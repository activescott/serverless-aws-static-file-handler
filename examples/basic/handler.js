"use strict"
const path = require("path")
const StaticFileHandler = require("serverless-aws-static-file-handler")
const clientFilesPath = path.join(__dirname, "./data-files/")
const fileHandler = new StaticFileHandler(clientFilesPath)

module.exports.root = async (event, context) => {
  event.path = "index.html" // forcing a specific page for this handler; ignore requested path
  return fileHandler.get(event, context)
}

module.exports.v2_root = async (event, context) => {
  event.rawPath = "index.html" // forcing a specific page for this handler; ignore requested path
  return fileHandler.get(event, context)
}

module.exports.binary = async (event, context) => {
  if (!event.path.startsWith("/binary/")) {
    throw new Error(`[404] Invalid filepath for this resource`)
  }
  return fileHandler.get(event, context)
}

module.exports.v2_binary = async (event, context) => {
  if (!event.rawPath.startsWith("/v2/binary/")) {
    throw new Error(`[404] Invalid filepath for this resource`)
  }
  return fileHandler.get(event, context)
}
