import {saveSharedReport} from '@/lib/audit/reports';
import type {Audit} from '@/lib/audit/types';

const WINDOW_MS=60_000;
const MAX_SHARES=10;
const shares=new Map<string,{count:number;resetAt:number}>();
function clientIp(request:Request){return request.headers.get('cf-connecting-ip')?.trim()||request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'local-preview';}
function allowShare(ip:string){const now=Date.now();for(const [key,value] of shares)if(value.resetAt<=now)shares.delete(key);const state=shares.get(ip);if(state&&state.resetAt>now){if(state.count>=MAX_SHARES)return false;state.count++;return true;}shares.set(ip,{count:1,resetAt:now+WINDOW_MS});return true;}

export async function POST(request:Request){
 try{
  const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Please create a report link from Signal.'},{status:403});
  if(!allowShare(clientIp(request)))return Response.json({error:'Please wait a minute before creating another report link.'},{status:429,headers:{'Cache-Control':'no-store'}});
  const length=Number(request.headers.get('content-length')||0);if(length>160_000)return Response.json({error:'This report is too large to share. Export it instead.'},{status:413});
  const body=await request.json() as {audit?:Audit};const id=await saveSharedReport(body.audit as Audit);
  return Response.json({id},{status:201,headers:{'Cache-Control':'no-store'}});
 }catch(error){const message=error instanceof Error?error.message:'Saved reports are temporarily unavailable. Please try again.';return Response.json({error:message},{status:/temporarily unavailable/i.test(message)?503:400,headers:{'Cache-Control':'no-store'}});}
}
