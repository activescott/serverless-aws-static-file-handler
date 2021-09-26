"use strict"
const path = require("path")
const StaticFileHandler = require("serverless-aws-static-file-handler")
const clientFilesPath = path.join(__dirname, "./data-files/")
const fileHandler = new StaticFileHandler(clientFilesPath)

// require.context triggers file-loader to copy the data-files directory. see https://webpack.js.org/guides/dependency-management/#requirecontext
require.context("./data-files")

export const html = async (event, context) => {
  event.path = "index.html" // forcing a specific page for this handler; ignore requested path
  return fileHandler.get(event, context)
}

export const png = async (event, context) => {
  event.path = "png.png"
  return fileHandler.get(event, context)
}

export const notfound = async (event, context) => {
  event.path = "notfound.html"
  return fileHandler.get(event, context)
}
