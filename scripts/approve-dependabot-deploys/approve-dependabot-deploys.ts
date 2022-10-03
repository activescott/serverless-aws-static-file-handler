// https://docs.github.com/en/rest/actions/workflow-runs#list-workflow-runs-for-a-repository
// https://docs.github.com/en/rest/actions/workflow-runs#review-pending-deployments-for-a-workflow-run
// https://docs.github.com/en/rest/deployments/statuses
// https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#status
// https://github.com/octokit/core.js

import { writeFile, mkdir} from "node:fs/promises"
import { Octokit } from "octokit"
import { Endpoints } from "@octokit/types"
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

async function dumpResponse(method: "GET" | "POST" | "PUT", pathAfterRepo: string, response: Promise<any>): Promise<void> {
  pathAfterRepo = pathAfterRepo.startsWith("/") ? pathAfterRepo : "/" + pathAfterRepo
  pathAfterRepo = pathAfterRepo.replace(/\//g, "-")
  await mkdir("./responses", { recursive: true })
  await writeFile(
    `./responses/${method}-repos-${baseOptions.owner}-${baseOptions.repo}${pathAfterRepo}.json`,
    JSON.stringify(await response, null, "  ")
  )
}

async function getWaitingWorkflowRuns(): Promise<Endpoints["GET /repos/{owner}/{repo}/actions/runs"]["response"]> {
  const runs = octokit.request("GET /repos/{owner}/{repo}/actions/runs", {
    ...baseOptions,
    status: "waiting",
  })
  await dumpResponse("GET", `actions/runs`, runs)
  return runs
}

async function getPendingDeploymentsForRun(run_id: number) {  
  const deploys = octokit.request(
    "GET /repos/{owner}/{repo}/actions/runs/{run_id}/pending_deployments",
    {
      ...baseOptions,
      run_id: run_id,
    }
  )
  await dumpResponse("GET", `actions/runs/${run_id}/pending_deployments`, deploys)
  return deploys
}

async function approveDeployment(run, environment) {
  console.log(
    `Approving deployment to ${environment.name} triggered by ${run.actor.login} for run ${run.display_title}...`
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
    `SUCCESS approving deployment to ${environment.name} for run ${run.display_title}.`
  )
}

const waitingRunsResponse = await getWaitingWorkflowRuns()
const runs = waitingRunsResponse.data.workflow_runs

const deploysToApprove = runs
  .map(async (run) => {
    // ID for login "dependabot[bot]"
    const DEPENDABOT_USER_ID = 49699333
    const ACTIVESCOTT_USER_ID = 213716
    const approvableActors = [DEPENDABOT_USER_ID, ACTIVESCOTT_USER_ID]
    if (!approvableActors.includes(run.actor.id)) {
      console.log(`Run ${run.id} is pending approval, but from an unknown actor: ${run.actor.login} (${run.actor.id})`)
      return null
    }
    console.log(`A run created by ${run.actor.login} is awaiting deployment: ${run.display_title}. Confirming that it is an expected environment and this user has permission to approve...`)
    const deploys = await getPendingDeploymentsForRun(run.id)
    const approvable = deploys.data.filter((deploy) => {
      const approvableEnvironments = ["aws"]
      if (!approvableEnvironments.includes(deploy.environment.name)) {
        console.log(`Environment '${deploy.environment.name}' not approvable for run ${run.display_title}.`)
        return false
      }
      if (!deploy.current_user_can_approve) {
        console.log(`The current user does not have permission to approve deployment for environment '${deploy.environment.name}'.`)
        return false
      }
      return true
    })
    if (approvable.length > 0) {
      const deploy = approvable[0]
      // console.log(`Found pending deploy for run ${run.id}:`, deploy)
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
