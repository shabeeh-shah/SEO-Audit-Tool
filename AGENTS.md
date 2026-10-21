# Signal repository guide

## Stack

- Node.js 22.13 or newer, npm, TypeScript in strict mode, and ESM.
- Vinext `1.0.0-beta.5` provides a Next.js 16 App Router-compatible application on Vite 8.
- React 19 powers the UI. Tailwind CSS 4, shadcn/Radix primitives, Lucide icons, and component-specific CSS provide styling and interaction.
- Server routes run on the Web `Request`/`Response` APIs and are intended for Cloudflare Workers. Shared summaries are stateless, strictly validated URL payloads; the app does not store report snapshots server-side.
- `linkedom` parses fetched HTML, Zod validates browser-stored audit history, and the isolated render route uses the vendored axe-core bundle for limited accessibility diagnostics.
- Tests are executable TypeScript verification scripts using `node:assert/strict` and HTML fixtures rather than a separate test runner.

## Repository map

- `app/`: App Router pages, metadata, OG images, shared-report pages, MCP endpoint, and server API routes.
- `components/`: Signal dashboard features and the vendored shadcn UI primitives in `components/ui/`.
- `hooks/`: browser-only state helpers, including audit-history persistence.
- `lib/audit/`: URL safety, robots handling, HTML analysis, scoring, crawling, comparisons, exports, stateless sharing, field data, history, and shared audit types.
- `scripts/` and `tests/fixtures/`: executable verification scripts and test fixtures.
- `packages/cli/`, `action.yml`, and `extension/`: CLI, composite GitHub Action, and unpacked Chrome extension distribution surfaces.
- `public/vendor/` and `vendor/`: third-party vendored files; preserve their source and licenses.
- `docs/`, `README.md`, and `CHANGELOG.md`: product scope, scoring formula, limitations, and release guidance.

## Commands

Use the lockfile for reproducible installs:

```sh
npm ci
npm run lint
npm test
npm run build
```

Useful additional commands:

```sh
npm run typecheck
npm run dev
npm run preview
```

The CI workflow runs `npm ci`, `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build` on Node.js 22.

## Code style

- Use TypeScript/TSX and ESM imports. Prefer the `@/` alias for application modules.
- Follow the style of the file being edited. First-party audit and feature files generally use single quotes, semicolons, compact helpers, explicit domain types, and functional React components with hooks. Configuration and vendored shadcn files retain their upstream formatting.
- Put shared audit-domain types in `lib/audit/types.ts`; keep network and safety logic in server-side audit modules.
- Client components start with `'use client'`. Keep browser APIs and stateful effects inside client components or hooks.
- Keep route inputs bounded, validate unknown data at boundaries, return plain-English errors, and set `Cache-Control: no-store` for audit responses.
- Findings use stable IDs, one of the existing categories/statuses, concrete evidence, a plain-English recommendation, and an explicit score weight. Weight `0` means advisory.
- Preserve accessible labels, semantic headings, status text, narrow-screen behavior, and offline sample modes.
- Keep tests deterministic. Extend the existing fixture-driven verification scripts or add a focused script and include it in `npm test`.
- Do not reformat or hand-edit vendored shadcn, axe-core, generated migration metadata, or lockfile content unless the dependency or generated artifact is intentionally being updated.

## Required rules

- Never weaken existing URL-safety or SSRF protections. Preserve HTTP/HTTPS-only validation, credential/custom-port/IP/local-domain rejection, DNS public-address checks, redirect-by-redirect validation, timeouts, response-size limits, redirect limits, robots.txt enforcement, rate limits, and the explicit User-Agent.
- Never add a third-party network call without asking the user first. Document the destination, data sent, purpose, timeout, failure behavior, and any credential or privacy implications before implementation.
- Keep every finding evidence-based. State exactly what was observed and the bounded scope of the check. Never claim or imply predictions or guarantees for rankings, traffic, indexing, crawler visits, AI visibility, or AI citations.
- Every new feature needs meaningful tests covering its success path, important edge cases, and applicable safety boundaries.
- Before finishing any change, run `npm run lint`, `npm test`, and `npm run build`. Also run `npm run typecheck` for TypeScript changes.
