import assert from 'node:assert/strict';
import {analyzeCrawlPage,crawlLimit,crawlSite,crawlSummary,DEFAULT_CRAWL_LIMIT,MAX_CRAWL_LIMIT} from '../lib/audit/crawl';
import {normalizeUrl,publicAddress} from '../lib/audit/fetch';
import {crawlOrigin,duplicateCrawlPage,failingCrawlPage,passingCrawlPage} from '../tests/fixtures/crawl-site';

const secureHeaders=new Headers({'content-security-policy':"default-src 'self'",'strict-transport-security':'max-age=31536000','x-content-type-options':'nosniff','referrer-policy':'strict-origin-when-cross-origin'});
const base={url:`${crawlOrigin}/`,finalUrl:`${crawlOrigin}/`,status:200,redirects:0,attempts:1,issue:''};
const passing=analyzeCrawlPage(passingCrawlPage,base,secureHeaders);
assert(passing.findings.every(finding=>finding.priority==='Good'),'passing fixture has no page-level issues');
const failing=analyzeCrawlPage(failingCrawlPage,base,new Headers());
for(const id of ['canonical','hreflang','social-tags','security-headers','accessibility'])assert.equal(failing.findings.find(finding=>finding.id===id)?.priority,'Improvement',`failing fixture: ${id}`);
assert.equal(failing.accessibility.missingAlt,1);assert.equal(failing.accessibility.unlabeledControls,1);assert.equal(failing.accessibility.emptyInteractive,1);assert.equal(failing.accessibility.headingSkips,1);
const duplicate=analyzeCrawlPage(duplicateCrawlPage,{...base,url:`${crawlOrigin}/about`,finalUrl:`${crawlOrigin}/about`},new Headers());
const broken={...passing,url:`${crawlOrigin}/broken`,finalUrl:`${crawlOrigin}/broken`,status:500,title:'',description:'',links:[],findings:[]};
const site=crawlSummary([{...failing,links:[`${crawlOrigin}/broken`]},duplicate,broken],[],25,false,'links');
assert.equal(site.duplicates.length,1);assert.equal(site.duplicateDescriptions.length,1);assert(site.issues.some(issue=>issue.id==='broken-internal-link'));assert(site.issues.every(issue=>issue.evidence&&issue.fix));
assert.equal(crawlLimit(undefined),DEFAULT_CRAWL_LIMIT);assert.equal(crawlLimit(500),MAX_CRAWL_LIMIT);assert.equal(crawlLimit(-4),1);

for(const blocked of ['http://localhost/','http://127.0.0.1/','http://10.0.0.8/','http://[::1]/'])assert.throws(()=>normalizeUrl(blocked),/blocked/);
for(const privateAddress of ['127.0.0.1','10.1.2.3','172.16.0.2','192.168.1.2','169.254.1.1','::1','fc00::1'])assert.equal(publicAddress(privateAddress),false,privateAddress);

const originalFetch=globalThis.fetch;const visited:string[]=[];let retryAttempts=0;
try{
 globalThis.fetch=async input=>{const url=String(input);visited.push(url);if(url.startsWith('https://cloudflare-dns.com'))return Response.json({Answer:[{type:1,data:'93.184.216.34'}]});if(url===`${crawlOrigin}/robots.txt`)return new Response('User-agent: SignalAudit\nDisallow: /blocked\nSitemap: https://fixture.com/sitemap.xml');if(url===`${crawlOrigin}/sitemap.xml`)return new Response(`<urlset><url><loc>${crawlOrigin}/</loc></url><url><loc>${crawlOrigin}/about</loc></url><url><loc>${crawlOrigin}/broken</loc></url><url><loc>${crawlOrigin}/old</loc></url><url><loc>${crawlOrigin}/retry</loc></url><url><loc>${crawlOrigin}/blocked</loc></url></urlset>`);if(url===`${crawlOrigin}/broken`)return new Response('broken',{status:500});if(url===`${crawlOrigin}/old`)return new Response(null,{status:301,headers:{location:'/step'}});if(url===`${crawlOrigin}/step`)return new Response(null,{status:302,headers:{location:'/about'}});if(url===`${crawlOrigin}/retry`&&retryAttempts++===0)throw new TypeError('temporary connection failure');if(url===`${crawlOrigin}/about`)return new Response(duplicateCrawlPage,{headers:{'content-type':'text/html'}});return new Response(failingCrawlPage,{headers:{'content-type':'text/html'}});};
 const report=await crawlSite(`${crawlOrigin}/`,10);assert.equal(report.summary.source,'sitemap');assert(report.pages.some(page=>page.redirects===2));assert.equal(report.pages.find(page=>page.url===`${crawlOrigin}/retry`)?.attempts,2);assert(report.issues.some(issue=>issue.id==='broken-internal-link'));assert(!visited.includes(`${crawlOrigin}/blocked`),'robots-disallowed page body was not fetched');assert(report.pages.find(page=>page.url===`${crawlOrigin}/blocked`)?.issue.includes('robots.txt'));
}finally{globalThis.fetch=originalFetch;}

console.log('Site crawl fixtures, retries, robots enforcement, and SSRF rejection passed.');
