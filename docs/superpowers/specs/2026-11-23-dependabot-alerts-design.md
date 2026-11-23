# Dependabot alerts — design

Date: 2026-11-23

## Why

The repository has 171 open Dependabot alerts: 105 against `package-lock.json`
(4 critical, 43 high) and 66 against `legacy/package-lock.json` (3 critical,
24 high). Fifteen Dependabot pull requests are open, each bumping one package
against a base that has since moved; the newest `next` one targets 16.2.6 while
the alerts now need 16.4.5.

## Goals

- No open Dependabot alert on either manifest once this is merged.
- Both apps behave as they do today.

## Non-goals

- Major upgrades that no alert asks for: eslint 10, typescript 7, express 5,
  node-schedule 2.
- Adding a `.github/dependabot.yml`.
- Reviving the legacy Brent oil job.

## Anti-goals

- Dismissing an alert while the vulnerable package is still installed.
- `npm audit fix --force`. For legacy it proposes downgrading `jade` to 1.9.2.

## Approaches

1. **Merge the fifteen Dependabot pull requests.** They conflict with each other
   on the lockfiles, several are already out of date, and none of them can fix
   `jade` or `request`. Rejected.
2. **One pull request that refreshes both lockfiles and makes the few manual
   changes.** Chosen: it is the only route that reaches zero, and the manual
   part is small.
3. **Retire the legacy app or dismiss its alerts.** The legacy app is live and
   was repaired in pull request 35. Not what was asked. Rejected.

## Root app (`package.json`, `package-lock.json`)

A lockfile refresh inside the existing ranges clears every alert but one. Tried
on a scratch copy: `npm audit` goes from 19 findings (1 critical, 13 high) to
the single minimatch chain.

- Raise the floors of the direct dependencies that have alerts, so the manifest
  itself excludes the vulnerable versions: `next` and `eslint-config-next` to
  `^16.4.6`, `axios` to `^1.21.1`, `postcss` to `^8.5.33`.
- `overrides.minimatch` moves from `^10.2.1` to `^11.0.1`. Alert 289 covers
  `>= 7.0.0, < 11.0.1`; the 10.x line has no patched release. minimatch 11 needs
  Node 20 or 22+, which Next.js 16 already requires.
- Everything else (sharp 0.35.5, nanoid, js-yaml, brace-expansion, form-data,
  follow-redirects, flatted, esbuild and the rest) is transitive and comes with
  the refresh.

## Legacy app (`legacy/`)

In-major bumps clear most of it:

| Package | From | To |
|---|---|---|
| `express` | `~4.13.1` | `^4.22.3` |
| `body-parser` | `~1.13.2` | `^1.20.9` |
| `cookie-parser` | `~1.3.5` | `^1.4.7` |
| `axios` | `^0.21.1` | `^1.21.1` (same line as the root app) |
| `lodash`, `morgan`, `debug`, `node-schedule`, `express-http-proxy` | unchanged ranges | lockfile refresh |

Three packages cannot be bumped:

- **`request`** is deprecated and its SSRF alert has no patched version. Its
  only caller is `worker.updateBrentOil`, and both places in `legacy/app.js`
  that would run it are commented out. Delete the function,
  the two commented-out lines that mention it, and the dependency.
  `worker.data.oilStats` stays `{}` and `/investing/brentOil` keeps answering
  `{}`, because the page still calls it.
- **`serve-favicon`** is required in `legacy/app.js` and never used (the
  `app.use` line is commented out; `express.static` already serves
  `public/favicon.ico`). Delete the require and the dependency.
- **`jade`** 1.11.0 is the last release and pulls in the vulnerable
  `constantinople`, `uglify-js`, `clean-css` and `transformers`. Replace it with
  its successor `pug` `^3.0.4`: rename `legacy/views/*.jade` to `*.pug` and set
  the view engine to `pug`. The three templates use no syntax that pug 3
  dropped.

The legacy deploy workflow installs with Node 18, so every package the new
lockfile resolves must accept Node 18.

## Verification

- Root: `npm ci`, `npm audit` reports 0, `npm run lint`, `npm test`,
  `npm run build`.
- Legacy: `npm ci`, `npm audit` reports 0, `npm test`, then start the server and
  request `/`, `/setfx/stats`, `/investing/brentOil?callback=x` and a missing
  path, comparing the home page markup with what `jade` renders today.
- After merge: the open alert count on GitHub is 0, both deploy workflows are
  green, and the superseded Dependabot pull requests are closed.

## Left to the builder

- If minimatch 11 breaks an ESLint plugin, stop and report it. Do not dismiss
  the alert and do not loosen the override.
