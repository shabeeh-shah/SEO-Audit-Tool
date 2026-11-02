# Navigation and accessibility verification

Verified against the local production build on November 2, 2026. All 83 applicable Playwright checks passed, with one expected skip for a mobile-only check on desktop. One desktop scan timed out during typing and passed unchanged on retry (12.2 seconds). Typecheck, unit verification, lint, and production build also passed; the two image advisories below remain.

## Navigation helpers

- Cmd/Ctrl+K opens a searchable command dialog for every enabled tab, new-audit entry, theme, PDF/HTML/JSON/CSV exports, and GitHub.
- Arrow keys wrap through matching commands; Tab/Shift+Tab also work. Enter executes a command. Empty searches explain how to recover.
- `/` focuses the persistent URL input. `?` opens the shortcut sheet. Single-key shortcuts do not intercept typing, IME composition, or other dialogs.
- The three-step, non-modal welcome tour points to the URL field, desktop sidebar or mobile tabs, and Top fixes. Escape or Dismiss ends it. Completion is saved locally; the shortcuts sheet offers replay.
- If no report exists, the last tour step opens the labeled offline sample, without requesting a website audit.

## Fixes made during verification

- Added keyboard selection and empty results to the palette, with explicit focus after navigation or new-audit selection.
- Prevented global shortcuts from opening competing dialogs or stealing editable-field input.
- Made the skip link focus the main landmark. Added named navigation landmarks and a breadcrumb landmark, retaining active-item `aria-current`.
- Preserved focus on route changes, deep-linked findings, mobile More navigation, and dialog dismissal. Share follow-up actions focus their intended destination.
- Added tour focus, Escape dismissal, target highlighting/descriptions, responsive positioning, and replay.
- Kept audit progress and notification announcements in polite live regions.
- Disabled UI animation and transitions for reduced-motion preferences.
- Corrected small-label, notification, preview, content-delivery, competitor, history, table, and dialog colors in both themes. Dark-mode panels now use matching foreground and background tokens.
- Removed the stale render-effect dependency and unused-body-text lint warnings without changing rendering or scoring behavior.

## Automated coverage

Run after `npm run build`:

```sh
npm run typecheck
npm run lint
npm test
npm run test:e2e
```

Playwright runs Chromium-based desktop (1280 × 900) and mobile (390 × 844) projects. Audit, crawl, and bulk responses use deterministic fixtures. Existing unit verification retains URL-safety, robots, private-address, redirect, and export checks.

The browser suite covers running and cancelling audits; all tabs; deep links, refresh, Back and Forward; finding details and local completion; sharing and exports; mobile bottom navigation; keyboard-only operation; onboarding persistence and replay; focus restoration; live regions; and reduced motion.

Every view, the initial landing page, and the main dialogs are scanned using the vendored axe-core bundle with WCAG 2 A/AA and WCAG 2.1 A/AA rules. A separate check requires at least 4.5:1 for rendered UI text in the tested views in both themes, including large text. It composites background colors and excludes hidden and disabled controls. It does not judge text embedded inside audited-site preview images.

Screenshots are saved under `docs/screenshots/`, including `navigation-palette-*`, `navigation-tour-*`, `overview-*`, `recommendations-*`, `dark-*`, and analysis/output views at both widths.

## Remaining verification limits

- Automated browser checks are not a complete accessibility assessment. Manual screen-reader checks with VoiceOver/NVDA and real-device testing remain to be done.
- Two existing `next/no-img-element` advisories remain for page-provided preview media. Those images use browser image loading; no server-side image-optimization network calls were added.
- The production hosting update is separate from local verification. An existing automatic approval-review block prevents transmitting the Sites repository credential through its source helper, so these changes must not be described as published until deployment succeeds.
