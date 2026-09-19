# Signal

Signal turns one public page URL into an actionable website audit across SEO foundations, content quality, and AI/search readiness.

## What it checks

- Page titles, meta descriptions, headings, canonical declarations, HTTPS, language and viewport tags
- Image alt attributes, indexing and snippet directives, structured-data JSON syntax, and up to 12 same-origin links
- Extracted word count, English reading ease, long paragraphs, repeated sentences, and common page topics
- Text availability and content structure for AI/search discovery without claiming ranking or citation predictions

Each finding includes observed evidence, a next step, and a Critical, Improvement, or Good priority. The client can download a complete standalone HTML report, which can be printed to PDF.

## Run locally

Use Node 22.13 or later:

```sh
npm ci
npm run dev
```

Run `npm run build` to create the Cloudflare Worker and browser assets.

## Scope and safety

The audit reads server-delivered HTML for one page and samples up to 12 eligible internal links. It does not execute audited-page JavaScript, crawl a full site, inspect robots.txt, measure Core Web Vitals, or determine actual indexing, backlinks, traffic, or AI citations. Scores are app-defined weighted checks, not rankings.

The endpoint accepts only public HTTP(S) URLs without custom ports or credentials, limits request and response bodies, checks redirect destinations, bounds link concurrency and timeouts, and forwards no user credentials to audited websites. It is intended for Cloudflare Workers with default public-only fetch and `global_fetch_strictly_public`; a Node or private-network deployment needs independent outbound egress protections.

## Verification

TypeScript validation and the audit fixture suite cover extraction, scoring, robots directives, link sampling, address restrictions, real public fetches, and escaped report export. The browser flow was checked for live results, filters, expanded evidence, mobile layout, download completion, and its WebMCP audit action.
