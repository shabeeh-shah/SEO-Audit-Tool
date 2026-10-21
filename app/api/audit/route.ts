import {FetchSafetyError} from '@/lib/audit/fetch';
import {auditPublicUrl} from '@/lib/audit/run';

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
  return Response.json(await auditPublicUrl(body?.url,request.signal),{headers:{'Cache-Control':'no-store'}});
 }catch(error){
  const message=error instanceof Error?error.message:'Unable to analyze this page.';
  const safe=error instanceof FetchSafetyError?error.message:/robots\.txt does not allow/i.test(message)?message:/too large|does not return an HTML|access check|returned HTTP|redirected more/i.test(message)?message:/timeout|abort/i.test(message)?'The website took too long to respond. Try again or audit a different page.':/fetch failed|network|connection/i.test(message)?'We could not reach this website. Check the URL or try another public page.':/Invalid URL/i.test(message)?'Enter a valid public website URL, such as https://example.com.':message;
  const status=error instanceof FetchSafetyError&&error.kind==='blocked'||/robots\.txt does not allow/i.test(message)?403:400;
  return Response.json({error:safe},{status,headers:{'Cache-Control':'no-store'}});
 }
}
