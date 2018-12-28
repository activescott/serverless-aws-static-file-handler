"use strict"

const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect

const BinaryMediaTypes = require("../plugins/BinaryMediaTypes")

describe("BinaryMediaTypes", function() {
  describe("constructor", function() {
    it("should not allow empty serverless arg", function() {
      expect(() => new BinaryMediaTypes()).to.throw(
        /Expected serverless to be provided as argument/
      )
    })
  })

  describe("package:compileEvents", function() {
    it("should gracefully fail with logging when no RestApi")
    it("should ungracefully fail when RestApi has no Properties")
    it(
      "should log helpful messages when serverless API isn't shaped as expected (this.serverless.service.provider.compiledCloudFormationTemplate.Resources)"
    )
    it("should log helpful messages when configuration isn't present")
    it("should read configured media types")
    it("should not overwrite any existing media types in stack")
    it("should not add duplicates to existing media types in stack")
  })
})
