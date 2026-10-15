export const siteUrl='https://signal-audit-lab.shabeehshah42.chatgpt.site';
export const siteTitle='Signal — SEO & AI Search Readiness Audit';
export const siteDescription='Can AI crawlers access your content? Check SEO, AI crawler rules, content structure, and performance signals with evidence and practical fixes.';
export const faq=[
 {question:'What does Signal check?',answer:'Signal reviews public HTML, SEO tags, AI crawler rules, structured data, and content. The web app also attempts an isolated mobile preview. Optional site discovery inspects up to 25 same-origin pages for links, titles, canonicals, and language alternates.'},
 {question:'Is Signal free, and what are the limits?',answer:'The public beta is free. A quick audit samples up to 8 internal links and 6 image headers. A separate site crawl covers up to 25 pages in 40 seconds. Audits are limited to 5 per minute, comparisons to 3, and crawls to 1 per connection per server instance. Large or blocked pages may be unavailable.'},
 {question:'Will a high score guarantee AI citations or rankings?',answer:'No. Scores summarize a documented set of checks, not rankings, traffic, or AI citations. A robots.txt allowance does not prove that an AI service will visit or cite your page. llms.txt is optional and never changes the score.'},
 {question:'Are these real Core Web Vitals?',answer:'The browser preview provides experimental lab diagnostics. It is not Lighthouse and can differ from the original page because of sandboxing and resource restrictions. Real-user LCP, INP, and CLS are shown separately only when a configured CrUX API returns data.'},
 {question:'What happens to my reports?',answer:'Recent audits are stored in this browser, with a Clear history option. Share report explicitly saves a public link that anyone with the link can read. Downloaded HTML, JSON, and CSV reports stay on your device. Use only public page URLs.'},
 {question:'Can I use Signal in my workflow?',answer:'The MIT-licensed repository includes a CLI, a GitHub Action, a Chrome extension source package, and an MCP endpoint. See the README for setup, availability, and limitations.'},
];
