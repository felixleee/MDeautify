---
title: MDeautify User Guide
subtitle: The easiest way to turn Markdown (.md) into a clean PDF
kicker: MD2PDF USER GUIDE
Version: v1.0
Date: 2026-07-06
Audience: MDeautify users
---

## A. MDeautify

**MDeautify** (aka *md2pdf*) is a tool that turns Markdown documents (`.md`) into **clean, page-by-page PDFs**.

No complex setup or design work required — just write in Markdown as you normally would and load the file. It automatically arranges everything neatly, from the cover to body text, tables, code blocks, and diagrams.

This guide itself was made with MDeautify. In other words, **the cover, headings, tables, code, and diagrams you see here are all real examples of "this is how it looks when you write it in Markdown."** These aren't mockups or sample images — the document you're reading *is* the actual output.

> **"Just drop in Markdown, and out comes a report-like PDF."**


## B. Basic Workflow

```mermaid
flowchart TD
A["Open MD file<br>Drag a .md file onto the dashed box"] --> B["Check the preview<br>See the real PDF layout on the right"]
B --> C["Adjust PDF settings<br>Change theme, font, and footer to taste"]
C --> D["Save / Print PDF<br>Click the save button at the top"]
D --> E["Save as PDF<br>Pick 'Save as PDF' as the destination"]
```

1. **Open MD file** — Drag a `.md` file onto the center dashed box, or click the `Open MD file` button.
2. **Check the preview** — The real PDF layout appears on the right, page by page.
3. **Adjust PDF settings** — Change color, font, and footer to taste under `PDF settings` at the top.
4. **Save PDF** — Click `Save / Print PDF` at the top and choose **"Save as PDF"** in the printer dialog. (See section F for details.)

## C. Exploring PDF Settings

Click the **`PDF settings`** button at the top to adjust the items below. (Close the settings window with **X, a click outside, or Esc**.)

| Setting | Description |
|---|---|
| Color theme | 8 presets + `Custom` (any color you like). Applies heading, table-header, and accent-line colors across the whole document |
| Body font | Choose between Noto Sans / Pretendard |
| Base font size | 10–20px. **The whole document scales proportionally** to this value |
| Page footer | Text at the bottom of each page. Supports the `{pageNumber}` and `{totalPages}` variables |
| Remember my settings | When on, remembers the settings below for the next launch |

**What "Remember my settings" covers**

- Remembered: color theme · body font · base font size · page footer
- Always kept separate: **Dark mode** (it's a toggle outside the settings window, so it's saved independently of this switch)

## D. Supported Markdown Syntax

From here on, we show things as **"write it like this (code on the left) → it comes out like this (result below)."**

### Headings and section badges

Heading size is set by the number of `#`. In particular, **putting a letter like `A.` or `B.` in front of a heading adds a number badge** (like the A, B, C… in this document).

```
# Largest heading
## A. Add a letter to get a badge
### Subheading
```

### Emphasis

```
**bold**, *italic*, ~~strikethrough~~, and `inline code`
```

Comes out as → **bold**, *italic*, ~~strikethrough~~, and `inline code`

> ⚠️ **Strikethrough note**: Strikethrough uses **two** tildes `~~like this~~`.
> A **single** tilde is treated as a number range (e.g., 166~169) and left as-is.

### Lists

```
- Unordered item
  - Sub-item via indentation
1. Ordered item
2. Second
```

- Unordered item
  - Sub-item via indentation
1. Ordered item
2. Second

### Tables

```
| Name | Role |
|---|---|
| Alice | Author |
| Bob | Reviewer |
```

| Name | Role |
|---|---|
| Alice | Author |
| Bob | Reviewer |

> Tip: If a table spans multiple pages, **the header row repeats automatically on the next page**.

### Code blocks

**Adding a language name (`js`, `python`, `sql`, etc.) turns on syntax highlighting.** Wrapping with just ``` and no language shows it in a single color. (That's why the "how to write" examples in this guide are single-color, while the "actual result" is colored.)

**How to write it (type this):**

````
```js
// greeting function
function hello(name) {
  const msg = "Hi, " + name;
  return 42;
}
```
````

**Actual result (shown like this — comments, keywords, strings, numbers, and function names in distinct colors):**

```js
// greeting function
function hello(name) {
  const msg = "Hi, " + name;
  return 42;
}
```

### Blockquotes and dividers

```
> This is a blockquote.

---
```

> This is a blockquote.

---

### Links

```
[MDeautify guide](https://example.com)
```

[MDeautify guide](https://example.com)

### Checklists (to-do lists)

Use `- [ ]` (empty) / `- [x]` (checked) to build a checkbox list.

```
- [x] Done
- [ ] To do
```

- [x] Done
- [ ] To do

### Diagrams

Draw diagrams with a `mermaid` code block. **Three types are supported: flowchart · sequenceDiagram · erDiagram.** (Any other type is shown with an "unsupported diagram" notice alongside the original code.)

**① Flowchart** — Supports direction (`TD` vertical / `LR` horizontal), branching, decision diamonds (`{ }`), and arrow labels.

````
```mermaid
flowchart TD
A[Start] --> B{Condition?}
B -->|Yes| C[Process]
B -->|No| D[End]
C --> D
```
````

Renders like this:

```mermaid
flowchart TD
A[Start] --> B{Condition?}
B -->|Yes| C[Process]
B -->|No| D[End]
C --> D
```

Node shapes: `[rectangle]` · `(rounded)` · `([stadium])` · `{diamond}` · `((circle))` / change the first line to `flowchart LR` to make it flow horizontally.

**② Sequence (sequenceDiagram)** — Shows the order of messages exchanged between participants. `-->>` is a dashed (response) arrow.

````
```mermaid
sequenceDiagram
User ->> App: Open MD file
App ->> App: Render preview
App -->> User: Save PDF
```
````

Renders like this:

```mermaid
sequenceDiagram
User ->> App: Open MD file
App ->> App: Render preview
App -->> User: Save PDF
```

**③ ER diagram (table relationships)** — Symbols like `||--o{` express the **cardinality** of a relationship. `||`=one, `o{`=zero or more (N), `|{`=one or more → e.g., `USER ||--o{ ORDER` means "one user has many orders."

````
```mermaid
erDiagram
USER ||--o{ ORDER : places
USER {
  int id PK
  string name
  string email
}
ORDER {
  int id PK
  int user_id FK
  date created
}
```
````

Renders like this (with `1` / `0..N` shown at each end of the relationship line):

```mermaid
erDiagram
USER ||--o{ ORDER : places
USER {
  int id PK
  string name
  string email
}
ORDER {
  int id PK
  int user_id FK
  date created
}
```

## E. Making a Cover Page

Put an info block wrapped in `---` at the **very top** of the document, and a **cover page** is created automatically (like the first page of this document).

````
---
title: Our Company Proposal
subtitle: First Half of 2026
kicker: NEW PLATFORM PROJECT
Date: 2026-07-03
Author: John Doe
---
````

- `title` and `subtitle` appear large on the cover; `kicker` is a small label at the top.
- Any other fields (Date, Author, etc.) are organized into an **info table** below the cover.

## F. Saving as a PDF

1. Click the **`Save / Print PDF`** button at the top.
2. When the print dialog opens, choose **`Save as PDF`** as the destination. (**Avoid `Microsoft Print to PDF` — it drops hyperlinks.**)
3. Click `Save`, choose a location, and you're done.

*This document was created with MDeautify.*
