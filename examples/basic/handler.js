"use strict"
const path = require("path")
const StaticFileHandler = require("serverless-aws-static-file-handler")
const clientFilesPath = path.join(__dirname, "./data-files/")
const fileHandler = new StaticFileHandler(clientFilesPath)

module.exports.root = async (event, context) => {
  event.path = "index.html" // forcing a specific page for this handler; ignore requested path
  return fileHandler.get(event, context)
}

module.exports.binary = async (event, context) => {
  if (!event.path.startsWith("/binary/")) {
    throw new Error(`[404] Invalid filepath for this resource: ${fname}`)
  }
  return fileHandler.get(event, context)
}
