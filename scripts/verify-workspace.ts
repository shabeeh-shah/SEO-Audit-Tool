import assert from 'node:assert/strict';
import {workspaceNav,viewFromPath,viewHref,issueBadge} from '../lib/workspace-nav';
import {sampleAudit} from '../lib/audit/sample';
import {auditErrorKind} from '../lib/workspace-errors';
import {parseDone} from '../lib/finding-tasks';
import {crawlPageScore} from '../lib/crawl-display';
import {analyzeCrawlPage} from '../lib/audit/crawl';
import {extractProfile} from '../lib/audit/competitors';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import WorkspaceNavLink from '../components/workspace-nav-link';
import {existsSync} from 'node:fs';
import {StatusChip,ScoreRing,ProgressSteps} from '../components/design-system';
assert.equal(new Set(workspaceNav.map(item=>item.route)).size,workspaceNav.length);
for(const item of workspaceNav)assert.equal(viewFromPath(item.route),item.id);
assert.equal(viewFromPath('/report/not-a-view'),'overview');
assert.equal(auditErrorKind('This address is blocked.'),'blocked');
assert.equal(auditErrorKind('The website took too long to respond.'),'timeout');
assert.equal(auditErrorKind('This page does not return an HTML document.'),'not-html');
assert.equal(auditErrorKind('Enter a valid website URL.'),'invalid-url');
assert.deepEqual(parseDone(JSON.stringify(['title','title','unknown']),sampleAudit.findings),['title']);
assert.deepEqual(parseDone('{broken',sampleAudit.findings),[]);
assert.deepEqual(parseDone(JSON.stringify([{},null,3]),sampleAudit.findings),[]);
assert.deepEqual(parseDone('a'.repeat(20_001),sampleAudit.findings),[]);
const crawl=analyzeCrawlPage('<html lang="en"><head><title>Fixture</title></head><body><h1>Heading</h1></body></html>',{url:'https://example.com/',finalUrl:'https://example.com/',status:200,redirects:0,attempts:1,issue:''});
assert.equal(crawlPageScore({...crawl,status:500}),0);
assert.equal(crawlPageScore({...crawl,findings:[]}),null);
assert.equal(crawlPageScore({...crawl,findings:[{id:'a',priority:'Good',evidence:'yes',fix:''},{id:'b',priority:'Improvement',evidence:'missing',fix:'Add'}]}),78);
assert.deepEqual(extractProfile('<html><body><script type="application/ld+json">{"@type":"Organization"}</script><h1>Marketing services</h1></body></html>','https://example.com/').schemaTypes,['Organization']);
const link=new URL(viewHref('recommendations','https://example.com/?a=1&b=2','schema'),'https://signal.test');
assert.equal(link.searchParams.get('url'),'https://example.com/?a=1&b=2');
assert.equal(link.searchParams.get('finding'),'schema');
assert.equal(issueBadge(sampleAudit,'all'),sampleAudit.findings.filter(f=>f.status==='critical'||f.status==='improvement').length);
console.log('Workspace routes, query persistence, and navigation badges passed.');
for(const status of ['good','improvement','critical','optional'] as const)assert.match(renderToStaticMarkup(createElement(StatusChip,{status})),new RegExp(status,'i'));
assert.match(renderToStaticMarkup(createElement(ScoreRing,{score:900,label:'SEO'})),/100 of 100/);
assert.match(renderToStaticMarkup(createElement(ProgressSteps,{steps:['Fetch','Check'],current:1})),/aria-current="step"/);

// All advertised features have real server routes; disabled items cannot become links.
for(const item of workspaceNav){
 assert.equal(existsSync(new URL(`../app${item.route}/page.tsx`,import.meta.url)),true,item.route);
 const markup=renderToStaticMarkup(createElement(WorkspaceNavLink,{item,active:true,count:3,url:'https://example.com/?q=a&b=2',onVisit:()=>{}}));
 assert.match(markup,/aria-current="page"/);
 if(item.badge)assert.match(markup,/3 issues/);
 const disabled=renderToStaticMarkup(createElement(WorkspaceNavLink,{item:{...item,enabled:false},active:false,count:3,url:'https://example.com/',onVisit:()=>{}}));
 assert.match(disabled,/aria-disabled="true"/);assert.match(disabled,/Soon/);assert.doesNotMatch(disabled,/<a[ >]|href=/);
}
assert.equal(issueBadge(sampleAudit,''),0);
assert.equal(issueBadge(sampleAudit,'geo'),sampleAudit.findings.filter(f=>f.category==='geo'&&(f.status==='critical'||f.status==='improvement')).length);

// Entry points select real evidence and contextual follow-ups, without changing scores.
const {analysisView,categoryFocus,findingForView,nextStep}=await import('../lib/workspace-experience');
assert.equal(analysisView('geo'),'ai-readiness');assert.equal(analysisView('content'),'seo-content');
for(const category of ['seo','content','geo','performance'] as const){const focus=categoryFocus(sampleAudit,category)!;assert.equal(focus.category,category);assert.equal(findingForView(sampleAudit,analysisView(category),focus.id)?.id,focus.id);}
assert.equal(findingForView(sampleAudit,'history','title'),undefined);assert.equal(findingForView(sampleAudit,'seo-content','unknown'),undefined);
assert.equal(nextStep(sampleAudit,'overview',false).focusUrl,true);
assert.equal(nextStep(sampleAudit,'recommendations',true).view,'history');
assert.equal(nextStep({...sampleAudit,findings:[]},'performance',true).view,'competitors');
const progress=renderToStaticMarkup(createElement(ProgressSteps,{steps:['Fetch','Rules','Render','Score'],states:['complete','complete','unavailable','complete']}));
assert.match(progress,/Unavailable/);assert.doesNotMatch(progress,/In progress/);

const {auditInputError}=await import('../lib/workspace-experience');
for(const value of ['',null,'not a url','ftp://example.com/','https://exa mple.com/','a'.repeat(2049)])assert.ok(auditInputError(value));
for(const value of ['example.com','https://example.com/path?q=a%20b','  https://example.com/  '])assert.equal(auditInputError(value),null);
