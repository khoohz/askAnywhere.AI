# Issue tracker: Local Markdown

Issues and product requirements for this repository live as Markdown files in `.scratch/`.

## Conventions

- One feature per directory: `.scratch/<feature-slug>/`
- The PRD is `.scratch/<feature-slug>/PRD.md`
- Implementation issues are `.scratch/<feature-slug>/issues/<NN>-<slug>.md`, numbered from `01`
- A `Status:` line near the top records triage state; see `triage-labels.md` for the role strings.
- Comments and discussion append under a `## Comments` heading.

## Publishing and reading tickets

When a skill says to publish to the issue tracker, create the appropriate file under `.scratch/<feature-slug>/`. When it refers to a ticket, read the referenced local file.
