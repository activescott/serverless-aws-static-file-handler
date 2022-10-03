// https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
// https://docs.github.com/en/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run
// https://docs.github.com/en/rest/deployments/statuses
// https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#status
// https://github.com/octokit/core.js

import fsPromises from "fs/promises"
import { Octokit } from "octokit"
import * as dotenv from "dotenv"
dotenv.config()

if (!process.env.GITHUB_TOKEN) {
  throw new Error("You must have the `GITHUB_TOKEN` environment variable specified with a github personal access token.")
}

const baseOptions = {
  owner: "activescott",
  repo: "serverless-aws-static-file-handler",
}

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
})

/**
 *
 * @returns Promise<
 */
async function getWaitingWorkflowRuns() {
  try {
    const data = await fsPromises.readFile("./runResponse.json", {
      encoding: "utf-8",
    })
    const parsed = JSON.parse(data)
    console.log("returnning cached data!")
    return parsed
  } catch (err) {
    // ok, do a normal request
    // console.error("failed to read cached data:", err)
  }
  return octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
    ...baseOptions,
    status: "waiting",
  })
}

async function getPendingDeploymentsForRun(runID) {
  const deploys = octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments",
    {
      ...baseOptions,
      run_id: runID,
    }
  )
  await fsPromises.writeFile(
    `./pendingDeploymentsForRun_${runID}.json`,
    JSON.stringify(await deploys, null, "  ")
  )
  return deploys
}

async function approveDeployment(run, environment) {
  console.log(
    `Approving deployment to ${environment.name} for run ${run.display_title}...`
  )
  await octokit.request(
    "POST /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments",
    {
      ...baseOptions,
      run_id: run.id,
      environment_ids: [environment.id],
      state: "approved",
      comment: "approved by approve-dependabot-deploys script",
    }
  )
  console.log(
    `Approving deployment to ${environment.name} for run ${run.display_title} succeeded.`
  )
}

const runResponse = await getWaitingWorkflowRuns()
const runs = runResponse.data.workflow_runs

// ID for login "dependabot[bot]"
const DEPENDABOT_USER_ID = 49699333
const dependabotRuns = runs.filter((run) => run.actor.id === DEPENDABOT_USER_ID)

console.log(`Found ${dependabotRuns.length} waiting runs from dependabot...`)

const deploysToApprove = dependabotRuns
  .map(async (run) => {
    const deploys = await getPendingDeploymentsForRun(run.id)
    const approvable = deploys.data.filter((deploy) => {
      return (
        deploy.current_user_can_approve && deploy.environment.name === "aws"
      )
    })
    if (approvable.length > 0) {
      const deploy = approvable[0]
      //console.log(`Found pending deploy for run ${run.id}:`, deploy)
      return {
        environment: deploy.environment,
        run,
      }
    } else {
      return null
    }
  })
  .filter((deploy) => deploy !== null)

console.log(`Found ${deploysToApprove.length} deploys to approve.`)

for await (const deploy of deploysToApprove) {
  await approveDeployment(deploy.run, deploy.environment)
}

function traceRuns(runs) {
  runs.forEach((run) => {
    console.log("Found dependabot run:", {
      display_title: run.display_title,
      actor: {
        id: run.actor.id,
        login: run.actor.login,
      },
    })
  })
}
