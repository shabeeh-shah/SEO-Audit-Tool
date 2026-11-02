import type {Category,Finding,Status} from './types';

export const SCORING_VERSION='signal-weighted-v2';
export const STATUS_POINTS:Record<Status,number>={critical:0,improvement:55,good:100,optional:0};

type CheckDefinition={category:Category;weight:number;label:string};

export const CHECKS={
 title:{category:'seo',weight:2,label:'Page title'},
 description:{category:'seo',weight:1,label:'Meta description'},
 h1:{category:'seo',weight:1,label:'Main heading'},
 outline:{category:'seo',weight:1,label:'Heading hierarchy'},
 alt:{category:'seo',weight:2,label:'Image alt attributes'},
 indexing:{category:'seo',weight:2,label:'Indexing directives'},
 canonical:{category:'seo',weight:0,label:'Canonical tag'},
 https:{category:'seo',weight:2,label:'HTTPS'},
 viewport:{category:'seo',weight:1,label:'Viewport meta tag'},
 lang:{category:'seo',weight:1,label:'Language attribute'},
 links:{category:'seo',weight:2,label:'Internal-link sample'},
 redirects:{category:'seo',weight:1,label:'Redirect chains'},
 'robots-txt':{category:'seo',weight:0,label:'robots.txt availability'},
 sitemap:{category:'seo',weight:0,label:'sitemap.xml availability'},
 'social-cards':{category:'seo',weight:0,label:'Social card tags'},
 'security-headers':{category:'seo',weight:0,label:'Security response headers'},
 hreflang:{category:'seo',weight:0,label:'Language alternates'},
 copy:{category:'content',weight:2,label:'Useful text'},
 readability:{category:'content',weight:1,label:'Reading ease'},
 repetition:{category:'content',weight:1,label:'Repeated language'},
 paragraphs:{category:'content',weight:1,label:'Paragraph length'},
 'content-gaps':{category:'content',weight:1,label:'Visitor-question coverage'},
 'text-access':{category:'geo',weight:2,label:'Server-delivered text'},
 sections:{category:'geo',weight:1,label:'Content sections'},
 answers:{category:'geo',weight:1,label:'Question and answer structure'},
 schema:{category:'geo',weight:1,label:'Relevant structured data'},
 authorship:{category:'geo',weight:1,label:'Author and date signals'},
 snippets:{category:'geo',weight:1,label:'Snippet controls'},
 'ai-crawlers':{category:'geo',weight:1,label:'AI crawler rules'},
 'llms-txt':{category:'geo',weight:0,label:'llms.txt (optional and experimental)'},
 'page-speed':{category:'performance',weight:2,label:'Initial HTML delivery'},
 'large-images':{category:'performance',weight:2,label:'Large image sample'},
 'performance-bottlenecks':{category:'performance',weight:1,label:'Markup bottlenecks'},
 'mobile-usability':{category:'performance',weight:1,label:'Mobile foundations'},
 'core-web-vitals':{category:'performance',weight:0,label:'Core Web Vitals diagnostics'},
} as const satisfies Record<string,CheckDefinition>;

export type CheckId=keyof typeof CHECKS;

export function createFinding(id:CheckId,status:Status,title:string,evidence:string,recommendation:string):Finding{
 const check=CHECKS[id];
 return {id,category:check.category,weight:check.weight,status,title,evidence,recommendation};
}

export type ScoreContribution={finding:Finding;points:number;earned:number;maximum:number;included:boolean};
export type CategoryCalculation={category:Category;score:number;earned:number;maximum:number;checks:ScoreContribution[]};

export function calculateScores(findings:Finding[]){
 const categories=['seo','content','geo','performance'] as const;
 const calculations=categories.map(category=>{
  const checks=findings.filter(finding=>finding.category===category).map(finding=>{
   const points=STATUS_POINTS[finding.status];
   const included=finding.weight>0&&finding.status!=='optional';
   return {finding,points,earned:included?finding.weight*points:0,maximum:included?finding.weight*100:0,included};
  });
  const earned=checks.reduce((sum,check)=>sum+check.earned,0);
  const maximum=checks.reduce((sum,check)=>sum+check.maximum,0);
  return {category,earned,maximum,score:maximum?Math.round(earned/maximum*100):0,checks};
 });
 const scores=Object.fromEntries(calculations.map(item=>[item.category,item.score])) as Record<Category,number>;
 const score=Math.round(categories.reduce((sum,category)=>sum+scores[category],0)/categories.length);
 return {score,scores,calculations};
}

export function validateFindingDefinitions(findings:Finding[]){
 return findings.every(finding=>{
  const check=CHECKS[finding.id as CheckId];
  return !!check&&finding.category===check.category&&finding.weight===check.weight;
 });
}
