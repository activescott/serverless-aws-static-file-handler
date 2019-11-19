[![npm version](https://badge.fury.io/js/serverless-aws-static-file-handler.svg)](https://www.npmjs.com/package/serverless-aws-static-file-handler)
[![npm](https://img.shields.io/npm/dt/serverless-aws-static-file-handler.svg?logo=npm)](https://www.npmjs.com/package/serverless-aws-static-file-handler)
[![Build Status](https://travis-ci.org/activescott/serverless-aws-static-file-handler.svg)](https://travis-ci.org/activescott/serverless-aws-static-file-handler)
[![Coverage Status](https://coveralls.io/repos/github/activescott/serverless-aws-static-file-handler/badge.svg)](https://coveralls.io/github/activescott/serverless-aws-static-file-handler)
[![Greenkeeper badge](https://badges.greenkeeper.io/activescott/serverless-aws-static-file-handler.svg)](https://greenkeeper.io/)
[![License](https://img.shields.io/github/license/activescott/serverless-aws-static-file-handler.svg)](https://github.com/activescott/serverless-aws-static-file-handler/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/activescott/serverless-aws-static-file-handler.svg?style=social)](https://github.com/activescott/serverless-aws-static-file-handler)

# serverless-aws-static-file-handler

Host the front-end of your web applications on [Serverless framework](https://github.com/serverless/serverless) on AWS Lambda right alongside the API.

It is a fast and easy way to get started and makes it trivial to deploy your web applications. If you need better response time in the future and get concerned about AWS costs of using Lambda to static content, you put CloudFront in front of your Serverless endpoints service static content.

<!-- TOC -->

- [Usage / Quick Start](#usage--quick-start)
- [Prerequisites / Usage Requirements](#prerequisites--usage-requirements)
- [Install](#install)
- [Features](#features)
- [Contributing 🤝](#contributing-🤝)
- [Show your support](#show-your-support)
- [Release Process (Deploying to NPM)](#release-process-deploying-to-npm)
- [License 📝](#license-📝)

<!-- /TOC -->

## Usage / Quick Start

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

Some additional real-world examples are demonstrated in the [examples/basic/](examples/basic) directory as well as a [serverless-offline](https://github.com/dherault/serverless-offline)-specific example in [examples/serverless-offline/](examples/serverless-offline).

## Prerequisites / Usage Requirements

Requires Node.js latest, LTS, or v10 ([tested](https://travis-ci.org/activescott/serverless-aws-static-file-handler)).

Requires Serverless Framework v1.x.
If you are new to the Serverless Framework, check out the [Serverless Framework Getting Started Guide](https://serverless.com/framework/docs/getting-started/).

## Install

Install with yarn (`yarn add serverless-aws-static-file-handler`) or npm (`npm install serverless-aws-static-file-handler --save-prod`)

## Features

- Simple to get started
- Works with **text files** such as HTML or **binary** files such as images or fonts

## Contributing 🤝

This is a community project. We invite your participation through issues and pull requests! You can peruse the [contributing guidelines](.github/CONTRIBUTING.md).

## Show your support

Give a ⭐️ if this project helped you!

## Release Process (Deploying to NPM)

We use [semantic-release](https://github.com/semantic-release/semantic-release) to consistently release [semver](https://semver.org/)-compatible versions. This project deploys to multiple [npm distribution tags](https://docs.npmjs.com/cli/dist-tag). Each of the below branches correspond to the following npm distribution tags:

| branch | npm distribution tag |
| ------ | -------------------- |
| master | latest               |
| beta   | beta                 |

To trigger a release use a Conventional Commit following [Angular Commit Message Conventions](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines) on one of the above branches.

## License 📝

Copyright © 2017 [scott@willeke.com](https://github.com/activescott).

This project is [MIT](https://github.com/activescott/serverless-http-invoker/blob/master/LICENSE) licensed.
