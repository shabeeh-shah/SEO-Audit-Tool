# Changelog

## Unreleased — site-wide audit depth

- Added configurable sitemap-first crawling for 10, 25, or 50 same-origin pages with three-request concurrency and one temporary-failure retry.
- Added a site summary and per-page evidence for broken internal links, redirect chains, canonical conflicts, duplicate titles and descriptions, hreflang, social metadata, security headers, and basic accessibility signals.
- Preserved robots.txt enforcement, redirect-by-redirect public-address validation, response limits, timeouts, rate limits, and the existing SignalAudit User-Agent.
- Added passing and failing site fixtures plus explicit localhost and private-address rejection tests.

## Unreleased — historical audit tracking

- Added per-page history, category score trends, and arbitrary earlier-run comparisons.
- Saved reports reopen as snapshots without rerunning browser measurements.
- Retained existing history, expanded local retention to 100 runs / 3 MB, added backup export and an offline history demo.
- Added validation, storage warnings, and scoring-coverage warnings.


## 0.1.0 — 2026-10-14

Initial documented public beta. This tag identifies a release of the accumulated app, not a claim of production-grade crawling coverage.

- MIT license, updated documentation, landing metadata, social preview, FAQ, and transparent limits.
- Optional, unscored llms.txt; explicit lab/field separation; impact-versus-effort suggestions.
- Bounded sitemap/link discovery (25 pages), sampled duplicate titles, canonical conflicts, hreflang return links, and response-header checks.
- axe-core diagnostics in the isolated browser preview; CrUX integration with an explicit unconfigured state.
- Editable JSON-LD, robots rules, and meta-description drafts.
- Browser-local history and before/after comparisons, JSON/CSV downloads, existing public report links and print-to-PDF.
- CLI package source, reusable GitHub Action, unpacked Chrome extension, and hosted MCP endpoint.

Known limits: CLI is not yet on npm; extension is not in the Chrome Web Store; field data requires a server-side CRUX_API_KEY; isolated preview results can differ from the original page; rate limits are per server instance; discovery and comparisons use bounded page samples.
