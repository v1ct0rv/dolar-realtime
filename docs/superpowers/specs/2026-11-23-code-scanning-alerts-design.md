# Code scanning alerts — design

Date: 2026-11-23

## Why

GitHub code scanning (CodeQL default setup) reports four open alerts on `master`. All four are the same rule,
`actions/missing-workflow-permissions` (medium): a workflow job runs without an explicit `permissions:` block.
The repository's default workflow permission is `write`, so each of those jobs gets a `GITHUB_TOKEN` that can
write contents, packages, deployments and more, far beyond what the job does.

| Alert | File | Job |
|---|---|---|
| #1 | `.github/workflows/azure-static-web-apps-salmon-ground-0be8b030f.yml` | `build_and_deploy_job` |
| #4 | `.github/workflows/azure-static-web-apps-salmon-ground-0be8b030f.yml` | `close_pull_request_job` |
| #3 | `.github/workflows/legacy-webapp-deploy.yml` | `build-and-deploy` |
| #2 | `.github/workflows/collect-data.yml` | `collect` |

The JavaScript/TypeScript analysis reports no alerts.

## Goals

- All four alerts close as fixed after the change reaches `master`.
- Each remaining job holds only the token permissions it uses.
- Both deployments keep working, including the preview-site comment on pull requests.

## Non-goals

- Changing the repository's default workflow permission from `write` to `read`. It is a repository setting,
  not needed to close the alerts, and the explicit blocks make it irrelevant for these workflows.
- Pinning actions to commit SHAs, or upgrading `actions/checkout@v3`. No alert asks for it.
- Dismissing alerts. They are closed by fixing or removing the flagged code.

## Anti-goals

- A permission set so tight that a deployment or the preview comment silently stops working.

## Approaches

1. **Explicit least-privilege `permissions:` in each workflow.** Chosen. It is what the rule asks for, it is
   visible next to the job it governs, and it survives a change of the repository default.
2. **Flip the repository default to `read` only.** One setting, no file change, but CodeQL still flags a job
   with no explicit block, so the alerts stay open. Rejected.
3. **Dismiss the alerts as "won't fix".** Closes them without reducing what the tokens can do. Rejected.

## Decisions

Chosen by the maintainer:

- **`collect-data.yml` is deleted**, not patched. It is in state `disabled_inactivity`, its last successful run
  was 2026-07-10, and a run has been queued since 2026-07-13. The Azure Logic App in `infra/` is the cron.
  Deleting it closes alert #2 and removes a shell program embedded in the workflow. The manual "Run workflow"
  button goes away; the `curl` command in `CLAUDE.md` still triggers a collection by hand.

Calls made while writing this, open to correction:

- **Static Web Apps workflow:** workflow-level `permissions: contents: read`, which covers
  `close_pull_request_job` (it passes no `repo_token` and checks nothing out). `build_and_deploy_job` gets its
  own block, `contents: read` and `pull-requests: write`. The write is needed because the deploy action uses
  `repo_token` to post the "Your stage site is ready" comment on the pull request, as `github-actions[bot]`.
  A job-level block replaces the workflow-level one, so `contents: read` is repeated there.
- **Legacy deploy workflow:** workflow-level `permissions: contents: read`. The job checks out, installs, and
  deploys with a publish profile; it never uses the GitHub token beyond the checkout.
- `SETUP_COMPLETE.md` keeps its "Option 3: GitHub Actions" snippet. It is a generic list of ways to schedule
  the cron, not a description of the deleted file.
- The run queued since 2026-07-13 is left alone. It belongs to a disabled workflow and cannot start.

## Verification

- `actionlint` passes on both remaining workflow files.
- On the pull request: the Static Web Apps build job succeeds, its log shows a token limited to
  `Contents: read`, `Metadata: read` and `PullRequests: write`, and the stage-site comment is still posted.
- After the merge: the close job succeeds with the read-only token, the production deploy succeeds, and
  `code-scanning/alerts?state=open` returns nothing.
- The legacy deploy only runs on a push that touches `legacy/**`, so this change does not exercise it. Its
  first run with the new block is the next legacy change.

## Left to the builder

Nothing beyond the YAML placement. Lines stay at 120 columns or fewer (the repository's PR gate).
