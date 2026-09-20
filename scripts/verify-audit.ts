import assert from "node:assert/strict";

import { analyzePage, discoverLinks } from "../lib/audit/analyze";
import { createFetcher, normalizeUrl, publicAddress, readHtml } from "../lib/audit/fetch";
import { reportHtml } from "../lib/audit/export";

const fixture = `<!doctype html><html lang="en"><head><title>Honest Studio — Accessible web design</title><meta name="description" content="We create useful websites for independent businesses, combining clear content, accessible design, and thoughtful engineering."><meta name="robots" content="max-image-preview:none"><meta name="viewport" content="width=device-width, initial-scale=1"><script type="application/ld+json">{"@type":"Organization","name":"Studio"}</script></head><body><nav>EXCLUDED NAV TEXT</nav><main><h1>Websites for independent businesses</h1><h2>Our process</h2><p>${"Clear writing helps people understand the information they need today. ".repeat(4)}</p><h2>What makes a website useful?</h2><p>${"Useful websites help people find answers. Good headings explain each section. We build pages with care. Our team reviews every detail. Everyone can use clear instructions. ".repeat(3)}</p><img src="one.png"><img src="two.png" alt=""><a href="/about#one">About</a><a href="/about#two">About again</a><a href="https://elsewhere.com">Outside</a><a href="/missing">Missing</a><a href="/brochure.pdf">PDF</a></main><footer>EXCLUDED FOOTER</footer></body></html>`;

const audit = analyzePage(fixture, "https://studio.com/", {
  links: [{ url: "https://studio.com/missing", status: 404, state: "broken" }],
});

assert.equal(audit.metrics.missingAlt, 1);
assert.equal(audit.metrics.images, 2);
assert.equal(audit.metrics.h2, 2);
assert(audit.metrics.readingEase !== null);
assert.deepEqual(audit.metrics.schemaTypes, ["Organization"]);
assert.equal(audit.findings.find((finding) => finding.id === "indexing")?.status, "good");
assert.equal(audit.findings.find((finding) => finding.id === "links")?.status, "critical");
assert.equal(audit.findings.find((finding) => finding.id === "repetition")?.status, "improvement");
assert(!audit.keywords.some((keyword) => keyword.word === "excluded"));
assert.deepEqual(discoverLinks(fixture, "https://studio.com/"), ["https://studio.com/about", "https://studio.com/missing"]);

for (const robots of ["noindex", "none", "index, noindex, follow"]) {
  const result = analyzePage(fixture.replace("max-image-preview:none", robots), "https://studio.com/");
  assert.equal(result.findings.find((finding) => finding.id === "indexing")?.status, "critical", robots);
}

for (const url of ["http://127.0.0.1", "http://2130706433", "http://0x7f000001", "http://[::1]", "http://site.local", "http://user:pass@site.com", "file:///etc/passwd", "http://example.com:8080", "http://localhost"]) {
  assert.throws(() => normalizeUrl(url), url);
}

for (const address of ["127.0.0.1", "10.0.0.1", "169.254.169.254", "100.64.0.1", "192.168.1.1", "::1", "fd00::1", "::ffff:127.0.0.1"]) {
  assert.equal(publicAddress(address), false, address);
}

assert.equal(normalizeUrl("example.com").href, "https://example.com/");
assert(publicAddress("93.184.216.34"));
assert.equal(analyzePage(fixture, "https://studio.com/", { robotHeader: "googlebot-news: noindex" }).findings.find((finding) => finding.id === "indexing")?.status, "good");
assert.equal(analyzePage(fixture, "https://studio.com/", { robotHeader: "googlebot: noindex" }).findings.find((finding) => finding.id === "indexing")?.status, "critical");

const escaped = reportHtml({ ...audit, title: "</title><script>alert(1)</script>", description: '<img onerror="bad">' });
assert(!escaped.includes("<script>"));
assert(escaped.includes("&lt;script&gt;"));
assert(escaped.includes("Repair confirmed"));

const fetchPage = createFetcher();
const { response } = await fetchPage("https://example.com");
assert((await readHtml(response)).html.includes("Example Domain"));

console.log("Audit verification passed.");
