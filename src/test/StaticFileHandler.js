/* eslint-env mocha */
/* eslint-disable padded-blocks */
"use strict"

const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect

const path = require("path")
const StaticFileHandler = require("../StaticFileHandler.js")

const STATIC_FILES_PATH = path.join(__dirname, "./data/testfiles/")

function mockEvent(event) {
  return {
    resource: null,
    httpMethod: "GET",
    requestContext: {
      httpMethod: "GET",
    },
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    body: null,
    isBase64Encoded: false,
    ...event,
  }
}

// https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
function mockEventV2(path, event) {
  return {
    version: "2.0",
    routeKey: "$default",
    rawPath: path,
    requestContext: {
      http: {
        method: "GET",
        path: path,
      },
    },
    ...event,
  }
}

describe("StaticFileHandler", function () {
  describe("constructor", function () {
    it("should not allow empty arg", function () {
      expect(() => new StaticFileHandler()).to.throw(
        /^clientFilesPath must be specified$/
      )
    })

    it("should accept string arg", function () {
      expect(() => new StaticFileHandler("some/path")).to.not.throw(Error)
    })
  })

  describe("get", function () {
    it("should return index.html", function () {
      const event = mockEvent({ path: "index.html" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then((response) => {
        expect(response).to.have.property("statusCode", 200)
        expect(response)
          .to.have.property("body")
          .to.match(/^<!DOCTYPE html>/)
        return response
      })
    })

    it("should validate event exist", function () {
      const event = null
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return expect(h.get(event, null)).to.be.rejectedWith(
        /event object not specified.$/
      )
    })

    it("should validate event.path", function () {
      const event = mockEvent({ NOPATH: "index.html" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return expect(h.get(event, null)).to.be.rejectedWith(/Empty path.$/)
    })

    it.skip("(integration:lambda no longer supported) should work with non-lambdaproxy requests", function () {
      const event = {
        path: {
          fonts: "fonts/glyphicons-halflings-regular.woff2",
        },
      }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then((response) => {
        return expect(response.body.length).to.equal(24040)
      })
    })

    it("integration:lambda no longer supported; should fail if not using lambda-proxy", function () {
      const event = {
        path: {
          fonts: "fonts/glyphicons-halflings-regular.woff2",
        },
      }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return expect(h.get(event, null)).to.be.rejectedWith(
        /^API Gateway method does not appear to be setup for Lambda Proxy Integration/
      )
    })

    it("should succeed in serverless-offline environment", function () {
      // see issue #10:
      const event = mockEvent({ path: "README.md" })
      delete event["isBase64Encoded"]
      event["isOffline"] = true
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then((response) => {
        let expectedContent = "This directory is not empty. Is it?\n"
        return expect(response.body).to.equal(expectedContent)
      })
    })

    it("should return text as text", function () {
      const event = mockEvent({ path: "README.md" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then((response) => {
        let expectedContent = "This directory is not empty. Is it?\n"
        return expect(response.body).to.equal(expectedContent)
      })
    })

    it("should insert viewdata", function () {
      const event = mockEvent({ path: "index.html" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const context = {
        staticFileHandler: {
          viewData: {
            csrftoken: "MY_FAKE_CSRF_TOKEN",
          },
        },
      }
      return h.get(event, context).then((response) => {
        return expect(response.body).to.match(
          /.*<input id="csrftoken" type="hidden" value="MY_FAKE_CSRF_TOKEN"/
        )
      })
    })

    describe("error response", function () {
      it("should include viewData in default error page", function () {
        const event = mockEvent({ path: "doesntexist.404" })
        let h = new StaticFileHandler(STATIC_FILES_PATH)
        const response = h.get(event, null)
        // the default error page mentions page name and "does not exist"
        return expect(response)
          .to.eventually.haveOwnProperty("body")
          .that.matches(/doesntexist\.404 does not exist/)
      })

      it("should include viewData in custom error page", function () {
        const event = mockEvent({ path: "doesntexist.404" })
        let h = new StaticFileHandler(STATIC_FILES_PATH, "custom-error.html")
        const response = h.get(event, null)
        // the default error page mentions page name and "does not exist"
        return expect(response)
          .to.eventually.haveOwnProperty("body")
          .that.matches(/doesntexist\.404 does not exist/)
      })

      it("should return 404 when no path parameters", function () {
        const event = mockEvent({ path: "doesntexist.404" })
        let h = new StaticFileHandler(STATIC_FILES_PATH)
        const response = h.get(event, null)
        return expect(response)
          .to.eventually.haveOwnProperty("statusCode")
          .that.equals(404)
      })

      it("should return 404 customErrorPagePath is invalid", function () {
        const event = mockEvent({ path: "doesntexist.404" })
        let h = new StaticFileHandler(
          STATIC_FILES_PATH,
          "error-page-doesnt-exist-either.html"
        )
        const response = h.get(event, null)
        return expect(response)
          .to.eventually.haveOwnProperty("statusCode")
          .that.equals(404)
      })

      it("should use customErrorPagePath", async function () {
        const event = mockEvent({ path: "doesntexist.404" })
        let h = new StaticFileHandler(STATIC_FILES_PATH, "custom-error.html")
        const response = h.get(event, null)
        expect(response)
          .to.eventually.haveOwnProperty("statusCode")
          .that.equals(404)
        return expect(response)
          .to.eventually.haveOwnProperty("body")
          .that.matches(/<title>CUSTOM<\/title>/)
      })
    })

    /**
     * This is to support a greedy path parameter like:
     * ```
     * events:
     * - http:
     *     path: /binary/{pathvar+}
     * ```
     */
    it("should support path parameters", function () {
      const event = mockEvent({
        path: "/binary/vendor/output.css.map",
        pathParameters: { pathvar: "vendor/output.css.map" },
      })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const response = h.get(event, null)
      expect(response)
        .to.eventually.have.ownProperty("statusCode")
        .that.equals(200)
      return expect(response)
        .to.eventually.haveOwnProperty("body")
        .that.is.a("string")
        .and.has.length(107)
    })

    it("should return 404 with path parameters", function () {
      const event = mockEvent({
        path: "/binary/does-not-exist.file",
        pathParameters: { pathvar: "vendor/does-not-exist.file" },
      })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const response = h.get(event, null)
      return expect(response)
        .to.eventually.haveOwnProperty("statusCode")
        .that.equals(404)
    })

    /**
     * This is a `integration: lambda` test WITH NO path parameters.
     * Defined in serverless.yml something like:
     *
     * myfunc:
     *   handler: handler.myfunc
     *   events:
     *     - http:
     *         path: /no_path_params_here
     *         method: get
     *         integration: lambda
     *         contentHandling: CONVERT_TO_BINARY
     */
    it.skip("(integration:lambda no longer supported) should error on lambda integration without path parameters", function () {
      const event = {
        body: {},
        method: "GET",
        stage: "dev",
        headers: { Accept: "*/*" },
        query: {},
        path: {}, // <<< this is the critical input to this test. It is an object (indicating lambda integration), but no properties.
      }
      const context = {}
      const h = new StaticFileHandler(STATIC_FILES_PATH)
      return expect(h.get(event, context)).to.eventually.be.rejectedWith(
        /The event.path is an object but there are no properties. This likely means it is a lambda integration but there are no path parameters\/variables defined. Check your serverless.yml./
      )
    })

    describe("MIME Types", function () {
      it("js.map => application/json", async function () {
        const event = mockEvent({ path: "vendor/output.js.map" })
        let h = new StaticFileHandler(STATIC_FILES_PATH)
        const response = await h.get(event, null)
        expect(response).to.haveOwnProperty("statusCode").that.equals(200)
        expect(response)
          .to.have.property("headers")
          .that.has.property("Content-Type")
          .that.equals("application/json")
        expect(response).to.have.property("isBase64Encoded").that.equals(false)
        return response
      })

      it("css.map => application/json", async function () {
        const event = mockEvent({ path: "vendor/output.css.map" })
        let h = new StaticFileHandler(STATIC_FILES_PATH)
        const response = await h.get(event, null)
        expect(response).to.haveOwnProperty("statusCode").that.equals(200)
        expect(response)
          .to.have.property("headers")
          .that.has.property("Content-Type")
          .that.equals("application/json")
        expect(response).to.have.property("isBase64Encoded").that.equals(false)
        return response
      })

      it("unknown-mime-type => application/octet-stream", async function () {
        const event = mockEvent({ path: "unknown-mime-type.unknowntype" })
        let h = new StaticFileHandler(STATIC_FILES_PATH)
        const response = await h.get(event, null)
        expect(response).to.haveOwnProperty("statusCode").that.equals(200)
        expect(response)
          .to.have.property("headers")
          .that.has.property("Content-Type")
          .that.equals("application/octet-stream")
        expect(response).to.have.property("isBase64Encoded").that.equals(true)
        return response
      })

      describe("Binary types are also base64", async function () {
        it(".png => image/png", async function () {
          const event = mockEvent({ path: "png.png" })
          let h = new StaticFileHandler(STATIC_FILES_PATH)
          const response = await h.get(event, null)
          expect(response).to.haveOwnProperty("statusCode").that.equals(200)
          expect(response).to.have.property("headers")
          expect(response.headers)
            .to.have.property("Content-Type")
            .that.equals("image/png")
          expect(response).to.have.property("isBase64Encoded").that.equals(true)
          return response
        })

        it(".jpg => image/jpeg", async function () {
          const event = mockEvent({ path: "jpg.jpg" })
          let h = new StaticFileHandler(STATIC_FILES_PATH)
          const response = await h.get(event, null)
          expect(response).to.haveOwnProperty("statusCode").that.equals(200)
          expect(response).to.have.property("headers")
          expect(response.headers)
            .to.have.property("Content-Type")
            .that.equals("image/jpeg")
          expect(response).to.have.property("isBase64Encoded").that.equals(true)
          return response
        })

        it(".woff2 => font/woff2", async function () {
          const event = mockEvent({
            path: "fonts/glyphicons-halflings-regular.woff2",
          })
          let h = new StaticFileHandler(STATIC_FILES_PATH)
          const response = await h.get(event, null)
          expect(response).to.haveOwnProperty("statusCode").that.equals(200)
          expect(response).to.have.property("headers")
          expect(response.headers)
            .to.have.property("Content-Type")
            .that.equals("font/woff2")
          expect(response).to.have.property("isBase64Encoded").that.equals(true)
          return response
        })

        it(".bin", async function () {
          const event = mockEvent({ path: "blah.bin" })
          let h = new StaticFileHandler(STATIC_FILES_PATH)
          const response = await h.get(event, null)
          expect(response).to.haveOwnProperty("statusCode").that.equals(200)
          expect(response).to.have.property("isBase64Encoded").that.equals(true)
          return response
        })
      })
    })
  })

  describe("get (httpApi v2)", function () {
    it("should return index.html", function () {
      const event = mockEventV2("index.html")
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then((response) => {
        expect(response).to.have.property("statusCode", 200)
        expect(response)
          .to.have.property("body")
          .to.match(/^<!DOCTYPE html>/)
        return response
      })
    })
    it("should support path parameters", function () {
      const event = mockEventV2("/binary/vendor/output.css.map", {
        pathParameters: { pathvar: "vendor/output.css.map" },
      })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const response = h.get(event, null)
      expect(response)
        .to.eventually.have.ownProperty("statusCode")
        .that.equals(200)
      return expect(response)
        .to.eventually.haveOwnProperty("body")
        .that.is.a("string")
        .and.has.length(107)
    })
  })
})
