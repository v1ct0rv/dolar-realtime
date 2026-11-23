# Security Policy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `SECURITY.md` so that a reporter knows where to send a vulnerability and what to expect.

**Architecture:** One hand-written Markdown file at the repository root. No code, no settings change: GitHub
picks the file up from the default branch and links it from the Security tab.

**Tech Stack:** Markdown, GitHub private vulnerability reporting (already enabled).

**Spec:** `docs/superpowers/specs/2026-11-23-security-policy-design.md`

## Global Constraints

- Reporting channel, exact: `https://github.com/v1ct0rv/dolar-realtime/security/advisories/new`. No email address
  anywhere in the file.
- Response wording is a target, not a guarantee: "aim to acknowledge within 7 days".
- Both apps are listed as supported, with these addresses:
  - Next.js app, repository root: `https://salmon-ground-0be8b030f.4.azurestaticapps.net/`
  - Legacy Express app, `legacy/`: `https://dolar.victorv.co/`
- Disclosure window, exact: until a fix is deployed or 90 days, whichever comes first.
- No safe-harbour clause, no bounty, no PGP key.
- The file does not describe any specific weakness of the live deployment.
- Added lines stay at 120 columns or fewer (the repository's PR gate).

## Review Focus

1. **A reporter without context follows the link:** the advisory link must be the repository's own
   `/security/advisories/new`, and private vulnerability reporting must be enabled, or the link shows a 404.
   Checked in Task 1, Step 2.
2. **A reporter tests against production:** the file must tell them to use a local copy and not to scan the
   live sites. Checked in Task 1, Step 2.
3. **The wrong app is named for an address:** `dolar.victorv.co` is the legacy app, not the Next.js one.
   Checked in Task 1, Step 2.
4. **GitHub does not recognise the file:** after merge, `isSecurityPolicyEnabled` must be `true`. Checked in
   Task 1, Step 4.

---

### Task 1: `SECURITY.md`

**Files:**
- Create: `SECURITY.md`

- [ ] **Step 1: Write `SECURITY.md`** with these sections, in this order, using the decisions in the spec:
  `# Security Policy` (one paragraph: personal project, best effort), `## Supported versions` (table of the two
  apps, plus one line that tags and forks get no fixes), `## Reporting a vulnerability` (no public issues, the
  link, what to include), `## What to expect` (7-day target, severity-based fix timing, advisory and credit,
  disclosure window), `## Scope` (in scope, out of scope), `## Testing` (local copy, no scanning, minimal data
  access).

- [ ] **Step 2: Check the file**

```bash
awk 'length > 120 { print FILENAME ":" FNR ": " length; bad = 1 } END { exit bad }' SECURITY.md
grep -c 'https://github.com/v1ct0rv/dolar-realtime/security/advisories/new' SECURITY.md
grep -ciE '@[a-z0-9-]+\.[a-z]{2,}|safe harbou?r|bounty' SECURITY.md
grep -n 'dolar.victorv.co' SECURITY.md
grep -ci 'local' SECURITY.md
gh api repos/v1ct0rv/dolar-realtime/private-vulnerability-reporting --jq .enabled
```

Expected, in order: no output and exit 0; `1` or more; `0`; the matching line is the legacy app's row; `1` or
more; `true`.

- [ ] **Step 3: Commit, push, open the pull request**

```bash
git add SECURITY.md
git commit -m "docs: add a security policy"
```

- [ ] **Step 4: After the merge, confirm GitHub recognises the policy**

```bash
gh repo view v1ct0rv/dolar-realtime --json isSecurityPolicyEnabled,securityPolicyUrl
```

Expected: `"isSecurityPolicyEnabled": true` and a `securityPolicyUrl` ending in `/security/policy`.
