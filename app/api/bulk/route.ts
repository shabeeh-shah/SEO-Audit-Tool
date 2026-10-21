import {parseBulkInput,BULK_CONCURRENCY,type BulkAuditResult} from '@/lib/audit/bulk';
import {auditPublicUrl} from '@/lib/audit/run';

const BODY_LIMIT=60_000;
const RATE_WINDOW_MS=60_000;
const buckets=new Map<string,number>();
const clientIp=(request:Request)=>request.headers.get('cf-connecting-ip')?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local-preview';
function retryAfter(ip:string){const now=Date.now();const until=buckets.get(ip)||0;if(until>now)return Math.max(1,Math.ceil((until-now)/1000));buckets.set(ip,now+RATE_WINDOW_MS);return 0;}
async function readBody(request:Request){const reader=request.body?.getReader();const decoder=new TextDecoder();let text='',size=0;if(!reader)return text;try{while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>BODY_LIMIT){await reader.cancel();throw new Error('Request too large.');}text+=decoder.decode(chunk.value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}}
const messageFor=(error:unknown)=>{const message=error instanceof Error?error.message:'Audit failed.';return /timeout|abort/i.test(message)?'The website took too long to respond.':/fetch failed|network|connection/i.test(message)?'The website could not be reached.':message;};

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Please run the bulk audit from this app.'},{status:403});
  const wait=retryAfter(clientIp(request));if(wait)return Response.json({error:'A bulk audit was recently started from this connection. Please wait a minute and try again.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':String(wait)}});
  if(Number(request.headers.get('content-length')||0)>BODY_LIMIT)return Response.json({error:'Request too large.'},{status:413});
  const body=JSON.parse(await readBody(request)) as {urls?:unknown};if(!Array.isArray(body.urls)||!body.urls.every(value=>typeof value==='string'))throw new Error('Provide a valid list of website URLs.');
  const urls=parseBulkInput(body.urls.join('\n'));const results=new Array<BulkAuditResult>(urls.length);let cursor=0;const signal=AbortSignal.any([request.signal,AbortSignal.timeout(150_000)]);
  await Promise.all(Array.from({length:Math.min(BULK_CONCURRENCY,urls.length)},async()=>{while(cursor<urls.length){const index=cursor++;const requestedUrl=urls[index];try{results[index]={requestedUrl,audit:await auditPublicUrl(requestedUrl,signal)};}catch(error){results[index]={requestedUrl,error:messageFor(error)};}}}));
  return Response.json({results},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return Response.json({error:error instanceof Error?error.message:'The bulk audit could not be completed.'},{status:400,headers:{'Cache-Control':'no-store'}});}
}
