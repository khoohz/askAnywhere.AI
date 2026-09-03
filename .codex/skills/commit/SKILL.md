---
name: commit
description: Split the working tree into coherent commits and commit each one with a proper message — grouping, staging, and messages, with no review pass. Use for the /commit slash command, or when the user explicitly asks to commit without a review ("just commit", "commit without reviewing", "skip the review"). The word "commit" in prose, with no slash, is review-and-commit.
user-invocable: true
---

# Commit

Group the working tree into coherent commits, write the commit messages, and
commit the selected changes.

This is [review-and-commit](../review-and-commit/SKILL.md) with the review removed,
which is exactly what makes it the exception rather than the default.

## Read This First

The reviewed path is the default here. Asking for this skill **is** the override —
so run it, and say once, in one line, what it skipped:

> Committing without review, as asked — 3 commits. Nothing reviews this branch on
> GitHub either; this repo has no PR review bot.

Say it once. Do not repeat it per commit, do not argue, do not re-offer the review
after each group.

Use this skill when the user explicitly asks to commit without another review —
typing `/commit` counts as asking. Otherwise use
[review-and-commit](../review-and-commit/SKILL.md). The word "commit" in a sentence
("commit this", "can you commit", "commit and push") is not a request to skip the
review, and the reviewed path is still the default here.

## When To Use

- The user typed `/commit`, asked to skip the review, or said they have already reviewed
- A review already ran this session and its findings were ruled on — this is the
  commit pass for work that came out of it
- The change is mechanical: generated output, a lockfile, a formatting-only pass, a
  straight revert

## Before Committing

- The diff touches AS2 session handling, `app/_lib/scope.ts`, or any path that reads
  `workspace-id` / `solution-id` — tell the user it is being committed without
  review, then proceed.
- The diff changes a `Dockerfile`, a `buildspec.yml`, or `next.config.ts`'s `env`
  block — build and deploy configuration, where a mistake surfaces in production
  rather than in review. Say so, then proceed.
- The change is too large to group confidently — show the proposed grouping and
  wait for confirmation before staging anything.
- The diff contains a `.env`, a credential, or a likely secret — **stop and report
  it. Do not commit those files.**

The first three are settled by the user answering. The last is not: reaffirming does
not lift it, and there is no phrasing of "commit anyway" that does. See Do Not.

## Procedure

1. **Read the tree, and what is already on the branch.**

   ```bash
   git status --short
   git diff
   git diff --staged
   git log --oneline @{upstream}..HEAD 2>/dev/null || git log --oneline origin/staging..HEAD
   ```

   → verify: you can name every changed file, and you know what is already staged.

2. **Group into commits** — see the rules below. → verify: every changed file
   belongs to exactly one group.

3. **Show the plan and wait.** One message, one line per group: subject, then its
   paths. Not a diff dump.

   ```
   1. feat(attendance): scope day records by company
      apps/attendance/app/api/day/route.ts
      apps/attendance/app/_lib/scope.ts
   2. chore(attendance): pin sharp reinstall to the declared version
      apps/attendance/Dockerfile
      apps/attendance/package.json
   ```

   Note there is no generated-output group to expect here: the Prisma generator in
   `apps/attendance/prisma/schema.prisma` declares no `output`, so the client lands
   in `node_modules` and is never committed.

   → verify: the user approved the grouping, or told you to change it. Skip this
   step only when they already said how to commit ("all as one", "one commit,
   message X").

4. **Commit each group.** `git add` that group's exact paths, then commit. Build
   order: `packages/` before the `apps/` consuming them. → verify: after each
   commit, `git status --short` shows only the groups you have not reached yet.

5. **Report.** `git status --short` and `git log --oneline` for the new commits. →
   verify: the tree is clean, or the leftovers are the ones the user chose to keep.

Never push. Pushing is the user's call, and this skill has reviewed nothing.

## Grouping Rules

One commit = one reason to change.

| Split when                                               | Keep together when                                     |
| -------------------------------------------------------- | ------------------------------------------------------ |
| Different concerns (a bug fix and a rename)              | A change and the tests covering it                     |
| Different layers with independent value (schema vs UI)   | A Prisma schema change and the handler that needs it   |
| A refactor and the feature that motivated it             | Trivial import updates forced by a move                |
| Unrelated drive-by fixes                                 | Generated files with the source that generated them    |
| Two apps under `apps/*` that do not depend on each other | A `Dockerfile` and the `buildspec.yml` that invokes it |

If a group cannot compile without another, it is not a separate commit.

One file whose hunks belong to two groups: commit it with the group that owns most
of it and say so, or ask. Do not split hunks interactively — `git add -i` and
`git add -p` are not available in this environment.

## Staging

`git add` the group's exact paths, every time:

```bash
git add apps/attendance/app/api/day/route.ts apps/attendance/app/_lib/scope.ts
git commit -m "feat(attendance): scope day records by company"
```

- Never `git add -A` or `git add .` when the tree holds more than one group.
- Something was already staged before you started: treat it as its own group unless
  the user says otherwise, and name it in the plan. Never quietly fold it into
  yours.
- Never `--no-verify`. A failing hook is a finding, not an obstacle — report it and
  stop.
- Never `git checkout`, `git restore`, `git stash`, or `git reset --hard` to tidy
  the tree. Uncommitted work you did not create is not yours to drop.

## Commit Messages

Follow the `caveman-commit` skill for format: Conventional Commits, subject ≤ 50
chars, imperative, body only when the "why" is not obvious from the diff.

Scope is the app or package (`attendance`, `quotation`, `client-brief`, `ui`) — or the module when one change
genuinely spans several. Prefer the narrowest scope that honestly covers the commit;
never split one coherent change into per-package commits just to keep the scope
narrow.

Do not mention the review, or its absence, in the message. A commit records the
change, not how it was produced.

## Do Not

- Run this on a prose "commit" with no slash — that is
  [review-and-commit](../review-and-commit/SKILL.md).
- Commit a secret, a `.env` file, or a credential. This is not overridable, by this
  skill or by the user. Stop and report it. `.env` files here are generated from
  Parameter Store at build time and are gitignored for that reason.
- Commit anything the user did not ask to be changed.
- Fix, refactor, or reformat while grouping. Commit what is there.
- Push, to any branch — and never to `main` or `staging` at all.
- Amend or rebase commits that are already pushed.
- Claim the change is reviewed, safe, or ready. It has not been reviewed.

## Project Rules

Apply the `karpathy-guidelines` skill — commit the diff that exists, nothing more.
For the reviewed path use [review-and-commit](../review-and-commit/SKILL.md); for a
review with no commit use [code-review](../code-review/SKILL.md).
