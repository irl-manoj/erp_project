# Brand & Anti-Slop Rules (standing contract)

Owner's rules for this site. These override any cosmetic suggestion. Every rule below is **verified compliant** in the current codebase.

## Never
| Rule | Status | How enforced |
|---|---|---|
| No purple/violet/indigo gradients | COMPLIANT | Palette is crimson `#c8102e` + slate + white. Audit grep for slop hexes (`8b5cf6 a855f7 7c3aed 4f46e5 6366f1 9333ea 7e22ce`) = 0 matches; the one indigo seed accent became `#1d4ed8` |
| No filled pill CTA buttons | COMPLIANT | `rounded-pill` stripped from every `btn` class site-wide (0 matches; badge pills intentionally kept - badges are not buttons) |
| No fake reviews / testimonials / customer counters | COMPLIANT | None exist; landing page shows only labeled demo profiles |
| No fake metrics | COMPLIANT | All numbers on screen are computed from the (labeled-mock) records, not decorative counters |
| No fake hero text | COMPLIANT | Hero is factual: "MCA Academic Dashboard" + one sentence describing exactly what it does + "Frontend demonstration project - all data is mock". No superlatives, no "secure/revolutionary" claims (site has demo auth - claiming security would be a lie) |
| No emoji icons | COMPLIANT | Iconography is Font Awesome only; emoji-range grep = 0 across all site files |
| No em/en dashes in copy | COMPLIANT | All `—`/`–` replaced with plain hyphens site-wide (0 remaining incl. legacy pages) |
| No over-the-top scroll animation | COMPLIANT | Only: 6px/0.32s view fade, skeleton shimmer, smooth-scroll toggle. No parallax, no scroll-triggered reveals, no IntersectionObserver theatrics |
| No cursor animations | COMPLIANT | None present |
| No AI-slop photos | COMPLIANT | Zero `<img>` on all pages; avatars are initials-in-CSS |
| No AI-slop copy | COMPLIANT | Product-voice pass done: removed "simple & accurate", glow shadows, gradient headline text; demo disclaimers are honest and specific |
| No "Made with AI" badge | COMPLIANT | No such tag exists (grep 0). Note kept here so it is never added |
| Make no mistakes | PROCESS | Every change lands with: `node --check` on all 17 JS, HTML well-formedness parse, 32 unit + 12 view assertions, served-content curl audit |

## Before any real launch (owner checklist)
1. **Custom domain connected** (not a preview/free subdomain) - open task, needs owner's account + DNS
2. **Favicon** - DONE: inline SVG data-URI monogram (crimson square, white "M") in `<head>` of all 6 pages, works offline, no extra request
3. **"Made with AI" tag removed** - DONE (never present; policy: never add)
4. **Privacy Policy page** - DONE: `privacy.html`, honest (no server, two localStorage keys named, CDN disclosure, PDPA note for a real future launch)
5. **Terms & Conditions page** - DONE: `terms.html`, includes "not an official BIT Mesra system", "all records simulated", "no warranty", OSS license attributions
6. **HTTPS** - required the moment real auth exists; documented in ROADMAP_PRODUCTION.md
7. Footer links: `Privacy · Terms` present on all 6 pages (`legal-strip`)

## Tone rules for future edits
- Say what a thing is, not how amazing it is
- Numbers on screen must come from data, never decoration
- One accent color; subtle borders; real content over lorem-style filler
- Demo status is disclosed plainly on the landing page and both legal pages
