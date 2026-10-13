import {parseHTML} from 'linkedom';

export type Intent = {label:string; signals:string[]};
export type PageProfile = {url:string; title:string; words:number; text:string; headings:{level:number;text:string}[]; h1:number; h2:number; h3:number; questions:number; lists:number; tables:number; intent:Intent; limited:boolean};
export type Evidence = {url:string; excerpt:string};
export type Opportunity = {term:string; priority:'High'|'Medium'; evidence:Evidence[]; why:string; fix:string; example:string};
export type CompetitorReport = {date:string; sample?:boolean; target:string; baseline:Omit<PageProfile,'text'>; competitors:Omit<PageProfile,'text'>[]; keywords:Opportunity[]; gaps:Opportunity[]; targetCoverage:{url:string; count:number; inTitle:boolean; inHeading:boolean}[]; errors:{url:string; message:string}[]};
const clean=(value:string)=>value.replace(/\s+/g,' ').trim();
const normalize=(value:string)=>value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const stop=new Set('about after again also and are best can company contact for from get has have help home how into its learn more new now our page read service services that the their them these they this those through tips use using was website what when where which who why will with you your'.split(' '));
const tokens=(value:string)=>normalize(value).split(' ').filter(word=>word.length>2&&!stop.has(word));
const counts=(text:string,phrase:string)=>{const haystack=` ${normalize(text)} `;const needle=` ${normalize(phrase)} `;let count=0,at=0;while((at=haystack.indexOf(needle,at))!==-1){count++;at+=needle.length-1;}return count;};
export function estimateIntent(title:string,headings:string[]):Intent{
 const source=normalize([title,...headings].join(' '));
 const groups:[string,string[]][]=[['Informational',['how to','guide','tutorial','what is','learn','explained']],['Commercial research',['comparison','compare','versus','reviews','alternatives','pricing']],['Transactional',['buy','shop','book','quote','order','subscribe','contact sales']]];
 const ranked=groups.map(([label,terms])=>({label,signals:terms.filter(term=>counts(source,term)>0)})).sort((a,b)=>b.signals.length-a.signals.length);
 if(!ranked[0].signals.length)return {label:'Unclear',signals:[]};
 const tied=ranked.filter(group=>group.signals.length===ranked[0].signals.length);
 return {label:tied.length>1?'Mixed':ranked[0].label,signals:tied.flatMap(group=>group.signals)};
}
export function extractProfile(html:string,url:string):PageProfile{
 const {document}=parseHTML(html);const title=clean(document.querySelector('title')?.textContent||'').slice(0,300);
 document.querySelectorAll('script,style,noscript,template,nav,footer,[hidden],[aria-hidden="true"]').forEach(node=>node.remove());
 document.querySelectorAll('header').forEach(node=>{if(!node.closest('main,[role="main"],article'))node.remove();});
 const root=document.querySelector('main,[role="main"],article')||document.body;
 const blocks='h1,h2,h3,h4,h5,h6,p,li,td,th,dt,dd';
 const paragraphs=Array.from(root.querySelectorAll(blocks)).filter(node=>{for(let parent=node.parentElement;parent&&parent!==root;parent=parent.parentElement)if(parent.matches(blocks))return false;return true;}).map(node=>clean(node.textContent||''));
 const full=clean(paragraphs.length?paragraphs.join(' '):root.textContent||'');const text=full.slice(0,120000);
 const headings=Array.from(root.querySelectorAll('h1,h2,h3,h4,h5,h6')).slice(0,100).map(node=>({level:Number(node.tagName.slice(1)),text:clean(node.textContent||'').slice(0,240)}));
 const words=normalize(text).split(' ').filter(Boolean).length;
 return {url,title,words,text,headings,h1:headings.filter(h=>h.level===1).length,h2:headings.filter(h=>h.level===2).length,h3:headings.filter(h=>h.level===3).length,questions:headings.filter(h=>/\?|^(how|what|why|when|where|who|can|does|is|are)\b/i.test(h.text)).length,lists:root.querySelectorAll('ul,ol').length,tables:root.querySelectorAll('table').length,intent:estimateIntent(title,headings.map(h=>h.text)),limited:words<80||full.length>120000};
}
const publicProfile=({text,...profile}:PageProfile)=>profile;
function snippet(page:PageProfile,term:string){const heading=page.headings.find(h=>counts(h.text,term));if(heading)return heading.text;const at=page.text.toLowerCase().indexOf(term.toLowerCase());return clean(page.text.slice(Math.max(0,at-60),Math.max(0,at-60)+220));}
export function compareProfiles(baseline:PageProfile,competitors:PageProfile[],target=''):CompetitorReport{
 const candidates=new Set<string>();const brandWords=new Set([baseline,...competitors].flatMap(page=>new URL(page.url).hostname.split(/[.\-]/)).filter(word=>word.length>2));
 for(const page of competitors){for(const heading of page.headings){const words=normalize(heading.text).split(' ').slice(0,32);for(let i=0;i<words.length;i++)for(const n of [2,3]){const chunk=words.slice(i,i+n);if(chunk.length===n&&chunk.every(word=>word.length>2&&!stop.has(word)&&!brandWords.has(word)))candidates.add(chunk.join(' '));}}}
 const baselineText=baseline.title+' '+baseline.text;
 const keywords:Opportunity[]=[...candidates].filter(term=>!counts(baselineText,term)).map(term=>{
  const evidence=competitors.filter(page=>counts(page.text,term)>=2&&page.headings.some(heading=>counts(heading.text,term)>0)).map(page=>({url:page.url,excerpt:snippet(page,term)}));
  return {term,evidence,priority:evidence.length>1?'High' as const:'Medium' as const,why:`This phrase appears at least twice on ${evidence.length} compared page(s), including a heading, but was not found in your extracted page text or title.`,fix:'Check whether this phrase describes something you genuinely offer. Research demand and intent before adding it naturally to relevant copy.',example:`Possible section: “${term.charAt(0).toUpperCase()+term.slice(1)}: what to expect”.`};
 }).filter(item=>item.evidence.length).sort((a,b)=>b.evidence.length-a.evidence.length||b.term.split(' ').length-a.term.split(' ').length||a.term.localeCompare(b.term)).filter((item,index,items)=>!items.slice(0,index).some(previous=>previous.term.includes(item.term)&&previous.evidence.length>=item.evidence.length)).slice(0,8);
 const gaps:Opportunity[]=[];
 for(const page of competitors){for(const heading of page.headings.filter(h=>h.level===2||h.level===3)){
  const terms=[...new Set(tokens(heading.text))];if(terms.length<2)continue;
  const represented=baseline.headings.some(h=>{const own=new Set(tokens(h.text));return terms.filter(term=>own.has(term)).length/terms.length>=.6;});
  if(represented)continue;
  const existing=gaps.find(gap=>normalize(gap.term)===normalize(heading.text));if(existing){if(!existing.evidence.some(e=>e.url===page.url))existing.evidence.push({url:page.url,excerpt:heading.text});existing.priority=existing.evidence.length>1?'High':'Medium';continue;}
  const mentioned=terms.filter(term=>counts(baseline.text,term)>0).length/terms.length>=.6;
  gaps.push({term:heading.text,priority:'Medium',evidence:[{url:page.url,excerpt:heading.text}],why:mentioned?'Related words appear in your copy, but no similar heading was found. This may be an opportunity to make existing information easier to find.':'No similar heading was found on your page, and most topic words were absent from the extracted copy. Treat this as a possible content gap to review.',fix:mentioned?'Review your existing coverage and add a descriptive section heading if the topic deserves its own space.':'Confirm the topic matters to your audience, then create a useful section or supporting article with your own expertise and examples.',example:`Content brief: answer the question behind “${heading.text}”, explain the practical details, add original proof or examples, and link to the relevant service or next step.`});
 }}
 gaps.sort((a,b)=>b.evidence.length-a.evidence.length);
 return {date:new Date().toISOString(),target,baseline:publicProfile(baseline),competitors:competitors.map(publicProfile),keywords,gaps:gaps.slice(0,8),targetCoverage:target?[baseline,...competitors].map(page=>({url:page.url,count:counts(page.text,target),inTitle:counts(page.title,target)>0,inHeading:page.headings.some(h=>counts(h.text,target)>0)})):[],errors:[]};
}

export function sampleComparison():CompetitorReport{
 const html=(title:string,body:string)=>`<html><head><title>${title}</title></head><body><main>${body}</main></body></html>`;
 const baseline=extractProfile(html('Northstar design studio','<h1>Brand design for growing businesses</h1><h2>Our creative process</h2><p>We create brand identities and websites with clear strategy. Our creative process starts with listening and includes design workshops, feedback, and launch planning.</p>'),'https://northstar.example/');
 const rivals=[extractProfile(html('Brand design pricing and packages','<h1>Brand design packages</h1><h2>Brand strategy workshops</h2><p>Brand strategy workshops help your team define customer needs.</p><h2>Project pricing and timelines</h2><p>See project pricing and timelines before booking a workshop.</p><h2>Client success stories</h2><p>Our client success stories describe the challenge, process, and results.</p>'),'https://studio-one.example/branding'),extractProfile(html('How to plan your brand redesign','<h1>Brand redesign guide</h1><h2>Brand strategy workshops</h2><p>Brand strategy workshops bring customer research and positioning together.</p><h2>Accessible design systems</h2><p>Accessible design systems keep your digital brand consistent for everyone.</p>'),'https://studio-two.example/guide')];
 return {...compareProfiles(baseline,rivals,'brand design'),sample:true};
}
