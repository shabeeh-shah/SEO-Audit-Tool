# v0.1.0 release checklist

This release includes the app, CLI source, reusable GitHub Action, and unpacked extension. The CLI and Chrome extension have separate distribution steps; a GitHub release does not publish them to their registries.

1. Run `npm run typecheck`, `npm test`, and `npm run build`.
2. Verify the offline sample, Optional llms.txt, downloads, metadata, FAQ, and public audit UI.
3. Build the CLI tarball with `npm pack ./packages/cli --ignore-scripts`. Zip the `extension` directory for the release.
4. Push the reviewed main commit, tag it `v0.1.0`, and create a GitHub release from the same commit. Include the CLI tarball and extension ZIP, with the limits from CHANGELOG.md.
5. For npm publication, sign in to the intended npm account, verify ownership/availability of the package name, and follow npm’s trusted publishing or MFA flow. Rename/scope the package if necessary. Only then advertise `npx signal-audit`.
6. For Chrome Web Store publication, submit from the owner’s developer account with accurate privacy disclosures and required screenshots. Do not advertise a listing before approval.
7. Configure server-side `CRUX_API_KEY` using a Google Cloud key enabled for Chrome UX Report, then verify a real record and the insufficient-data state. The UI remains explicitly unconfigured until then.

Repository metadata:

- Description: Signal — SEO and AI search readiness audits with evidence, transparent scores, competitor insights, and practical fixes.
- Website: https://signal-audit-lab.shabeehshah42.chatgpt.site
- Topics: seo, seo-audit, geo, ai-search, llms-txt, nextjs

MIT applies to Signal’s source. Vendored axe-core retains MPL-2.0. The project does not claim ratings, stars, forks, or guaranteed results.
