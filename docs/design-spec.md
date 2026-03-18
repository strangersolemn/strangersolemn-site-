# Stranger Solemn Art — Design Spec

## Brand Identity
**Name:** Stranger Solemn Art
**Tagline:** Glitch + Code
**Artist:** Solemn — Hybrid Producer & Web3 Architect, Manchester, UK

---

## Aesthetic Direction
Dark, minimal, monospace. The site is a digital gallery for on-chain art — it should feel like a terminal meets a gallery. Clean, no clutter, the art is always the focus.

### Mood
- Dark glitch art gallery
- Terminal / hacker aesthetic — monospace everything
- High contrast: near-black backgrounds, muted text, chain-colored accents
- The art does the talking — UI stays out of the way

---

## Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| Background Primary | `#0a0a0a` | Main background |
| Background Secondary | `#111111` | Panels, cards |
| Background Tertiary | `#1a1a1a` | Hover states |
| Text Primary | `#ffffff` | Headings, emphasis |
| Text Secondary | `#888888` | Body text |
| Text Muted | `#555555` | Labels, meta |
| BTC (Ordinals) | `#f7931a` | Bitcoin orange |
| ETH (Ethereum) | `#627eea` | Ethereum purple |
| TEZ (Tezos) | `#2c7df7` | Tezos blue |
| SOL (Solana) | `#9945ff` | Solana violet |
| Title | `#cccccc` | Light grey for "Stranger Solemn" |

---

## Typography
**Font:** Space Mono (Google Fonts) — monospace, 400/700 weights
**Used everywhere** — headings, body, labels, buttons, nav. No secondary font.

### Scale
- Site title: `0.9rem`, uppercase, `0.1em` letter-spacing, light grey
- Tagline: `0.65rem`, muted grey
- Nav links: `0.6rem`, muted, hover → white
- Collection titles: `1.2rem`, bold
- Chain badges: `0.5rem`, uppercase, bordered, chain-colored
- Meta text (year/count): `0.5rem`, muted, next to badge
- Body text: `0.75–0.85rem`, line-height 1.8–1.9

---

## Layout

### Main Site (index.html)
- **Flex layout:** Main content area (left) + sidebar panel (right, 320px fixed)
- **Main area:** Features rotating artwork — contained, centered, with title/collection/chain overlay on hover
- **Sidebar:** Scrollable timeline of collections grouped by year, search bar at top, chain legend at bottom
- **Grid background:** Subtle 48px grid lines at 0.04 opacity with radial vignette overlay

### Collection Detail View
- **Split:** Artwork display (left) + info panel (right)
- **Info:** Title, chain badge + year/count outside badge, artist note (if any), marketplace links, piece grid (thumbnails)
- **Marketplace links:** Bordered monospace buttons — "Gallery" for BTC, named marketplaces (SuperRare, OpenSea) for ETH
- **Display mode button** per collection — enters fullscreen slideshow locked to that collection

### About Page (about.html)
- **Side-by-side:** Live on-chain artwork iframe (left, full height) + scrollable text panel (right, 460px)
- **Text panel:** Light grey title, subtitle, artist statement, interview placeholder
- **Grid background** on text panel, no overlay on artwork
- **Mobile:** Stacks vertically

### Articles Page (articles.html)
- **Centered column layout** (700px max)
- **Accordion/dropdown sections** using `<details>` elements
- **Q&A format** for interviews — italic questions, regular answers
- **Grid background**

---

## UI Components

### Chain Badge
- Tiny bordered pill: chain name inside (ETH/BTC/TEZ)
- Border + text color matches chain color
- Year and piece count as separate muted text OUTSIDE the badge

### Marketplace Links
- Monospace bordered buttons, transparent background
- Hover: white text + white border
- Examples: Gallery, SuperRare, OpenSea, Display

### Display Mode
- Fullscreen black overlay, artwork centered
- Controls appear on hover: prev, shuffle, next, close
- Per-collection: prev/next cycle through that collection only
- From home: global random across all collections

### Sidebar Nav
- Under title: About, Articles, Cyber Galleries (dropdown)
- Dropdown on hover shows gallery links (The Line, Everyday Strange, etc.)
- All links monospace, muted, hover → white

---

## Visual Details
- **Grid pattern:** 48px squares, rgba white at 0.04 opacity — used on main content, about panel, articles page
- **Radial vignette:** On main content area — fades edges to black
- **Borders:** 1px solid rgba white at 0.06 — very subtle dividers
- **Scrollbars:** Thin (4-6px), light grey
- **No shadows, no rounded corners, no gradients** (except vignette and hover fades)
- **Transitions:** 0.2s ease on color/opacity changes

---

## Pages
1. **index.html** — Main gallery, featured art carousel, sidebar with collections
2. **about.html** — Artist bio + statement, live on-chain artwork hero
3. **articles.html** — Interview, X articles, Medium archive (accordion sections)

---

## Technical Notes
- Static site: HTML, CSS, vanilla JS — no framework, no build step
- Artwork data in JSON files (`collections/*.json`)
- On-chain art rendered as live iframes (data URIs or ordinals content URLs)
- Space Mono loaded from Google Fonts
- Mobile breakpoint at 768px
