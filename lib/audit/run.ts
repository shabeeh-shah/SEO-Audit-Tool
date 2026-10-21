import {createCrawler} from './crawl-fetch';
import {normalizeUrl,readHtml} from './fetch';
import {analyzePage,discoverImages,discoverLinks} from './analyze';
import {aiBotAccess,robotsAllows} from './robots';
import type {Audit,ImageAssetCheck,LinkResult,ResourceCheck} from './types';

const LINK_SAMPLE_LIMIT=8;
const LINK_CONCURRENCY=4;
const LINK_TIMEOUT_MS=2_500;
const IMAGE_SAMPLE_LIMIT=6;

export async function auditPublicUrl(input:string,signal?:AbortSignal):Promise<Audit>{
 const url=normalizeUrl(input).href;const crawler=createCrawler(AbortSignal.any([...(signal?[signal]:[]),AbortSignal.timeout(40000)]));const fetchPage=crawler.fetchPage;
 const initial=await crawler.robots(url);let robots={body:initial.text,check:{url:initial.url,status:initial.status,redirects:initial.redirects}};
 const started=Date.now();const page=await fetchPage(url);const finalUrl=page.url;
 if(new URL(finalUrl).origin!==new URL(url).origin){const final=await crawler.robots(finalUrl);robots={body:final.text,check:{url:final.url,status:final.status,redirects:final.redirects}};}
 const {html,bytes}=await readHtml(page.response);const responseMs=Date.now()-started;
 if(/<title[^>]*>\s*(just a moment|access denied|attention required|verify you are human)/i.test(html))throw new Error('This site presented an access check instead of its page. Try another public page.');
 const checkResource=async(path:string):Promise<ResourceCheck>=>{const resourceUrl=new URL(path,finalUrl).href;try{const result=await fetchPage(resourceUrl,'GET',LINK_TIMEOUT_MS);const status=result.response.status;await result.response.body?.cancel();return {url:result.url,status,redirects:result.redirects};}catch{return {url:resourceUrl,status:null,redirects:0};}};
 const resourceChecks=Promise.all([checkResource('/sitemap.xml'),checkResource('/llms.txt')]);
 const imageSample=discoverImages(html,finalUrl).slice(0,IMAGE_SAMPLE_LIMIT);const imageChecks:ImageAssetCheck[]=[];
 for(const imageUrl of imageSample){try{const result=await fetchPage(imageUrl,'HEAD',LINK_TIMEOUT_MS);const status=result.response.status;const rawLength=result.response.headers.get('content-length');const length=rawLength===null?NaN:Number(rawLength);await result.response.body?.cancel();const imageBytes=Number.isFinite(length)&&length>=0?length:null;imageChecks.push({url:imageUrl,status,bytes:imageBytes,state:status>=200&&status<400?imageBytes!==null&&imageBytes>300_000?'large':'ok':'unknown'});}catch{imageChecks.push({url:imageUrl,status:null,bytes:null,state:'unknown'});}}
 const sample=discoverLinks(html,finalUrl).filter(link=>robotsAllows(robots.body,link)!==false).slice(0,LINK_SAMPLE_LIMIT);const links:LinkResult[]=[];
 for(let i=0;i<sample.length;i+=LINK_CONCURRENCY){const batch=await Promise.all(sample.slice(i,i+LINK_CONCURRENCY).map(async link=>{try{let result=await fetchPage(link,'HEAD',LINK_TIMEOUT_MS);let response=result.response;if(response.status===405||response.status===501){await response.body?.cancel();result=await fetchPage(link,'GET',LINK_TIMEOUT_MS);response=result.response;}const status=response.status;await response.body?.cancel();return {url:link,status,state:status>=400&&status<600?'broken':status>=200&&status<300?'ok':'unknown',redirects:result.redirects} as LinkResult;}catch{return {url:link,status:null,state:'unknown',redirects:0} as LinkResult;}}));links.push(...batch);}
 const [sitemapXml,llmsTxt]=await resourceChecks;
 return analyzePage(html,finalUrl,{requestedUrl:url,responseMs,bytes,links,images:imageChecks,redirects:page.redirects,robotsTxt:robots.check,sitemapXml,llmsTxt,bots:aiBotAccess(robots.body,finalUrl),headers:Object.fromEntries(page.response.headers),robotHeader:page.response.headers.get('x-robots-tag')||''});
}
