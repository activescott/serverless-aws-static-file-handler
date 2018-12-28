"use strict"
const util = require("util")
const _ = require("lodash")

class BinaryMediaTypes {
  constructor(serverless, options) {
    if (!serverless) {
      throw new Error("Expected serverless to be provided as argument")
    }
    this.serverless = serverless
    this.options = options
    this.provider = this.serverless.getProvider("aws")
    this.commands = {
      deploy: {
        lifecycleEvents: ["resources"]
      }
    }
    this.hooks = {
      //"before:deploy:resources": this.beforeDeployResources.bind(this),
      //"deploy:resources": this.deployResources.bind(this),
      //"after:package:compileEvents": this.afterPackageCompileEvents.bind(this),
      "package:compileEvents": this.packageCompileEvents.bind(this)
    }
  }

  log(...args) {
    args.unshift("aws-static-file-handler-BinaryMediaTypes:")
    const msg = util.format(...args)
    this.serverless.cli.log(msg)
  }

  getRestApi() {
    const resources = this.serverless.service.provider
      .compiledCloudFormationTemplate.Resources
    return _.find(resources, r => r.Type === "AWS::ApiGateway::RestApi")
  }

  addBinaryMediaTypes(restApi) {
    if (!restApi) {
      throw new Error("restApi argument expected!")
    }
    if (!restApi.Properties) {
      throw new Error("RestApi Properties property does not exist!")
    }
    // see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-restapi.html#cfn-apigateway-restapi-binarymediatypes
    const newTypes = [
      "insertedBy/aws-static-file-handler-BinaryMediaTypes",
      "application/octet-stream"
    ]
    if (newTypes) {
      this.log("Adding the following BinaryMediaTypes to RestApi:", newTypes)
    } else {
      this.log(
        "No BinaryMediaTypes configured. See https://github.com/activescott/serverless-aws-static-file-handler#usage for information on how to configure"
      )
      return
    }
    const oldTypes = restApi.Properties["BinaryMediaTypes"] || []
    const combined = _.concat(oldTypes, newTypes)
    restApi.Properties["BinaryMediaTypes"] = combined
    this.log("RestAPI BinaryMediaTypes is now:", combined)
  }

  packageCompileEvents() {
    this.log("packageCompileEvents")
    const restApi = this.getRestApi()
    this.addBinaryMediaTypes(restApi)
  }

  afterPackageCompileEvents() {
    this.log("afterPackageCompileEvents")
    //this.log("this.serverless.service.provider.compiledCloudFormationTemplate.Resources:", this.serverless.service.provider.compiledCloudFormationTemplate.Resources)
  }
}

module.exports = BinaryMediaTypes
