# Code Scanning Alerts Implementation Plan

> **Automation safety note:** This plan is documentation, not an executable instruction source. Any agent/tool use
> must be approved by a human reviewer and only proceed after provenance checks against trusted specs/policies.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the four open `actions/missing-workflow-permissions` alerts by giving every workflow job an
explicit, minimal token.

**Architecture:** Two workflows gain a `permissions:` block; the third, already disabled and replaced by the
Azure Logic App, is deleted. No application code changes.

**Tech Stack:** GitHub Actions YAML, CodeQL default setup, `actionlint`.

**Spec:** `docs/superpowers/specs/2026-11-23-code-scanning-alerts-design.md`

## Global Constraints

- Static Web Apps workflow: workflow-level `contents: read`; `build_and_deploy_job` has `contents: read` and
  `pull-requests: write`; `close_pull_request_job` has no block of its own.
- Legacy deploy workflow: workflow-level `contents: read`.
- `.github/workflows/collect-data.yml` is deleted. Nothing else about the cron changes.
- No action version changes, no SHA pinning, no repository setting changes, no alert dismissals.
- Added lines stay at 120 columns or fewer (the repository's PR gate).

## Review Focus

1. **The preview comment stops appearing:** the build job's token must still be able to comment on the pull
   request. Checked in Task 1, Step 5.
2. **Checkout fails in the build job:** a job-level block replaces the workflow-level one, so `contents: read`
   must be listed again next to `pull-requests: write`. Checked in Task 1, Steps 2 and 5.
3. **The close job fails when the pull request closes:** it runs with the read-only workflow-level token.
   Checked in Task 1, Step 6.
4. **An alert stays open:** deleting a file must close its alert on the next `master` analysis, as must the
   two edits. Checked in Task 1, Step 6.
5. **The legacy deploy breaks later:** this change does not trigger it (`paths: legacy/**`). `actionlint` is
   the only check here; its first real run is the next legacy change. Checked in Task 1, Step 4.

---

### Task 1: Workflow permissions

**Files:**
- Modify: `.github/workflows/azure-static-web-apps-salmon-ground-0be8b030f.yml`
- Modify: `.github/workflows/legacy-webapp-deploy.yml`
- Delete: `.github/workflows/collect-data.yml`

- [ ] **Step 1: Static Web Apps workflow, workflow level.** Between the `on:` block and `jobs:`, add:

```yaml
permissions:
  contents: read
```

- [ ] **Step 2: Static Web Apps workflow, build job.** In `build_and_deploy_job`, after `name:`, add:

```yaml
    permissions:
      contents: read
      pull-requests: write # the deploy action posts the stage-site URL as a PR comment
```

- [ ] **Step 3: Legacy deploy workflow.** Between the `on:` block and `jobs:`, add the same block as Step 1.
  Then `git rm .github/workflows/collect-data.yml`.

- [ ] **Step 4: Check the files**

```bash
actionlint .github/workflows/*.yml
ls .github/workflows
git diff --cached --stat; git diff --stat
```

Expected: `actionlint` prints nothing about permissions or syntax and the directory lists two files. Findings
about lines this change did not touch are not in scope.

- [ ] **Step 5: Commit, push, open the pull request, and check its run**

```bash
git commit -am "ci: set least-privilege workflow permissions"
gh pr checks <n>
gh run view <run-id> --log | grep -A6 'GITHUB_TOKEN Permissions'
gh api repos/v1ct0rv/dolar-realtime/issues/<n>/comments --jq '.[].body'
```

Expected: the build job and both CodeQL analyses pass; the token lists only `Contents: read`,
`Metadata: read` and `PullRequests: write`; a "Your stage site is ready" comment is present.

- [ ] **Step 6: After the merge, confirm the result**

```bash
gh run list --workflow 'Azure Static Web Apps CI/CD' --limit 2
gh api 'repos/v1ct0rv/dolar-realtime/code-scanning/alerts?state=open' --jq length
```

Expected: the close job and the `master` deploy both succeeded, and the alert count is `0` once the CodeQL
analysis of `master` has finished.
