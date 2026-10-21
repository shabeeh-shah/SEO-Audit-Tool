# Signal workspace

Goal: users should always know where they are, what to do next, and be one click from any feature.

## Implementation and review stages

1. U1: persistent shell, one navigation configuration, report routes, query persistence, grouped badges, mobile navigation. Reviewed type checks, route/encoding tests, lint, and build before commit.
2. U2: shared design tokens, themed primitives, and `/dev/components` gallery. Reviewed component output, type checks, lint, fixtures, and build before commit.
3. U3: compact overview, score-ring links, top fixes, retry advice, skeletons, and finding deep links. Reviewed error fixtures and existing audit tests before commit.
4. U4: action list, evidence, mobile drawer, clipboard examples, completion validation, and row shortcuts. Reviewed local-state validation and all required checks before commit.
5. U5: SEO/content cards, crawler table, performance ranges, competitor structure, sortable page table, and page drawer. Reviewed crawl-display and profile fixtures and all required checks before commit.
6. U6: share dialog, export menu, global feedback, history confirmation, bulk drop input and batch status. Reviewed all required checks before commit.
7. U7: command palette, shortcut help, first-run tour, route focus, responsive screenshots, and browser regression tests. Includes browser-review fixes for labels, dark contrast, preview fallbacks, and mobile navigation.

## Routes and state

Workspace views live at `/report/overview`, `/report/recommendations`, `/report/pages`, `/report/seo-content`, `/report/ai-readiness`, `/report/performance`, `/report/competitors`, `/report/bulk`, `/report/history`, `/report/scoring`, and `/report/checks`.

Navigation uses the browser History API and a subscribed route store to retain mounted feature state. Each path also has a server route for refresh and direct navigation. The `url` query parameter identifies the selected public page. Refresh restores the matching validated local audit when available; it never starts a network audit implicitly. Without a matching local record, the explicitly labeled offline sample remains visible until the user runs the URL. Stateless public share links retain their existing `/report/<encoded-summary>` route.

Theme, dismissed onboarding, completion marks, and audit history are stored only in the browser. Completion marks are a personal checklist and never alter evidence or scores. Bulk/crawl form state stays mounted while navigating; unsubmitted form state and bulk results are not durable across refresh.

## Visual system and accessibility

`components/design-tokens.css` defines both palettes, the 8px spacing scale, radius, shadows, typography, and motion. `components/design-system.tsx` adapts existing shadcn/Radix primitives without editing vendor components. `/dev/components` shows their variants. Route titles receive focus; navigation announces the active page, progress and toasts use live regions, dialogs/drawers manage focus, and reduced-motion preferences disable animated scrolling and transitions.

Keyboard: Cmd/Ctrl+K opens commands, `/` focuses the persistent URL field, `?` opens shortcut help. On a recommendation row, j/k moves, Enter opens, and x toggles done. These row shortcuts do not intercept typing in controls.

## Browser verification

```sh
npm ci
npm run build
npm run test:e2e
```

Local tests use installed Chrome. On CI, install the matching Playwright Chromium with `npx playwright install --with-deps chromium`, then run the same commands with `CI=1`. The suite uses local audit fixtures and stubs external destinations, including LinkedIn. It does not audit arbitrary live sites. It exercises all tabs, refresh/back, fix drawers and completion, clipboard controls, PNG/JSON/CSV/HTML and printable PDF output, history confirmation, bulk errors/results, keyboard navigation, and representative 4.5:1 text/controls contrast in both themes. Screenshots at 390px and 1280px are saved in `docs/screenshots/`.

Browser rendering remains experimental. Progress does not manufacture LCP/CLS measurements or predict crawler output. Bulk requests still return as a bounded batch; the progress list describes submitted URLs until that response arrives. A crawl-check grade equally averages completed Good=100, Improvement=55, Critical=0 checks and is labeled separately from the full audit’s weighted category score.
