"use strict"
const assert = require("assert")
const fs = require("fs")
const mimetypes = require("mime-types")
const Mustache = require("mustache")
const path = require("path")
const util = require("util")
const _ = require("lodash")
const readFileAsync = util.promisify(fs.readFile)
const accessAsync = util.promisify(fs.access)

// originally from lodash, but never called with a defaultValue
// https://gist.github.com/jeneg/9767afdcca45601ea44930ea03e0febf
function __get(value, path, defaultValue) {
  return String(path)
    .split('.')
    .reduce((acc, v) => {
      if (v.startsWith('[')) {
        const [, arrPart] = v.split('[');
        v = arrPart.split(']')[0];
      }

      if (v.endsWith(']') && !v.startsWith('[')) {
        const [objPart, arrPart, ...rest] = v.split('[');
        const [firstIndex] = arrPart.split(']');
        const otherParts = rest
          .join('')
          .replaceAll('[', '')
          .replaceAll(']', '.')
          .split('.')
          .filter(str => str !== '');

        return [...acc, objPart, firstIndex, ...otherParts];
      }

      return [...acc, v];
    }, [])
    .reduce((acc, v) => {
      try {
        acc = acc[v] !== undefined ? acc[v] : defaultValue;
      } catch (e) {
        return defaultValue;
      }

      return acc;
    }, value);
};

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
    return mimetypes.lookup(filePath) || "application/octet-stream"
  }

  static isBinaryType(mimeType) {
    const mimeCharset = mimetypes.charset(mimeType)
    /* Using https://w3techs.com/technologies/overview/character_encoding/all
     * to be more comprehensive go through those at https://www.iana.org/assignments/character-sets/character-sets.xhtml
     */
    const textualCharSets = [
      "UTF-8",
      "ISO-8859-1",
      "Windows-1251",
      "Windows-1252",
      "Shift_JIS",
      "GB2312",
      "EUC-KR",
      "ISO-8859-2",
      "GBK",
      "Windows-1250",
      "EUC-JP",
      "Big5",
      "ISO-8859-15",
      "Windows-1256",
      "ISO-8859-9",
    ]
    const found = textualCharSets.find(
      (cs) => 0 === cs.localeCompare(mimeCharset, "en", { sensitivity: "base" })
    )
    return found === undefined || found === null
  }

  async get(event, context) {
    if (!event) {
      throw new Error("event object not specified.")
    }

    if (event.rawPath) {
      // convert the V2 API to look like v1 like rest of code expects

      // this matches validateLambdaProxyIntegration required props
      event.resource = event.requestContext.http.path
      event.path = event.rawPath
      event.httpMethod = event.requestContext.http.method
      // OK as is event.headers
      event.multiValueHeaders = event.headers
      event.queryStringParameters = event.queryStringParamaters
      event.multiValueQueryStringParameters = event.queryStringParameters // Not sure what old code does ?
      // OK as is event.pathParameters
      event.stageVariables = event.requestContext.stage // Not sure we ever pass these ?
      // OK as is event.requestContext
      event.body = "" // It is a GET, there never is one ?
      // OK as is event.isBase64Encoded
    }

    if (!event.path) {
      throw new Error("Empty path.")
    }
    await StaticFileHandler.validateLambdaProxyIntegration(event)
    let requestPath
    if (event.pathParameters) {
      requestPath = ""
      /*
       * event.path is an object when `integration: lambda` and there is a greedy path parameter
       * If there are zero properties, it is just "lambda integration" and no path parameters
       * If there are properties, it indicates there are path parameters.
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
    return this.readFileAsResponse(filePath, context).catch((err) => {
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

  static readStreamAsResponse(stream, context, statusCode, mimeType) {
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
    statusCode,
    mimeType,
    isBase64Encoded
  ) {
    assert(mimeType, "expected mimeType to always be provided")
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
        "Content-Type": mimeType,
      },
      isBase64Encoded,
      body: stringData,
    }
    return response
  }

  /**
   * Returns a Promise with a response that is an HTML page with the specified error text on it.
   * @param {*string} errorText The error to add to the page.
   */
  async responseAsError(errorText, statusCode) {
    const context = {
      staticFileHandler: {
        viewData: {
          errorText: errorText,
        },
      },
    }
    if (this.customErrorPagePath) {
      let filePath = path.join(this.clientFilesPath, this.customErrorPagePath)
      try {
        await accessAsync(filePath, fs.constants.R_OK)
        return this.readFileAsResponse(filePath, context, statusCode)
      } catch (err) {
        console.warn(
          "serverless-aws-static-file-handler: Error using customErrorPagePath",
          this.customErrorPagePath,
          ". Using fallback error HTML."
        )
      }
    }

    const DEFAULT_ERROR_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Error</title>
  </head>

  <body>
    {{errorText}}
  </body>
</html>
`
    return StaticFileHandler.readStringAsResponse(
      DEFAULT_ERROR_HTML,
      context,
      statusCode,
      "text/html",
      false
    )
  }

  /**
   * Rejects if the specified event is not Lambda Proxy integration
   */
  static async validateLambdaProxyIntegration(event) {
    /* 
    There are two different event schemas in API Gateway + Lambda Proxy APIs. One is known as "REST API" or the old V1 API and the newer one is the V2 or "HTTP API". 
    Each are described at https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html#services-apigateway-apitypes
    You can see examples of each at https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
    TLDR: 
    - V2 has a { version: "2.0" } field and { requestContext.http.method: "..." }  field.
    - V1 has a { version: "1.0" } field and { requestContext.httpMethod: "..." }  field.
    To set each up in serverless.com:
    - V1: https://www.serverless.com/framework/docs/providers/aws/events/apigateway
    - V2: https://www.serverless.com/framework/docs/providers/aws/events/http-api
    */
    function isV2ProxyAPI(evt) {
      return (
        evt.version === "2.0" &&
        typeof __get(evt, "requestContext.http.method") === "string"
      )
    }
    function isV1ProxyAPI(evt) {
      return (
        // docs say there is a .version but there isn't!
        // evt.version === "1.0" &&
        typeof __get(evt, "requestContext.httpMethod") === "string"
      )
    }
    // serverless-offline doesn't provide the `isBase64Encoded` prop, but does add the isOffline. Fixes issue #10: https://github.com/activescott/serverless-aws-static-file-handler/issues/10
    const isServerlessOfflineEnvironment = "isOffline" in event
    if (!isV1ProxyAPI(event) && !isV2ProxyAPI(event)) {
      const logProps = [
        "version",
        "requestContext.httpMethod",
        "requestContext.http.method",
      ]
      const addendum = logProps
        .map((propName) => `event.${propName} was '${__get(event, propName)}'`)
        .join(" ")
      throw new Error(
        "API Gateway method does not appear to be setup for Lambda Proxy Integration. Please confirm that `integration` property of the http event is not specified or set to `integration: proxy`." +
          addendum
      )
    }
  }
}

module.exports = StaticFileHandler
