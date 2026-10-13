// The Worker fetch runtime only permits public internet egress. DNS checks and
// redirect-by-redirect validation provide a second guard against SSRF.
export const AUDIT_USER_AGENT='SignalAudit/1.1 (+https://signal-audit-lab.shabeehshah42.chatgpt.site)';
const MAX_REDIRECTS=3;
const MAX_HTML_BYTES=1_500_000;
const MAX_TEXT_BYTES=200_000;

export class FetchSafetyError extends Error {
 constructor(public readonly kind:'blocked'|'slow'|'unreachable',message:string){super(message);this.name='FetchSafetyError';}
}

const isAbort=(error:unknown)=>error instanceof DOMException&&error.name==='AbortError'||(error instanceof Error&&/abort|timeout/i.test(error.name));

export function normalizeUrl(input:string):URL {
 if(typeof input!=='string'||input.length>2048||!input.trim())throw new Error('Enter a public website URL, such as https://example.com.');
 const raw=input.trim();let url:URL;
 try{url=new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw)?raw:`https://${raw}`);}catch{throw new Error('Enter a valid public website URL, such as https://example.com.');}
 const host=url.hostname.toLowerCase().replace(/\.$/,'');
 if(!['http:','https:'].includes(url.protocol))throw new Error('Only HTTP and HTTPS website URLs can be audited.');
 if(url.username||url.password||url.port||!host.includes('.')||host.includes(':')||/^[\d.]+$/.test(host)||/(^|\.)(localhost|local|internal|lan|home|test|invalid|example)$/.test(host)||!/^[a-z0-9.-]+$/.test(host))throw new Error('This address is blocked. Use a public website domain without credentials, a custom port, or an IP address.');
 url.hostname=host;url.hash='';return url;
}

export function publicAddress(address:string):boolean {
 if(address.includes(':')){
  const ip=address.toLowerCase();
  // Global-unicast IPv6 only. This excludes loopback, link-local, unique-local,
  // multicast, documentation, Teredo, and 6to4 ranges.
  return /^[23]/.test(ip)&&!/^2001:(?:0{1,4}|db8|2|10|20):/.test(ip)&&!/^2002:/.test(ip);
 }
 const octets=address.split('.').map(Number);if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
 const [a,b,c]=octets;
 return !(a===0||a===10||a===127||a>=224||(a===100&&b>=64&&b<=127)||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===0||b===2||b===31&&c===196||b===52&&c===193||b===88&&c===99||b===168||b===175&&c===48))||(a===198&&(b===18||b===19||b===51&&c===100))||(a===203&&b===0&&c===113));
}

export function createFetcher(options:{beforeRequest?:(url:string)=>Promise<void>;signal?:AbortSignal}={}){
 const checked=new Map<string,Promise<void>>();
 async function checkHost(host:string){
  if(!checked.has(host))checked.set(host,(async()=>{
   let answers:string[][];
   try{answers=await Promise.all(['A','AAAA'].map(async type=>{const r=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(3500)});if(!r.ok)throw new Error('DNS lookup failed');const data=await r.json() as {Answer?:{type:number;data:string}[]};return (data.Answer||[]).filter(answer=>answer.type===1||answer.type===28).map(answer=>answer.data);}));}catch(error){throw new FetchSafetyError(isAbort(error)?'slow':'unreachable','We could not verify that this domain is a reachable public website.');}
   const ips=answers.flat();if(!ips.length)throw new FetchSafetyError('unreachable','We could not find a public address for this website.');
   if(ips.some(ip=>!publicAddress(ip)))throw new FetchSafetyError('blocked','This website resolves to a private or internal network address, so Signal cannot audit it.');
  })());
  await checked.get(host);
 }
 return async function safeFetch(input:string,method='GET',timeout=10_000){
  let url=normalizeUrl(input);const deadline=AbortSignal.timeout(Math.max(1_000,Math.min(timeout,15_000)));const signal=options.signal?AbortSignal.any([options.signal,deadline]):deadline;
  for(let redirect=0;redirect<=MAX_REDIRECTS;redirect++){
   try{
    await checkHost(url.hostname);await options.beforeRequest?.(url.href);if(signal.aborted)throw new FetchSafetyError('slow','The website took too long to respond. Please try again.');
    const response=await fetch(url.href,{method,redirect:'manual',signal,headers:{'User-Agent':AUDIT_USER_AGENT,'Accept':'text/html,application/xhtml+xml;q=0.9,text/plain;q=0.7,*/*;q=0.3','Accept-Language':'en-US,en;q=0.8'}});
    if([301,302,303,307,308].includes(response.status)){const destination=response.headers.get('location');await response.body?.cancel();if(!destination)throw new FetchSafetyError('unreachable','The website returned a redirect without a destination.');url=normalizeUrl(new URL(destination,url).href);continue;}
    return {response,url:url.href,redirects:redirect};
   }catch(error){
    if(error instanceof FetchSafetyError)throw error;
    if(signal.aborted||isAbort(error))throw new FetchSafetyError('slow','The website took too long to respond. Please try again.');
    throw new FetchSafetyError('unreachable','We could not reach this website. Check the URL or try another public page.');
   }
  }
  throw new FetchSafetyError('unreachable',`The website redirected more than ${MAX_REDIRECTS} times. Try its final page URL.`);
 };
}

function declaredTooLarge(response:Response,limit:number){const length=Number(response.headers.get('content-length'));return Number.isFinite(length)&&length>limit;}
export async function readHtml(response:Response){
 if(!response.ok)throw new Error(`The website returned HTTP ${response.status}. It may be unavailable or blocking automated access.`);
 if(!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw new Error('That URL does not return an HTML webpage. Try a page URL instead of a file.');}
 if(declaredTooLarge(response,MAX_HTML_BYTES)){await response.body?.cancel();throw new Error('This page is too large for a quick audit (1.5 MB HTML limit). Try a smaller page.');}
 const reader=response.body?.getReader();if(!reader)throw new Error('The website returned an empty page.');const decoder=new TextDecoder();let html='',bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_HTML_BYTES)throw new Error('This page is too large for a quick audit (1.5 MB HTML limit). Try a smaller page.');html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}return {html,bytes};
}
export async function readText(response:Response,limit=MAX_TEXT_BYTES){
 if(declaredTooLarge(response,limit)){await response.body?.cancel();throw new Error('Response is too large to inspect.');}
 const reader=response.body?.getReader();if(!reader)return '';const decoder=new TextDecoder();let text='',bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>limit)throw new Error('Response is too large to inspect.');text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{await reader.cancel().catch(()=>{});}
}
