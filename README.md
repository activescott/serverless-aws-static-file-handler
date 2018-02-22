[![npm version](https://badge.fury.io/js/serverless-aws-static-file-handler.svg)](https://badge.fury.io/js/serverless-aws-static-file-handler)
[![license](https://img.shields.io/npm/l/serverless-aws-static-file-handler.svg)](https://www.npmjs.com/package/serverless-aws-static-file-handler)

# serverless-aws-static-file-handler
An easy way to host the front-end of your web applications on [Serverless framework](https://github.com/serverless/serverless) on AWS Lambda along with their APIs written in Serverless. 

It is a fast and easy way to get started and makes it trivial to deploy your web applications. If you need better response time in the future and get concerned about AWS costs of using Lambda to static content, you put Cloud Front in front of your Serverless endpoints service static content.

# Usage

Define a handler in your code as follows:


    module.exports.staticfile = (event, context, callback) => {
      // clientFilesPath is a local directory that serverless will automatically package and deploy to AWS Lambda along with your code
      const clientFilesPath = path.join(__dirname, './data/public/')
      return new StaticFileHandler(clientFilesPath).get(event, context)
        .then(response => callback(null, response))
        .catch(err => callback(err))
    }

In your `serverless.yml` file, reference the handler function from above to provide routes to your static files:


    staticfiles:
      handler: handler.staticfile
      events:
        # Serve some simple static files from the root:
        - http:
            path: index.html
            method: get
        - http:
            path: index.js
            method: get
        - http:
            path: style.css
            method: get
        
        # The following example uses a path placeholder to serve all files directly in the vendor/ directory:
        - http:
            path: vendor/{url}
            method: get
        
        # Add a + to the path placeholder to route all subpaths to your handler. In this example, /css/file.css and /css/subdir/file2.css will both be handled:
        - http:
            path: css/{csspath+}
            method: get
            contentHandling: CONVERT_TO_BINARY        
        
        # Binary content works too. Just add `integration: lambda` and `contentHandling: CONVERT_TO_BINARY` to your http event (this configures API Gateway for Binary content):
        - http:
            path: images/myimage.png
            method: get
            integration: lambda # binary requires non-proxy API Gateway requests
            contentHandling: CONVERT_TO_BINARY # serverless-apigwy-binary plugin required for contentHandling to work. Get it at https://www.npmjs.com/package/serverless-apigwy-binary


Some additional real-world examples are demonstrated in the [sheetmonkey-server project](https://github.com/activescott/sheetmonkey-server).

# Installation
npm (`npm install serverless-aws-static-file-handler --save-dev`) or yarn (`yarn add serverless-aws-static-file-handler --dev`)
