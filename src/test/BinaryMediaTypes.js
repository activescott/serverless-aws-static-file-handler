"use strict"

const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect
const sinon = require("sinon")

const BinaryMediaTypes = require("../plugins/BinaryMediaTypes")

describe("BinaryMediaTypes", function() {
  afterEach(() => {
    // Restore the default sandbox here
    sinon.restore()
  })

  describe("source path", function() {
    it("should load from '/plugins/BinaryMediaTypes'", () => {
      // this is the proper path
      require("../../plugins/BinaryMediaTypes")
    })

    it("should load from 'src/plugins/BinaryMediaTypes'", () => {
      // this was inadvertently introduced in v2.0.3 per https://github.com/activescott/serverless-aws-static-file-handler/issues/32
      require("../plugins/BinaryMediaTypes")
    })
  })

  describe("constructor", function() {
    it("should not allow empty serverless arg", function() {
      expect(() => new BinaryMediaTypes()).to.throw(
        /Expected serverless to be provided as argument/
      )
    })
  })

  describe("package:compileEvents", function() {
    let logSpy
    beforeEach(() => {
      //logSpy = sinon.spy(console.log)
      logSpy = sinon.spy()
    })

    function createPlugin(restApi) {
      const provider = {
        compiledCloudFormationTemplate: {
          Resources: []
        }
      }
      provider.compiledCloudFormationTemplate.Resources.push(restApi)
      const serverless = {
        getProvider: str => {
          str === "aws" ? provider : null
        },
        cli: {
          log: logSpy
        },
        service: {
          provider
        }
      }
      return new BinaryMediaTypes(serverless)
    }

    function createRestApi() {
      return {
        Type: "AWS::ApiGateway::RestApi",
        Properties: []
      }
    }

    const getHook = plugin => plugin.hooks["package:compileEvents"]

    it("should gracefully fail with logging when no RestApi", function() {
      const api = createRestApi()
      const p = createPlugin(api)
      // remove Rest API from service (maybe user isn't using http events/APIG?):
      p.serverless.service.provider.compiledCloudFormationTemplate.Resources = []
      const hook = getHook(p)
      expect(hook).to.not.throw()
      expect(logSpy.callCount).to.equal(1)
      expect(
        logSpy.calledOnceWithExactly(
          sinon.match(
            /Amazon API Gateway RestApi resource not found. No BinaryMediaTypes will be added.$/
          )
        )
      ).to.be.true
    })

    it("should ungracefully fail when RestApi has no Properties property", function() {
      const api = createRestApi()
      delete api.Properties
      const p = createPlugin(api)
      const hook = getHook(p)
      expect(hook).to.throw(/RestApi Properties property does not exist/)
    })

    describe("service configuration", function() {
      /**
       * expecting serverless.yml yaml:
       * custom:
       *   apiGateway:
       *     binaryMediaTypes:
       *       - image/png
       *       - application/octet-stream
       * ...
       * Plugin is expecting to read this like: expecting:  serverless.service.custom.apiGateway.binaryMediatypes: []
       */
      const CONFIG_ERROR_REGEX = /github\.com\/activescott\/serverless\-aws\-static\-file\-handler\#usage for information on how to configure$/
      it("should throw helpful messages when no custom config", function() {
        const api = createRestApi()
        const p = createPlugin(api)
        p.serverless.service.custom = null
        const hook = getHook(p)
        expect(hook).to.throw(CONFIG_ERROR_REGEX)
      })

      it("should throw helpful messages when no apiGateway config", function() {
        const api = createRestApi()
        const p = createPlugin(api)
        p.serverless.service.custom = {}
        const hook = getHook(p)
        expect(hook).to.throw(CONFIG_ERROR_REGEX)
      })

      it("should throw helpful messages when no binaryMediatypes config", function() {
        const api = createRestApi()
        const p = createPlugin(api)
        p.serverless.service.custom = {
          apiGateway: {}
        }
        const hook = getHook(p)
        expect(hook).to.throw(CONFIG_ERROR_REGEX)
      })

      it("should throw helpful messages when binaryMediatypes config null", function() {
        const api = createRestApi()
        const p = createPlugin(api)
        p.serverless.service.custom = {
          apiGateway: {
            binaryMediaTypes: null
          }
        }
        const hook = getHook(p)
        expect(hook).to.throw(CONFIG_ERROR_REGEX)
      })

      it("should throw helpful messages when binaryMediatypes config empty", function() {
        const api = createRestApi()
        const p = createPlugin(api)
        p.serverless.service.custom = {
          apiGateway: {
            binaryMediaTypes: []
          }
        }
        const hook = getHook(p)
        expect(hook).to.throw(CONFIG_ERROR_REGEX)
      })

      it("should read configured media types", function() {
        const api = createRestApi()
        const p = createPlugin(api)
        p.serverless.service.custom = {
          apiGateway: {
            binaryMediaTypes: ["image/png", "image/jpeg"]
          }
        }
        const hook = getHook(p)
        hook()
        expect(api.Properties.BinaryMediaTypes).to.deep.equal([
          "image/png",
          "image/jpeg"
        ])
      })
    })

    it("should not overwrite any existing media types in stack", function() {
      const api = createRestApi()
      api.Properties.BinaryMediaTypes = ["image/jpeg"]
      const p = createPlugin(api)
      p.serverless.service.custom = {
        apiGateway: {
          binaryMediaTypes: ["image/png"]
        }
      }
      const hook = getHook(p)
      hook()
      expect(api.Properties.BinaryMediaTypes).to.deep.equal([
        "image/jpeg",
        "image/png"
      ])
    })

    it("should not add duplicates to existing media types in stack", function() {
      const api = createRestApi()
      api.Properties = ["image/jpeg"]
      const p = createPlugin(api)
      p.serverless.service.custom = {
        apiGateway: {
          binaryMediaTypes: ["image/jpeg"]
        }
      }
      const hook = getHook(p)
      hook()
      expect(api.Properties.BinaryMediaTypes).to.deep.equal(["image/jpeg"])
    })
  })
})
