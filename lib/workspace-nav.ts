import type {Audit} from './audit/types';
export type WorkspaceNavItem={id:string;label:string;group:'Audit'|'Analyze'|'Compare'|'Learn';icon:'overview'|'fixes'|'pages'|'seo'|'ai'|'performance'|'compare'|'bulk'|'history'|'help';route:string;badge:string;enabled:boolean;description:string};
export const workspaceNav=[
 {id:'overview',label:'Overview',group:'Audit',icon:'overview',route:'/report/overview',badge:'all',enabled:true,description:'Your results, strongest signals, and three useful fixes.'},
 {id:'recommendations',label:'Recommendations',group:'Audit',icon:'fixes',route:'/report/recommendations',badge:'all',enabled:true,description:'Turn evidence into changes you can review and complete.'},
 {id:'pages',label:'Pages',group:'Audit',icon:'pages',route:'/report/pages',badge:'',enabled:true,description:'Discover pages and review the evidence from your bounded crawl.'},
 {id:'seo-content',label:'SEO & Content',group:'Analyze',icon:'seo',route:'/report/seo-content',badge:'seo,content',enabled:true,description:'Review metadata, headings, images, links, and readable content.'},
 {id:'ai-readiness',label:'AI search readiness',group:'Analyze',icon:'ai',route:'/report/ai-readiness',badge:'geo',enabled:true,description:'Understand crawler access, publisher signals, and answer structure.'},
 {id:'performance',label:'Performance & mobile',group:'Analyze',icon:'performance',route:'/report/performance',badge:'performance',enabled:true,description:'Review bounded server evidence and experimental browser diagnostics.'},
 {id:'competitors',label:'Competitor insights',group:'Compare',icon:'compare',route:'/report/competitors',badge:'',enabled:true,description:'Compare public pages and find useful content gaps.'},
 {id:'bulk',label:'Bulk audit',group:'Compare',icon:'bulk',route:'/report/bulk',badge:'',enabled:true,description:'Compare up to 20 public URLs, two audits at a time.'},
 {id:'history',label:'History',group:'Compare',icon:'history',route:'/report/history',badge:'',enabled:true,description:'Reopen saved browser snapshots and compare changes over time.'},
 {id:'scoring',label:'How scoring works',group:'Learn',icon:'help',route:'/report/scoring',badge:'',enabled:true,description:'Inspect every check, weight, and score contribution.'},
 {id:'checks',label:'About the checks',group:'Learn',icon:'help',route:'/report/checks',badge:'',enabled:true,description:'Understand scope, limitations, privacy, and available tools.'},
] as const satisfies readonly WorkspaceNavItem[];
export type WorkspaceView=typeof workspaceNav[number]['id'];
export function viewFromPath(path:string):WorkspaceView{return workspaceNav.find(item=>item.enabled&&item.route===path.replace(/\/$/,''))?.id||'overview';}
export function viewHref(view:WorkspaceView,url='',finding=''){const params=new URLSearchParams();if(url)params.set('url',url);if(finding)params.set('finding',finding);const item=workspaceNav.find(item=>item.id===view&&item.enabled)||workspaceNav[0];return `${item.route}${params.size?'?'+params:''}`;}
export function issueBadge(audit:Audit,badge:string){return audit.findings.filter(f=>(f.status==='critical'||f.status==='improvement')&&(badge==='all'||badge.split(',').includes(f.category))).length;}
