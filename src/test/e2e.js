"use strict"

const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
chai.use(chaiAsPromised)
const expect = chai.expect
const path = require("path")
const { spawnSync } = require("child_process")

describe("e2e", function () {
  // npm install & serverless loading a project is pretty slow (apparently damn slow on node8: https://travis-ci.org/activescott/serverless-aws-static-file-handler/jobs/632405805?utm_medium=notification&utm_source=github_status)
  this.timeout(60000)

  it("should load plugin", function () {
    // does a simple load of a plugin per https://github.com/activescott/serverless-aws-static-file-handler/issues/32
    const proc = loadServerless("../../test-files/basic-project")
    expect(proc).to.haveOwnProperty("status", 0)
  })
})

function loadServerless(projectDir) {
  // serverless print will load all the plugins and fail if they fail to load
  const cwd = path.join(__dirname, projectDir)
  // first run npm install
  console.log("Running npm install for project at '" + projectDir + "'...")
  const npmProc = spawnSync("npm", ["install"], {
    cwd: cwd,
  })
  if (npmProc.status !== 0) {
    console.error(
      "npm install failed for project '" + projectDir + "'.\nsdtout:",
      npmProc.stdout.toString(),
      "\n stderr:",
      npmProc.stderr.toString()
    )
    return npmProc
  }
  console.log(
    "Running npm install for project at '" + projectDir + "' complete."
  )
  const slsProc = spawnSync("./node_modules/.bin/serverless", ["print"], {
    cwd: cwd,
  })
  if (slsProc.status !== 0) {
    console.error("proc.stdout", slsProc.stdout.toString())
  }
  return slsProc
}
