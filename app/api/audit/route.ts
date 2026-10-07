import {createFetcher,FetchSafetyError,normalizeUrl,readHtml,readText} from '@/lib/audit/fetch';
import {analyzePage,discoverImages,discoverLinks} from '@/lib/audit/analyze';
import {aiBotAccess,robotsAllows} from '@/lib/audit/robots';
import type {ImageAssetCheck,LinkResult,ResourceCheck} from '@/lib/audit/types';

const LINK_SAMPLE_LIMIT=8;
const LINK_CONCURRENCY=4;
const LINK_TIMEOUT_MS=2_500;
const IMAGE_SAMPLE_LIMIT=6;
const RATE_WINDOW_MS=60_000;
const RATE_MAX_AUDITS=5;
const rateBuckets=new Map<string,{count:number;resetAt:number}>();

function clientIp(request:Request){return request.headers.get('cf-connecting-ip')?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local-preview';}
function takeAuditSlot(ip:string){
 const now=Date.now();for(const [key,bucket] of rateBuckets)if(bucket.resetAt<=now)rateBuckets.delete(key);
 const bucket=rateBuckets.get(ip);if(bucket&&bucket.resetAt>now){if(bucket.count>=RATE_MAX_AUDITS)return Math.max(1,Math.ceil((bucket.resetAt-now)/1000));bucket.count++;return 0;}
 rateBuckets.set(ip,{count:1,resetAt:now+RATE_WINDOW_MS});return 0;
}
async function readRequestBody(request:Request){
 const reader=request.body?.getReader();const decoder=new TextDecoder();let text='',size=0;if(!reader)return text;
 try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>4096){await reader.cancel();throw new Error('Request too large.');}text+=decoder.decode(chunk.value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Please run the audit from this app.'},{status:403});
  const retryAfter=takeAuditSlot(clientIp(request));if(retryAfter)return Response.json({error:'Too many audits from this connection. Please wait a minute and try again.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(retryAfter)}});
  if(Number(request.headers.get('content-length')||0)>4096)return Response.json({error:'Request too large.'},{status:413});
  let body;try{body=JSON.parse(await readRequestBody(request));}catch(error){return Response.json({error:error instanceof Error&&error.message==='Request too large.'?'Request too large.':'Enter a valid website URL.'},{status:400});}
  const url=normalizeUrl(body?.url).href;const fetchPage=createFetcher();
  const fetchRobots=async(pageUrl:string)=>{const resourceUrl=new URL('/robots.txt',pageUrl).href;try{const result=await fetchPage(resourceUrl,'GET',LINK_TIMEOUT_MS);const status=result.response.status;const text=status>=200&&status<300?await readText(result.response):null;if(text===null)await result.response.body?.cancel();return {check:{url:result.url,status,redirects:result.redirects} as ResourceCheck,body:text};}catch{return {check:{url:resourceUrl,status:null,redirects:0} as ResourceCheck,body:null};}};
  let robots=await fetchRobots(url);if(robotsAllows(robots.body,url)===false)throw new Error('This site’s robots.txt does not allow Signal Audit to fetch this page.');
  const started=Date.now();const page=await fetchPage(url);const finalUrl=page.url;
  if(new URL(finalUrl).origin!==new URL(url).origin){robots=await fetchRobots(finalUrl);if(robotsAllows(robots.body,finalUrl)===false){await page.response.body?.cancel();throw new Error('This site’s robots.txt does not allow Signal Audit to fetch this page.');}}
  const {html,bytes}=await readHtml(page.response);const responseMs=Date.now()-started;
  if(/<title[^>]*>\s*(just a moment|access denied|attention required|verify you are human)/i.test(html))throw new Error('This site presented an access check instead of its page. Try another public page.');
  const checkResource=async(path:string):Promise<ResourceCheck>=>{const resourceUrl=new URL(path,finalUrl).href;try{const result=await fetchPage(resourceUrl,'GET',LINK_TIMEOUT_MS);const status=result.response.status;await result.response.body?.cancel();return {url:result.url,status,redirects:result.redirects};}catch{return {url:resourceUrl,status:null,redirects:0};}};
  const resourceChecks=Promise.all([checkResource('/sitemap.xml'),checkResource('/llms.txt')]);
  const imageSample=discoverImages(html,finalUrl).slice(0,IMAGE_SAMPLE_LIMIT);const imageChecks:ImageAssetCheck[]=[];
  for(const imageUrl of imageSample){try{const result=await fetchPage(imageUrl,'HEAD',LINK_TIMEOUT_MS);const status=result.response.status;const length=Number(result.response.headers.get('content-length'));await result.response.body?.cancel();const bytes=Number.isFinite(length)&&length>=0?length:null;imageChecks.push({url:imageUrl,status,bytes,state:status>=200&&status<400?bytes!==null&&bytes>300_000?'large':'ok':'unknown'});}catch{imageChecks.push({url:imageUrl,status:null,bytes:null,state:'unknown'});}}
  const sample=discoverLinks(html,finalUrl).filter(link=>robotsAllows(robots.body,link)!==false).slice(0,LINK_SAMPLE_LIMIT);const links:LinkResult[]=[];
  for(let i=0;i<sample.length;i+=LINK_CONCURRENCY){const batch=await Promise.all(sample.slice(i,i+LINK_CONCURRENCY).map(async link=>{try{let result=await fetchPage(link,'HEAD',LINK_TIMEOUT_MS);let response=result.response;if(response.status===405||response.status===501){await response.body?.cancel();result=await fetchPage(link,'GET',LINK_TIMEOUT_MS);response=result.response;}const status=response.status;await response.body?.cancel();return {url:link,status,state:status>=400&&status<600?'broken':status>=200&&status<300?'ok':'unknown',redirects:result.redirects} as LinkResult;}catch{return {url:link,status:null,state:'unknown',redirects:0} as LinkResult;}}));links.push(...batch);}
  const [sitemapXml,llmsTxt]=await resourceChecks;
  return Response.json(analyzePage(html,finalUrl,{requestedUrl:url,responseMs,bytes,links,images:imageChecks,redirects:page.redirects,robotsTxt:robots.check,sitemapXml,llmsTxt,bots:aiBotAccess(robots.body,finalUrl),robotHeader:page.response.headers.get('x-robots-tag')||''}),{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const message=error instanceof Error?error.message:'Unable to analyze this page.';
  const safe=error instanceof FetchSafetyError?error.message:/robots\.txt does not allow/i.test(message)?message:/too large|does not return an HTML|access check|returned HTTP|redirected more/i.test(message)?message:/timeout|abort/i.test(message)?'The website took too long to respond. Try again or audit a different page.':/fetch failed|network|connection/i.test(message)?'We could not reach this website. Check the URL or try another public page.':/Invalid URL/i.test(message)?'Enter a valid public website URL, such as https://example.com.':message;
  const status=error instanceof FetchSafetyError&&error.kind==='blocked'||/robots\.txt does not allow/i.test(message)?403:400;
  return Response.json({error:safe},{status,headers:{'Cache-Control':'no-store'}});
 }
}
