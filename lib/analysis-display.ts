import type {LabPerformance} from './audit/types';
import type {CrawlPage} from './audit/crawl';
import {crawlPageScore,crawlTopIssue} from './crawl-display';

export function labBand(value:number|null|undefined,metric:'lcp'|'cls'){
 if(value==null||!Number.isFinite(value)||value<0)return {status:'optional' as const,label:'Unavailable'};
 const [good,improvement]=metric==='lcp'?[2500,4000]:[.1,.25];
 return value<=good?{status:'good' as const,label:'Good'}:value<=improvement?{status:'improvement' as const,label:'Needs improvement'}:{status:'critical' as const,label:'Poor'};
}
export function labRanges(metric:'lcp'|'cls'){return metric==='lcp'?'Good ≤ 2.5 s · Needs improvement ≤ 4 s · Poor > 4 s':'Good ≤ 0.1 · Needs improvement ≤ 0.25 · Poor > 0.25';}
export function mobileSummary(lab:LabPerformance|null){return !lab?'Unavailable':lab.mobileOverflow||lab.smallTapTargets?'Review mobile findings':'No checked issues observed';}
export type CrawlSort='url'|'grade'|'http'|'issue';
export function sortCrawlPages(pages:CrawlPage[],sort:CrawlSort,direction:'ascending'|'descending'){
 return [...pages].sort((a,b)=>{
  const difference=sort==='url'?a.url.localeCompare(b.url):sort==='grade'?(crawlPageScore(a)??-1)-(crawlPageScore(b)??-1):sort==='http'?(a.status??-1)-(b.status??-1):crawlTopIssue(a).localeCompare(crawlTopIssue(b));
  return difference*(direction==='ascending'?1:-1)||a.url.localeCompare(b.url);
 });
}
