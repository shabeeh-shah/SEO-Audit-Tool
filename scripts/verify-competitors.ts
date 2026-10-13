import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compareProfiles,estimateIntent,extractProfile,sampleComparison} from '../lib/audit/competitors';
import {comparisonHtml} from '../lib/audit/competitor-export';
import {comparisonInputs,POST} from '../app/api/compare/route';

const baseHtml=readFileSync(new URL('./fixtures/competitor-baseline.html',import.meta.url),'utf8');
const rivalHtml=readFileSync(new URL('./fixtures/competitor-rival.html',import.meta.url),'utf8');
const base=extractProfile(baseHtml,'https://northstar.com/');const rival=extractProfile(rivalHtml,'https://rival.com/');
assert(!base.text.includes('strategy workshops'),'Navigation and footer must not generate topic evidence');
assert.equal(rival.h1,1);assert.equal(rival.h2,3);assert.equal(rival.h3,1);assert.equal(rival.questions,1);assert.equal(rival.lists,1);assert.equal(rival.tables,1);
assert.equal(rival.intent.label,'Commercial research');assert(!rival.intent.signals.includes('buy'),'Scripts must not influence intent');
assert.equal(estimateIntent('Our studio',[]).label,'Unclear');assert.equal(estimateIntent('Guide to buy a camera',[]).label,'Mixed');
const report=compareProfiles(base,[rival],'brand design');
assert(report.keywords.some(item=>item.term==='brand strategy workshops'));
assert(!report.keywords.some(item=>item.term==='accessible design systems'),'Existing body coverage must not be marked as a missing phrase');
assert(!report.gaps.some(item=>item.term==='Customer research'),'Matching headings are not gaps');
assert(report.gaps.find(item=>item.term==='Accessible design systems')?.why.includes('Related words appear'));
assert(report.keywords.every(item=>item.priority==='Medium'));
assert.equal(report.targetCoverage[0].count,2);assert.equal(report.targetCoverage[0].inTitle,true);assert.equal(report.targetCoverage[0].inHeading,true);
const shared=compareProfiles(base,[rival,{...rival,url:'https://second.com/'}]);assert(shared.keywords.find(item=>item.term==='brand strategy workshops')?.priority==='High');
assert.equal(compareProfiles(rival,[{...rival,url:'https://copy.com/'}]).keywords.length,0);
assert.equal(extractProfile('<html><body><main></main></body></html>','https://empty.com/').limited,true);
const nested=extractProfile('<html><body><header>Site navigation</header><main><article><header><h1>Useful guide</h1></header><ul><li><p>Brand strategy workshops</p></li></ul></article></main></body></html>','https://nested.com/');
assert.equal(nested.h1,1,'Article headers must retain their page title');assert.equal(nested.words,5,'Nested paragraphs must not inflate word or phrase counts');
assert.throws(()=>comparisonInputs({url:'https://brand.com',competitors:['https://brand.com/']}),/different/);
assert.throws(()=>comparisonInputs({url:'http://127.0.0.1',competitors:['https://rival.com/']}),/blocked/);
assert.throws(()=>comparisonInputs({url:'https://brand.com',competitors:['https://a.com','https://b.com','https://c.com']}),/one or two/);
assert.throws(()=>comparisonInputs({url:'https://brand.com',competitors:['https://rival.com'],target:'x'.repeat(121)}),/120/);
const sample=sampleComparison();assert(sample.sample);assert(sample.keywords.length&&sample.gaps.length);
const escaped=comparisonHtml({...report,target:'<script>alert(1)</script>'});assert(!escaped.includes('<script>'));assert(escaped.includes('&lt;script&gt;'));

const originalFetch=globalThis.fetch;const visited:string[]=[];
try{
 globalThis.fetch=async(input)=>{
  const url=String(input);visited.push(url);
  if(url.startsWith('https://cloudflare-dns.com'))return Response.json({Answer:[{type:1,data:'93.184.216.34'}]});
  if(url==='https://blocked.com/robots.txt')return new Response('User-agent: SignalAudit\nDisallow: /secret');
  if(url.endsWith('/robots.txt'))return new Response('',{status:404});
  if(url==='https://rival.com/redirect')return new Response(null,{status:302,headers:{location:'https://blocked.com/secret'}});
  if(url==='https://broken.com/')return new Response('',{status:503});
  return new Response(url.startsWith('https://brand.com')?baseHtml:rivalHtml,{headers:{'content-type':'text/html'}});
 };
 const request=(competitors:string[],ip:string)=>new Request('https://signal.com/api/compare',{method:'POST',headers:{'Content-Type':'application/json','cf-connecting-ip':ip},body:JSON.stringify({url:'https://brand.com/',competitors})});
 const partial=await POST(request(['https://rival.com/','https://broken.com/'],'fixture-1'));assert.equal(partial.status,200);const data=await partial.json() as {competitors:unknown[];errors:unknown[]};assert.equal(data.competitors.length,1);assert.equal(data.errors.length,1);
 const blocked=await POST(request(['https://rival.com/redirect'],'fixture-2'));assert.equal(blocked.status,422);assert(!visited.includes('https://blocked.com/secret'),'Robots must be checked before a redirected page is fetched');
 const denied=await POST(new Request('https://signal.com/api/compare',{method:'POST',headers:{Origin:'https://elsewhere.com'},body:'{}'}));assert.equal(denied.status,403);
 for(let i=0;i<3;i++)await POST(request(['https://rival.com/'],'fixture-rate'));
 assert.equal((await POST(request(['https://rival.com/'],'fixture-rate'))).status,429);
}finally{globalThis.fetch=originalFetch;}
console.log('Competitor comparison fixtures and fetch protections passed.');
