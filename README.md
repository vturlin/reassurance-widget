# Reassurance Widget

An embeddable React toast that hotels paste into their direct-booking
site to show an aggregate guest rating broken down across review
platforms (Booking.com, Google, Tripadvisor, Hotels.com…). Unobtrusive
bottom-left placement, dismissable, persisted-mute for the rest of
the session.

<p align="center"><em>One script tag. Multi-platform reviews. No backend.</em></p>

---

## How it works

1. The hotel deploys a config JSON (e.g. `hm_demo001.json`) containing
   the aggregate score, the per-platform scores and counts, and the
   trigger / position settings. Configs are managed via the admin SPA
   (`hotel-widget-admin`).
2. The widget loads `widget.js?id=<hotelId>` on the host page, fetches
   the matching config from `configs/<id>.json`, and waits for its
   trigger (immediate / time / scroll / time_or_scroll).
3. The toast slides in with the aggregate score, each platform's score
   and progress bar, and a footer trust line.
4. The visitor clicks ×. The toast disappears and a sessionStorage
   flag mutes it for the rest of the session — refresh / inner-page
   navigation in the same tab won't re-open it. A returning visitor
   sees it again next session.

The widget is fully static — no backend dependency, no analytics POST.

---

## Quick start (hotelier)

```html
<div id="reassurance-widget"></div>
<script async src="https://your-cdn/widget.js?id=YOUR_HOTEL_ID"></script>
```

The mount point is optional — if no `#reassurance-widget` (or
`[data-reassurance-widget]`) exists, the widget auto-creates one.

For an inline config (testing): set
`window.REASSURANCE_WIDGET_CONFIG = { … }` before loading `widget.js`.

---

## Configuration reference

Configs are JSON, served from `configs/<hotelId>.json` next to `widget.js`.

| Key                     | Type                          | Description                                                                        |
| ----------------------- | ----------------------------- | ---------------------------------------------------------------------------------- |
| `aggregateScore`        | string                        | Aggregate score shown big in the header (e.g. `"4.8"`).                            |
| `totalReviews`          | string                        | Total review count (e.g. `"1,347"`). Free-form so locales can format it.           |
| `accentColor`           | hex string                    | Accent color for the score badge + progress bars.                                  |
| `footerText`            | string                        | Trust line at the bottom (e.g. `"Verified guest reviews · Updated daily"`).        |
| `platforms`             | `Platform[]`                  | One row per platform. See below.                                                   |
| `position`              | `'bottom-left'` (default) \| `'bottom-right'` \| `'top-left'` \| `'top-right'` \| `'center-left'` \| `'center-right'` | Where the toast pins. |
| `triggerMode`           | `'immediate'` \| `'time'` \| `'scroll'` \| `'time_or_scroll'` | When the toast appears. |
| `triggerDelaySec`       | seconds                       | Delay for time-based triggers (default 5s).                                        |
| `triggerScrollPercent`  | 0–100                         | Scroll-depth threshold (default 50).                                               |

### Platform shape

| Field    | Type     | Description                                                       |
| -------- | -------- | ----------------------------------------------------------------- |
| `id`     | string   | Stable identifier (`"booking"`, `"google"`, …).                   |
| `name`   | string   | Display name (`"Booking.com"`).                                   |
| `short`  | string   | One-or-two-letter dot label (`"B."`, `"G"`).                      |
| `score`  | string   | Score as displayed (`"8.9"` for /10, `"4.8"` for /5).             |
| `scale`  | `'/5'` \| `'/10'` | Drives the progress bar normalisation.                    |
| `color`  | hex      | Dot background.                                                   |
| `count`  | string   | Per-platform review count (free-form).                            |

See `public/configs/hm_demo001.json` for a complete example.

---

## Style isolation

The widget mounts into **Shadow DOM** — host-page CSS can't reach in,
the widget can't leak out. Styles are inline (CSS-in-JS). A single
`<style>` tag is injected on mount to host the keyframes and the mobile
media query.

`prefers-reduced-motion` is honoured — the fade-in animation is
disabled for users with vestibular sensitivity.

---

## Dismiss persistence

Clicking × sets `sessionStorage["reassurance_dismissed_<hotelId>"] = "1"`,
so a refresh / navigation in the same tab won't re-show the toast.
The flag clears when the tab closes — a returning visitor (next day,
next session) sees the reassurance once again.

Multi-hotel scope: the key is hotelId-scoped, so a browser visiting
two D-EDGE hotels in the same session sees each toast independently.

Private-mode browsers that throw on `sessionStorage` access fall back
silently — the toast simply re-shows on refresh in that case (no
crash, no error).

Preview mode (admin iframe) bypasses the dismiss check so the operator
can keep editing without re-opening the iframe.

---

## Preview mode

Same pattern as the other widgets: the admin previews live edits via
`transparent.html?preview=<base64>`. The widget decodes the payload
and bypasses the remote fetch.

The pathname gate (`/transparent.html`) prevents phishing links of the
form `https://hotel.com/?preview=<crafted>` from being honoured outside
the admin iframe.

---

## Development

```bash
npm install
npm run dev       # Vite dev server at :5173, opens demo.html
npm run build     # Produces dist/widget.js + dist/configs/ + dist/demo.html
```

### Project structure

```
├── src/
│   ├── embed.jsx        # Entry: Shadow DOM mount + dismiss persistence
│   ├── Widget.jsx       # Toast component (header / per-platform / footer)
│   └── loader.js        # Config resolution: ?preview= / ?id= / window.REASSURANCE_WIDGET_CONFIG
├── public/
│   ├── demo.html        # Mock hotel landing page
│   ├── transparent.html # Transparent host for the admin preview iframe
│   └── configs/
│       └── hm_demo001.json
├── scripts/
│   └── postbuild.js
├── vite.config.js
└── package.json
```

### Build output

```
dist/
├── widget.js     # ~45 kB min (~16 kB gzip) — React + ReactDOM bundled
├── configs/
└── demo.html
```

---

## Security notes

- No `<a href>` rendered from operator config — no scheme-injection vector.
- No `dangerouslySetInnerHTML` — no XSS surface from operator content.
- `id` query param regex-validated (`^[A-Za-z0-9_-]{3,64}$`) before fetch.
- Config fetch has a 5s `AbortController` timeout.

---

## License

MIT.
