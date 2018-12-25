"use strict"
const assert = require("assert")
const fs = require("fs")
const Mustache = require("mustache")
const path = require("path")
const util = require("util")

const Diag = require("./Diag")

const D = new Diag("StaticFileHandler")

const readFileAsync = util.promisify(fs.readFile)
const accessAsync = util.promisify(fs.access)

const typeMap = {
  // see https://www.iana.org/assignments/media-types/media-types.xhtml
  html: "text/html",
  md: "text/markdown",
  css: "text/css",
  js: "application/javascript",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  json: "application/json",
  xml: "application/xml",
  zip: "application/zip",
  pdf: "application/pdf",
  mp4: "audio/mpeg",
  m4a: "audio/mpeg",
  ico: "image/x-icon",
  woff2: "application/font-woff2; charset=utf-8",
  woff: "application/font-woff; charset=utf-8",
  ttf: "application/font-sfnt",
  otf: "application/font-sfnt"
}
const binaryTypes = [
  typeMap["png"],
  typeMap["jpg"],
  typeMap["jpeg"],
  typeMap["gif"],
  typeMap["zip"],
  typeMap["pdf"],
  typeMap["mp4"],
  typeMap["m4a"],
  typeMap["ico"],
  typeMap["woff2"],
  typeMap["woff"],
  typeMap["ttf"],
  typeMap["otf"]
]

class StaticFileHandler {
  /**
   * Initializes a new instance of @see StaticFileHandler
   * @param {*string} clientFilesPath The fully qualified path to the client files that this module should serve.
   * @param {*string} customErrorPagePath Optional path to a custom error page. Must be relative to @see clientFilesPath .
   */
  constructor(clientFilesPath, customErrorPagePath = null) {
    if (clientFilesPath == null || clientFilesPath.length === 0) {
      throw new Error("clientFilesPath must be specified")
    }
    this.clientFilesPath = clientFilesPath
    this.customErrorPagePath = customErrorPagePath
  }

  static getMimeType(filePath) {
    let parts = filePath.split(".")
    var mimeType = ""
    if (parts.length > 0) {
      let extension = parts[parts.length - 1]
      if (typeMap.hasOwnProperty(extension)) {
        mimeType = typeMap[extension]
      } else {
        mimeType = "application/octet-stream" // https://stackoverflow.com/questions/20508788/do-i-need-content-type-application-octet-stream-for-file-download#20509354
      }
    }
    return mimeType
  }

  static isBinaryType(mimeType) {
    return binaryTypes.indexOf(mimeType) >= 0
  }

  async get(event, context) {
    await StaticFileHandler.validateLambdaProxyIntegration(event)
    if (!event) {
      throw new Error("event object not specified.")
    }
    if (!event.path) {
      throw new Error("Empty path.")
    }
    let requestPath
    if (event.pathParameters) {
      //D.log("Found event.pathParameters:", event.pathParameters)
      requestPath = ""
      /*
       * event.path is an object when `integration: lambda` and there is a greedy path parameter
       * If there are zero properties, it is just "lambda integration" and no path parameters
       * If ther are properites, it indicates there are path parameters.
       * For example: The path parameter could be mapped like so in serverless.yml:
       * - http:
             path: fontsdir/{fonts+}
       * The {fonts+} in the path indicates the base path and tells APIG to pass along the whole path.
       */
      // now enumerate the properties of it:
      let propNames = Object.getOwnPropertyNames(event.pathParameters)
      if (propNames.length === 0) {
        const msg =
          "The event.path is an object but there are no properties. Check serverless.yml."
        throw new Error(msg)
      }
      if (propNames.length !== 1) {
        const msg = `Expected exactly one property name, but found: ${util.inspect(
          propNames
        )}. Check that you configured the pathParameter in serverless.yml with a plus sign like \`path/{pathparam+}\`.`
        throw new Error(msg)
      }
      requestPath = "/" + event.pathParameters[propNames[0]]
    } else {
      assert(typeof event.path === "string", "expected path to be string")
      requestPath = event.path
    }
    let filePath = path.join(this.clientFilesPath, requestPath)
    return this.readFileAsResponse(filePath, context)
      .then(response => {
        return response
      })
      .catch(err => {
        throw new Error(
          `Unable to read client file '${requestPath}'. Error: ${err}`
        )
      })
  }

  /**
   * Loads the specified file's content and returns a response that can be called back to lambda for sending the file as the http response.
   */
  async readFileAsResponse(filePath, context, statusCode = 200) {
    let stream
    try {
      stream = await readFileAsync(filePath)
    } catch (err) {
      if (err.code === "ENOENT") {
        // NOTE: avoid leaking full local path
        const fileName = path.basename(filePath)
        return this.responseAsError(`File ${fileName} does not exist`, 404)
      }
    }
    let mimeType = StaticFileHandler.getMimeType(filePath)
    return StaticFileHandler.readStreamAsResponse(
      stream,
      context,
      statusCode,
      mimeType
    )
  }

  static readStreamAsResponse(stream, context, statusCode = 200, mimeType) {
    let body
    let isBase64Encoded = false
    if (StaticFileHandler.isBinaryType(mimeType)) {
      isBase64Encoded = true
      body = Buffer.from(stream).toString("base64")
    } else {
      body = stream.toString("utf8")
    }
    return StaticFileHandler.readStringAsResponse(
      body,
      context,
      statusCode,
      mimeType,
      isBase64Encoded
    )
  }

  static readStringAsResponse(
    stringData,
    context,
    statusCode = 200,
    mimeType,
    isBase64Encoded = false
  ) {
    if (!mimeType) {
      let msg = "Unrecognized MIME type for file " + filePath
      D.error(msg)
      throw new Error(msg)
    }
    if (
      context &&
      "staticFileHandler" in context &&
      "viewData" in context.staticFileHandler
    ) {
      const viewData = context.staticFileHandler.viewData
      stringData = Mustache.render(stringData, viewData)
    }
    const response = {
      statusCode: statusCode,
      headers: {
        "Content-Type": mimeType
      },
      isBase64Encoded,
      body: stringData
    }
    return response
  }

  /**
   * Returns a Promise with a response that is an HTML page with the specified error text on it.
   * @param {*string} errorText The error to add to the page.
   */
  async responseAsError(errorText, statusCode = 400) {
    let filePath
    let customErrorPagePathIsValid
    if (this.customErrorPagePath) {
      filePath = path.join(this.clientFilesPath, this.customErrorPagePath)
      try {
        await accessAsync(filePath, fs.constants.R_OK)
        customErrorPagePathIsValid = true
      } catch (err) {
        customErrorPagePathIsValid = false
      }
    }
    if (!customErrorPagePathIsValid) {
      filePath = path.join(__dirname, "error.html")
    }
    const viewData = {
      errorText: errorText
    }
    return this.readFileAsResponse(filePath, viewData, statusCode)
  }

  /**
   * Rejects if the specified event is not
   */
  static async validateLambdaProxyIntegration(event) {
    // From https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
    const expectedProps = [
      "resource",
      "path",
      "httpMethod",
      "headers",
      "multiValueHeaders",
      "queryStringParameters",
      "multiValueQueryStringParameters",
      "pathParameters",
      "stageVariables",
      "requestContext",
      "body",
      "isBase64Encoded"
    ]
    const missingProps = expectedProps.filter(propName => !(propName in event))
    if (missingProps.length > 0)
      throw new Error(
        `API Gateway method does not appear to be setup for Lambda Proxy Integration. Please confirm that \`integration\` property of the http event is not specified or set to \`integration: proxy\`. Missing lambda proxy property was ${
          missingProps[0]
        }`
      )
  }
}

module.exports = StaticFileHandler
