# DESIGN.md

## 1. Design Direction

The UI should feel:

- Minimal
- Soft
- Spacious
- Premium
- Calm
- Tool-like rather than app-like
- High contrast without feeling harsh
- Mostly monochrome
- Accent color used sparingly

Avoid:
- dense layouts
- cramped controls
- excessive borders
- strong shadows
- heavy gradients
- too many text labels
- tiny click targets
- generic stock shadcn appearance

The visual language is based on:
- large rounded surfaces
- thin neutral borders
- generous spacing
- clean line icons
- restrained color
- subtle motion

The extension should feel like:

> Lovart's soft tool interface compressed into an annotation layer.

Do not copy Lovart's absolute dimensions. Preserve proportions and visual principles.

---

## 2. Important Implementation Rule

Use:

- shadcn/ui
- Radix UI primitives
- Tailwind CSS
- CSS variables / design tokens

But:

> shadcn is the primitive/component layer, not the visual design system.

All shadcn components must be customized to this file.

Do not ship stock shadcn visuals.

The main chat/note card should be custom.

---

## 3. Core Color Tokens

```css
:host {
  --background: #ffffff;
  --background-subtle: #fafafa;

  --surface: rgba(255, 255, 255, 0.96);
  --surface-solid: #ffffff;

  --foreground: #2c2c2c;
  --foreground-muted: #666666;
  --placeholder: #b7b7b7;

  --border: #e5e5e5;
  --border-strong: #dedede;

  --control-active-bg: #2c2c2c;
  --control-active-fg: #ffffff;

  --accent-blue: #4c8dff;

  --danger: #d14343;
}
```

Use charcoal rather than pure black for normal controls.

Accent colors are reserved for:
- active state
- AI/status emphasis
- notifications
- provider/error states when appropriate

Do not decorate the entire interface with accent color.

---

## 4. Radius Tokens

Rounded geometry is a defining characteristic.

Suggested tokens:

```css
:host {
  --radius-toolbar: 16px;
  --radius-card: 24px;
  --radius-large-panel: 36px;
  --radius-control: 10px;
  --radius-control-active: 12px;
  --radius-menu: 16px;
  --radius-menu-item: 10px;
  --radius-tooltip: 8px;
  --radius-highlight: 3px;
}
```

### Large surfaces

Lovart-like large surfaces:
- approximately 36–44px radius

For our extension:
- thin input: 16–20px
- expanded chat: ~24px
- larger modal/export panel: 32–40px

Do not use small SaaS-card radii like 6–8px on main surfaces.

### Active square controls

Use rounded squares rather than circles:

```css
border-radius: 12px;
```

Do not use `rounded-full` by default.

---

## 5. Spacing System

Use an 8px-based system with 4px increments:

```css
:host {
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 12px;
  --space-4: 16px;
  --space-5: 20px;
  --space-6: 24px;
  --space-7: 32px;
  --space-8: 40px;
}
```

Minimal does not mean cramped.

Rule:

> Fewer controls + comfortable spacing + quiet visual treatment.

---

## 6. Typography

Preferred stack:

```css
font-family:
  Inter,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Do not bundle proprietary fonts solely to imitate Lovart.

### UI text

```css
font-size: 14px;
line-height: 20px;
font-weight: 400;
```

### Input

```css
font-size: 15px;
line-height: 22px;
font-weight: 400;
```

### AI response

```css
font-size: 14px;
line-height: 1.55;
font-weight: 400;
```

### Note title/header

```css
font-size: 13px;
line-height: 18px;
font-weight: 500;
```

Use weights:
- 400 normal
- 500 medium
- 600 sparingly

Avoid overly bold UI.

---

## 7. Borders

Primary:

```css
border: 1px solid var(--border);
```

Hover:

```css
border-color: #d8d8d8;
```

Focus:

```css
border-color: #cfcfcf;
```

Borders should define surfaces more than shadows do.

---

## 8. Shadows

Use shadows sparingly.

### Toolbar

```css
box-shadow:
  0 2px 8px rgba(0, 0, 0, 0.04),
  0 8px 24px rgba(0, 0, 0, 0.04);
```

### Chat card

```css
box-shadow:
  0 4px 16px rgba(0, 0, 0, 0.06),
  0 12px 32px rgba(0, 0, 0, 0.04);
```

### Menu

```css
box-shadow:
  0 8px 24px rgba(0, 0, 0, 0.08);
```

Avoid heavy dramatic shadows.

---

## 9. Icon Style

Use Lucide React.

Recommended:
- 20–24px visual size
- 1.75–2px stroke
- rounded caps
- rounded joins
- consistent family

Typical:

```tsx
size={20}
strokeWidth={2}
```

Primary controls may use 22px icons.

Do not mix multiple icon libraries.

---

## 10. Bottom-Left Toolbar

Position:

```css
position: fixed;
left: 20px;
bottom: 20px;
```

Use a high extension layer without blindly maxing every element.

Suggested z-index hierarchy:

```css
:host {
  --z-highlight: 2147482000;
  --z-note: 2147482500;
  --z-toolbar: 2147483000;
  --z-popover: 2147483100;
  --z-toast: 2147483200;
}
```

### Toolbar surface

```css
.toolbar {
  height: 48px;

  padding: 6px 8px;

  display: flex;
  align-items: center;
  gap: 4px;

  border: 1px solid var(--border);
  border-radius: var(--radius-toolbar);

  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(16px);

  box-shadow:
    0 4px 16px rgba(0,0,0,.05);
}
```

Idle:
```css
opacity: 0.72;
```

Hover/focus-within:
```css
opacity: 1;
```

Transition:
```css
transition: opacity 160ms ease;
```

Important:
- do not shrink when idle
- do not change dimensions
- do not move
- keep click targets comfortable

---

## 11. Toolbar Buttons

```css
.toolbar-button {
  width: 36px;
  height: 36px;

  display: grid;
  place-items: center;

  border-radius: var(--radius-control);
}
```

Hover:

```css
background: #f5f5f5;
```

Pressed:

```css
transform: scale(.96);
```

Selected:

```css
background: var(--control-active-bg);
color: var(--control-active-fg);
border-radius: var(--radius-control-active);
```

Selected state should resemble Lovart's dark rounded-square active control.

---

## 12. Toolbar Dividers

Use subtle separators only between meaningful groups.

```css
.toolbar-divider {
  width: 1px;
  height: 28px;
  background: var(--border);
  margin-inline: 4px;
}
```

Do not add separators between every icon.

---

## 13. OpenAI Configuration Control

The toolbar's OpenAI configuration control should be an icon plus a compact local-only popover or dialog.

It shows configured/unavailable status but does not offer provider switching in V1. Do not permanently display the API key or a long provider name.

Recommended:

```css
.provider-config {
  height: 36px;
  min-width: 48px;
  padding-inline: 8px;
  border-radius: 10px;
}
```

Dropdown:

```css
.provider-config-panel {
  min-width: 180px;
  padding: 6px;

  border: 1px solid var(--border);
  border-radius: 16px;

  background: #ffffff;
}
```

Item:

```css
.provider-config-action {
  height: 38px;
  padding-inline: 10px;
  border-radius: 10px;
}
```

---

## 14. Initial Selection Input

Recommended:

```css
.selection-input {
  width: 420px;
  max-width: min(420px, calc(100vw - 32px));

  min-height: 44px;

  padding: 8px 10px 8px 16px;

  border: 1px solid var(--border);
  border-radius: 16px;

  background: rgba(255, 255, 255, 0.98);

  box-shadow:
    0 4px 16px rgba(0,0,0,.05);
}
```

Target initial height:
- ~44–48px

Input text:
```css
font-size: 15px;
line-height: 22px;
```

The text area:
- starts at 1 line
- grows to 4 lines max
- scrolls internally afterwards

---

## 15. Expanded Chat Card

Recommended:

```css
.chat-card {
  width: 420px;

  min-height: 44px;
  max-height: min(480px, calc(100vh - 48px));

  border: 1px solid var(--border);
  border-radius: 24px;

  background: rgba(255,255,255,.98);

  box-shadow:
    0 4px 16px rgba(0,0,0,.06),
    0 12px 32px rgba(0,0,0,.04);
}
```

Do not expand infinitely.

Typical max:
- 420–480px
- additionally constrained by viewport

---

## 16. Card Internal Spacing

Suggested:

```css
.chat-header {
  padding: 12px 16px;
}

.chat-body {
  padding: 4px 16px 16px;
}

.chat-footer {
  padding: 10px 12px 12px;
}
```

Message gap:
- 14–16px

Avoid placing content directly against card edges.

---

## 17. Context Chip

Context chip should be compact, quiet, and clickable.

Suggested:

```css
.context-chip {
  height: 28px;
  padding-inline: 9px;
  border-radius: 9px;
  background: #f5f5f5;
  font-size: 12px;
  line-height: 16px;
}
```

Avoid making it look like a large CTA.

---

## 18. Source Highlight

Use a subtle highlight.

Example:

```css
background: rgba(255, 220, 80, 0.28);
border-radius: 3px;
```

Pinned highlight may be slightly stronger than temporary.

Do not use fluorescent yellow or thick outlines.

---

## 19. Menus / Popovers

```css
.menu {
  padding: 6px;

  border: 1px solid var(--border);
  border-radius: 16px;

  background: #ffffff;

  box-shadow:
    0 8px 24px rgba(0,0,0,.08);
}
```

Menu item:

```css
.menu-item {
  min-height: 38px;
  padding-inline: 10px;
  border-radius: 10px;
}
```

Hover:
```css
background: #f5f5f5;
```

Destructive action:
```css
color: var(--danger);
```

Do not make the full destructive row bright red.

---

## 20. Tooltips

Because the toolbar is icon-only, tooltips are mandatory.

```css
.tooltip {
  padding: 6px 9px;

  border-radius: 8px;

  font-size: 12px;
  line-height: 16px;

  background: #2c2c2c;
  color: #ffffff;
}
```

Tooltip delay:
- about 350–500ms

Do not show tooltips instantly on incidental hover.

---

## 21. Focus States

Avoid harsh browser-default focus rings if possible, but preserve accessibility.

Suggested:

```css
box-shadow:
  0 0 0 3px rgba(0, 0, 0, 0.05);
```

Do not remove focus indication.

---

## 22. Motion Principles

Motion should communicate state changes, not decorate.

### Card appearance

```text
opacity 0 → 1
scale .98 → 1
translateY 3px → 0
duration 160–220ms
```

### Input → chat expansion

Animate the same card.

Target:
- ~200–280ms
- smooth / spring-like
- no component swap

### Pin

```text
scale 1 → .985 → 1
~180ms
```

### Collapse

- fade body slightly
- animate height
- leave header
- ~180–240ms

### Reposition

When source moves:
- animate old position to new
- ~150–220ms
- avoid exaggerated bounce

---

## 23. Framer Motion Guidance

Prefer Framer Motion layout animations for the core card.

Conceptual:

```tsx
<motion.div
  layout
  transition={{
    layout: {
      duration: 0.22,
      ease: [0.25, 1, 0.5, 1],
    },
  }}
>
```

Exact easing may be tuned.

Do not overuse spring/bounce effects.

---

## 24. Surface Hierarchy

### Webpage
The host webpage remains visually dominant.

### Pinned note
Visible, readable, but still an overlay.

### Active chat
Strongest extension elevation/focus.

### Collapsed note
Minimal elevation; header only.

### Menu/popover
Highest temporary elevation.

The extension should not visually turn the host webpage into background content inside our app.

---

## 25. Responsive / Viewport Rules

Minimum viewport margin:
- 12px

Preferred:
- 16px

Card width:

```css
width: min(420px, calc(100vw - 32px));
```

Placement priority:
1. right
2. top
3. bottom

Never allow the active card to render outside the viewport if another placement is viable.

---

## 26. Shadow DOM Isolation

Render extension UI inside a Shadow DOM.

Conceptually:

```html
<div id="ai-web-annotation-root">
  #shadow-root
</div>
```

A host reset may use:

```css
:host {
  all: initial;

  font-family:
    Inter,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}
```

Be careful that reset rules do not break:
- accessibility
- form behavior
- inherited values intentionally set inside the extension

---

## 27. Interaction Density Rule

When choosing between:
- more controls
- fewer, better controls

prefer fewer.

Do not interpret minimalism as tiny.

Target:
- 36px toolbar hit areas
- 44–48px input height
- readable 14–15px text
- deliberate whitespace

---

## 28. Icon-Only Philosophy

The bottom-left toolbar contains icons only.

Text belongs in:
- tooltips
- menus
- dialogs
- chat content

Do not permanently label toolbar actions.

---

## 29. Lovart Reference Proportions

From the provided screenshots, approximate visual characteristics are:

### Toolbar reference

- large pill-like rounded surface
- approximately 1px neutral border
- very soft shadow
- large comfortable icon spacing
- active controls use dark rounded squares
- icons approximately 26–30px in the original screenshot
- toolbar radius approximately 30px at the original scale

For our smaller extension toolbar, preserve proportions rather than literal size.

### Composer reference

- large rounded white surface
- approximately 40–44px radius at original scale
- strong internal whitespace
- 1–2px subtle neutral border
- little or almost no visible shadow
- text inset generously from edges
- controls spaced along the lower edge

For our compact input/chat, retain the breathing room without copying the oversized dimensions.

---

## 30. Final Visual Rule

When uncertain between:

A. adding another visible control

or

B. placing the action behind a tooltip/menu/context interaction

prefer B unless the action is essential to:

**Highlight → Ask → Read → Pin → Continue.**

The extension should feel quiet, polished, and integrated into the webpage rather than like a separate dashboard floating on top of it.
