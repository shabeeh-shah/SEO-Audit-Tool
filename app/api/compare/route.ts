import {createFetcher,FetchSafetyError,normalizeUrl,readHtml,readText} from '@/lib/audit/fetch';
import {robotsAllows} from '@/lib/audit/robots';
import {compareProfiles,extractProfile} from '@/lib/audit/competitors';

const buckets=new Map<string,{count:number;reset:number}>();
const reply=(body:unknown,status=200,headers:Record<string,string>={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store',...headers}});
export function comparisonInputs(body:unknown){
 if(!body||typeof body!=='object')throw new Error('Enter your page and one or two competitor page URLs.');
 const value=body as {url?:string;competitors?:unknown;target?:unknown};const url=normalizeUrl(value.url as string).href;
 if(!Array.isArray(value.competitors)||value.competitors.length<1||value.competitors.length>2)throw new Error('Compare one or two competitor pages at a time.');
 const competitors=value.competitors.map(item=>normalizeUrl(item).href);
 const key=(address:string)=>address.replace(/\/$/,'');if(new Set([url,...competitors].map(key)).size!==competitors.length+1)throw new Error('Use different page URLs for your site and each competitor.');
 if(value.target!==undefined&&(typeof value.target!=='string'||value.target.length>120))throw new Error('Keep the optional target phrase under 120 characters.');
 return {url,competitors,target:typeof value.target==='string'?value.target.trim():''};
}
export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return reply({error:'Please run comparisons from Signal.'},403);
  const ip=request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local';const now=Date.now();
  for(const [key,bucket] of buckets)if(bucket.reset<=now)buckets.delete(key);
  const bucket=buckets.get(ip)||{count:0,reset:now+60000};if(bucket.count>=3)return reply({error:'Please wait a minute before starting another comparison.'},429,{'Retry-After':String(Math.ceil((bucket.reset-now)/1000))});bucket.count++;buckets.set(ip,bucket);
  let raw:unknown;try{raw=JSON.parse(await readText(new Response(request.body),8192));}catch{return reply({error:'Enter valid page URLs. Comparison requests must be under 8 KB.'},400);}
  const input=comparisonInputs(raw);const signal=AbortSignal.any([request.signal,AbortSignal.timeout(40000)]);
  const resourceFetch=createFetcher({signal});const robotCache=new Map<string,Promise<string>>();
  const fetchPage=createFetcher({signal,beforeRequest:async address=>{
   const origin=new URL(address).origin;
   if(!robotCache.has(origin))robotCache.set(origin,(async()=>{
    const result=await resourceFetch(origin+'/robots.txt','GET',6000);const status=result.response.status;
    if(status===404||status===410){await result.response.body?.cancel();return '';}
    if(!result.response.ok){await result.response.body?.cancel();throw new FetchSafetyError('blocked','Could not confirm crawler access from robots.txt. This page was not fetched.');}
    return readText(result.response);
   })());
   const robots=await robotCache.get(origin);if(robotsAllows(robots||'',address)===false)throw new FetchSafetyError('blocked','This page is blocked for SignalAudit by robots.txt.');
  }});
  const inspect=async(address:string)=>{const page=await fetchPage(address,'GET',15000);const {html}=await readHtml(page.response);if(/<title[^>]*>\s*(just a moment|access denied|attention required|verify you are human)/i.test(html))throw new Error('This page presented an access check. Try another public page.');return extractProfile(html,page.url);};
  const [baseline,...rivals]=await Promise.allSettled([input.url,...input.competitors].map(inspect));
  if(baseline.status==='rejected')throw baseline.reason;
  const seen=new Set([baseline.value.url.replace(/\/$/,'')]);const pages=[];const errors=[];
  for(const [index,result] of rivals.entries()){
   if(result.status==='rejected'){errors.push({url:input.competitors[index],message:result.reason instanceof Error?result.reason.message:'This competitor could not be reached.'});continue;}
   const key=result.value.url.replace(/\/$/,'');if(seen.has(key)){errors.push({url:input.competitors[index],message:'This URL redirects to a page already included in the comparison.'});continue;}seen.add(key);pages.push(result.value);
  }
  if(!pages.length)return reply({error:'No competitor pages could be compared. Review the details and try another URL.',errors},422);
  return reply({...compareProfiles(baseline.value,pages,input.target),errors});
 }catch(error){return reply({error:error instanceof Error?error.message:'The comparison could not be completed. Try another public page.'},error instanceof FetchSafetyError&&error.kind==='blocked'?403:400);}
}
