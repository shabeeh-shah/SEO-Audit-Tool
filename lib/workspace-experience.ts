import type {Audit,Category,Finding} from './audit/types';
import {isIssue,prioritize} from './audit/priorities';
import type {WorkspaceView} from './workspace-nav';

export const auditSteps=['Fetching page','Checking robots.txt and sitemap','Rendering','Scoring'];
export function analysisView(category:Category):WorkspaceView{return category==='geo'?'ai-readiness':category==='performance'?'performance':'seo-content';}
export function categoryFocus(audit:Audit,category:Category){const checks=prioritize(audit.findings).filter(f=>f.category===category);return checks.find(isIssue)||checks[0];}
export function findingForView(audit:Audit,view:WorkspaceView,id:string|null):Finding|undefined{return audit.findings.find(f=>f.id===id&&analysisView(f.category)===view);}
export function nextStep(audit:Audit,view:WorkspaceView,hasReport:boolean){
 const issues=prioritize(audit.findings).filter(isIssue);
 if(view==='overview'&&!hasReport)return {title:'Start with a public page',description:'Enter a website URL, or explore the offline sample first.',label:'Enter a URL',view:'overview' as WorkspaceView,focusUrl:true};
 if(view==='recommendations')return {title:'Verify your changes over time',description:'Make a change, re-run the page, and compare the saved results.',label:'Open history',view:'history' as WorkspaceView};
 if(['seo-content','ai-readiness','performance'].includes(view)){
  const relevant=issues.filter(f=>analysisView(f.category)===view);
  if(relevant.length)return {title:`Review ${relevant.length} ${relevant.length===1?'improvement':'improvements'}`,description:'Open the evidence and choose one concrete change to make.',label:'Review fixes',view:'recommendations' as WorkspaceView,finding:relevant[0].id};
  return {title:'Compare against a competitor',description:'Compare public page structure and topics to spot useful differences.',label:'Compare pages',view:'competitors' as WorkspaceView};
 }
 if(view==='history'||view==='bulk')return {title:'Review a single page in detail',description:'Use a page audit to understand the evidence behind its score.',label:'Open overview',view:'overview' as WorkspaceView};
 if(view==='pages')return {title:'Compare content and structure',description:'Put your page beside a competitor and review the differences.',label:'Compare pages',view:'competitors' as WorkspaceView};
 if(issues.length)return {title:`Review ${issues.length} ${issues.length===1?'improvement':'improvements'}`,description:'Open the evidence and choose the most useful change to make first.',label:'Review fixes',view:'recommendations' as WorkspaceView,finding:issues[0].id};
 return {title:'Compare against a competitor',description:'Explore differences in public page structure and content.',label:'Compare pages',view:'competitors' as WorkspaceView};
}

/** Input feedback only: the server still enforces every URL and SSRF safety rule. */
export function auditInputError(value:unknown){
 if(typeof value!=='string'||!value.trim()||value.length>2048)return 'Enter a valid website URL.';
 const candidate=value.trim();if(/\s/.test(candidate))return 'Enter a valid HTTP or HTTPS website URL without spaces.';
 try{const parsed=new URL(/^[a-z][a-z0-9+.-]*:/i.test(candidate)?candidate:`https://${candidate}`);if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname)return 'Enter a valid HTTP or HTTPS website URL.';}catch{return 'Enter a valid HTTP or HTTPS website URL.';}
 return null;
}
