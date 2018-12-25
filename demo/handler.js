"use strict"
const path = require("path")
const StaticFileHandler = require("serverless-aws-static-file-handler")
const clientFilesPath = path.join(__dirname, "./data-files/")
const fileHandler = new StaticFileHandler(clientFilesPath)

module.exports.png = async (event, context) => {
  console.log("event:", event)
  event.path = "png.png"
  return fileHandler.get(event, context)
}

module.exports.jpg = async (event, context) => {
  console.log("event:", event)
  event.path = "jpg.jpg"
  return fileHandler.get(event, context)
}

module.exports.binary = async (event, context) => {
  console.log("event:", event)
  if (!event.path.startsWith("/binary/")) {
    throw new Error(`[404] Invalid filepath for this resource: ${fname}`)
  }
  //const fname = path.join(__dirname, event.path)
  return fileHandler.get(event, context)
}

module.exports.html = async (event, context) => {
  console.log("event:", event)
  event.path = "index.html" // force a specific page for this handler; ignore requested path
  return fileHandler.get(event, context)
}
