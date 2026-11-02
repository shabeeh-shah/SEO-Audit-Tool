import {DOMParser,parseHTML} from 'linkedom';
import {createCrawler} from './crawl-fetch';
import {FetchSafetyError,normalizeUrl,readHtml,readText} from './fetch';
import {discoverLinks} from './analyze';

export const DEFAULT_CRAWL_LIMIT=25;
export const MAX_CRAWL_LIMIT=50;
export const CRAWL_CONCURRENCY=3;
export const CRAWL_RETRIES=1;

export type CrawlPriority='Critical'|'Improvement'|'Good';
export type CrawlFinding={id:string;priority:CrawlPriority;evidence:string;fix:string};
export type CrawlPage={
 url:string;finalUrl:string;status:number|null;redirects:number;attempts:number;title:string;description:string;canonical:string;canonicals:string[];
 hreflang:{language:string;url:string}[];links:string[];securityHeaders:string[];social:{openGraph:string[];twitter:string[]};
 accessibility:{missingAlt:number;unlabeledControls:number;emptyInteractive:number;headingSkips:number;lang:string};findings:CrawlFinding[];issue:string;
};
export type CrawlIssue=CrawlFinding&{url:string};
export type CrawlReport={
 pages:CrawlPage[];duplicates:{title:string;urls:string[]}[];duplicateDescriptions:{description:string;urls:string[]}[];issues:CrawlIssue[];sitemaps:string[];
 summary:{pages:number;reachable:number;broken:number;redirected:number;critical:number;improvement:number;good:number;checkedInternalLinks:number;source:'sitemap'|'links'};
 limit:number;limited:boolean;date:string;
};

export function crawlLimit(value:unknown){const number=Number(value);return Number.isInteger(number)?Math.max(1,Math.min(MAX_CRAWL_LIMIT,number)):DEFAULT_CRAWL_LIMIT;}

export function sitemapUrls(xml:string,origin:string){
 const document=new DOMParser().parseFromString(xml,'text/xml');const index=!!document.querySelector('sitemapindex');
 const urls=(Array.from(document.querySelectorAll('loc')) as {textContent:string|null}[]).slice(0,500).flatMap(node=>{try{const url=normalizeUrl(node.textContent||'');return url.origin===origin?[url.href]:[];}catch{return [];}});
 return {index,urls:[...new Set(urls)]};
}

const clean=(value:string|null|undefined)=> (value||'').replace(/\s+/g,' ').trim();
const normalizeKey=(value:string)=>clean(value).toLocaleLowerCase();
const headerNames=['content-security-policy','strict-transport-security','x-content-type-options','referrer-policy'] as const;

export function analyzeCrawlPage(html:string,entry:Pick<CrawlPage,'url'|'finalUrl'|'status'|'redirects'|'attempts'|'issue'>,headers:Headers|Record<string,string>=new Headers()):CrawlPage{
 const {document}=parseHTML(html);const all=(selector:string)=>Array.from(document.querySelectorAll(selector));
 const title=clean(document.querySelector('title')?.textContent).slice(0,300);
 const description=clean(all('meta').find(node=>(node.getAttribute('name')||'').toLowerCase()==='description')?.getAttribute('content')).slice(0,500);
 const canonicalNodes=all('link').filter(node=>(node.getAttribute('rel')||'').toLowerCase().split(/\s+/).includes('canonical'));
 const canonicals=canonicalNodes.flatMap(node=>{try{return [new URL(node.getAttribute('href')||'',entry.finalUrl).href]}catch{return []}});
 const invalidCanonicals=canonicalNodes.length-canonicals.length;
 const hreflang=all('link').filter(node=>(node.getAttribute('rel')||'').toLowerCase().split(/\s+/).includes('alternate')&&node.hasAttribute('hreflang')).slice(0,50).flatMap(node=>{try{return [{language:clean(node.getAttribute('hreflang')).toLowerCase(),url:new URL(node.getAttribute('href')||'',entry.finalUrl).href}]}catch{return [{language:clean(node.getAttribute('hreflang')).toLowerCase(),url:''}]}});
 const links=discoverLinks(html,entry.finalUrl);
 const getHeader=(name:string)=>headers instanceof Headers?headers.get(name)||'':Object.entries(headers).find(([key])=>key.toLowerCase()===name)?.[1]||'';
 const securityHeaders:string[]=headerNames.filter(name=>!!getHeader(name));
 const properties=all('meta').map(node=>({name:(node.getAttribute('property')||node.getAttribute('name')||'').toLowerCase(),content:clean(node.getAttribute('content'))}));
 const openGraph=['og:title','og:description','og:image','og:url'].filter(name=>properties.some(item=>item.name===name&&item.content));
 const twitter=['twitter:card','twitter:title','twitter:description','twitter:image'].filter(name=>properties.some(item=>item.name===name&&item.content));
 const images=all('img'),missingAlt=images.filter(node=>!node.hasAttribute('alt')).length;
 const labels=new Set(all('label[for]').map(node=>node.getAttribute('for')).filter(Boolean));
 const controls=all('input:not([type="hidden"]),select,textarea');
 const unlabeledControls=controls.filter(node=>!node.getAttribute('aria-label')&&!node.getAttribute('aria-labelledby')&&!labels.has(node.getAttribute('id'))&&!node.closest('label')).length;
 const emptyInteractive=all('a[href],button').filter(node=>!clean(node.textContent)&&!node.getAttribute('aria-label')&&!node.getAttribute('aria-labelledby')&&!node.querySelector('img[alt]:not([alt=""])')).length;
 const headingLevels=all('h1,h2,h3,h4,h5,h6').map(node=>Number(node.tagName.slice(1)));let headingSkips=0;for(let i=1;i<headingLevels.length;i++)if(headingLevels[i]>headingLevels[i-1]+1)headingSkips++;
 const lang=clean(document.documentElement?.getAttribute('lang')).toLowerCase();
 const page:CrawlPage={...entry,title,description,canonical:canonicals[0]||'',canonicals,hreflang,links,securityHeaders,social:{openGraph,twitter},accessibility:{missingAlt,unlabeledControls,emptyInteractive,headingSkips,lang},findings:[]};
 const add=(id:string,priority:CrawlPriority,evidence:string,fix:string)=>page.findings.push({id,priority,evidence,fix});
 if(!title)add('title','Critical','No non-empty title element was found.','Add one concise, page-specific title element.');else add('title','Good',`Title found: “${title}”.`,'Keep the title specific to this page.');
 if(!description)add('meta-description','Improvement','No non-empty meta description was found.','Add a concise description that accurately summarizes this page.');else add('meta-description','Good',`Meta description found (${description.length} characters).`,'Keep it accurate and specific to this page.');
 if(canonicalNodes.length!==1||invalidCanonicals)add('canonical','Improvement',`${canonicalNodes.length} canonical tag(s) found; ${invalidCanonicals} had an invalid URL.`,'Use one valid canonical URL that identifies the preferred version of this page.');
 else if(canonicals[0]!==entry.finalUrl)add('canonical','Improvement',`Canonical points to ${canonicals[0]} instead of the fetched URL ${entry.finalUrl}.`,'Confirm the intended preferred URL and keep internal links, redirects, and canonical tags consistent.');
 else add('canonical','Good',`Self-referencing canonical found: ${canonicals[0]}.`,'Keep the canonical aligned with the preferred public URL.');
 const invalidLanguages=hreflang.filter(item=>!item.url||!/^([a-z]{2,3})(-[a-z0-9]{2,8})*$|^x-default$/i.test(item.language));const repeatedLanguages=hreflang.filter((item,index)=>hreflang.findIndex(other=>other.language===item.language)!==index);
 if(invalidLanguages.length||repeatedLanguages.length)add('hreflang','Improvement',`${invalidLanguages.length} invalid and ${repeatedLanguages.length} repeated hreflang entries were found.`,'Use valid language or language-region codes, one destination per code, and valid absolute or relative URLs.');
 else if(hreflang.length)add('hreflang','Good',`${hreflang.length} syntactically valid hreflang entr${hreflang.length===1?'y':'ies'} found.`,'Keep alternate annotations reciprocal across translated pages.');
 const missingSocial=[...['og:title','og:description','og:image','og:url'].filter(name=>!openGraph.includes(name)),...['twitter:card','twitter:title','twitter:description','twitter:image'].filter(name=>!twitter.includes(name))];
 add('social-tags',missingSocial.length?'Improvement':'Good',missingSocial.length?`Missing or empty tags: ${missingSocial.join(', ')}.`:'Open Graph and Twitter card title, description, image, and URL/card fields were found.',missingSocial.length?'Add the missing tags with values that match the visible page and use an absolute, shareable image URL.':'Keep social metadata aligned with visible content.');
 const requiredHeaders=['content-security-policy','x-content-type-options','referrer-policy',...(entry.finalUrl.startsWith('https:')?['strict-transport-security']:[])];const missingHeaders=requiredHeaders.filter(name=>!securityHeaders.includes(name));
 add('security-headers',missingHeaders.length?'Improvement':'Good',missingHeaders.length?`Missing response headers: ${missingHeaders.join(', ')}.`:`Observed: ${securityHeaders.join(', ')}.`,'Set security headers at the application or edge layer, testing Content-Security-Policy before enforcing it.');
 const a11yProblems=[missingAlt&&`${missingAlt} image(s) without alt`,unlabeledControls&&`${unlabeledControls} unlabeled form control(s)`,emptyInteractive&&`${emptyInteractive} empty link/button(s)`,headingSkips&&`${headingSkips} heading-level skip(s)`,!lang&&'missing html lang'].filter(Boolean);
 add('accessibility',a11yProblems.length?'Improvement':'Good',a11yProblems.length?a11yProblems.join(' · '):'No missing alt attributes, unlabeled controls, empty interactive elements, heading skips, or missing lang attribute were found in the server HTML.','Add text alternatives and programmatic labels, use meaningful interactive names, keep headings sequential, and declare the page language. Confirm with manual and assistive-technology testing.');
 return page;
}

function duplicateGroups(pages:CrawlPage[],key:'title'|'description'){
 const values=new Map<string,CrawlPage[]>();for(const page of pages){const value=page[key];if(!value)continue;const normalized=normalizeKey(value);values.set(normalized,[...(values.get(normalized)||[]),page]);}
 return [...values.values()].filter(group=>group.length>1).map(group=>({[key]:group[0][key],urls:group.map(page=>page.url)})) as ({title:string;urls:string[]}|{description:string;urls:string[]})[];
}

export function crawlSummary(pages:CrawlPage[],sitemaps:string[],limit:number,limited:boolean,source:'sitemap'|'links'=sitemaps.length?'sitemap':'links'):CrawlReport{
 const issues:CrawlIssue[]=[];const byFinal=new Map(pages.map(page=>[page.finalUrl,page]));const add=(url:string,id:string,priority:CrawlPriority,evidence:string,fix:string)=>issues.push({url,id,priority,evidence,fix});
 for(const page of pages){
  page.findings.forEach(finding=>{if(finding.priority!=='Good')issues.push({...finding,url:page.url});});
  if(page.status!==null&&page.status>=400)add(page.url,'broken-page','Critical',`${page.url} returned HTTP ${page.status}.`,'Restore the page, redirect it once to the closest relevant destination, and update sitemap and internal links.');
  if(page.issue)add(page.url,'crawl-error','Improvement',page.issue,'Check availability and crawler rules. Unreachable or blocked pages are reported as inconclusive, not automatically broken.');
  if(page.redirects>1)add(page.url,'redirect-chain','Improvement',`${page.url} required ${page.redirects} redirects before ${page.finalUrl}.`,'Update links and sitemap entries to point directly to the final URL and remove unnecessary redirect hops.');
  if(page.canonical){const target=byFinal.get(page.canonical);if(target&&(target.status!==200||target.canonical&&target.canonical!==target.finalUrl))add(page.url,'canonical-conflict','Improvement',`Canonical target ${page.canonical} is unavailable or canonicalizes to another sampled URL.`,'Choose one reachable preferred URL and align redirects, internal links, and canonical tags with it.');}
  const languages=new Set<string>();for(const alternate of page.hreflang){if(languages.has(alternate.language))continue;languages.add(alternate.language);const target=byFinal.get(alternate.url);if(target&&!target.hreflang.some(item=>item.url===page.finalUrl))add(page.url,'hreflang-return','Improvement',`Sampled alternate ${alternate.url} does not link back to ${page.finalUrl}.`,'Add reciprocal hreflang annotations when these pages are true language or region alternates.');}
 }
 const brokenTargets=new Map<string,{target:CrawlPage;sources:string[]}>();for(const sourcePage of pages)for(const link of sourcePage.links){const target=byFinal.get(link);if(target&&target.status!==null&&target.status>=400){const item=brokenTargets.get(link)||{target,sources:[]};item.sources.push(sourcePage.url);brokenTargets.set(link,item);}}
 for(const [link,item] of brokenTargets)add(item.sources[0],'broken-internal-link','Critical',`${link} returned HTTP ${item.target.status} and was linked from ${item.sources.slice(0,5).join(', ')}${item.sources.length>5?` and ${item.sources.length-5} more`:''}.`,'Replace or remove the broken links, or restore the destination with a useful response.');
 const duplicates=duplicateGroups(pages,'title') as {title:string;urls:string[]}[];for(const duplicate of duplicates)add(duplicate.urls[0],'duplicate-title','Improvement',`Duplicate title “${duplicate.title}” appears on ${duplicate.urls.join(', ')}.`,'Give distinct pages distinct titles; consolidate intentional duplicates with a consistent canonical and redirect plan.');
 const duplicateDescriptions=duplicateGroups(pages,'description') as {description:string;urls:string[]}[];for(const duplicate of duplicateDescriptions)add(duplicate.urls[0],'duplicate-description','Improvement',`The same meta description appears on ${duplicate.urls.join(', ')}.`,'Write a page-specific description for each important indexable page.');
 const uniqueIssues=[...new Map(issues.map(issue=>[`${issue.id}:${issue.url}:${issue.evidence}`,issue])).values()];const good=pages.reduce((sum,page)=>sum+page.findings.filter(finding=>finding.priority==='Good').length,0);
 return {pages,duplicates,duplicateDescriptions,issues:uniqueIssues,sitemaps,summary:{pages:pages.length,reachable:pages.filter(page=>page.status!==null&&page.status<400&&!page.issue).length,broken:pages.filter(page=>page.status!==null&&page.status>=400).length,redirected:pages.filter(page=>page.redirects>0).length,critical:uniqueIssues.filter(issue=>issue.priority==='Critical').length,improvement:uniqueIssues.filter(issue=>issue.priority==='Improvement').length,good,checkedInternalLinks:pages.reduce((sum,page)=>sum+page.links.filter(link=>byFinal.has(link)).length,0),source},limit,limited,date:new Date().toISOString()};
}

export async function crawlSite(input:string,requestedLimit=DEFAULT_CRAWL_LIMIT,signal?:AbortSignal){
 const limit=crawlLimit(requestedLimit);const start=normalizeUrl(input).href;const origin=new URL(start).origin;const crawler=createCrawler(signal);
 const queue=[start],seen=new Set<string>(),pages:CrawlPage[]=[],sitemaps:string[]=[];let discoveredFromSitemap=false;
 const enqueue=(url:string)=>{if(new URL(url).origin===origin&&!seen.has(url)&&!queue.includes(url)&&queue.length<500)queue.push(url);};
 const fetchWithRetry=async(url:string,timeout:number)=>{let attempt=0;while(true){attempt++;try{return {...await crawler.fetchPage(url,'GET',timeout),attempts:attempt}}catch(error){if(attempt>CRAWL_RETRIES||!(error instanceof FetchSafetyError)||error.kind==='blocked'||signal?.aborted)throw error;}}};
 const rules=await crawler.robots(start);const maps=[...rules.text.matchAll(/^sitemap:\s*(\S+)/gim)].map(match=>match[1]);maps.push(origin+'/sitemap.xml');
 for(let i=0;i<maps.length&&sitemaps.length<3&&!signal?.aborted;i++){try{const url=normalizeUrl(maps[i]).href;if(new URL(url).origin!==origin||sitemaps.includes(url))continue;sitemaps.push(url);const result=await fetchWithRetry(url,3500);if(!result.response.ok){await result.response.body?.cancel();continue;}const parsed=sitemapUrls(await readText(result.response),origin);if(parsed.index)maps.push(...parsed.urls.slice(0,3));else {if(parsed.urls.length)discoveredFromSitemap=true;parsed.urls.forEach(enqueue);}}catch{/* Missing or blocked maps do not prevent permitted link discovery. */}}
 while(queue.length&&pages.length<limit&&!signal?.aborted){const batch=queue.splice(0,Math.min(CRAWL_CONCURRENCY,limit-pages.length));for(const url of batch)seen.add(url);
  const results=await Promise.all(batch.map(async url=>{const base={url,finalUrl:url,status:null as number|null,redirects:0,attempts:1,issue:''};try{const result=await fetchWithRetry(url,5000);base.finalUrl=result.url;base.status=result.response.status;base.redirects=result.redirects;base.attempts=result.attempts;if(!result.response.ok){await result.response.body?.cancel();return {...base,title:'',description:'',canonical:'',canonicals:[],hreflang:[],links:[],securityHeaders:[],social:{openGraph:[],twitter:[]},accessibility:{missingAlt:0,unlabeledControls:0,emptyInteractive:0,headingSkips:0,lang:''},findings:[]} satisfies CrawlPage;}const headers=new Headers(result.response.headers);const {html}=await readHtml(result.response);const page=analyzeCrawlPage(html,base,headers);page.links.forEach(enqueue);return page;
   }catch(error){base.issue=error instanceof Error?error.message:'Page unavailable.';return {...base,title:'',description:'',canonical:'',canonicals:[],hreflang:[],links:[],securityHeaders:[],social:{openGraph:[],twitter:[]},accessibility:{missingAlt:0,unlabeledControls:0,emptyInteractive:0,headingSkips:0,lang:''},findings:[]} satisfies CrawlPage;}}));pages.push(...results);
 }
 return crawlSummary(pages,sitemaps,limit,queue.length>0||!!signal?.aborted,discoveredFromSitemap?'sitemap':'links');
}
