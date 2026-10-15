import {DOMParser,parseHTML} from 'linkedom';
import {createCrawler} from './crawl-fetch';
import {normalizeUrl,readHtml,readText} from './fetch';
import {discoverLinks} from './analyze';
export type CrawlPage={url:string;finalUrl:string;status:number|null;redirects:number;title:string;canonical:string;hreflang:{language:string;url:string}[];issue:string};
export type CrawlReport={pages:CrawlPage[];duplicates:{title:string;urls:string[]}[];issues:{url:string;priority:string;evidence:string;fix:string}[];sitemaps:string[];limit:number;limited:boolean;date:string};
export function sitemapUrls(xml:string,origin:string){
 const document=new DOMParser().parseFromString(xml,'text/xml');const index=!!document.querySelector('sitemapindex');
 const urls=(Array.from(document.querySelectorAll('loc')) as {textContent:string|null}[]).slice(0,500).flatMap(node=>{try{const url=normalizeUrl(node.textContent||'');return url.origin===origin?[url.href]:[];}catch{return [];}});
 return {index,urls:[...new Set(urls)]};
}
export function crawlSummary(pages:CrawlPage[],sitemaps:string[],limit:number,limited:boolean):CrawlReport{
 const titles=new Map<string,CrawlPage[]>();const issues:CrawlReport['issues']=[];
 for(const page of pages){if(page.title){const key=page.title.toLowerCase().replace(/\s+/g,' ').trim();titles.set(key,[...(titles.get(key)||[]),page]);}
  const add=(priority:string,evidence:string,fix:string)=>issues.push({url:page.url,priority,evidence,fix});
  if(page.status&&page.status>=400)add('Critical',`HTTP ${page.status}.`,'Update links and sitemap entries to a working destination, or restore this page.');
  if(page.issue)add('Review',page.issue,'Review the page manually. Unreachable or blocked pages are not counted as broken.');
  if(page.redirects>1)add('Improvement',`${page.redirects} redirects before ${page.finalUrl}.`,'Link directly to the final URL and remove avoidable intermediate redirects.');
  if(page.status===200&&!page.issue&&!page.title)add('Improvement','No non-empty title was found.','Add a unique title describing this page.');
  if(page.canonical&&page.canonical!==page.finalUrl){const target=pages.find(p=>p.finalUrl===page.canonical);if(target&&(target.status!==200||target.canonical&&target.canonical!==target.finalUrl))add('Improvement',`Canonical points to ${page.canonical}, which is unavailable or canonicalizes elsewhere.`,'Confirm the preferred URL and use one consistent, reachable canonical destination.');}
  const languages=new Set<string>();for(const alternate of page.hreflang){if(languages.has(alternate.language))add('Improvement',`Repeated hreflang language: ${alternate.language}.`,'Use one URL per language/region.');languages.add(alternate.language);
   const target=pages.find(p=>p.finalUrl===alternate.url);if(target&&!target.hreflang.some(h=>h.url===page.finalUrl))add('Improvement',`No return hreflang link from sampled page ${alternate.url}.`,'Add reciprocal language alternate links if these pages are translations of each other.');
  }
 }
 const duplicates=[...titles.values()].filter(group=>group.length>1).map(group=>({title:group[0].title,urls:group.map(page=>page.url)}));
 for(const duplicate of duplicates)issues.push({url:duplicate.urls[0],priority:'Improvement',evidence:`Duplicate title “${duplicate.title}” on ${duplicate.urls.join(', ')}`,fix:'Give distinct pages distinct titles; consolidate intentional duplicates with consistent canonicals.'});
 return {pages,duplicates,issues,sitemaps,limit,limited,date:new Date().toISOString()};
}
export async function crawlSite(input:string,limit=25,signal?:AbortSignal){
 const start=normalizeUrl(input).href;const origin=new URL(start).origin;const crawler=createCrawler(signal);
 const queue=[start],seen=new Set<string>(),pages:CrawlPage[]=[],sitemaps:string[]=[];
 const enqueue=(url:string)=>{if(new URL(url).origin===origin&&!seen.has(url)&&!queue.includes(url)&&queue.length<500)queue.push(url);};
 const rules=await crawler.robots(start);
 const maps=[...rules.text.matchAll(/^sitemap:\s*(\S+)/gim)].map(match=>match[1]);maps.push(origin+'/sitemap.xml');
 for(let i=0;i<maps.length&&sitemaps.length<3&&!signal?.aborted;i++){try{const url=normalizeUrl(maps[i]).href;if(new URL(url).origin!==origin||sitemaps.includes(url))continue;sitemaps.push(url);const result=await crawler.fetchPage(url,'GET',3500);if(!result.response.ok){await result.response.body?.cancel();continue;}const parsed=sitemapUrls(await readText(result.response),origin);if(parsed.index)maps.push(...parsed.urls.slice(0,3));else parsed.urls.forEach(enqueue);}catch{/* Missing maps do not prevent link discovery. */}}
 while(queue.length&&pages.length<limit&&!signal?.aborted){const batch=queue.splice(0,Math.min(3,limit-pages.length));for(const url of batch)seen.add(url);
  const results=await Promise.all(batch.map(async url=>{const entry:CrawlPage={url,finalUrl:url,status:null,redirects:0,title:'',canonical:'',hreflang:[],issue:''};try{const result=await crawler.fetchPage(url,'GET',5000);entry.finalUrl=result.url;entry.status=result.response.status;entry.redirects=result.redirects;if(!result.response.ok){await result.response.body?.cancel();return entry;}const {html}=await readHtml(result.response);const {document}=parseHTML(html);entry.title=(document.querySelector('title')?.textContent||'').trim().slice(0,300);const canonicals=document.querySelectorAll('link[rel~="canonical"]');if(canonicals.length>1)entry.issue=`${canonicals.length} canonical tags found.`;const canonical=canonicals[0]?.getAttribute('href');if(canonical)try{entry.canonical=new URL(canonical,result.url).href;}catch{entry.issue='Invalid canonical URL.';}
   entry.hreflang=Array.from(document.querySelectorAll('link[rel~="alternate"][hreflang][href]')).slice(0,30).flatMap(node=>{try{return [{language:node.getAttribute('hreflang')||'',url:new URL(node.getAttribute('href')!,result.url).href}];}catch{return [];}});discoverLinks(html,result.url).forEach(enqueue);
  }catch(error){entry.issue=error instanceof Error?error.message:'Page unavailable.';}return entry;}));pages.push(...results);
 }
 return crawlSummary(pages,sitemaps,limit,queue.length>0||!!signal?.aborted);
}
