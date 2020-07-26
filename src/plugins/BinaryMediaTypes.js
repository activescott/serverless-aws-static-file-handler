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
        lifecycleEvents: ["resources"],
      },
    }
    this.hooks = {
      "package:compileEvents": this.packageCompileEvents.bind(this),
    }
  }

  log(...args) {
    args.unshift("aws-static-file-handler (BinaryMediaTypes):")
    const msg = util.format(...args)
    this.serverless.cli.log(msg)
  }

  getRestApi() {
    const resources = this.serverless.service.provider
      .compiledCloudFormationTemplate.Resources
    return _.find(resources, (r) => r.Type === "AWS::ApiGateway::RestApi")
  }

  readConfig() {
    const service = this.serverless.service
    if (
      !service.custom ||
      !service.custom.apiGateway ||
      !service.custom.apiGateway.binaryMediaTypes ||
      _.isEmpty(service.custom.apiGateway.binaryMediaTypes)
    ) {
      throw new Error(BinaryMediaTypes.Strings.CONFIG_ERROR)
    }
    return service.custom.apiGateway.binaryMediaTypes
  }

  addBinaryMediaTypes(restApi) {
    if (!restApi) {
      this.log(
        "Amazon API Gateway RestApi resource not found. No BinaryMediaTypes will be added."
      )
      return
    }
    if (!restApi.Properties) {
      throw new Error("RestApi Properties property does not exist!")
    }
    // see https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigateway-restapi.html#cfn-apigateway-restapi-binarymediatypes
    const newTypes = this.readConfig()
    this.log("Adding the following BinaryMediaTypes to RestApi:", newTypes)
    const oldTypes = restApi.Properties["BinaryMediaTypes"] || []
    const combined = _.concat(oldTypes, newTypes)
    restApi.Properties["BinaryMediaTypes"] = combined
    this.log("RestApi BinaryMediaTypes are now:", combined)
  }

  packageCompileEvents() {
    const restApi = this.getRestApi()
    this.addBinaryMediaTypes(restApi)
  }
}

BinaryMediaTypes.Strings = {
  CONFIG_ERROR:
    "No BinaryMediaTypes configured. See https://github.com/activescott/serverless-aws-static-file-handler#usage for information on how to configure",
}

module.exports = BinaryMediaTypes
