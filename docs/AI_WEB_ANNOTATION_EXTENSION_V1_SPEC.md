# AI Web Annotation Extension — V1 Product & Engineering Spec

## 1. Product Summary

Build a browser extension that lets users highlight text on any webpage and immediately ask an LLM about that selected content through a lightweight inline chat interface.

The product should not behave like a traditional AI sidebar.

Its core interaction is:

**Highlight → Ask → Understand → Pin → Continue Reading → Export**

The AI interface should feel like a temporary annotation layer over the webpage itself.

Pinned AI conversations should behave like contextual sticky notes attached to the exact content the user was reading.

The product should remain lightweight, visually unobtrusive, and focused on reading and understanding.

---

## 2. Product Principles

### 2.1 Do not hijack normal text selection

The extension only reacts to text selection when it is explicitly enabled for the current browser tab.

When disabled:

- text selection behaves normally
- no AI input appears
- existing pinned notes remain visible and interactive

Enable/disable state is scoped to the current tab only.

Do not persist enable state across tabs, domains, or browser sessions in V1.

### 2.2 Avoid the traditional sidebar model

Do not create a permanent AI sidebar.

The AI interface should appear next to the selected content.

The experience should feel like:

- Google Docs comments
- sticky notes
- contextual annotations

rather than:

- ChatGPT embedded in a sidebar

### 2.3 One continuous UI object

The initial input, AI response, conversation, and pinned note should all be the same card transitioning between states.

Do not:

- destroy the input and replace it with another component
- open a separate response modal
- move the conversation into another panel after sending

The card should visually transform and expand.

### 2.4 Manual intent overrides automation

When the user manually opens, collapses, drags, resizes, or otherwise adjusts a note, preserve that explicit intent unless the user changes it again.

### 2.5 Keep V1 deliberately focused

Do not turn the product into a general-purpose AI assistant, knowledge platform, or sidebar suite.

The core workflow is the product:

**Highlight → Ask → Pin → Continue Reading.**

---

## 3. Expected Tech Stack

Use the following stack unless there is a strong implementation reason to deviate:

### Extension framework
- **WXT**
- **Chrome Extension Manifest V3**

WXT should handle:
- manifest generation
- content-script entrypoints
- background service worker
- development reload workflow
- extension packaging

### Frontend
- **React**
- **TypeScript**

### UI primitives
- **shadcn/ui**
- **Radix UI primitives**

Important:
- shadcn is the accessible primitive/component layer, not the visual design system.
- Do not ship stock shadcn styling.
- All shadcn components must be customized to follow `DESIGN.md`.

Good candidates for shadcn/Radix:
- Button
- Tooltip
- DropdownMenu
- Popover
- Select
- Dialog
- ScrollArea
- Separator
- Textarea
- Sonner / toast

The main chat card, note card, positioning system, and annotation interactions should remain custom product components.

### Styling
- **Tailwind CSS**
- design tokens / CSS variables
- Shadow DOM style isolation

Use Tailwind as a styling mechanism, not as the entire design architecture.

Prefer:
- shared CSS variables
- component variants
- reusable tokens
- product-specific component styles

Avoid scattering arbitrary utility values throughout the entire codebase.

### Icons
- **Lucide React**

### Animation
- **Framer Motion**

Use Framer Motion for:
- input-to-chat expansion
- card resizing
- pin feedback
- collapse/expand transitions
- smooth re-anchoring movement
- subtle entry/exit animations

### State
- **Zustand**

Use for:
- current-tab extension state
- active temporary chat
- pinned notes
- provider availability and local prototype configuration
- route-scoped page state
- note UI states

Do not use Redux unless a genuine need appears.

### Session persistence
- `chrome.storage.session`

Use for:
- per-tab pinned notes
- reload restoration
- route-scoped state within the current browser session

V1 does not include permanent cloud storage.

### Markdown
- **react-markdown**
- **remark-gfm**

### Code rendering
- **Shiki**

Use lazy loading if needed to avoid unnecessary bundle/runtime cost.

### Testing
Recommended:
- **Vitest** for logic/unit tests
- **React Testing Library** for UI behavior
- **Playwright** for extension/browser integration tests where practical

---

## 4. Proposed Source Structure

```text
extension/
├── entrypoints/
│   ├── background.ts
│   └── content/
│       ├── index.tsx
│       └── style.css
│
├── background/
│   ├── messaging/
│   ├── session/
│   └── providers/
│       ├── provider.ts
│       └── openai-direct.ts
│
├── content/
│   ├── selection/
│   ├── anchoring/
│   ├── positioning/
│   ├── collision/
│   ├── observers/
│   ├── route/
│   └── highlights/
│
├── components/
│   ├── ui/                 # customized shadcn components
│   ├── SelectionInput.tsx
│   ├── ChatCard.tsx
│   ├── ChatHeader.tsx
│   ├── ChatComposer.tsx
│   ├── PinnedNote.tsx
│   ├── PageToolbar.tsx
│   ├── ApiKeyConfiguration.tsx
│   ├── ContextSelector.tsx
│   ├── ExportDialog.tsx
│   ├── MarkdownResponse.tsx
│   └── DetachedNoteWarning.tsx
│
├── stores/
│   ├── notes-store.ts
│   └── provider-config-store.ts
│
├── lib/
│   ├── storage.ts
│   ├── messaging.ts
│   ├── markdown.ts
│   ├── source-context.ts
│   ├── route-key.ts
│   └── cn.ts
│
├── types/
│   ├── note.ts
│   ├── provider.ts
│   └── messages.ts
│
└── styles/
    ├── tokens.css
    └── markdown.css
```

Exact structure may change, but keep the architectural separation between:
- webpage/content behavior
- UI
- provider communication
- state
- persistence

---

## 5. Main Interaction Flow

### Step 1 — User selects text

When the extension is enabled and the user completes a text selection:

1. Capture the selected text.
2. Capture enough information to reconstruct/re-anchor that source later.
3. Preserve the source visually with a custom highlight.
4. Display a thin AI input beside the selection.
5. Automatically focus the input.

The browser's native selection highlight should be replaced by the extension's own persistent highlight once focus moves into the input.

---

## 6. Initial AI Input

The initial UI is a thin, medium-width horizontal input.

Conceptually:

```text
┌───────────────────────────────────────────────┐
│ Ask anything...      [Selection ▾]       ↑   │
└───────────────────────────────────────────────┘
```

Requirements:

- small vertical footprint
- medium-long width
- single-line initially
- automatically grows while typing
- maximum input height = 4 lines
- after 4 lines, scroll internally
- comfortable click/touch targets
- minimal visible actions

Keyboard:
- Enter = Send
- Shift + Enter = New line

Do not include large sets of quick actions like:
- Explain
- Simplify
- Summarize
- Translate

inside the primary input.

---

## 7. Input Positioning

Position the card relative to the selected text.

Preferred placement order:

1. Right side of selection
2. Above selection
3. Below selection

Use smart collision and viewport detection.

Never render off-screen if another valid placement exists.

Use APIs such as:
- `Range.getBoundingClientRect()`
- `Range.getClientRects()`

---

## 8. Context Selection

The initial input includes a small clickable context chip.

Supported modes:

- Selection
- Paragraph
- Section
- Page

Only the original user-selected text remains visibly highlighted.

Do not visually highlight the entire paragraph/section/page when broader context is selected.

Large contexts are allowed.

Do not display token-count warnings merely because context is large.

---

## 9. Sending a Question

After sending, the same card expands vertically.

Conceptually:

```text
┌──────────────────────────────────────┐
│ Why does MVCC matter?                │
├──────────────────────────────────────┤
│ MVCC allows readers and writers...   │
│                                      │
│ Ask a follow-up...               ↑   │
└──────────────────────────────────────┘
```

Requirements:
- animate the existing card
- do not replace it with another component
- keep motion subtle and fast
- card should feel like it is unfolding

---

## 10. Streaming Responses

Responses stream into the card.

While streaming:
- card height grows automatically
- growth animates smoothly
- card stops growing at its max height
- content scrolls internally afterwards
- pinned and unpinned cards behave consistently

During generation, the Send button becomes Stop.

Stop:
- cancels generation where possible
- preserves partial output
- restores input
- allows follow-up messages

---

## 11. Markdown & Code

Render AI output as Markdown.

Support:
- paragraphs
- headings
- bullet lists
- numbered lists
- bold
- italic
- inline code
- fenced code blocks
- links
- tables

Code blocks:
- syntax highlighting
- Copy button

Links:
- open in a new browser tab
- no previews in V1

---

## 12. Temporary Chats

A chat begins temporary.

Temporary chats:
- remain open when the user simply clicks elsewhere
- do not disappear on normal focus changes
- are discarded when the user creates a new text selection
- are not exported
- are not automatically saved

When a new selection occurs:
1. remove previous unpinned chat
2. remove its source highlight
3. create a new input at the new selection

Do not:
- ask for confirmation
- auto-pin
- show undo for this replacement

---

## 13. Pinning

Every chat card supports Pin.

Pinning means:
**keep this conversation attached to this point of the webpage.**

Pinning may happen:
- before response begins
- while streaming
- after completion

If pinned during streaming:
- pin immediately
- continue streaming in place

The card must remain visually the same object.

Pinning changes behavior, not component identity.

---

## 14. Pinned Note Model

Conceptual model:

```ts
interface Note {
  id: string

  source: {
    selectedText: string
    surroundingText?: string
    pageTitle: string
    url: string

    anchor: {
      xpathHints?: string[]
      cssHints?: string[]
      textBefore?: string
      textAfter?: string
      startOffset?: number
      endOffset?: number
      initialRect?: {
        x: number
        y: number
        width: number
        height: number
      }
    }
  }

  messages: Message[]

  provider: string
  model?: string

  position: {
    offsetX: number
    offsetY: number
  }

  dimensions?: {
    width: number
    height: number
  }

  state: {
    pinned: boolean
    collapsed: boolean
    behavior: "auto" | "manual-open" | "manual-collapsed"
    detached?: boolean
    lowConfidenceAnchor?: boolean
  }

  createdAt: number
}
```

Exact implementation may evolve.

---

## 15. Note Anchoring

Pinned notes remain attached to their source.

Do not store only absolute document coordinates.

Use:

**source anchor position + user-defined offset**

When the source moves due to:
- resize
- font loading
- site sidebar opening
- asynchronous content
- layout shifts
- DOM mutation

the note should move with it.

If the user dragged the note:
- preserve its relative offset to the source

---

## 16. Repositioning Smoothness

Do not recalculate note position on every animation frame.

Re-anchor on meaningful events such as:
- ResizeObserver
- relevant MutationObserver events
- viewport resize
- content/container geometry changes
- route restoration
- source re-detection

Animate from old position to new position rather than teleporting.

---

## 17. Dragging

Only pinned notes are draggable.

Unpinned chat:
- automatic placement only

Pinned note:
- drag updates relative offset
- note remains anchored
- future source motion preserves user offset

A detached note may become free-floating.

---

## 18. Resizing

Unpinned chats:
- automatic sizing only

Pinned notes:
- auto-grow by default
- manually resizable after pinning

Manual dimensions persist for the current tab/session.

---

## 19. Soft Collision Avoidance

Pinned notes should try not to overlap.

Rules:
1. preserve user placement whenever possible
2. make the smallest automatic adjustment required
3. do not aggressively reorder notes
4. explicit drag intent wins
5. if user intentionally overlaps notes, allow it

---

## 20. Collapse State

Expanded:

```text
┌─────────────────────────────────┐
│ Why does MVCC matter?       📌  │
├─────────────────────────────────┤
│ AI response...                  │
│                                 │
│ Ask follow-up...            ↑   │
└─────────────────────────────────┘
```

Collapsed:

```text
┌─────────────────────────────────┐
│ Why does MVCC matter?       📌  │
└─────────────────────────────────┘
```

Requirements:
- same width
- same position
- same component
- only body collapses
- header remains

Header text:
- truncated first user question
- no LLM-generated title in V1

---

## 21. Automatic Collapse

Default pinned behavior is `auto`.

If the source content leaves the viewport:
- collapse the note

If the source returns:
- expand it again

Do not move collapsed notes into:
- viewport edge tabs
- note stack
- sidebar
- separate navigator

The note stays at its document/source position and scrolls away naturally.

---

## 22. Manual Overrides

Manual behavior overrides auto behavior.

Manual collapse:
- set `manual-collapsed`
- stay collapsed
- do not auto-expand
- stop unnecessary viewport behavior tracking when possible

Manual open:
- set `manual-open`
- stay expanded
- do not auto-collapse on scroll
- remain open until manually collapsed

---

## 23. Open All Notes

The page-level toolbar includes Open All Notes.

Action:
- expand all pinned notes
- set all to `manual-open`
- disable auto-collapse for those notes

Individual notes may still be manually collapsed afterwards.

---

## 24. Collapse All Notes

Action:
- collapse all pinned notes
- set all to `manual-collapsed`
- prevent automatic reopening

---

## 25. Source Highlight

Each chat is associated with a custom source highlight.

Temporary:
- highlight lives while chat exists
- disappears when temporary chat is replaced/discarded

Pinned:
- highlight persists with the note

The highlight must remain readable and subtle.

---

## 26. Context Modification After Creation

Pinned-note menu includes Expand Context.

Options:
- Selection only
- Paragraph
- Section
- Reselect manually

Manual reselection allows the user to select a new source range and attach the existing note to it.

Keep this out of the primary chat UI.

---

## 27. Reload / DOM Reattachment

Use aggressive source reattachment after:
- reload
- SPA return navigation
- DOM changes
- content re-render

Possible matching strategy:
1. DOM/path hints
2. exact selected text
3. surrounding text
4. preceding/following text
5. paragraph similarity
6. approximate previous position
7. fuzzy text matching

Prefer reattachment rather than giving up too early.

If confidence is high:
- reattach silently

If confidence is low:
- show a subtle warning

Do not knowingly attach to clearly incorrect content.

---

## 28. Detached Notes

If the source cannot be reliably found:
- note remains usable
- note may remain floating
- user may manually reselect and reattach
- user may delete it

Do not automatically delete detached notes.

---

## 29. Page Reload Persistence

Pinned notes survive reloads of the same URL during the current browser session.

Use session-scoped extension storage.

Requirements:
- survive reload
- stay isolated per tab
- disappear after browser/session ends
- no permanent V1 knowledge library

---

## 30. Per-Tab Isolation

The same URL opened in two tabs creates two independent annotation sessions.

Do not share notes across tabs.

---

## 31. SPA Navigation

Notes are scoped by route/URL within the same tab.

Example:
- `/docs/database`
- `/docs/networking`

Each route gets its own note state.

If the user navigates back to a previously visited route in that tab:
- restore its notes

---

## 32. Follow-Up Conversation Rules

Each follow-up keeps:
- original source context
- relevant conversation history
- current user message

Conversation history is immutable in V1.

Do not support:
- editing prior messages
- branching
- regenerating from an earlier message
- individual message deletion

Support:
- follow-up messages
- stop generation
- whole-note deletion

---

## 33. Provider Architecture

Keep UI and note behavior provider-neutral through an LLM provider abstraction.

V1 implements one adapter: `OpenAIDirectProvider`. It calls the official OpenAI API from the extension background service worker using a locally supplied API key. This is a **personal-use prototype architecture**, not the intended production architecture.

The Selection/Chat UI must not call OpenAI-specific code directly:

```text
Selection / Chat UI
      ↓
LLMProvider
      ↓
OpenAIDirectProvider
      ↓
Official OpenAI API
```

Example:

```ts
interface LLMProvider {
  id: string

  isAvailable(): Promise<boolean>

  sendMessage(input: {
    sourceContext: string
    messages: Message[]
    signal?: AbortSignal
  }): AsyncIterable<string>
}
```

Provider-specific logic must remain isolated behind adapters.

---

## 34. V1 OpenAI API-Key Configuration

V1 uses the official OpenAI API with a developer/user-supplied API key. The API key is local prototype configuration, not a long-term product architecture.

OpenAI does not treat a browser-held API key as production-safe. This direct-key path is strictly for the personal V1 prototype and must not be distributed as a production extension.

Requirements:
- never hardcode the key or commit it to source control
- store it locally in `chrome.storage.local`, never `chrome.storage.sync`
- do not send it to an AskAnywhere backend; V1 has no backend
- do not read cookies, browser-session tokens, provider-page storage, or credentials from any provider website
- provide only the minimal UI needed to enter, replace, check, or remove the local key
- keep the key out of the host webpage JavaScript and make API requests from extension code

V1 does not include an AskAnywhere account, billing, subscriptions, credits, usage quotas, production rate limiting, abuse prevention, or a hosted server.

---

## 35. V2 Provider Direction

V2 replaces direct client-side provider access with an AskAnywhere backend:

```text
Browser Extension
      ↓
AskAnywhere Backend
      ↓
Provider APIs
```

The future backend may own AskAnywhere authentication, provider credentials, billing, subscriptions/credits, usage metering, rate limiting, abuse prevention, routing, and production observability. None of these capabilities belongs in V1.

The V1 `LLMProvider` boundary must allow `OpenAIDirectProvider` to be replaced by an `AskAnywhereProvider` without rewriting chat UI or note behavior.

---

## 36. Provider Failure

If the OpenAI key is missing, invalid, or the provider is unavailable:
- input still appears
- the compact configuration/status control shows a subtle unavailable state
- existing notes remain usable

If send fails:
- show inline error
- show Retry
- preserve question/context/history/partial output

Do not automatically open a provider login flow or fall back to a different provider in V1.

---

## 37. Bottom-Left Page Toolbar

The toolbar is:
- fixed
- bottom-left
- always visible while extension UI is active for the tab
- icons only
- tooltip-driven
- not draggable
- comfortably sized even while idle
- lower opacity when idle
- full opacity on hover/focus
- fixed dimensions

Do not place it top-left.

---

## 38. Toolbar Actions

Default V1 actions:

1. Enable/disable selection-triggered AI
2. Open all notes
3. Collapse all notes
4. Export notes
5. OpenAI configuration/status
6. More menu

All visible toolbar controls use icons only.

---

## 39. Extension Toggle

Toggle OFF:
- normal text selection
- no new AI selection input
- existing pinned notes remain visible
- existing pinned notes remain interactive

Toggle ON:
- text selection triggers the AI input

Toggle state is per-tab only.

---

## 40. More Menu

Secondary page-level actions may include:
- Clear page notes

Avoid turning the toolbar into a large control center.

No large settings page is required in V1. API-key configuration is a small, local-only flow.

---

## 41. Card-Level Menu

Each pinned note has a compact `...` menu.

Possible actions:
- Expand context
- Reselect source
- Collapse / Expand
- Delete note

Secondary note actions belong here, not in the main card body.

---

## 42. Delete

Deleting a pinned note:
- removes it immediately
- removes its source highlight
- shows a short Undo toast

No confirmation dialog.

Undo restores the note and its source anchor when possible.

---

## 43. Export

Only pinned notes are exportable.

Temporary chats are excluded.

Export flow:
- open note-selection UI
- all pinned notes selected by default
- user may deselect individual notes

---

## 44. Export Modes

### A. Knowledge Points — default

Generated locally.

No LLM call.

Each item includes:
- user's first question
- useful answer content
- highlighted source text
- nearby paragraph
- page title
- page URL

### B. Raw Q&A

Generated locally.

Preserve:
- questions
- answers
- source references

No LLM call.

### C. Structured Study Notes

Uses current LLM.

The LLM may:
- group related notes
- create sections
- lightly rewrite explanations
- reduce repetition
- organize into a coherent outline

Must preserve:
- factual meaning
- source association
- source links

Do not produce a generic page summary.

---

## 45. Export Destinations

V1:
- Copy to clipboard
- Download as Markdown

Do not build:
- PDF
- Notion
- Obsidian
- cloud sync

in V1.

---

## 46. Knowledge Philosophy

The export system should emphasize:

**what the user needed clarification on**

rather than:

**generic webpage summarization**

The product captures:

```text
Source
+
Knowledge gap / Question
+
AI explanation
```

and turns those interactions into personalized notes.

---

## 47. Shadow DOM Rendering Architecture

Inject the UI from the content script through a Shadow DOM host.

Conceptually:

```text
Webpage DOM
│
├── Site DOM
│
└── Extension Host
      │
      └── Shadow Root
           ├── Selection Input
           ├── Chat Cards
           ├── Pinned Notes
           ├── Page Toolbar
           ├── Menus
           ├── Tooltips
           └── Toasts
```

Purpose:
- isolate website CSS from extension
- prevent extension CSS leaking into website
- maintain predictable visual behavior

---

## 48. Main Runtime Architecture

```text
Webpage
│
├── Content Script
│   ├── Selection Detection
│   ├── Context Extraction
│   ├── Highlighting
│   ├── Anchoring
│   ├── Positioning
│   ├── Collision Handling
│   ├── DOM/Layout Observation
│   └── Shadow DOM UI
│
├── Zustand UI State
│
├── chrome.storage.session
│
└── Background Service Worker
    ├── Local API-key configuration (`chrome.storage.local`)
    ├── OpenAI provider availability
    ├── Streaming
    └── `OpenAIDirectProvider` behind `LLMProvider`
```

---

## 49. Performance Requirements

The extension must not noticeably degrade host webpage performance.

Requirements:
- no continuous animation-frame position loop
- debounce/coalesce layout recalculation
- narrow MutationObserver scope where possible
- stop unnecessary observers
- use IntersectionObserver where appropriate
- manually collapsed notes should require minimal viewport work
- lazy-load expensive Markdown/code features if needed
- minimize host DOM injection
- keep provider traffic outside host page JavaScript where possible

---

## 50. Accessibility

Minimum V1 requirements:
- all controls keyboard focusable
- visible focus states
- icon buttons have accessible labels
- tooltips support keyboard focus
- Markdown text remains selectable
- Escape closes dropdowns/popovers where expected
- sufficient contrast
- error state is not communicated by color alone

No advanced accessibility settings panel is required.

---

## 51. V1 Non-Goals

Do not build:
- permanent account system
- permanent knowledge library
- cloud note storage
- saved notes across browser sessions
- cross-device sync
- collaboration
- generic AI sidebar
- agents
- RAG
- document uploads
- PDF chat
- email assistant
- automatic page-summary dashboard
- automatic webpage summaries
- Anki integration
- Notion integration
- Obsidian integration
- mobile app
- configurable keyboard shortcuts
- large settings dashboard
- message editing
- conversation branching
- individual message deletion
- link previews
- PDF export

---

## 52. V2 Candidates

Potential V2:
- persistent Saved state
- knowledge library
- cross-session storage
- account sync
- knowledge graph / learning insights
- Notion export
- Obsidian export
- Anki export
- PDF export
- Anthropic API support
- OpenRouter
- Ollama/local models
- AskAnywhere backend for provider routing, credentials, authentication, billing, usage metering, rate limiting, abuse prevention, and observability

Possible state progression:

```text
Temporary
→ Pinned
→ Saved
```

Pinned remains page/session oriented.
Saved becomes permanent.

---

## 53. Main UX State Machine

```text
EXTENSION DISABLED
      │
      │ Toggle On
      ▼
READY
      │
      │ Select Text
      ▼
INPUT
      │
      │ Send
      ▼
GENERATING
      │
      ├── Stop ──────► CHAT
      │
      ├── Complete ──► CHAT
      │
      └── Pin ───────► PINNED_GENERATING
                           │
                           └── Complete
                                 ▼
                              PINNED

CHAT
 │
 ├── Follow-up
 │      ▼
 │   GENERATING
 │
 ├── Pin
 │      ▼
 │   PINNED
 │
 └── Select New Text
        ▼
     DISCARD
        │
        ▼
      INPUT

PINNED
 │
 ├── Manual Collapse → MANUAL_COLLAPSED
 │
 ├── Manual Open → MANUAL_OPEN
 │
 ├── Auto source out of view → AUTO_COLLAPSED
 │
 ├── Drag → update anchor offset
 │
 ├── Resize → update dimensions
 │
 ├── Follow-up → GENERATING
 │
 └── Delete → Undo-capable removal
```

---

## 54. V1 Success Criteria

A user can:

1. install the extension
2. enable it on a webpage
3. highlight text
4. immediately type a question
5. choose context
6. receive a streaming AI answer beside the text
7. stop generation
8. continue with follow-up questions
9. pin the conversation
10. drag and resize pinned notes
11. scroll while notes remain anchored
12. create multiple pinned notes
13. use automatic or manual collapse behavior
14. reload the page without losing current-session notes
15. navigate within an SPA and restore route-scoped notes
16. configure or remove their local OpenAI API key
17. recover from OpenAI configuration and provider errors
18. export selected pinned notes
19. copy export to clipboard
20. download export as Markdown

The experience should feel lighter and more contextual than:
- opening ChatGPT in another tab
- using a permanent AI sidebar

---

## 55. First Engineering Milestone — Completed Browser-Session Feasibility Spike

The browser-session feasibility spike is complete as historical research. Chrome can technically support content-script to service-worker to provider-page messaging, but no documented, production-safe ChatGPT browser-session integration exists for this use case. Do not implement private endpoints, DOM scraping, credential/session-token extraction, UI automation, or other unsupported browser-session techniques.

See `docs/research/authenticated-provider-session-bridge-feasibility.md` for the rationale. This result does not block V1's official OpenAI API-key prototype.

---

## 56. First V1 Implementation Milestone — OpenAI Direct Provider

Before implementing the core UI, validate:

Prototype:

```text
Selected text
      ↓
Content Script
      ↓
Background Service Worker
      ↓
Provider Adapter
      ↓
Official OpenAI API
      ↓
Streaming response
      ↓
Content Script
```

Start with `OpenAIDirectProvider`. It must stream, support cancellation, preserve partial output, and keep the UI provider-neutral. The key is entered locally and never committed, synced, or sent to an AskAnywhere service.

---

## 57. Suggested Implementation Order

### Phase 1 — Direct Provider Prototype
Build:
- WXT project
- Manifest V3 extension
- background worker
- `LLMProvider` and `OpenAIDirectProvider`
- local API-key configuration in `chrome.storage.local`
- streaming response

Goal:
- validate the official OpenAI API-key prototype while preserving the future provider boundary

### Phase 2 — Core Selection UX
Build:
- per-tab toggle
- selection detection
- custom highlight
- smart input positioning
- thin input
- 4-line auto-grow
- context chip
- streaming response
- Markdown rendering

### Phase 3 — Pinned Notes
Build:
- pinning
- source anchoring
- relative offsets
- drag
- resize
- auto-collapse
- manual-open/manual-collapsed
- soft collision avoidance

### Phase 4 — Persistence & Reattachment
Build:
- `chrome.storage.session`
- tab isolation
- same-URL reload restoration
- SPA route state
- aggressive source reattachment
- detached-note behavior

### Phase 5 — Toolbar
Build bottom-left icon toolbar:
- on/off
- open all
- collapse all
- export
- OpenAI configuration/status
- more menu

### Phase 6 — Export
Build:
- pinned-note picker
- Knowledge Points
- Raw Q&A
- Structured Study Notes
- Copy
- Markdown download

### Phase 7 — Polish
Implement:
- Framer Motion transitions
- tooltips
- loading states
- retries
- unavailable-provider states
- Undo delete
- refined card placement
- accessibility
- performance optimization

---

## 58. AI Coding Agent Rules

When implementing:

- Do not invent additional product features unless required by this spec.
- Use `DESIGN.md` as the visual source of truth.
- Do not ship stock shadcn styling.
- Keep provider-specific behavior behind adapters.
- Keep webpage observation scoped and performant.
- Treat the main chat card as one continuous animated object.
- Prefer user intent over automatic behavior.
- Keep the webpage visually dominant.
- Avoid a sidebar architecture.
- Avoid a large settings system in V1.
- Do not implement unsupported browser-session provider automation.
- Treat direct OpenAI API-key access as V1 prototype-only architecture.

Priority order:

1. official OpenAI streaming and cancellation through the provider boundary
2. local API-key configuration
3. interaction quality
4. stability
5. webpage compatibility
6. low performance overhead
7. visual polish
8. export

The central product interaction must remain:

**Highlight → Ask → Pin → Continue Reading.**
