# Signal — Website Audit

[![Verify](https://github.com/shabeeh-shah/SEO-Audit-Tool/actions/workflows/ci.yml/badge.svg)](https://github.com/shabeeh-shah/SEO-Audit-Tool/actions/workflows/ci.yml)

Signal audits one public website page and turns its HTML into practical SEO, content, and AI/search-readiness recommendations.

[Live app](https://signal-audit-lab.shabeehshah42.chatgpt.site) · [Report a bug](https://github.com/shabeeh-shah/SEO-Audit-Tool/issues)

## Features

- **SEO foundations:** title, description, headings, alt attributes, HTTPS, canonical tags, language, viewport, indexing directives, and sampled internal links.
- **Content quality:** extracted word count, English reading ease, long paragraphs, repeated sentences, and frequent on-page topics.
- **AI/search readiness:** text availability, content structure, question-led sections, snippet controls, and structured-data opportunities.
- **Actionable output:** weighted category scores, evidence for each finding, filters, a responsive interface, clean PDF printing, shareable reports, and audit comparisons.

## Sample-report mode

Select **Preview offline sample** to open the built-in report. It uses fixed audit data already bundled with Signal and makes no network request, so it works offline and is safe for demos. **Run example.com audit** is different: it audits `example.com` and requires network access.

For a no-install preview, open `demo.html` directly in a browser. It also uses fixed sample data and never sends a request to the entered URL. Saved share links require the live app's database; the local demo shows a clear unavailable message instead.

## Checks and scoring

Signal reports a status for every check. A status is either **Good**, **Improvement**, or **Critical**. Some checks are advisory: they still show evidence and a next step, but are not used in the numeric score.

```text
category score = round(sum(check weight × status points) / sum(check weights))
status points: Good = 100, Improvement = 55, Critical = 0
overall score = round((SEO + Content + AI/GEO) / 3)
```

Checks with weight `0` are advisory. A link check with no conclusive response is also advisory, and readability is advisory when there is not enough declared-English prose to calculate it.

| Category | Check | What it reviews | Weight |
| --- | --- | --- | ---: |
| SEO | Title | A non-empty, single title tag; 20–65 characters is a review guide. Site-wide uniqueness needs a crawl and is not claimed. | 2 |
| SEO | Meta description | A non-empty, single page description; 70–170 characters is a review guide. | 1 |
| SEO | H1 | One non-empty main heading. | 1 |
| SEO | Heading outline | Heading-level jumps such as H1 to H3. | 1 |
| SEO | Image alt attributes | Images that have no `alt` attribute. | 2 |
| SEO | Indexing directives | `noindex` or `none` in meta robots or an applicable X-Robots-Tag. | 2 |
| SEO | Canonical | One usable canonical that resolves to the audited URL. | Advisory |
| SEO | HTTPS | Whether the final audited URL uses HTTPS. | 2 |
| SEO | Viewport | `width=device-width` in the viewport meta tag. | 1 |
| SEO | Language | A `lang` attribute on the HTML element. | 1 |
| SEO | Internal links | A focused sample of internal URLs that return 4xx/5xx responses. | 2 when conclusive |
| SEO | Redirect chains | More than one redirect for the page or a sampled internal link. | 1 |
| SEO | robots.txt | Successful response from `/robots.txt`; contents are not fully validated. | Advisory |
| SEO | sitemap.xml | Successful response from `/sitemap.xml`; contents are not validated. | Advisory |
| SEO | Social cards | Open Graph title, description, image, and Twitter card tags. | Advisory |
| Content | Text volume | Extracted likely-main-content text, with a 100-word review threshold. | 1 |
| Content | Reading ease | English Flesch reading-ease estimate when there are at least 100 words and 5 sentences. | 1 when scored |
| Content | Repetition | Sentences of at least 8 words that appear 3 or more times. | 1 |
| Content | Paragraph length | Paragraphs longer than 120 words. | 1 |
| AI/GEO | Text access | Essential server-delivered text, with a 50-word review threshold. | 2 |
| AI/GEO | Sections | H2 sections that organize the content. | 1 |
| AI/GEO | Answer format | Question-style headings followed by a concise 8–80 word paragraph. | Advisory |
| AI/GEO | JSON-LD | JSON syntax plus Organization, FAQPage, Article, or Product declarations. Invalid JSON-LD is scored. | 1 only for invalid JSON-LD |
| AI/GEO | Author and date | Author and publication/update signals in visible markup, metadata, or JSON-LD. | Advisory |
| AI/GEO | Snippet controls | `nosnippet` or `max-snippet:0` directives. | 1 |
| AI/GEO | AI crawler access | Basic robots.txt rules for GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and CCBot. | Advisory |
| AI/GEO | llms.txt | Successful response from `/llms.txt`; it is an emerging convention. | Advisory |

The crawler, schema, answer, authorship, llms.txt, and social checks are useful structure signals. They do not guarantee indexing, AI visibility, or citations.

## Quick start

**Requirements:** Node.js 22.13 or later.

```sh
git clone https://github.com/shabeeh-shah/SEO-Audit-Tool.git
cd SEO-Audit-Tool
npm ci
npm run dev
```

Open the local URL shown in your terminal. Run `npm run build` for a production build.

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

The app fetches one public HTML page, follows at most three redirects, respects applicable `robots.txt` rules for SignalAudit, and checks up to 8 eligible same-origin links. Each scored check is weighted: Good = 100, Improvement = 55, Critical = 0. Optional opportunities and unavailable checks are excluded. The overall score is the average of SEO, Content, and AI/GEO category scores.

## Scope and safety

The audit does not crawl a full site, reproduce a specific crawler, measure Core Web Vitals, or determine actual search indexing, backlinks, traffic, or AI citations. Scores are useful checklists, not rankings or guarantees.

Only public HTTP(S) URLs without custom ports or credentials are accepted. The audit route limits request and response sizes, rechecks redirects, bounds timeouts and link concurrency, and never forwards user credentials to audited sites. The deployment targets Cloudflare Workers with public-only fetch and `global_fetch_strictly_public` enabled.

## Contributing

1. Create a branch from `main`.
2. Make a focused change with clear, user-facing behavior.
3. Run `npm run typecheck`, `npm test`, and `npm run build`.
4. Open a pull request describing the change and validation.

Please do not open a public issue with a possible security vulnerability. Contact the repository owner privately instead.

## License

No license has been selected yet. Choose a license before accepting external contributions or allowing reuse.
