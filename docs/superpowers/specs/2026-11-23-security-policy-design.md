# Security policy — design

Date: 2026-11-23

## Why

The repository is public and has no security policy: GitHub reports `isSecurityPolicyEnabled: false`, and the
Security tab tells visitors nothing. Private vulnerability reporting is already enabled, so a private channel
exists but is not advertised. Someone who finds a problem today has no stated way to report it other than a
public issue.

## Goals

- A `SECURITY.md` that tells a reporter where to send a report, what to put in it, and what happens next.
- GitHub recognises it: the Security tab shows the policy and `isSecurityPolicyEnabled` is `true`.

## Non-goals

- Fixing any vulnerability. This adds a document only.
- A contact email, a PGP key, a bug bounty, or a `security.txt` on either site.
- Changing repository settings. Private vulnerability reporting, Dependabot security updates, secret scanning
  and push protection are already on.
- A legal safe-harbour clause. Nobody asked for one and it is a legal promise.

## Anti-goals

- Promising a response time the maintainer cannot keep. This is a one-person project.
- Publishing the maintainer's email address.
- Describing a specific weakness of the live deployment in a public file.

## Approaches

1. **`SECURITY.md` at the repository root, hand-written.** Chosen. GitHub looks for the file at the root, in
   `.github/` or in `docs/`; the root is where the `LICENSE` and `README.md` already are and where a visitor
   looks first.
2. **`.github/SECURITY.md`.** Works the same for GitHub, but `.github/` here holds only workflows and the file
   is less visible when browsing. Rejected.
3. **GitHub's "Set up a security policy" template.** It is built around a table of numbered release lines. This
   project has one tag (`v1.0.0`) and deploys both apps from `master`, so the table would be wrong. Rejected.

## Decisions

Chosen by the maintainer:

- **Channel:** GitHub private vulnerability reporting only. The link is
  `https://github.com/v1ct0rv/dolar-realtime/security/advisories/new`. No email address.
- **Response:** best effort. Aim to acknowledge within 7 days; fix timing depends on severity. Worded as a
  target, not a guarantee.
- **Coverage:** both apps are supported.

Calls made while writing this, open to correction:

- Written in English, like `README.md`.
- "Supported" means what is deployed from `master`. The `v1.0.0` tag and forks get no fixes.
- The two apps are listed with their live addresses, each checked on 2026-11-23 (HTTP 200):
  - Next.js app, repository root: `https://salmon-ground-0be8b030f.4.azurestaticapps.net/`
  - Legacy Express app, `legacy/`: `https://dolar.victorv.co/` (also `https://dolar-webapp.azurewebsites.net/`)
- Coordinated disclosure: the reporter is asked to keep details private until a fix is deployed or 90 days have
  passed, whichever comes first. Credit in the published advisory if the reporter wants it.
- In scope, by name: authentication of `POST /api/cron/collect-data`; the public API routes under `/api/` and
  the legacy `/setfx/` routes (injection, exposure of data that should not be public); cross-site scripting in
  either UI; secrets committed to the repository or returned in a response; the GitHub Actions workflows.
- Out of scope: vulnerabilities in SET-ICAP's own services; volumetric denial of service and missing rate
  limits; anything that needs access to the maintainer's Azure, MongoDB or GitHub accounts; scanner output and
  missing headers with no demonstrated impact; a vulnerable dependency with no reachable impact (Dependabot
  covers those); wrong or stale market data, which is an ordinary bug for a public issue.
- Testing guidance: reproduce against a local copy (`docker-compose.yml`, `npm run dev`) rather than the live
  sites, no high-volume scanning of the live sites, and no access to or change of data beyond what proves the
  problem.

## Left to the builder

The wording, within the decisions above. Lines stay at 120 columns or fewer (the repository's PR gate).
