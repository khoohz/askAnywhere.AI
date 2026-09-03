---
name: review-and-commit
description: Review the working tree, split it into coherent commits, and commit each one with a proper message. Applies the full review rubric — correctness, security, code quality, naming, monorepo fit, conventions — via parallel specialist subagents, so fixes land inside the commit instead of as follow-up churn on the PR. Use when the user says "commit" in prose, "review and commit", or "split these changes", or is about to push a branch. The bare /commit slash command is the unreviewed `commit` skill instead.
user-invocable: true
---

# Review and Commit

One pass over the working tree: group, review, fix, commit.

Reviewing before the commit is the point, and more so here than in the platform
monorepo: **this repo has no PR review bot.** Nothing reviews the branch on GitHub
after you push. A finding missed here is not deferred to the PR — it ships.

## When To Use

- Before pushing a branch or opening a PR
- When the working tree holds more than one logical change
- When the user asks for a commit message

## Procedure

1. **Read the tree, and everything else the PR will show.** `git status --short` and
   `git diff` (plus `git diff --staged` if anything is already staged), then
   `git log --oneline @{upstream}..HEAD` for commits already made but not pushed
   (no upstream yet — use `origin/staging..HEAD`, or the branch's real base; there
   is no `dev` branch in this repo). Anything in that log is in scope — a reviewer
   opening the PR sees the whole branch diff, so work you committed earlier in the
   session is still unreviewed. → verify: you can name every changed file, working
   tree and unpushed commits both.
2. **Group into commits** — see grouping rules below. → verify: every changed file
   belongs to exactly one group; no file is split across groups unless its hunks are
   genuinely unrelated.
3. **Review each group** against all ten lenses in
   [rubric.md](../code-review/rubric.md) — correctness _and_ quality, naming,
   monorepo fit, conventions, best practices. Use the specialist cross-check below
   for anything non-trivial. → verify: each finding names a `file:line`, a severity,
   a rule slug, and a concrete fix; lenses 6-10 were actually applied.
4. **Write the checklist and stop.** Every finding, numbered, into
   `.review/findings.md` — described, not applied. → verify: nothing has been
   edited, staged, or committed yet.
5. **Wait.** The user ticks boxes in the file, or answers in chat by number. →
   verify: every finding is either ticked or explicitly declined.
6. **Apply the ticked fixes, then re-review them** — a fix is a diff too, and
   re-reviewing is how a sloppy fix gets caught before it ships. → verify: the fix
   does not introduce a new finding.
7. **If the re-review found anything new, go back to step 4** — rewrite the
   checklist with the new findings and stop again. Never fix a finding the user has
   not seen. → verify: no fingerprint reaches a commit without a tick or a decline
   against it.
8. **Commit each group** — `git add` only that group's paths, then commit. → verify:
   `git status` is clean at the end, and `git log --oneline` reads as a sequence of
   single-purpose commits.
9. **Sweep the branch before the PR** — see below. → verify: the full branch diff has
   been through steps 3-8, not just the last group.

## The Checklist

**Never edit code before the user picks the finding.** Review and repair are
separate acts: applying a fix silently means the user reviews your repair after the
fact instead of judging the finding on its merits.

Write `.review/findings.md` (add `.review/` to `.gitignore` if it is not there —
this is a scratchpad, not a record):

```markdown
# Review — 3 findings

Tick to fix. Leave unticked to decline. Or tell me: "fix 1 3", "2: use a guard
instead", "skip 3, intentional".

- [ ] **1.** **[High]** `app/api/day/route.ts:42` — type-cast — cast hides a null path <!-- 3a49217 -->
      Fix: narrow with a type guard before the access
- [ ] **2.** **[High]** `app/api/images/route.ts:8` — tenant-isolation — S3 key built before `getScope(req)` <!-- 7d11b41 -->
- [ ] **3.** **[Low]** `app/_lib/utils.ts:3` — naming — `d` is not descriptive <!-- 99f8983 -->
```

Order by severity, highest first, and number from 1. The HTML comment is the
fingerprint from [fingerprint.sh](../code-review/fingerprint.sh) — invisible when
rendered, and what lets a re-run keep the user's ticks instead of asking again.
Compute it, never invent it:

```bash
.agents/skills/code-review/fingerprint.sh <path> <rule-slug> "<the flagged source line>"
```

Severity ranks the list. It does not gate the commit — an unticked Critical is a
decision, not an oversight.

## Reading The User's Answer

Two channels, one list. The user may tick boxes in the editor, reply in chat, or
both.

| They say                                      | You do                      |
| --------------------------------------------- | --------------------------- |
| `fix 1 3` or `1,3`                            | fix those, decline the rest |
| `skip 2`                                      | decline it                  |
| `2: use a guard instead of optional chaining` | fix it their way, not yours |
| `3: not a bug, the caller scopes it`          | decline, record the reason  |
| `fix all` / `skip all`                        | bulk                        |

Two rules keep it unambiguous:

1. **Chat beats the file, and later beats earlier.** A ticked box followed by
   `skip 2` is skipped. Never ask the user to reconcile the two.
2. **Text after the number is a fix brief, not a comment.** Follow it instead of
   your own proposal. If it conflicts with the finding, say so once and follow it
   anyway.

Rewrite the file after each exchange so it always shows current state — `[x]` to
fix, `[ ]` undecided, `[~]` declined with the reason underneath. Delete
`.review/findings.md` once the last group is committed.

## One Approval Per Finding, Not Per Session

The approval covers **the findings the user ruled on**, by fingerprint. Within that
set, steps 5-8 are one decision: apply and commit without asking again.

It does not extend to findings the user has never seen. A fingerprint absent from
the last checklist is undecided, whatever round it surfaced in — re-review of a
fix, a later group, the branch sweep. Undecided means back to step 4: rewrite
`.review/findings.md` with the new findings numbered from 1, and stop.

The failure this prevents: round 1 asks, the user picks, and every round after
inherits that approval and fixes silently. Approval is per fingerprint. It does not
carry forward.

Carry the old findings into the rewritten file with their decisions intact — `[x]`
already fixed, `[~]` declined — so the user sees only what is actually new. Say so
in one line: `2 new findings from re-reviewing the fixes — 4 and 5.`

Never push — pushing is the user's call.

## When A Decline Keeps Coming Back

A declined finding is per-run. It reappears next review, unticked, and you leave it
unticked. That is fine and costs nothing.

It stops being fine when the same rule is declined over and over — the sign that
the rule itself does not apply here. There is no ignore file in this repo to mute
it, and adding one would be inventing infrastructure. Instead, offer to amend
[rubric.md](../code-review/rubric.md) — its "What this repo does _not_ have" table
exists exactly for rules that were imported from the platform monorepo and do not
fit. That is a commit someone can argue with, which a mute file is not.

Never change the rubric for a single finding, and never change it without the
user's agreement.

## Grouping Rules

One commit = one reason to change. In practice:

| Split when                                               | Keep together when                                     |
| -------------------------------------------------------- | ------------------------------------------------------ |
| Different concerns (a bug fix and a rename)              | A change and the tests covering it                     |
| Different layers with independent value (schema vs UI)   | A Prisma schema change and the handler that needs it   |
| A refactor and the feature that motivated it             | Trivial import updates forced by a move                |
| Unrelated drive-by fixes                                 | Generated files with the source that generated them    |
| Two apps under `apps/*` that do not depend on each other | A `Dockerfile` and the `buildspec.yml` that invokes it |

Order commits so each one builds: `packages/` before the `apps/` consuming them.
If a group cannot compile without another, it is not a separate commit.

## Review Depth

The full rubric lives in [rubric.md](../code-review/rubric.md) — read it, do not
work from memory:

| Lens                 | Covers                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1-5 Correctness      | bugs and edge cases, security and tenant scoping, type safety, performance, error handling and nullability         |
| 6-10 Quality and fit | code quality, naming conventions, weird application patterns, CLAUDE.md conventions, React and Node best practices |

Lenses 6-10 are the ones that get skipped when a review is done from memory. With
no bot behind you, skipping them means nobody applies them at all.

Read the rubric's **"What this repo does _not_ have"** table before filing
anything. There is no tRPC, no Zod, no shared schema package, no Tailwind and no
test runner here — findings that assume otherwise are noise imported from the
platform monorepo.

Severity: **Critical** (data loss, security, broken build) > **High** (likely to
break under real usage) > **Medium** (clarity, minor perf) > **Low** (nit). It sets
the order of the checklist, nothing more. Tag each finding with a rule slug from
the rubric — the fingerprint is built from it, so a drifting slug loses the user's
tick.

Skip Prettier/ESLint formatting noise — the formatter owns that. Note that
`pnpm lint` and `pnpm check-types` only exercise `packages/ui` in this repo; for an
app, run its own script (`pnpm --filter attendance typecheck`).

### Specialist Cross-Check

For any group beyond a trivial one (one file, under ~50 changed lines), spawn two
read-only specialists in parallel — one message, two Agent calls:

- **Specialist A — correctness**: rubric lenses 1-5 only
- **Specialist B — quality and fit**: rubric lenses 6-10 only

Both need a write-capable general agent (Claude Code: `general-purpose`) — not a
nit-suppressing reviewer for B, which returns nothing on lens 6-10. Write the
group's diff to `.review/diff.txt` first and pass that path: a subagent re-running
`git diff` itself sees a clean tree and reviews nothing. Have each write its
findings to `.review/crosscheck-{correctness,quality}.md` (truncate both first, one
pair per group) and return a pointer — an empty return message is then one Read
away from recovery instead of a full rerun.
[code-review](../code-review/SKILL.md) has the reasoning and the empty-specialist
procedure.

Give each the group's exact file list, the path to
[rubric.md](../code-review/rubric.md), its lens range, and the finding format:

```
- [severity] path:line — rule-slug — issue
  - Fix (ran it|unverified): the change | decision needed: A vs B, tradeoff is X
  - Read: file:lines you opened to conclude this
  - Wrong if: the case that breaks it, or the environment fact it assumes
```

`Read:` and `Wrong if:` are required on every fix — a label alone is not something
you can judge. A fix missing either is treated as unverified.

Then consolidate yourself: drop assertions with no evidence in the code, drop
anything assuming infrastructure this repo lacks, keep what both found, open the
code to verify every finding you keep **and every fix you pass on** (rubric's
proposed-fixes rules — a right diagnosis with a wrong remedy gets applied
unchecked), merge duplicates, and never omit lens 6-10 findings just because
correctness came back clean. The specialists propose; you decide.
[code-review](../code-review/SKILL.md) has the full consolidation rules.

One cross-check per group, not per file. Review the group as a unit — that is the
thing becoming a commit.

## Commit Messages

Follow the `caveman-commit` skill for format: Conventional Commits, subject ≤50
chars, imperative, body only when the "why" is not obvious from the diff.

Scope is the app or package (`attendance`, `quotation`, `client-brief`, `ui`).

Do not mention the review in the message. A commit records the change, not how it
was produced.

## The Branch Sweep

Steps 3-8 review one group at a time. A reviewer opening the PR sees
`base...HEAD` in one shot — a wider diff, showing interactions between groups that
no single group showed. That gap is why a branch can be clean group by group and
still be wrong as a whole.

So before the user pushes or opens a PR, review the whole thing once:

```
git diff $(git merge-base origin/staging HEAD)...HEAD
```

Substitute the branch's actual base. Run the specialist cross-check on it, skipping
nothing for size. Findings already decided keep their decision; anything new goes
to step 4 like any other new finding.

Cheap in practice: most fingerprints repeat from the per-group runs and drop out
immediately. What survives is the cross-group finding, which is the whole point.

## Saying It Is Ready

"Ready to commit" means this group is committed. Say what actually happened:

> Branch swept, no new findings. 3 findings declined locally — nothing re-checks
> them on GitHub, so they ship as-is.

List the declined findings by file and rule. In a repo with no review bot, a
decline is final at merge, and the user should see the list before pushing.

If the branch sweep was skipped, say that instead of implying it passed.

## Do Not

- Commit anything the user did not ask to be changed.
- Fix findings outside the diff under review — mention them, leave them.
- Amend or rebase commits that are already pushed.
- Stage with `git add -A` when the tree holds more than one group.
- Bypass hooks (`--no-verify`).
- Push, to any branch — and never to `main` or `staging` at all.

## Project Rules

Apply the `karpathy-guidelines` skill — surgical feedback tied to the diff,
smallest correct change. For a standalone review with no commit, use
[code-review](../code-review/SKILL.md) instead. To commit with the review
deliberately skipped, use [commit](../commit/SKILL.md).
