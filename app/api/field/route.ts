import {normalizeUrl,readText} from '@/lib/audit/fetch';
import {parseCrux} from '@/lib/audit/field';
const requests=new Map<string,number>();
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Use Signal to request field data.'},{status:403});
 const now=Date.now();for(const [key,time] of requests)if(time<now)requests.delete(key);const ip=request.headers.get('cf-connecting-ip')||'local';if(requests.has(ip))return Response.json({error:'Wait a minute before another field-data lookup.'},{status:429});requests.set(ip,now+60000);
 try{let key=process.env.CRUX_API_KEY;try{const {env}=await import('cloudflare:workers');key=(env as unknown as Record<string,string>).CRUX_API_KEY||key;}catch{/* Node previews use the server environment. */}if(!key)return Response.json({state:'not-configured',message:'Real-user field data is not connected on this deployment. Use PageSpeed Insights below to check available field data.'});
  const body=JSON.parse(await readText(new Response(request.body),4096));const url=normalizeUrl(body.url).href;
  const response=await fetch('https://chromeuxreport.googleapis.com/v1/records:queryRecord?key='+encodeURIComponent(key),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url,formFactor:'PHONE',metrics:['largest_contentful_paint','interaction_to_next_paint','cumulative_layout_shift']}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)return Response.json({state:'unavailable',message:response.status===404?'CrUX has insufficient real-user data for this page. No score was assigned.':'The field-data service is unavailable. No score was assigned.'});return Response.json(parseCrux(await response.json(),url),{headers:{'Cache-Control':'no-store'}});
 }catch{return Response.json({state:'unavailable',message:'Field data could not be loaded. No score was assigned.'});}
}
