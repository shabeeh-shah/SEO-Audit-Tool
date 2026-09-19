// Use only Cloudflare Workers default public-only global fetch; never a private/VPC binding.
// DNS preflight is defense in depth, not IP pinning. Other runtimes require egress protection.
// Redirect destinations are revalidated.
export function normalizeUrl(input: string): URL {
  if (typeof input !== 'string' || input.length > 2048 || !input.trim()) throw new Error('Enter a public website URL, such as https://example.com.');
  const raw = input.trim();
  const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || !host.includes('.') || host.includes(':') || /^[\d.]+$/.test(host) || /(^|\.)(localhost|local|internal|lan|home|test|invalid|example)$/.test(host) || !/^[a-z0-9.-]+$/.test(host)) throw new Error('Use a public website domain on HTTP or HTTPS. Local addresses, IP addresses, custom ports, and credentials are not supported.');
  url.hostname = host; url.hash = ''; return url;
}
export function publicAddress(address: string): boolean {
  if (address.includes(':')) {
    const ip = address.toLowerCase();
    // Only global unicast IPv6; exclude special-purpose documentation/transition ranges.
    return /^[23]/.test(ip) && !/^2001:(?:0:|db8:|2:|10:|20:)/.test(ip) && !/^2002:/.test(ip);
  }
  const octets=address.split('.').map(Number); if(octets.length!==4||octets.some(n=>!Number.isInteger(n)||n<0||n>255))return false;
  const [a,b,c]=octets;
  return !(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&(b===168||b===0||b===2))||(a===100&&b>=64&&b<=127)||(a===198&&(b===18||b===19||(b===51&&c===100)))||(a===203&&b===0&&c===113));
}
export function createFetcher() {
  const checked = new Map<string, Promise<void>>();
  async function checkHost(host: string) {
    if(!checked.has(host)) checked.set(host,(async()=>{
      const answers=await Promise.all(['A','AAAA'].map(async type=>{
        const r=await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,{headers:{accept:'application/dns-json'},signal:AbortSignal.timeout(3500)});
        if(!r.ok)throw new Error('We could not verify that domain. Try again in a moment.');
        const d=await r.json() as {Answer?:{type:number;data:string}[]};return (d.Answer||[]).filter(a=>a.type===1||a.type===28).map(a=>a.data);
      }));
      const ips=answers.flat(); if(!ips.length||ips.some(ip=>!publicAddress(ip)))throw new Error('This domain does not resolve to an eligible public website.');
    })());
    await checked.get(host);
  }
  return async function safeFetch(input:string, method='GET', timeout=10000){
    let url=normalizeUrl(input);const signal=AbortSignal.timeout(timeout);
    for(let n=0;n<=4;n++){
      await checkHost(url.hostname); if(signal.aborted)throw new Error('The website took too long to respond. Please try again.');
      const r=await fetch(url.href,{method,redirect:'manual',signal,headers:{'User-Agent':'SignalAudit/1.0 (single-page website audit)','Accept':'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5'}});
      if([301,302,303,307,308].includes(r.status)){
        const next=r.headers.get('location');await r.body?.cancel();if(!next)throw new Error('The website returned a redirect without a destination.');url=normalizeUrl(new URL(next,url).href);continue;
      }
      return {response:r,url:url.href,redirects:n};
    }
    throw new Error('The website redirected too many times. Try its final page URL.');
  };
}
export async function readHtml(response:Response){
  if(!response.ok)throw new Error(`The website returned HTTP ${response.status}. It may be unavailable or blocking automated access.`);
  if(!/text\/html|application\/xhtml\+xml/i.test(response.headers.get('content-type')||'')){await response.body?.cancel();throw new Error('That URL does not return an HTML webpage. Try a page URL instead of a file.');}
  const reader=response.body?.getReader();if(!reader)throw new Error('The website returned an empty page.');
  const decoder=new TextDecoder();let html='',bytes=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1_500_000)throw new Error('This page is too large for a quick audit (1.5 MB HTML limit). Try a smaller page.');html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel().catch(()=>{});}
  return {html,bytes};
}
