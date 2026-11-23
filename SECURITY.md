# Security Policy

dolar-realtime is a personal project with one maintainer. Security reports are welcome and are handled on a
best-effort basis.

## Supported versions

Both apps deploy from `master`, so the supported version is whatever is live now.

| App                | Code            | Live at                                                  | Supported |
| ------------------ | --------------- | -------------------------------------------------------- | --------- |
| Next.js app        | repository root | <https://salmon-ground-0be8b030f.4.azurestaticapps.net/> | Yes       |
| Legacy Express app | `legacy/`       | <https://dolar.victorv.co/>                              | Yes       |

Tagged releases such as `v1.0.0`, and forks, do not receive fixes.

## Reporting a vulnerability

Please do not report a security problem in a public issue, pull request or discussion.

Report it privately through GitHub:
[Report a vulnerability](https://github.com/v1ct0rv/dolar-realtime/security/advisories/new).
The same form is under the repository's **Security** tab. Only you and the maintainer can see the report.

A useful report says:

- which app is affected, and the URL or file
- the steps to reproduce it, or a proof of concept
- what an attacker could do with it
- whether you want to be credited, and under what name

## What to expect

- I aim to acknowledge a report within 7 days. This is a target, not a guarantee.
- After that I will tell you whether I can reproduce it and how serious I think it is.
- How fast a fix lands depends on severity. A problem that exposes the database or lets someone write data
  comes before one with limited impact.
- Once the fix is deployed I publish a GitHub security advisory, and credit you if you asked for that.

Please keep the details private until a fix is deployed or 90 days have passed since your report, whichever
comes first.

## Scope

In scope:

- authentication of the data collection endpoint, `POST /api/cron/collect-data`
- the public API routes under `/api/` and the legacy `/setfx/` and `/investing/` routes: injection, or
  returning data that should not be public
- cross-site scripting in either app's pages
- secrets committed to this repository or returned in a response
- the GitHub Actions workflows in `.github/workflows/`

Out of scope:

- vulnerabilities in SET-ICAP's own services; report those to SET-ICAP
- volumetric denial of service, and missing rate limits
- anything that needs access to the maintainer's Azure, MongoDB or GitHub accounts
- scanner output or missing HTTP headers with no demonstrated impact
- a vulnerable dependency that cannot be reached in a way that matters; Dependabot already tracks those
- wrong or stale market data, which is an ordinary bug: open a public issue

## Testing

- Reproduce against a local copy, not the live sites. `docker compose up -d` starts MongoDB and `npm run dev`
  starts the Next.js app.
- Do not run high-volume or automated scans against the live sites.
- Do not read or change more data than you need to show the problem.
