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
    headers: {},
    multiValueHeaders: {},
    queryStringParameters: null,
    multiValueQueryStringParameters: null,
    pathParameters: null,
    stageVariables: null,
    requestContext: {},
    body: null,
    isBase64Encoded: false,
    ...event
  }
}

describe("StaticFileHandler", function() {
  describe("constructor", function() {
    it("should not allow empty arg", function() {
      expect(() => new StaticFileHandler()).to.throw(
        /clientFilesPath must be specified/
      )
    })

    it("should accept string arg", function() {
      expect(() => new StaticFileHandler("some/path")).to.not.throw(Error)
    })
  })

  describe("get", function() {
    it("should return index.html", function() {
      let event = mockEvent({ path: "index.html" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then(response => {
        expect(response).to.have.property("statusCode", 200)
        expect(response)
          .to.have.property("body")
          .to.match(/^<!DOCTYPE html>/)
        return response
      })
    })

    it("should return a mime/type of application/octet-stream for .map files", function() {
      let event = mockEvent({ path: "vendor/bootstrap.min.css.map" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then(response => {
        expect(response).to.have.property("headers")
        expect(response.headers).to.have.property("Content-Type")
        expect(response.headers["Content-Type"]).to.equal(
          "application/octet-stream"
        )
        return response
      })
    })

    it.skip("(integration:lambda no longer supported) should work with non-lambdaproxy requests", function() {
      let event = {
        path: {
          fonts: "fonts/glyphicons-halflings-regular.woff2"
        }
      }
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then(response => {
        return expect(response.body.length).to.equal(24040)
      })
    })

    it("should return text as text", function() {
      let event = mockEvent({ path: "README.md" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      return h.get(event, null).then(response => {
        let expectedContent = "This directory is not empty. Is it?\n"
        return expect(response.body).to.equal(expectedContent)
      })
    })

    it("should insert viewdata", function() {
      let event = mockEvent({ path: "index.html" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const context = {
        staticFileHandler: {
          viewData: {
            csrftoken: "MY_FAKE_CSRF_TOKEN"
          }
        }
      }
      return h.get(event, context).then(response => {
        return expect(response.body).to.match(
          /.*<input id="csrftoken" type="hidden" value="MY_FAKE_CSRF_TOKEN"/
        )
      })
    })

    it("should return 404 when no path parameters", function() {
      let event = mockEvent({ path: "doesntexist.404" })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const response = h.get(event, null)
      return expect(response)
        .to.eventually.haveOwnProperty("statusCode")
        .that.equals(404)
    })

    it("should return 404 customErrorPagePath is invalid", function() {
      let event = mockEvent({ path: "doesntexist.404" })
      let h = new StaticFileHandler(
        STATIC_FILES_PATH,
        "error-page-doesnt-exist-either.html"
      )
      const response = h.get(event, null)
      return expect(response)
        .to.eventually.haveOwnProperty("statusCode")
        .that.equals(404)
    })

    /**
     * This is to support a greedy path parameter like:
     * ```
     * events:
     * - http:
     *     path: /binary/{pathvar+}
     * ```
     */
    it("should support path parameters", function() {
      let event = mockEvent({
        path: "/binary/vendor/bootstrap.min.css.map",
        pathParameters: { pathvar: "vendor/bootstrap.min.css.map" }
      })
      let h = new StaticFileHandler(STATIC_FILES_PATH)
      const response = h.get(event, null)
      expect(response)
        .to.eventually.have.ownProperty("statusCode")
        .that.equals(200)
      return expect(response)
        .to.eventually.haveOwnProperty("body")
        .that.is.a("string")
        .and.has.length(542194)
    })

    it("should return 404 with path parameters", function() {
      let event = mockEvent({
        path: "/binary/vendor/bootstrap.min.css.map",
        pathParameters: { pathvar: "vendor/does-not-exist.file" }
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
    it.skip("(integration:lambda no longer supported) should error on lambda integration without path parameters", function() {
      const event = {
        body: {},
        method: "GET",
        stage: "dev",
        headers: { Accept: "*/*" },
        query: {},
        path: {} // <<< this is the critical input to this test. It is an object (indicating lambda integration), but no properties.
      }
      const context = {}
      const h = new StaticFileHandler(STATIC_FILES_PATH)
      return expect(h.get(event, context)).to.eventually.be.rejectedWith(
        /The event.path is an object but there are no properties. This likely means it is a lambda integration but there are no path parameters\/variables defined. Check your serverless.yml./
      )
    })
  })
})
