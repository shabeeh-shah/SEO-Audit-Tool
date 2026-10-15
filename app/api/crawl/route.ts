import {crawlSite} from '@/lib/audit/crawl';
import {readText} from '@/lib/audit/fetch';
const buckets=new Map<string,number>();
export async function POST(request:Request){
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return Response.json({error:'Start the crawl from Signal.'},{status:403});
 const now=Date.now();for(const [ip,until] of buckets)if(until<now)buckets.delete(ip);const ip=request.headers.get('cf-connecting-ip')||'local';if(buckets.has(ip))return Response.json({error:'Wait a minute before another site crawl.'},{status:429});buckets.set(ip,now+60000);
 try{const {url}=JSON.parse(await readText(new Response(request.body),4096));const report=await crawlSite(url,25,AbortSignal.any([request.signal,AbortSignal.timeout(40000)]));return Response.json(report,{headers:{'Cache-Control':'no-store'}});}catch(error){return Response.json({error:error instanceof Error?error.message:'Crawl unavailable.'},{status:400});}
}
