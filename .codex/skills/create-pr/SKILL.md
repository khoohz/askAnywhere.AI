---
name: create-pr
description: Open a GitHub PR for the commits already pushed on this branch. Asks for the target base branch and the ticket up front, then writes the body — a Changes / Screenshots / Tickets feature PR, or a Release / Included / Tickets release PR when the base is main. Captures Playwright screenshots for frontend changes. Use when the user says "create a PR", "open a PR", "raise a PR", or /create-pr.
user-invocable: true
---

# Create PR

One PR for the branch that is already committed. Ask two things, gather the rest,
open it.

This skill does not review and does not commit. Findings belong to
[code-review](../code-review/SKILL.md); commits belong to
[review-and-commit](../review-and-commit/SKILL.md). If the tree is dirty, say so
and stop — do not fold uncommitted work into the PR.

## Two Kinds Of PR

The base branch decides the body. Establish it first, because everything else
follows from it:

| Base          | Kind                                          | Body                                        | Screenshots           |
| ------------- | --------------------------------------------- | ------------------------------------------- | --------------------- |
| `main`        | **Release** — promoting an integration branch | `# Release` / `# Included` / `# Tickets`    | Never                 |
| anything else | **Feature**                                   | `# Changes` / `# Screenshots` / `# Tickets` | When the diff renders |

A release PR is a list of what is shipping, not a description of a change — the
individual changes were already reviewed on their own PRs. Never put `# Changes`
or screenshots on one.

## Ask First, Before Anything Else

Two questions, in one message, before inspecting anything:

1. **Base branch.** Never assume. This repo's integration branch is `staging`
   (feature branches merge there; `staging` is then promoted to `main`). **There is
   no `dev` branch here** — do not offer one. Offer `staging`, `main`, and let them
   name another. Verify the ref exists:

   ```bash
   git fetch origin --prune
   git rev-parse --verify origin/<base>
   ```

   Missing ref → ask again. Never create a base branch, never silently substitute
   one.

2. **The ticket — which one depends on the base.**
   - Base is **not** `main`: "Is there a ClickUp ticket for this?" If the branch is
     named `CU-<id>_…`, propose the derived link and ask them to confirm rather
     than asking cold:

     ```
     Branch is CU-86eyfcypj_QR-Attendance-Change-Request — ticket https://app.clickup.com/t/86eyfcypj ?
     ```

   - Base **is** `main`: ask for the **release code and release ticket** instead —
     the version or release identifier this promotion ships under, and its ticket
     if there is one. A per-task ClickUp link is the wrong thing here; the tasks
     are already listed on the PRs in `# Included`.

   Either way: no ticket → the `# Tickets` section is omitted entirely. Do not
   invent a link and do not leave a `# Tickets` heading with `N/A` under it.

Everything after this runs without further prompting, except an unpushed commit
(step 2) and a dirty tree.

## Workflow

```
Create PR:
- [ ] 0. Ask base branch + ticket (or release code)
- [ ] 1. Inspect branch vs base
- [ ] 2. Push if needed
- [ ] 3. Detect frontend surfaces      (feature PRs only)
- [ ] 4. Capture + upload screenshots  (feature PRs only — references/screenshots.md)
- [ ] 5. gh pr create (or edit if one exists)
- [ ] 6. Delete screenshot files; return the PR URL
```

Release PR → steps 3 and 4 do not run.

### 1. Inspect the branch

```bash
git status --short --branch
git rev-parse --abbrev-ref HEAD
git rev-parse --abbrev-ref @{upstream} 2>/dev/null || true
git log --oneline origin/<base>..HEAD
git diff --stat origin/<base>...HEAD
git diff origin/<base>...HEAD
gh pr list --head "$(git branch --show-current)" --json number,url,state
```

Read **every** commit on `origin/<base>...HEAD`, not just the last one — the PR is
the whole branch and the title has to cover it.

Release PR: the diff is other people's merged work, so read the **merged PRs**
rather than the file diff:

```bash
# merge-commit repos (this one)
git log --merges --pretty='%s' origin/main..HEAD | grep -oE '#[0-9]+' | sort -un

# squash-merge fallback — PR number is a (#123) suffix on the subject
git log --pretty='%s' origin/main..HEAD | grep -oE '\(#[0-9]+\)' | tr -d '()#' | sort -un

# then, per number
gh pr view <n> --json number,title,url,labels
```

Uncommitted changes: report them and ask whether to stop or proceed without them.
Never `git add` on the user's behalf here.

### 2. Push

The PR is built from pushed commits. If the branch has no upstream, or is ahead of
origin:

```bash
git push -u origin HEAD
```

Ask before the first push of a branch. Never force-push.

### 3. Detect frontend surfaces

**Feature PRs only.** Screenshots when the diff changes something a reviewer can
**see**:

| Screenshot | Path                                                                                                                |
| ---------- | ------------------------------------------------------------------------------------------------------------------- |
| Yes        | `apps/attendance/app/`, `apps/client-brief-generator/src/`, `packages/ui/`                                          |
| Yes        | `apps/quotation-generator/` — its UI sits at the app root (`App.tsx`, `index.tsx`, `components/`), not under `src/` |
| Yes        | any `.tsx`, `.css`, or `app/globals.css` change that renders                                                        |
| No         | route handlers under `app/api/**`, `prisma/schema.prisma`, `Dockerfile`, `buildspec.yml`, config, tooling           |

Backend-only or infra-only diff → skip steps 4 and 5 and omit `# Screenshots` from
the body. Say in chat that you skipped it and why, so the omission is a decision
the user can see rather than a gap.

### 4. Capture screenshots

**Feature PRs with a rendering diff only.** Everything about capturing, uploading,
and captioning lives in [references/screenshots.md](./references/screenshots.md) —
read it now if you got here, and skip it entirely otherwise.

Ask before you read it: **does the user want to supply the screenshots themselves?**
Often faster for a small change, and some tools (Codex's browser, for one) already
hold a logged-in session. If they do, take their images and captions and go to step
5; the reference file is for when _you_ are capturing.

The short version, so this step is judgeable without loading the file: screenshots
go to a scratch dir and are **never** `git add`ed, captions are written before
upload, images are uploaded as GitHub user-attachments, and a capture you could not
take becomes a caption-only entry rather than a blocked PR.

### 5. Create or update the PR

This repo has **no PR template** in `.github/` — the only file there is the Vercel
deployment workflow. The body you write is the entire body that lands. (If a
template is added later, keep the shapes below in step with it.)

#### Feature PR — base is not `main`

**Title** — one line summarising the whole branch, not the last commit and not the
branch slug. Imperative, ≤ 72 characters, no trailing period. General enough to
cover every commit; if that is impossible the branch is probably two PRs, and
saying so is a better answer than a title with an "and" in it. `type(scope):` is
fine when every commit shares one type. Do not prefix the ticket id — it goes in
`# Tickets`.

**Body** — exactly these sections, in this order, omitting the optional ones:

```markdown
# Changes

- <what shipped, concrete>
- <behaviour, constraint, or migration a reviewer must know>

# Screenshots

![<descriptive alt text>](<GitHub user-attachment URL>)

> <caption: route and the state shown>

# Tickets

- [CU-86eyfcypj](https://app.clickup.com/t/86eyfcypj)
```

- `# Changes` — **required, always.** One bullet per real change: the endpoint, the
  behaviour, the scoping rule, the rollback path. Not "updated file X". Not a
  restatement of the commit list.
- `# Screenshots` — omit the heading entirely for a backend- or infra-only diff.
  Several images stack as `![]()` + `>` pairs with a blank line between; keep one
  heading. A failed upload leaves a caption-only entry, never an empty `![]()`.
- `# Tickets` — omit entirely when the user has no ticket. One bullet per ticket,
  linked, never a bare id.

#### Release PR — base is `main`

**Title** — the release code, not a summary of the code: `release: 2026.08.20` or
whatever identifier the user gave. If they gave none, ask rather than inventing a
version number.

**Body** — a manifest, not a description:

```markdown
# Release

`staging` → `main` · `2026.08.20`

# Included

- #32 — fix(attendance): scope day records by company
- #31 — fix(quotation): harden Telegram webhook against slow-turn 500s

# Tickets

- [Release 2026.08.20](https://app.clickup.com/t/86c1release)
```

- `# Release` — source branch, target branch, and the release code on one line.
  Add a line for anything that makes this promotion non-routine: a Parameter Store
  value to add before deploy, an ECR or task-definition change, a deploy order
  between apps. Nothing to say → one line is the whole section.
- `# Included` — **required.** One bullet per merged PR, `#<number> — <title>`,
  from step 1. Never a commit dump. A PR you could not resolve to a number gets a
  bullet naming the commit subject instead of being dropped silently.
- `# Tickets` — the **release** ticket, not the per-task ones. Omit when there is
  none.
- No `# Changes`. No `# Screenshots`. Not even empty.

#### Both kinds

- Nothing beyond the sections above. No `# Testing`, no checklist, no tool
  attribution footer (`Made with Cursor` and similar) — strip it if the tool
  injects one, with `gh pr edit <n> --body`, which does not re-inject.
- Never claim lint, types, tests, or CI passed. There is no test suite here, and
  `pnpm lint` / `pnpm check-types` only cover `packages/ui` — report a real result
  or say nothing.

```bash
gh pr create --base <base> --title "<title>" --body "$(cat <<'EOF'
...body...
EOF
)"
```

An open PR already exists for this head: **do not overwrite it silently.** Read what
is already there first:

```bash
gh pr view <number> --json title,body
```

If the body holds anything you did not write — a description someone typed, images
they attached, a filled-in template — show it to the user and ask before replacing
it. Prefer keeping their prose and updating only the sections this skill owns.
`gh pr edit <number> --body …` replaces the **whole** body, so an unread body is a
body you are about to destroy. Never open a duplicate PR.

#### Example feature body

```markdown
# Changes

- Scope attendance day records by company so two companies sharing a workspace no longer see each other's toolbox meetings
- Reject requests whose `workspace-id` / `solution-id` headers fail `SAFE_ID` before any S3 key is built
- Backfill existing `Day` rows with the company derived from their contract

# Screenshots

![Toolbox list filtered to one company](https://github.com/user-attachments/assets/47798a96-1933-44de-9eaf-0096614ffc9d)

> `/` Toolbox tab — day list for company A, with company B's records no longer listed

# Tickets

- [CU-86eyfcypj](https://app.clickup.com/t/86eyfcypj)
```

### 6. Clean up and report

```bash
git status --short --branch
gh pr view --json url,title,baseRefName,headRefName,state,body
```

Confirm before replying:

- Base is the branch the user picked, and the body is the right kind for it.
- No screenshot file, throwaway script, or Playwright dependency is tracked or left
  behind.
- Body has an attachment URL for every successful upload and a caption-only entry
  for the rest.
- No tool attribution footer.

Reply with the PR URL. Say how the screenshots were captured, list any caption still
needing a manual attach, and say plainly if screenshots were skipped.

## Do Not

- Open a PR without asking for the base branch.
- Offer or assume a `dev` base — this repo does not have one.
- Invent, guess, or create a base branch.
- Invent a ticket link or a release code, or keep an empty `# Tickets` heading.
- Put `# Changes` or `# Screenshots` on a PR based on `main`.
- Commit or `git add` a screenshot, a throwaway script, or screenshot tooling.
- Add Playwright to any `package.json` in this repo.
- Put credentials in the PR body, a tracked file, or a committed script — including
  anything `AS2_DEV_*`.
- Force-push, or push to `main` or `staging`.
- Claim checks passed. Report the real result or omit it.
- Fold uncommitted work into the PR.

## Project Rules

Apply the `karpathy-guidelines` skill — the PR describes the diff that exists,
nothing speculative. Repo layout, app ports, and conventions are in CLAUDE.md.
