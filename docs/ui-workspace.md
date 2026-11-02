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

Navigation entries are defined in `lib/workspace-nav.ts`. Only implemented views are listed today. Setting an entry’s `enabled` flag to `false` renders a non-interactive “Soon” item and excludes it from command-palette actions. Mobile More opens a bottom sheet below 768px. Back/Forward restores the query-selected local report or an explicitly labeled sample if unavailable, without submitting another audit.

## First run and evidence links

The overview initially shows a focused URL form, one primary Run audit action, and a secondary See sample action. Sample results appear only after an explicit request. Trust text says no server-side storage, while disclosing browser-local history. The persistent toolbar remains available.

While the bounded audit request is pending, fetching and resource checks are shown as in progress together: the JSON endpoint does not expose individual progress events. Steps do not advance on a timer. Once the response arrives, scoring is complete and isolated rendering is tracked separately. Skeletons stand in for results during the request. Cancel aborts the request or removes the lab frame; late responses cannot replace the visible result. Unavailable lab measurements remain unscored.

Category rings, Top 3 fixes, strengths, and SEO/content findings link to the appropriate analysis route with a validated `finding` query parameter. The expanded evidence panel includes why the check matters, the specific fix, an illustrative example, Copy fix, and Track this fix. The latter opens the existing completion workflow. Unknown IDs and findings from another category do not open an unrelated panel. Refresh and Back/Forward preserve selection. Each screen’s Next step is based on its role and current findings rather than the same generic action everywhere.

## Recommendations action queue

Status and category chips combine without changing the underlying audit. Actionable Critical and Improvement findings appear first, followed by Good and Optional checks. Within those groups, default ordering is descending editorial impact, then ascending effort; the alternative orders by effort, then impact. Exact ties resolve consistently by status and check ID. These are editorial estimates, not predicted traffic gains or implementation hours. Other report priority lists retain their existing ordering.

Completion counts every check, including Good and Optional, across all filters. Only valid finding IDs are persisted under the page's browser-local completion key; the marks never affect scores or findings. The all-done state asks users to verify changes with another audit. Storage failures retain marks in memory and show a notice. Browser storage events synchronize the checklist across tabs.

Each row supports j/k (wrapping), Enter to open, and x to toggle completion while the row itself has focus. Typing and interaction inside child controls are left alone. Expanded evidence is inline on desktop and in a focus-managed mobile drawer; closing removes the finding selection from the URL. Snippets are rendered as escaped text and provide a Copy fix action with failure feedback.
