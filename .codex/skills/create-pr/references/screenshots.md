# Screenshots for a PR

Loaded on demand by [create-pr](../SKILL.md) step 4, and only when the diff
actually renders. A backend-only PR never needs this file, and neither does a
human who would rather grab the shots themselves — in that case take their images
and captions and go straight to the body.

## 4. Capture with Playwright

Files go to the scratchpad or `/tmp/pr-screenshots/`. **Never** `git add` an image.

This repo has no Playwright and no test suite of its own — and no sibling test repo
covers these microapps. Work down this ladder and stop at the first rung that
works; say in chat which rung you used, because it determines whether the
screenshot is authenticated:

### Rung A — local Playwright, run from the scratchpad

Run Playwright without adding it to this repo:

```bash
cd <scratchpad>
pnpm dlx playwright@latest install chromium     # cached, not a repo dependency
```

Write the script in the scratchpad, never in the repo. Start the changed app on its
own hardcoded port — each app pins its own, there is no shared port mechanism:

| App                      | Command                                    | Port(s)                     |
| ------------------------ | ------------------------------------------ | --------------------------- |
| `attendance`             | `pnpm --filter attendance dev`             | 3101 (Next.js)              |
| `quotation-generator`    | `pnpm --filter quotation-generator dev`    | 3102 (Vite), 3103 (server)  |
| `client-brief-generator` | `pnpm --filter client-brief-generator dev` | Vite default, 3105 (server) |

Reuse a healthy running server; never start a second one on the same port.

- **Public surface** (a `packages/ui` component in isolation, a route that renders
  without platform scope): capture directly, no session needed.
- **Authenticated surface**: these apps get their session from the AS2 platform.
  `proxy.ts` and `next.config.ts` need `AS2_DEV_GATEWAY_URL` set or the app throws
  at startup, and the dev login flow needs the `AS2_DEV_*` vars from the app's
  local `.env`. If the user's `.env` already has them, the dev login carries the
  session; if not, ask them once for a test account for the running environment and
  keep the credentials out of the repo and out of the PR body — scratchpad or an
  env var, nothing written to a tracked file. If they have no account to give, drop
  to rung B.

Never add `@playwright/test` to any `package.json` here. If a manifest or lockfile
changes, restore it before finishing.

### Rung B — caption-only

No way to reach the surface. Capture nothing, write the captions, and tell the user
which ones need a manual attach in the GitHub UI. This is a normal outcome, not a
failure to hide.

Never screenshot a login screen and present it as the change, and never dress up
rung B as if a capture happened.

### Rules for the images themselves

- Realistic viewport. One image per distinct state, not per file changed.
- Drive the UI so the **new** state is visible — filled form, open dialog, the row
  that now renders differently.
- Open every file and look at it before uploading. A blank page, a spinner, or an
  error toast is not a screenshot of the change.
- Write the caption **before** uploading. It names the route and the state, never
  "Screenshot 1".

## 5. Upload, or leave captions

GitHub user-attachments only — no committed images, no gist, no third-party host:

```bash
repo="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
repo_id="$(gh api "repos/$repo" --jq .id)"

url="$(
  gh api --method POST \
    "https://uploads.github.com/user-attachments/assets?name=<filename>&content_type=image/png&repository_id=$repo_id" \
    -H "Content-Type: image/png" \
    --input "<local-path>" \
    --jq .url
)"
```

Upload failed or unavailable → **do not block the PR**. Drop the `![...]()` line,
keep the caption blockquote, and tell the user which captions still need a manual
attach in the GitHub UI.
