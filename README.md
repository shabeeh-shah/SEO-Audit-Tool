# Signal — Website Audit

[![Verify](https://github.com/shabeeh-shah/SEO-Audit-Tool/actions/workflows/ci.yml/badge.svg)](https://github.com/shabeeh-shah/SEO-Audit-Tool/actions/workflows/ci.yml)

Signal audits one public website page and turns its HTML into practical SEO, content, and AI/search-readiness recommendations.

[Report a bug](https://github.com/shabeeh-shah/SEO-Audit-Tool/issues)

## Features

- **SEO foundations:** title, description, headings, alt attributes, HTTPS, canonical tags, language, viewport, indexing directives, and sampled internal links.
- **Content quality:** extracted word count, English reading ease, long paragraphs, repeated sentences, and frequent on-page topics.
- **AI/search readiness:** text availability, content structure, question-led sections, snippet controls, and structured-data opportunities.
- **Actionable output:** weighted category scores, evidence for each finding, filters, a responsive interface, and a downloadable standalone HTML report.

## Quick start

**Requirements:** Node.js 22.13 or later.

```sh
git clone https://github.com/shabeeh-shah/SEO-Audit-Tool.git
cd SEO-Audit-Tool
npm ci
npm run dev
```

Open the local URL shown in your terminal. Run `npm run build` for a production build.

## Standalone demo

Open `demo.html` directly in any browser for a polished, no-install preview of the product. It uses fixed sample data and never sends a request to the entered URL.

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start local development. |
| `npm run typecheck` | Validate TypeScript. |
| `npm test` | Run audit parsing, safety, and export checks. |
| `npm run preview` | Preview the production build locally. |
| `npm run build` | Build the application. |
| `npm run lint` | Run ESLint. |

## How audits work

The app fetches one public HTML page, follows at most four redirects, and checks up to 12 eligible same-origin links. Each scored check is weighted: Good = 100, Improvement = 55, Critical = 0. Optional opportunities and unavailable checks are excluded. The overall score is the average of SEO, Content, and AI/GEO category scores.

## Scope and safety

The audit does not execute audited-page JavaScript, crawl a full site, inspect `robots.txt`, measure Core Web Vitals, or determine actual search indexing, backlinks, traffic, or AI citations. Scores are useful checklists, not rankings or guarantees.

Only public HTTP(S) URLs without custom ports or credentials are accepted. The audit route limits request and response sizes, rechecks redirects, bounds timeouts and link concurrency, and never forwards user credentials to audited sites.

## Contributing

1. Create a branch from `main`.
2. Make a focused change with clear, user-facing behavior.
3. Run `npm run typecheck`, `npm test`, and `npm run build`.
4. Open a pull request describing the change and validation.

Please do not open a public issue with a possible security vulnerability. Contact the repository owner privately instead.

## License

No license has been selected yet. Choose a license before accepting external contributions or allowing reuse.
