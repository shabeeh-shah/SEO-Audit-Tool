import {createFetcher,normalizeUrl,readHtml,readText} from '@/lib/audit/fetch';
import {analyzePage,discoverLinks} from '@/lib/audit/analyze';
import {aiBotAccess} from '@/lib/audit/robots';
import type {LinkResult,ResourceCheck} from '@/lib/audit/types';
const LINK_SAMPLE_LIMIT=8;
const LINK_CONCURRENCY=6;
const LINK_TIMEOUT_MS=2500;
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Please run the audit from this app.'},{status:403});
  if(Number(request.headers.get('content-length')||0)>4096)return Response.json({error:'Request too large.'},{status:413});
  const reader=request.body?.getReader();const decoder=new TextDecoder();let text='',size=0;
  if(reader){try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>4096){await reader.cancel();return Response.json({error:'Request too large.'},{status:413});}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}}
  let body;try{body=JSON.parse(text)}catch{return Response.json({error:'Enter a valid website URL.'},{status:400})}
  const url=normalizeUrl(body?.url).href;const fetchPage=createFetcher();const started=Date.now();
  const {response,url:finalUrl,redirects}=await fetchPage(url);const {html,bytes}=await readHtml(response);const responseMs=Date.now()-started;
  if(/<title[^>]*>\s*(just a moment|access denied|attention required|verify you are human)/i.test(html))throw new Error('This site presented an access check instead of its page. Try another public page.');
  const checkResource=async(path:string):Promise<ResourceCheck>=>{const resourceUrl=new URL(path,finalUrl).href;try{const result=await fetchPage(resourceUrl,'GET',LINK_TIMEOUT_MS);const status=result.response.status;await result.response.body?.cancel();return {url:result.url,status,redirects:result.redirects};}catch{return {url:resourceUrl,status:null,redirects:0};}};
  const checkRobots=async()=>{const resourceUrl=new URL('/robots.txt',finalUrl).href;try{const result=await fetchPage(resourceUrl,'GET',LINK_TIMEOUT_MS);const status=result.response.status;const body=status>=200&&status<300?await readText(result.response):null;if(body===null)await result.response.body?.cancel();return {check:{url:result.url,status,redirects:result.redirects},body};}catch{return {check:{url:resourceUrl,status:null,redirects:0},body:null};}};
  const resourceChecks=Promise.all([checkRobots(),checkResource('/sitemap.xml'),checkResource('/llms.txt')]);
  const sample=discoverLinks(html,finalUrl).slice(0,LINK_SAMPLE_LIMIT);const links:LinkResult[]=[];
  for(let i=0;i<sample.length;i+=LINK_CONCURRENCY){const batch=await Promise.all(sample.slice(i,i+LINK_CONCURRENCY).map(async link=>{
    try{let result=await fetchPage(link,'HEAD',LINK_TIMEOUT_MS);let r=result.response;if(r.status===405||r.status===501){await r.body?.cancel();result=await fetchPage(link,'GET',LINK_TIMEOUT_MS);r=result.response;}const status=r.status;await r.body?.cancel();return {url:link,status,state:status>=400&&status<600?'broken':status>=200&&status<300?'ok':'unknown',redirects:result.redirects} as LinkResult;}catch{return {url:link,status:null,state:'unknown',redirects:0} as LinkResult;}
   }));links.push(...batch);}
  const [robots,sitemapXml,llmsTxt]=await resourceChecks;
  return Response.json(analyzePage(html,finalUrl,{requestedUrl:url,responseMs,bytes,links,redirects,robotsTxt:robots.check,sitemapXml,llmsTxt,bots:aiBotAccess(robots.body,finalUrl),robotHeader:response.headers.get('x-robots-tag')||''}),{headers:{'Cache-Control':'no-store'}});
 }catch(error){const message=error instanceof Error?error.message:'Unable to analyze this page.';return Response.json({error:/timeout|abort/i.test(message)?'The website took too long to respond. Try again or audit a different page.':/fetch failed|network|connection/i.test(message)?'We could not reach this website. Check the URL, or try another public page.':/Invalid URL/i.test(message)?'Enter a valid public website URL, such as https://example.com.':message},{status:400,headers:{'Cache-Control':'no-store'}});}
}
