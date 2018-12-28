# serverless-aws-static-file-handler

[![npm version](https://badge.fury.io/js/serverless-aws-static-file-handler.svg)](https://badge.fury.io/js/serverless-aws-static-file-handler)
[![Build Status](https://travis-ci.org/activescott/serverless-aws-static-file-handler.svg?branch=master)](https://travis-ci.org/activescott/serverless-aws-static-file-handler)
[![Coverage Status](https://coveralls.io/repos/github/activescott/serverless-aws-static-file-handler/badge.svg?branch=master)](https://coveralls.io/github/activescott/serverless-aws-static-file-handler?branch=master)
[![code style: prettier](https://img.shields.io/badge/code_style-prettier-ff69b4.svg?style=flat-square)](https://github.com/prettier/prettier)
[![license](https://img.shields.io/npm/l/serverless-aws-static-file-handler.svg)](https://www.npmjs.com/package/serverless-aws-static-file-handler)

An easy way to host the front-end of your web applications on [Serverless framework](https://github.com/serverless/serverless) on AWS Lambda along with their APIs written in Serverless.

It is a fast and easy way to get started and makes it trivial to deploy your web applications. If you need better response time in the future and get concerned about AWS costs of using Lambda to static content, you put Cloud Front in front of your Serverless endpoints service static content.

# Usage

Import & initialize:

    const StaticFileHandler = require('serverless-aws-static-file-handler')

    # configure where to serve files from:
    const clientFilesPath = path.join(__dirname, "./data-files/")
    const fileHandler = new StaticFileHandler(clientFilesPath)

Define a handler in your code as follows:

    module.exports.html = async (event, context) => {
      event.path = "index.html" // forcing a specific page for this handler, ignore requested path. This would serve ./data-files/index.html
      return fileHandler.get(event, context)
    }

In your `serverless.yml` file, reference the handler function from above to provide routes to your static files:

    functions:
      html:
        handler: handler.html
        events:
          - http:
              path: /
              method: get

      # Note Binary files work too! See configuration information below
      png:
        handler: handler.png
        events:
          - http:
              path: png
              method: get

      # The following example uses a path placeholder to serve all files directly in the /binary/ directory:
      binary:
        handler: handler.binary
        events:
          - http:
            path: /binary/{pathvar+}
            method: get

To serve binary content make sure that you setup the plugin in your serverless.yml like so:

    plugins:
      - serverless-aws-static-file-handler/plugins/BinaryMediaTypes

    custom:
      apiGateway:
        binaryMediaTypes:
          - "image/png"
          - "image/jpeg"

Some additional real-world examples are demonstrated in the [demo](demo/serverless.yml).

# Installation

npm: `npm install serverless-aws-static-file-handler --save-prod`
