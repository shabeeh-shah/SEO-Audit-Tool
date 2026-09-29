import {createFetcher,normalizeUrl,readHtml} from '@/lib/audit/fetch';

const safeToken=(value:string|null)=>/^[a-zA-Z0-9_-]{12,128}$/.test(value||'')?value:'';

function instrument(html:string,target:string,token:string){
 const base=`<base href="${target}">`;
 const script=`<script>(function(){function count(){var root=document.querySelector('main,article,[role="main"]')||document.body;var text=(root.innerText||root.textContent||'').replace(/\s+/g,' ').trim();var words=(text.match(/[\p{L}]+(?:['’][\p{L}]+)?/gu)||[]).length;parent.postMessage({type:'signal-rendered-word-count',token:${JSON.stringify(token)},words:Math.min(words,500000)},'*');}window.addEventListener('load',function(){setTimeout(count,1800)});setTimeout(count,5500)})();<\/script>`;
 if(/<head\b[^>]*>/i.test(html))return html.replace(/<head\b[^>]*>/i,match=>`${match}${base}${script}`);
 return `<!doctype html><html><head>${base}${script}</head><body>${html}</body></html>`;
}

export async function GET(request:Request){
 try{
  const requestUrl=new URL(request.url);const target=normalizeUrl(requestUrl.searchParams.get('url')||'').href;const token=safeToken(requestUrl.searchParams.get('token'));if(!token)return new Response('Invalid render request.',{status:400});
  const fetchPage=createFetcher();const {response,url}=await fetchPage(target,'GET',10000);const {html}=await readHtml(response);const origin=new URL(url).origin;
  return new Response(instrument(html,url,token),{headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':`sandbox allow-scripts; default-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'self'; script-src 'unsafe-inline' http: https:; style-src 'unsafe-inline' http: https:; img-src data: http: https:; font-src data: http: https:; media-src http: https:; connect-src ${origin};`}});
 }catch{return new Response('Unable to create an isolated page preview.',{status:400,headers:{'Cache-Control':'no-store'}});}
}
