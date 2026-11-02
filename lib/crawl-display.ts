import type {CrawlPage} from './audit/crawl';
export function crawlPageScore(page:CrawlPage){if(!page.status||page.status>=400)return 0;return page.findings.length?Math.round(page.findings.reduce((sum,f)=>sum+(f.priority==='Good'?100:f.priority==='Improvement'?55:0),0)/page.findings.length):null;}
export function crawlTopIssue(page:CrawlPage){return page.issue||page.findings.find(f=>f.priority==='Critical')?.fix||page.findings.find(f=>f.priority==='Improvement')?.fix||'No issues in completed checks';}
