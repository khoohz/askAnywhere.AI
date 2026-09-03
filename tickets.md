# Tickets: AI Web Annotation Extension V1

Build the in-page annotation extension from `docs/AI_WEB_ANNOTATION_EXTENSION_V1_SPEC.md` and `docs/DESIGN.md`. V1 is a personal-use prototype with a local OpenAI API key; V2 replaces direct access with an AskAnywhere backend.

Work the **frontier**: any ticket whose blockers are all done.

## Complete browser-session feasibility research

**What to build:** Preserve the decision record explaining why browser-session provider automation will not be used, while retaining the tested provider-neutral streaming/cancellation seam that informed the replacement architecture.

**Blocked by:** None — completed.

**Status:** Completed. Browser-session automation is blocked for production use and is no longer a V1 prerequisite.

- [x] The research explains why ChatGPT and Claude browser-session bridges are unsuitable without private endpoints or live accounts.
- [x] The provider-neutral mock boundary streams ordered events, supports cancellation, and preserves partial output.

## Implement the OpenAI direct streaming adapter

**What to build:** The extension sends source context and conversation through `LLMProvider` to the official OpenAI API, streams the answer back through the existing message boundary, stops a request, and retains partial output without exposing OpenAI details to the UI.

**Blocked by:** None — can start immediately.

- [x] `OpenAIDirectProvider` implements availability, streaming, cancellation, and explicit error translation behind the provider-neutral contract.
- [x] The service worker, not webpage JavaScript, makes the official API request; no browser-session, DOM-automation, or private-endpoint path exists.
- [x] Contract tests cover streaming, stopping, provider errors, and partial-output preservation with the official API transport mocked at its public boundary.

## Configure a local OpenAI API key

**What to build:** A developer uses a small, local-only configuration flow to enter, replace, check, or remove the OpenAI API key needed by the personal V1 prototype.

**Blocked by:** None — can start immediately.

- [x] The key is stored only in `chrome.storage.local`, never synced, hardcoded, committed, or sent to an AskAnywhere backend.
- [x] The compact configuration control distinguishes missing and configured states without revealing the key.
- [x] Removing the key disables future sends while leaving existing notes usable.

## Ask about a selection in one continuous card

**What to build:** With the extension enabled and local OpenAI configuration available, a reader selects text and asks a question in a quiet, collision-safe inline card that becomes the streaming conversation and accepts follow-ups without changing UI identity.

**Blocked by:** Implement the OpenAI direct streaming adapter; Configure a local OpenAI API key.

- [x] The per-tab toggle controls only selection-triggered AI; existing pinned notes stay usable while it is off.
- [x] The initial card anchors beside the selection, stays in the viewport, supports all four context modes, and replaces native selection appearance with a subtle custom highlight.
- [x] Streaming Markdown, code-copy actions, Stop, errors, Retry, and follow-up messages work in the same card.

## Pin a conversation to its source

**What to build:** A reader can pin an in-place conversation, then keep reading while the visually continuous note remains attached to its highlighted source and respects user drag and resize choices.

**Blocked by:** Ask about a selection in one continuous card.

- [ ] Pinning works before, during, and after generation without a user-visible break: preserve visual continuity, streaming state, input state, scroll position, and animation continuity. React component identity is not itself an acceptance criterion.
- [x] A pinned note follows source layout changes using a source anchor plus the reader's relative offset rather than fixed document coordinates.

## Make multiple notes practical while reading

**What to build:** Pinned conversations support automatic collapse, manual overrides, restrained collision handling, and immediate reversible deletion.

**Blocked by:** Pin a conversation to its source.

- [x] Individual and page-wide open/collapse actions preserve manual-open and manual-collapsed intent.
- [x] Notes make only minimal automatic adjustments to avoid accidental overlap while allowing intentional overlap.
- [x] Delete removes the note and its highlight immediately, and Undo restores it when possible.

## Restore annotations within a tab and route

**What to build:** A reader's pinned annotations survive reloads during the browser session, are independent in each tab and SPA route, and recover safely when webpage DOM changes.

**Blocked by:** Pin a conversation to its source.

- [x] Reloading the same URL restores pinned notes only in the originating tab and current browser session.
- [x] SPA navigation restores route-scoped notes; low-confidence or unmatched anchors remain usable and reattachable.

## Operate annotations from the page toolbar

**What to build:** The active tab exposes a compact, bottom-left, icon-only toolbar for selection enablement, all-note actions, export entry, OpenAI configuration/status, and secondary page-note actions.

**Blocked by:** Configure a local OpenAI API key; Ask about a selection in one continuous card; Make multiple notes practical while reading.

- [x] Toolbar actions are keyboard reachable, labelled for assistive technology, and explained by delayed tooltips.
- [x] Open All, Collapse All, Clear page notes, the extension toggle, and OpenAI configuration perform their defined scoped behaviors.

## Export selected pinned notes locally

**What to build:** A reader chooses pinned conversations and exports locally generated Knowledge Points or Raw Q&A by clipboard or Markdown download.

**Blocked by:** Restore annotations within a tab and route; Operate annotations from the page toolbar.

- [x] The export picker selects all pinned notes by default and excludes temporary chats.
- [x] Knowledge Points and Raw Q&A preserve their required question, answer, and source references without an LLM request.

## Create structured study-note exports

**What to build:** A reader uses the OpenAI adapter to organize selected pinned conversations into source-linked study notes that retain factual meaning and focus on their knowledge gaps.

**Blocked by:** Implement the OpenAI direct streaming adapter; Export selected pinned notes locally.

- [x] Output groups related explanations and reduces repetition without becoming a generic page summary.
- [x] A provider failure leaves selected notes available for retry or local export.

## Harden the V1 reading experience

**What to build:** The complete extension behaves reliably across normal pages while retaining the quiet, soft annotation-layer design and staying accessible and low-overhead.

**Blocked by:** Implement the OpenAI direct streaming adapter; Configure a local OpenAI API key; Ask about a selection in one continuous card; Pin a conversation to its source; Make multiple notes practical while reading; Restore annotations within a tab and route; Operate annotations from the page toolbar; Export selected pinned notes locally; Create structured study-note exports.

- [ ] Components use the documented design tokens, customized primitives, Shadow DOM isolation, and subtle state-changing motion rather than stock component styling.
- [ ] Keyboard operation, focus states, tooltips, escape behavior, contrast, and selectable response text meet V1 accessibility requirements.
- [ ] Observation and positioning work is event-driven and scoped so it does not noticeably degrade host-page performance.
