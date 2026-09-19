import {createFetcher,normalizeUrl,readHtml} from '@/lib/audit/fetch';
import {analyzePage,discoverLinks} from '@/lib/audit/analyze';
import type {LinkResult} from '@/lib/audit/types';
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Please run the audit from this app.'},{status:403});
  if(Number(request.headers.get('content-length')||0)>4096)return Response.json({error:'Request too large.'},{status:413});
  const reader=request.body?.getReader();const decoder=new TextDecoder();let text='',size=0;
  if(reader){try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>4096){await reader.cancel();return Response.json({error:'Request too large.'},{status:413});}text+=decoder.decode(chunk.value,{stream:true});}text+=decoder.decode();}finally{reader.releaseLock();}}
  let body;try{body=JSON.parse(text)}catch{return Response.json({error:'Enter a valid website URL.'},{status:400})}
  const url=normalizeUrl(body?.url).href;const fetchPage=createFetcher();const started=Date.now();
  const {response,url:finalUrl}=await fetchPage(url);const {html,bytes}=await readHtml(response);const responseMs=Date.now()-started;
  if(/<title[^>]*>\s*(just a moment|access denied|attention required|verify you are human)/i.test(html))throw new Error('This site presented an access check instead of its page. Try another public page.');
  const sample=discoverLinks(html,finalUrl).slice(0,12);const links:LinkResult[]=[];
  for(let i=0;i<sample.length;i+=4){const batch=await Promise.all(sample.slice(i,i+4).map(async link=>{
    try{let {response:r}=await fetchPage(link,'HEAD',3000);if(r.status===405||r.status===501){await r.body?.cancel();r=(await fetchPage(link,'GET',3000)).response;}const status=r.status;await r.body?.cancel();return {url:link,status,state:status===404||status===410?'broken':status>=200&&status<300?'ok':'unknown'} as LinkResult;}catch{return {url:link,status:null,state:'unknown'} as LinkResult;}
   }));links.push(...batch);}
  return Response.json(analyzePage(html,finalUrl,{requestedUrl:url,responseMs,bytes,links,robotHeader:response.headers.get('x-robots-tag')||''}),{headers:{'Cache-Control':'no-store'}});
 }catch(error){const message=error instanceof Error?error.message:'Unable to analyze this page.';return Response.json({error:/timeout|abort/i.test(message)?'The website took too long to respond. Try again or audit a different page.':/fetch failed|network|connection/i.test(message)?'We could not reach this website. Check the URL, or try another public page.':/Invalid URL/i.test(message)?'Enter a valid public website URL, such as https://example.com.':message},{status:400,headers:{'Cache-Control':'no-store'}});}
}
