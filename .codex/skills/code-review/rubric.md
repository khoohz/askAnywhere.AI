# Review Rubric

The single rubric for every review in this repo — the `code-review` skill and the
`review-and-commit` skill both apply these ten lenses.

Correctness is lens 1-5. A review that stops there is half a review: lenses 6-10
are what keep the monorepo coherent, and they are the ones agents skip when
nobody makes them explicit.

## The ten lenses

### Correctness (lenses 1-5)

1. **Bugs / logic errors and edge cases** — off-by-one, inverted conditions,
   unhandled empty/null/concurrent cases, wrong early returns.
2. **Security** — authz gaps, tenant isolation (every read and write scoped to the
   `workspaceId` / `solutionId` from `getScope(req)`), path traversal in S3 keys,
   injection, secrets reaching the client bundle or logs. Anything inlined by
   `next.config.ts`'s `env` block or Vite's `define` block is public — a password
   or API key there ships to every browser.
3. **Type safety** — unsafe casts, `any`, non-null assertions, and inferred types
   that hide a real bug. A cast that silences a compiler error the code has not
   actually handled is a finding.
4. **Performance** — request waterfalls, N+1 queries, unnecessary client bundle
   weight, uncompressed image paths. Only when it is clear from the code, not
   speculative.
5. **Error handling and nullability** — missing catch paths, swallowed errors,
   user-visible errors that say nothing, optional values treated as present.

### Quality, naming, and fit (lenses 6-10)

6. **Code quality** — single responsibility, unnecessary complexity, dead code
   introduced by the diff, duplicated logic that should reuse an existing util or
   `@repo/ui`, unclear control flow, magic values with no name, brittle coupling.
7. **Naming conventions** — descriptive variable and constant names, PascalCase
   components, matching the surrounding module's style, no cryptic abbreviations
   or misleading names. File casing follows the folder it lands in — `app/_lib/`
   is kebab-case (`image-store.ts`, `as2-client.ts`), `app/_components/` is
   PascalCase per component folder. Match the neighbours; do not import the other
   repo's convention. Changed lines only.
8. **Weird / inconsistent application** — patterns that fight this repo: a
   component calling a route handler directly instead of going through
   `app/_lib/api.ts`, `new PrismaClient()` instead of the `app/_lib/db.ts`
   singleton, a server-only module (db, s3, scope, sharp) reachable from a client
   component, reinventing platform scope instead of `AS2PlatformClient`, drive-by
   refactors, odd layering. Flag only clear mismatches against nearby code or
   CLAUDE.md.
9. **Coding conventions** — from CLAUDE.md and the surrounding code:
   - every data-touching route handler calls `getScope(req)` and rejects missing
     scope; header values validated against `SAFE_ID` before they reach an S3 key
     or a query
   - Prisma through the `app/_lib/db.ts` default export, never a new client per
     request
   - route handlers using Node APIs (Prisma, sharp, S3) declare
     `export const runtime = "nodejs"`
   - server-only modules open with `import "server-only";`
   - UI lives under `app/_components/`, grouped in a folder named after the parent
     screen; the `_` prefix is what keeps it out of the route tree
   - no drive-by refactors

   Flag clear violations in the changed lines — never whole-file rewrites.

10. **Best practices** — React: no `useEffect` or memoization the render path does
    not need, declaration order (constants, variables, refs, state, effects),
    component composition for complex layouts. Backend: validate request input at
    the boundary before use; a route handler is the trust boundary, not the
    caller. General: no premature dependencies, smallest correct change.

## What this repo does _not_ have

Do not raise findings that assume infrastructure this repo lacks. Checked, and
true as of this file:

| Not here                 | So                                                                                             |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| tRPC                     | App Router route handlers under `app/api/**` are the API. Ad-hoc `fetch` is not a finding here |
| A shared schema package  | Validation is colocated. "Schema outside `packages/schemas`" does not apply                    |
| Zod                      | Hand-written guards like `SAFE_ID` are the local precedent. Do not demand Zod                  |
| Tailwind                 | Apps hand-write plain CSS in `app/globals.css`. The `rem`-scale unit rules do not apply        |
| Any test runner or tests | Never file a "missing test" finding. Say it in prose once if the change genuinely needs one    |
| A PR review bot          | Nothing re-reviews the branch on GitHub. What you miss here reaches `main` unreviewed          |
| `next-intl` or any i18n  | Hardcoded user-facing strings are the existing convention                                      |

`packages/eslint-config` and `packages/typescript-config` exist but are only wired
into `packages/ui` — `pnpm lint` and `pnpm check-types` do **not** cover
`apps/*`. Do not report a lint gate as proof an app is clean.

## Severity

| Level        | Meaning                                                   |
| ------------ | --------------------------------------------------------- |
| **Critical** | Must fix before merge — data loss, security, broken build |
| **High**     | Should fix — likely to break under real usage             |
| **Medium**   | Worth addressing — clarity, minor perf, missing edge case |
| **Low**      | Nit — style, optional improvement                         |

Exact casing. Order findings by severity, highest first.

## Proposed fixes

A finding is evidence. A fix is a hypothesis, and it does **not** inherit the
finding's credibility — a correct diagnosis with a wrong remedy is worse than no
fix at all, because it looks pre-verified and gets applied without a second look.
So:

1. **Run anything mechanical before proposing it.** Regex, jq, bash, SQL, globs —
   one sample input, once. This is the only rule that eliminates a class outright.
2. **Cite what you read**, on its own `Read:` line (see the required shape below).
   A fix whose author read only the flagged line is a guess.
3. **State the case where the fix is wrong.** "Wrong if the caller already
   validated it." A fix derived from the one example in the finding usually breaks
   the rest of the input domain. Being unable to name a counterexample is itself a
   signal.
4. **Name the assumption about the environment, and where you checked it.** Ports,
   env var names, which `.env` a container actually reads, whether a script runs
   on `postinstall` — check, do not assume.
5. **Do not propose a fix for a tradeoff.** Retry and timeout policy, which
   failure is worse, defaults — those need a human's preference, not a remedy.
   Write `decision needed: A vs B, tradeoff is X`.

### Required shape

The label alone is not judgeable — "unverified" does not say what was assumed or
where it breaks. So the evidence is part of the format, not advice:

```
Fix (ran it|unverified): <the change>
Read: <file:lines you opened to conclude this>
Wrong if: <the case that breaks it, or the environment fact it assumes>
```

Three fields, always these names. Only the punctuation around them changes with
the medium.

Both evidence lines are required on every fix. `Wrong if: nothing found` is an
allowed answer and a useful one — it says the input domain was considered.
Silence does not. A fix missing either line is treated as unverified regardless
of its label.

`decision needed:` takes no `Read:`/`Wrong if:` — it is not a fix. State the two
options and the tradeoff instead.

Rules 2-5 do not prevent a wrong fix; they make it visible in seconds instead of
after it is applied.

Consolidating a review means verifying the fixes too, not only the findings.

## Rule slugs

Tag every finding with a short kebab-case slug for its **category**, not the
instance. Findings are fingerprinted as `sha1(path|rule|snippet)`, so a stable
slug means the same issue keeps the same fingerprint across runs and keeps the
user's tick. Drifting slugs re-ask a settled question.

Common slugs: `tenant-isolation`, `missing-null-check`, `error-handling`,
`type-cast`, `n-plus-one`, `react-effect`, `naming`, `dead-code`,
`duplicated-logic`, `scope-creep`, `magic-value`, `server-only-leak`,
`prisma-client`, `secret-in-bundle`.

Reuse an existing slug when one fits. Invent a new one only for a genuinely new
category, and keep it equally generic.

## Settled findings

A finding can be settled in two places, and neither should be re-argued:

| Where                             | Scope           |
| --------------------------------- | --------------- |
| Unticked in `.review/findings.md` | this review run |
| Conversation resolved on a PR     | that PR         |

There is no repo-wide ignore file here, because there is no bot reading one. A
rule that keeps getting declined is a signal to change this rubric in a commit
someone can argue with — not to add a mute.

Fingerprints tie a re-run to the previous one. Compute one only with the shared
helper, never by hand:

```bash
.agents/skills/code-review/fingerprint.sh <path> <rule-slug> "<the flagged source line>"
```

It covers the flagged line, so a settled finding reopens the moment that line
changes. Rewritten code gets reviewed again.

## What to skip

- Prettier / ESLint formatting noise — the formatter owns that. Import order is
  auto-sorted by `@trivago/prettier-plugin-sort-imports`; never hand-file it
- Speculative "maybe add a test" nits — there is no test setup in this repo
- Pre-existing problems outside the diff — mention them once, do not file them
- Style preferences the surrounding code already contradicts

Prefer few high-signal findings over exhaustive convention nits. Only report what
you can justify from the code in front of you.
