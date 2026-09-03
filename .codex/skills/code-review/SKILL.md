---
name: code-review
description: Full code review of a diff, branch, or file — correctness and security plus code quality, naming, monorepo fit, conventions, and best practices. Runs two specialist subagents in parallel, writes a numbered checklist to .review/findings.md, and waits for the user to tick. Use before opening PRs, when the user asks for a code review, or to review another engineer's diff.
user-invocable: true
---

# Code Review

Applies all ten lenses in [rubric.md](./rubric.md) — correctness **and** quality,
naming, monorepo fit, conventions, best practices. A review that only reports bugs
and security has skipped half the rubric.

**This repo has no PR review bot.** Nothing re-reviews the branch on GitHub after
you finish, so a lens skipped here is a lens nobody applies. That is the opposite
of the platform monorepo, where a skipped local review just moves the work onto
the PR.

Findings go into a file, numbered and fingerprinted, not only into chat. Chat
scrolls away; `.review/findings.md` is what the user ticks and what survives a
re-run.

## When To Use

- Before opening a pull request
- After completing a feature branch
- When reviewing another engineer's diff

To review _and then commit_ the changes, use
[review-and-commit](../review-and-commit/SKILL.md) instead; it wraps this review in
a grouping and commit pass. This skill reviews and optionally applies fixes. It
never commits.

## Procedure

1. **Scope the diff.** `git diff` for the working tree, `git diff <base>...HEAD` for
   a branch, or the paths the user named. Reviewing before a PR means the branch
   diff against the PR's actual base — `origin/staging` for a feature branch,
   `origin/main` only for a release. There is no `dev` branch in this repo. The
   working tree alone hides every commit already made. → verify: you can state
   exactly which files and how many lines are under review.
2. **Cross-check with two specialists** — see below. Skip only for a trivial diff
   (one file, under ~50 changed lines); review that inline. Never skip it on a
   pre-PR branch review. → verify: both `.review/crosscheck-*.md` exist and are
   non-empty.
3. **Consolidate** — see the consolidation rules. → verify: every kept finding has a
   `file:line`, a severity, a rule slug, and a concrete fix.
4. **Write the checklist and stop.** Every kept finding, numbered and fingerprinted,
   into `.review/findings.md` — described, not applied. Post the short summary from
   the output format below in chat and point at the file. → verify: the file exists,
   lenses 6-10 are represented whenever the quality specialist found something
   justified, and nothing has been edited.
5. **Wait.** The user ticks boxes in the file, or answers in chat by number. →
   verify: every finding is either ticked or explicitly declined.
6. **Apply the ticked fixes, then re-review them** — a fix is a diff too. → verify:
   the fix does not introduce a new finding.
7. **If the re-review found anything new, go back to step 4** — rewrite the
   checklist with the new findings and stop again. Never fix a finding the user has
   not seen. → verify: no fingerprint gets applied without a tick against it.

Steps 6-7 only run if the user asks for fixes. A review that ends at step 5 with
everything unticked is a finished review, not an abandoned one.

## The Findings File

**Never edit code before the user picks the finding.** Review and repair are
separate acts: applying a fix silently means the user reviews your repair after the
fact instead of judging the finding on its merits.

Write `.review/findings.md` (add `.review/` to `.gitignore` if it is not there —
this is a scratchpad, not a record):

```markdown
# Review — 3 findings

`origin/staging...HEAD` · 7 files · 214 lines. Tick to fix. Leave unticked to
decline. Or tell me: "fix 1 3", "2: use a guard instead", "skip 3, intentional".

- [ ] **1.** **[High]** `app/api/day/route.ts:42` — type-cast — cast hides a null path <!-- 3a49217 -->
      Fix (unverified): narrow with a type guard before the access
      Read: `app/api/day/route.ts:30-48`
      Wrong if: the caller already guarantees non-null
- [ ] **2.** **[High]** `app/api/images/route.ts:8` — tenant-isolation — key built before `getScope(req)` <!-- 7d11b41 -->
      Fix (ran it): moved the `getScope` call above the key construction
      Read: `app/api/images/route.ts:1-30`, `app/_lib/scope.ts:1-40`
      Wrong if: nothing found
- [ ] **3.** **[Low]** `app/_lib/utils.ts:3` — naming — `d` is not descriptive <!-- 99f8983 -->
```

Order by severity, highest first, and number from 1. Carry `Fix`, `Read:` and
`Wrong if:` through from the consolidated finding — a fix the user cannot judge is
a fix they have to re-derive. A `decision needed:` finding takes neither line and
asks the question instead of proposing a change.

The HTML comment is the fingerprint from
[fingerprint.sh](./fingerprint.sh) — invisible when rendered, and what lets a
re-run keep the user's ticks instead of asking again. Compute it, never invent it:

```bash
.agents/skills/code-review/fingerprint.sh <path> <rule-slug> "<the flagged source line>"
```

Severity ranks the list. It does not gate anything here — an unticked Critical is a
decision, not an oversight.

Overwrite the file at the start of each review run. Delete it once the user is done
with the findings, or hand it over intact if they move on to
[review-and-commit](../review-and-commit/SKILL.md) — same file, same fingerprints,
the ticks carry.

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

Rewrite the file after each exchange so it always shows current state — `[x]` fixed,
`[ ]` undecided, `[~]` declined with the reason underneath.

## One Approval Per Finding, Not Per Session

The approval covers **the findings the user ruled on**, by fingerprint. Within that
set, steps 5-6 are one decision: apply without asking again.

It does not extend to findings the user has never seen. A fingerprint absent from
the last checklist is undecided, whatever round it surfaced in. Undecided means back
to step 4: rewrite `.review/findings.md` with the new findings numbered from 1, and
stop.

Carry the old findings into the rewritten file with their decisions intact — `[x]`
already fixed, `[~]` declined — so the user sees only what is actually new. Say so
in one line: `2 new findings from re-reviewing the fixes — 4 and 5.`

## Specialist Cross-Check

Spawn both in parallel, in a single message with two Agent calls. They are
independent — running them sequentially only costs wall-clock time.

**Specialist A — correctness.** Rubric lenses 1-5 only: bugs and logic, security
and tenant scoping, type safety, error handling and nullability, performance clear
from the diff.

**Specialist B — quality and fit.** Rubric lenses 6-10 only: code quality, naming
conventions, weird or inconsistent application against this repo, coding
conventions from CLAUDE.md, best practices.

Give each one: the diff (see below), the path to [rubric.md](./rubric.md), its lens
range, the report path, and the output format. Point both at the rubric's
**"What this repo does _not_ have"** table — a specialist carrying platform-monorepo
habits will otherwise file tRPC, Zod, `packages/schemas`, Tailwind-unit and
missing-test findings that do not apply here. Both are read-only — they report,
they do not edit.

### Hand them the diff; do not make them re-derive it

Write the scoped diff to `.review/diff.txt` **before** spawning, and give each
specialist that path plus the file list. A subagent starts with none of your
context, so "review this diff" means it re-runs `git diff` in a fresh session — and
on an already-committed branch with a clean tree that returns nothing. The
specialist then reviews an empty diff and reports nothing, correctly, having seen
none of the code.

### They report to a file, not only to you

Truncate `.review/crosscheck-correctness.md` and `.review/crosscheck-quality.md`
before spawning, tell each specialist to write its findings there, and have it
return only a one-line pointer.

A subagent's return message is otherwise its only output channel, and an empty
message is indistinguishable from a clean review. With the file on disk, an empty
return costs one Read; without it the only recovery is a rerun — a fresh context
re-reading the diff, the rubric and every file again.

When a specialist comes back empty:

1. Read its file. Findings there? Use them — do not rerun.
2. File empty too? Rerun that one specialist **once**, or review its lens range
   inline yourself. Never report the review as complete with a lens range
   unexamined.

### Which agent

Pick by capability, not by name — agent types are harness-specific (Claude Code
`general-purpose`, opencode `general`). Both specialists need one that **can write
a file**; a search- or review-only agent cannot leave a report. Read-only is then
an instruction rather than a capability, so state it in the prompt: report only,
edit no code, the report file is the only file you may write.

Avoid a reviewer agent tuned to suppress nits for **B** — `caveman:cavecrew-reviewer`
is the one to watch for here. Lenses 6-10 are largely nits that matter, so such an
agent returns nothing on the exact range B exists to cover, and its own output
shape omits the `Read:` / `Wrong if:` lines. It suits **A**, whose output it was
shaped for.

Both must return findings as:

```
- [severity] path:line — rule-slug — issue
  - Fix (ran it|unverified): the change | decision needed: A vs B, tradeoff is X
  - Read: file:lines you opened to conclude this
  - Wrong if: the case that breaks it, or the environment fact it assumes
```

`Read:` and `Wrong if:` are required on every fix — that is what makes a fix
judgeable rather than just labelled. `Wrong if: nothing found` is allowed and
informative. `decision needed:` takes neither line. A fix missing either one is
treated as unverified during consolidation, whatever its label says.

or `- No findings`. An empty report file is not a clean review — it is a failed
one, and the two must stay distinguishable.

### Consolidation Rules

The specialists propose; you decide. Against the actual diff:

- **Drop** a single-specialist assertion with no clear evidence in the code. A
  specialist that could not point at the line was guessing.
- **Drop** anything that assumes infrastructure this repo does not have — check it
  against the rubric's table before keeping it.
- **Keep** findings both specialists reached, and well-evidenced disagreements.
- **Verify** every finding you keep by opening the code yourself. Specialists
  hallucinate line numbers and occasionally whole functions.
- **Verify the fix, not just the finding.** A right diagnosis with a wrong remedy
  is the most expensive output of a review — it reads as pre-checked and gets
  applied. Apply the proposed-fixes rules in [rubric.md](./rubric.md): run anything
  mechanical, cite the lines read, name the case where it breaks, and downgrade a
  tradeoff to `decision needed:` instead of answering it.
- **Do not omit lens 6-10 findings** because correctness came back clean. That is
  the failure mode this split exists to prevent.
- **Merge** duplicates — same issue found by both is one finding.
- Report the consolidated review, never the raw specialist output.

## Output Format

`.review/findings.md` is the review. Chat gets the summary and the pointer, not a
second copy of the list:

```markdown
## Summary

[approve / approve with nits / request changes] — one sentence

`origin/staging...HEAD` · 7 files · 214 lines
1 Critical · 2 High · 3 Medium · 1 Low → `.review/findings.md`

Tick the ones to fix, or tell me by number.

## What looks good

- ...
```

Name the top one or two findings inline if they change what the user does next.
Everything else stays in the file.

`No findings` is a valid and good result — say so in chat, write the file with a
`# Review — no findings` heading so a re-run has something to compare against, and
do not pad a clean diff.

## Checklist

- [ ] Logic correct; edge cases handled (null, empty, concurrent)
- [ ] Security — `getScope(req)` on every data path, `SAFE_ID`-validated headers,
      no secret reaching `next.config.ts` `env` or a Vite `define` block
- [ ] Types accurate; no unsafe casts hiding real bugs
- [ ] Errors handled; nullability honoured
- [ ] Quality — single responsibility, no dead or duplicated code, no magic values
- [ ] Naming — descriptive variables, PascalCase components, file casing matching
      the folder it lands in
- [ ] Fits the repo — route handlers under `app/api/**`, client calls through
      `app/_lib/api.ts`, shared UI from `@repo/ui`
- [ ] Conventions — Prisma via the `app/_lib/db.ts` singleton, `runtime = "nodejs"`
      where Node APIs are used, `import "server-only"` on server modules
- [ ] Best practices — no needless `useEffect` or memoization, input validated at
      the route boundary
- [ ] Scope minimal — no drive-by refactors riding along
- [ ] Nothing filed that assumes tRPC, Zod, `packages/schemas`, Tailwind, or tests
- [ ] Findings written to `.review/findings.md`, numbered, fingerprinted, unticked

## Do Not

- Edit code before the user ticks the finding.
- Commit or stage anything — this skill reviews. Use
  [review-and-commit](../review-and-commit/SKILL.md) to commit.
- Report findings only in chat. The file is the artifact.
- Invent a fingerprint. Compute it with the shared helper or omit the finding.
- Fix findings outside the diff under review — mention them, leave them.

## Project Rules

Apply the `karpathy-guidelines` skill — surgical feedback tied to the diff. For
React and Next.js pages, also apply `vercel-react-best-practices`. Both are
harness-level skills; this repo does not vendor a copy.
