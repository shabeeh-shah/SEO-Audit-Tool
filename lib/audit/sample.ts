import type { Audit } from './types';
export const sampleAudit: Audit = {
  sample:true,url:'https://northstar.example',requestedUrl:'https://northstar.example',title:'Northstar — Design for what’s next',description:'Independent design studio.',date:'2026-09-19T12:00:00Z',
  score:72,scores:{seo:68,content:84,geo:64},
  metrics:{words:842,readingEase:66,headings:7,h1:1,h2:6,images:12,missingAlt:3,links:24,checkedLinks:12,responseMs:382,htmlKb:46,schemaTypes:[]},
  keywords:[{word:'design',count:18,density:2.1},{word:'brand',count:12,density:1.4},{word:'strategy',count:9,density:1.1},{word:'studio',count:7,density:0.8}],
  headings:[{level:1,text:'Design for what’s next'},{level:2,text:'Ideas with a point of view'},{level:2,text:'Our selected work'},{level:2,text:'A thoughtful approach'}],linkResults:[],
  findings:[
    {id:'alt',category:'seo',status:'improvement',title:'Give your images a little more context',evidence:'3 of 12 images have no alt attribute.',recommendation:'Add descriptive alt text to informative images. Use an empty alt attribute for purely decorative images.',weight:2},
    {id:'schema',category:'geo',status:'improvement',title:'Help search engines understand your business',evidence:'No JSON-LD structured data was found.',recommendation:'Consider accurate Organization or LocalBusiness structured data where it matches the visible page. Structured data does not guarantee AI citations.',weight:1},
    {id:'description',category:'seo',status:'improvement',title:'Make your search description more useful',evidence:'The meta description is only 26 characters: “Independent design studio.”',recommendation:'Describe the page’s specific services and audience in a useful, natural summary. Search engines may choose their own snippet.',weight:1},
    {id:'answers',category:'geo',status:'improvement',title:'Answer the questions your visitors are asking',evidence:'No question-led headings were found.',recommendation:'Where useful, add direct answers about your services, process, and who you work with. Only add FAQs if they serve real visitor questions.',weight:1},
    {id:'h1',category:'seo',status:'good',title:'Your page has a clear main heading',evidence:'One H1 was found: “Design for what’s next”.',recommendation:'Keep the heading descriptive and consistent with the purpose of the page.',weight:2},
    {id:'readability',category:'content',status:'good',title:'Your copy is easy to follow',evidence:'The estimated English reading-ease score is 66 / 100.',recommendation:'Keep using direct sentences, familiar words, and useful section headings.',weight:1},
    {id:'https',category:'seo',status:'good',title:'A secure connection is in place',evidence:'The page is served over HTTPS.',recommendation:'Keep all page assets and internal links on HTTPS.',weight:2},
    {id:'structure',category:'geo',status:'good',title:'Content is organized into useful sections',evidence:'Six H2 headings divide the main content.',recommendation:'Keep each heading specific and place its explanation directly beneath it.',weight:1}
  ], limitations:['This is an illustrative sample, not a live audit.','Live audits inspect one page’s server-delivered HTML and up to 12 internal links.','Scores are heuristic indicators, not search rankings or AI citation predictions.']
};

for (const category of ['seo','content','geo'] as const) {
 const checks=sampleAudit.findings.filter(f=>f.category===category&&f.weight>0);
 sampleAudit.scores[category]=Math.round(checks.reduce((sum,f)=>sum+(f.status==='good'?100:f.status==='improvement'?55:0)*f.weight,0)/checks.reduce((sum,f)=>sum+f.weight,0));
}
sampleAudit.score=Math.round((sampleAudit.scores.seo+sampleAudit.scores.content+sampleAudit.scores.geo)/3);
