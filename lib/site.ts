import type {Metadata} from 'next';

export const siteUrl='https://signal-audit-lab.shabeehshah42.chatgpt.site';
export const siteTitle='Signal — SEO, Content & AI Search Readiness Audit';
export const siteDescription='Audit a public webpage for SEO, content, AI search readiness, and performance signals with evidence, transparent scores, and practical fixes.';
export const socialTagline='SEO, content, and AI search readiness audit';
export const faq=[
 {question:'What does Signal check?',answer:'Signal reviews one public webpage for SEO tags, content structure and readability, AI crawler rules, structured data, sampled internal links and images, and performance signals. Optional tools separately compare competitor pages, run a sitemap-first audit of 10, 25, or 50 same-origin pages, and request real-user field data when the server is configured for it.'},
 {question:'Does Signal predict rankings or AI citations?',answer:'No. Signal reports evidence from bounded technical and content checks. Its scores do not predict or guarantee rankings, indexing, traffic, crawler visits, AI visibility, or AI citations.'},
 {question:'Is my audit data stored?',answer:'Successful audit history is saved only in this browser, up to 100 runs or 3 MB. Share links encode only the public page URL, scores, and three fix titles in the URL; Signal does not store a server-side report. Bulk results and optional report branding are returned to or kept in the browser and are not stored server-side. Downloads remain on your device.'},
 {question:'What are the audit limits?',answer:'A quick audit checks one HTML page, up to 8 internal links, and up to 6 image headers. Bulk mode accepts up to 20 public URLs and checks two at a time. The site-wide audit defaults to 25 same-origin pages, can be set to 10 or 50 pages, and stops after 40 seconds. HTML is limited to 3 MB (3,000,000 bytes), redirects to 3, and public requests are rate limited per connection and server instance.'},
 {question:'Is Signal open source?',answer:'Yes. Signal is available on GitHub under the MIT License. The repository includes the web app, CLI source, GitHub Action, Chrome extension source, tests, and scoring documentation.'},
];

export const softwareApplicationSchema={
 '@context':'https://schema.org',
 '@type':'SoftwareApplication',
 name:'Signal',
 url:siteUrl,
 applicationCategory:'BusinessApplication',
 applicationSubCategory:'SEO audit tool',
 operatingSystem:'Any',
 description:siteDescription,
 isAccessibleForFree:true,
 offers:{'@type':'Offer',price:'0',priceCurrency:'USD'},
 softwareVersion:'0.1.0',
 license:'https://opensource.org/license/mit',
};

export const faqPageSchema={
 '@context':'https://schema.org',
 '@type':'FAQPage',
 mainEntity:faq.map(item=>({
  '@type':'Question',
  name:item.question,
  acceptedAnswer:{'@type':'Answer',text:item.answer},
 })),
};

export const siteMetadata:Metadata={
 metadataBase:new URL(siteUrl),
 title:siteTitle,
 description:siteDescription,
 alternates:{canonical:siteUrl},
 openGraph:{type:'website',siteName:'Signal',title:siteTitle,description:siteDescription,url:siteUrl,images:[{url:`${siteUrl}/og`,width:1200,height:630,alt:`signal. — ${socialTagline}`}]},
 twitter:{card:'summary_large_image',title:siteTitle,description:siteDescription,images:[`${siteUrl}/og`]},
 icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'},
};
