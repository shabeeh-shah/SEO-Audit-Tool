import {test,expect,type Page} from '@playwright/test';
import {sampleAudit} from '../../lib/audit/sample';
import {workspaceNav} from '../../lib/workspace-nav';
import {analyzeCrawlPage,crawlSummary} from '../../lib/audit/crawl';
const live={...structuredClone(sampleAudit),sample:false,url:'https://example.com/',requestedUrl:'https://example.com/',date:'2026-10-21T12:00:00.000Z'};
test.beforeEach(async({page,context})=>{await page.addInitScript(()=>localStorage.setItem('signal-tour-complete','1'));await context.route('https://**/*',route=>route.abort());await context.route('https://www.linkedin.com/**',route=>route.fulfill({contentType:'text/html',body:'<h1>LinkedIn share fixture</h1>'}));await page.route('**/api/audit',route=>route.fulfill({json:live}));await page.route('**/api/render?**',route=>{const token=new URL(route.request().url()).searchParams.get('token');return route.fulfill({contentType:'text/html',body:`<html><body>Isolated fixture preview<script>parent.postMessage(${JSON.stringify({type:'signal-render-diagnostics',token,metrics:sampleAudit.performance.lab})},'*')</script></body></html>`});});});
async function audit(page:Page){await page.goto('/');await page.getByLabel('Website URL',{exact:true}).first().fill('https://example.com/');await page.locator('.ws-url').getByRole('button').click();await expect(page.locator('.ws-summary-url')).toContainText('https://example.com/');}
async function go(page:Page,id:string,mobile:boolean){if(mobile){const names:Record<string,string>={overview:'Overview',recommendations:'Fixes','ai-readiness':'AI',performance:'Performance'};if(names[id]){await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:names[id],exact:true}).click();return;}await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:workspaceNav.find(item=>item.id===id)!.label,exact:true}).click();}else await page.getByRole('navigation',{name:'Workspace navigation'}).getByRole('link',{name:new RegExp(workspaceNav.find(item=>item.id===id)!.label.replace('&','&'))}).click();}
test('run audit, visit every view, refresh a deep link and go back',async({page,isMobile})=>{await audit(page);for(const nav of workspaceNav){await go(page,nav.id,isMobile);await expect(page.locator('#workspace-title')).toHaveText(nav.label);await expect(page).toHaveURL(new RegExp(`/report/${nav.id}\\?url=`));await expect(page.locator('.ws-next')).toBeVisible();}await go(page,'ai-readiness',isMobile);await page.reload();await expect(page.locator('#workspace-title')).toHaveText('AI search readiness');await expect(page.locator('#persistent-url')).toHaveValue('https://example.com/');await go(page,'performance',isMobile);await page.goBack();await expect(page.locator('#workspace-title')).toHaveText('AI search readiness');});
test('open a fix, mark done, copy, and retain completion after refresh',async({page,isMobile})=>{await audit(page);await page.locator('.ws-top-fixes').getByRole('button',{name:'Open fix'}).first().click();await expect(page).toHaveURL(/finding=/);await expect(page.locator('.ws-inspector')).toContainText('Evidence');await page.locator('.ws-inspector').getByRole('button',{name:'Copy fix',exact:true}).click();await page.locator('.ws-inspector').getByRole('button',{name:'Track this fix',exact:true}).click();const box=isMobile?page.getByRole('dialog'):page.locator('.ws-fix-detail').filter({visible:true});await expect(box.getByRole('heading',{name:'Evidence',exact:true})).toBeVisible();if(isMobile)await page.keyboard.press('Escape');const row=page.locator('.ws-task').first();await row.getByRole('checkbox').check();await expect(page.locator('.ws-task-progress')).toContainText('1 of');await page.reload();await expect(page.locator('.ws-task-progress')).toContainText('1 of');});
test('share dialog, safe permalink, LinkedIn, and all file exports',async({page})=>{await audit(page);await page.getByRole('button',{name:'Share report',exact:true}).click();const modal=page.getByRole('dialog');await modal.getByRole('button',{name:'Copy link',exact:true}).click();await expect(modal.getByLabel('Share URL')).toHaveValue(/\/report\/[A-Za-z0-9_-]+$/);const popup=page.waitForEvent('popup');await modal.getByRole('button',{name:'Share on LinkedIn',exact:true}).click();const linkedin=await popup;await expect(linkedin).toHaveURL(/linkedin.com\/sharing\/share-offsite\/\?url=/);await linkedin.close();const png=page.waitForEvent('download');await modal.getByRole('button',{name:'Download scorecard PNG',exact:true}).click();expect((await png).suggestedFilename()).toMatch(/\.png$/);await page.keyboard.press('Escape');for(const format of ['JSON','CSV','HTML']){await page.getByRole('button',{name:'Export report',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('menuitem',{name:`Export ${format}`,exact:true}).click();expect((await download).suggestedFilename()).toMatch(new RegExp(`\\.${format.toLowerCase()}$`));}await page.getByRole('button',{name:'Export report',exact:true}).click();const printable=page.waitForEvent('popup');await page.getByRole('menuitem',{name:'Export PDF',exact:true}).click();const report=await printable;await expect(report.locator('.executive')).toContainText('EXECUTIVE SUMMARY');});
test('keyboard palette, URL shortcut, row shortcuts, and theme',async({page,isMobile})=>{await audit(page);await page.locator('#workspace-title').focus();await page.keyboard.press('/');await expect(page.locator('#persistent-url')).toBeFocused();await page.keyboard.press('Control+k');await expect(page.getByRole('dialog')).toBeVisible();await page.getByLabel('Search commands').fill('Recommendations');await page.getByRole('button',{name:'Go to Recommendations',exact:true}).click();const row=page.locator('.ws-task').first();await row.focus();await page.keyboard.press('x');await expect(row.getByRole('checkbox')).toBeChecked();await page.keyboard.press('j');await expect(page.locator('.ws-task').nth(1)).toBeFocused();await page.keyboard.press('Enter');await expect(isMobile?page.getByRole('dialog'):page.locator('.ws-fix-detail').filter({visible:true})).toBeVisible();await page.keyboard.press('Escape');await page.locator('#workspace-title').focus();await page.keyboard.press('?');await expect(page.getByRole('heading',{name:'Keyboard shortcuts'})).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Use dark theme'}).click();await expect(page.locator('html')).toHaveClass(/dark/);});
test('bulk and errors give feedback; history clearing asks first',async({page,isMobile})=>{await audit(page);await go(page,'history',isMobile);await page.getByRole('button',{name:'Clear saved history'}).click();await expect(page.getByRole('dialog')).toContainText('Clear saved history?');await page.getByRole('button',{name:'Keep history'}).click();await go(page,'bulk',isMobile);await page.getByLabel('Website URLs',{exact:true}).fill('http://localhost:3000');await page.getByRole('button',{name:'Run bulk audit'}).click();await expect(page.getByRole('alert')).toContainText('blocked');await page.route('**/api/bulk',route=>route.fulfill({json:{results:[{requestedUrl:live.url,audit:live}]}}));await page.getByLabel('Website URLs',{exact:true}).fill(live.url);await page.getByRole('button',{name:'Run bulk audit'}).click();await expect(page.locator('.ws-bulk-progress')).toContainText('Complete');await expect(page.locator('.bulk-table-wrap')).toContainText('example.com');});
test('layout screenshots at the requested viewport and no horizontal page overflow',async({page,isMobile},info)=>{await audit(page);await expect(page.locator('.ws-top-fixes')).toBeVisible();await page.screenshot({path:`docs/screenshots/overview-${isMobile?'390':'1280'}.png`,fullPage:true});await page.screenshot({path:`docs/screenshots/viewport-${isMobile?'390':'1280'}.png`});await go(page,'recommendations',isMobile);await page.screenshot({path:`docs/screenshots/recommendations-viewport-${isMobile?'390':'1280'}.png`});await page.screenshot({path:`docs/screenshots/recommendations-${isMobile?'390':'1280'}.png`,fullPage:true});await page.getByRole('button',{name:'Use dark theme'}).click();await page.screenshot({path:`docs/screenshots/dark-${isMobile?'390':'1280'}.png`,fullPage:true});const width=await page.evaluate(()=>({document:document.documentElement.scrollWidth,viewport:innerWidth}));expect(width.document,info.project.name).toBeLessThanOrEqual(width.viewport+1);});
test('foreground text and controls meet 4.5:1 contrast in both themes',async({page,isMobile})=>{await audit(page);await go(page,'recommendations',isMobile);for(const dark of [false,true]){if(dark)await page.getByRole('button',{name:'Use dark theme'}).click();const checks=await page.evaluate(()=>{const rgb=(value:string)=>value.match(/[\d.]+/g)?.slice(0,3).map(Number)||[255,255,255];const lum=(values:number[])=>values.map(value=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,n,i)=>sum+n*[.2126,.7152,.0722][i],0);return [...document.querySelectorAll<HTMLElement>('.ws-page-header h1,.ws-page-header p,.ws-task-row h3,.ws-task-row small,.ws-task-row button,.ws-task-row .ds-status,.ws-nav-group a[aria-current],.ws-url button')].filter(element=>element.getClientRects().length&&!element.closest('[hidden]')).map(element=>{let node:HTMLElement|null=element;let background='rgb(255,255,255)';while(node){const color=getComputedStyle(node).backgroundColor;if(color!=='rgba(0, 0, 0, 0)'&&color!=='transparent'){background=color;break;}node=node.parentElement;}const a=lum(rgb(getComputedStyle(element).color)),b=lum(rgb(background));return {text:element.textContent?.slice(0,60),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};});});for(const check of checks)expect(check.ratio,`${dark?'dark':'light'} ${check.text}`).toBeGreaterThanOrEqual(4.5);}});
test('onboarding is dismissible, follows three steps, and stays dismissed',async({browser,baseURL})=>{const context=await browser.newContext();await context.route('https://**/*',route=>route.abort());const page=await context.newPage();await page.goto(baseURL||'http://127.0.0.1:8792/');await page.getByRole('button',{name:'See sample',exact:true}).click();const tour=page.getByRole('dialog',{name:'Welcome to Signal'});await expect(tour).toContainText('1 OF 3');await tour.getByRole('button',{name:'Next',exact:true}).click();await expect(tour).toContainText('2 OF 3');await tour.getByRole('button',{name:'Next',exact:true}).click();await expect(tour).toContainText('3 OF 3');await tour.getByRole('button',{name:'Got it',exact:true}).click();await page.reload();await expect(tour).toHaveCount(0);await context.close();});
test('audit failures explain the cause and offer retry',async({page})=>{await page.route('**/api/audit',route=>route.fulfill({status:403,json:{error:'This address is blocked. Use a public website domain.'}}));await page.goto('/');await page.locator('#persistent-url').fill('https://example.com/');await page.locator('.ws-url').getByRole('button').click();await expect(page.getByRole('alert')).toContainText('blocked');await expect(page.getByRole('button',{name:'Try again',exact:true})).toBeVisible();});
test('Pages table sorts completed crawl checks and opens evidence in a drawer',async({page,isMobile})=>{const item=analyzeCrawlPage('<html lang="en"><head><title>Fixture page</title></head><body><h1>Useful heading</h1></body></html>',{url:live.url,finalUrl:live.url,status:200,redirects:0,attempts:1,issue:''});await page.route('**/api/crawl',route=>route.fulfill({json:crawlSummary([item],[],25,false)}));await audit(page);await go(page,'pages',isMobile);await page.getByRole('button',{name:'Audit up to 25 pages',exact:true}).click();await page.getByRole('tab',{name:'Per-page results',exact:true}).click();await page.getByRole('button',{name:'Check grade ↕',exact:true}).click();await page.getByRole('button',{name:'View Fixture page',exact:true}).click();await expect(page.getByRole('dialog')).toContainText('Evidence:');await expect(page.getByRole('dialog')).toContainText('Meta description');});

test('Back and Forward restore the URL and the matching saved report without refetching',async({page})=>{
 let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/audit')requests++;});
 await audit(page);
 await page.route('**/api/audit',route=>route.fulfill({json:{...live,url:'https://second.example.org/',requestedUrl:'https://second.example.org/',date:'2026-10-22T12:00:00.000Z'}}));
 await page.locator('#persistent-url').fill('https://second.example.org/');
 await page.locator('.ws-url').getByRole('button').click();
 await expect(page.locator('.ws-summary-url')).toContainText('second.example.org');
 await page.goBack();
 await expect(page.locator('#persistent-url')).toHaveValue(live.url);
 await expect(page.locator('.ws-summary-url')).toContainText(live.url);
 await page.goForward();
 await expect(page.locator('#persistent-url')).toHaveValue('https://second.example.org/');
 await expect(page.locator('.ws-summary-url')).toContainText('second.example.org');
 expect(requests).toBe(2);
});
test('mobile More uses a bottom sheet and the top bar stays visible while scrolling',async({page,isMobile})=>{
 test.skip(!isMobile,'Mobile-specific shell');await audit(page);
 await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'More',exact:true}).click();
 await expect(page.locator('[data-slot="sheet-content"]')).toBeVisible();
 await expect(page.getByRole('dialog').getByRole('link',{name:'History',exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await page.locator('.ws-next').scrollIntoViewIfNeeded();
 await expect(page.locator('#persistent-url')).toBeInViewport();
 await expect(page.getByRole('button',{name:'Share report',exact:true})).toBeInViewport();
});

test('malformed query prefill stays a sample and never submits an audit',async({page})=>{
 let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/audit')requests++;});
 await page.goto('/report/ai-readiness?url=not-a-url');
 await expect(page.locator('#persistent-url')).toHaveValue('not-a-url');
 await expect(page.locator('#workspace-title')).toHaveText('AI search readiness');
 await expect(page.locator('.ws-mode')).toHaveText('Sample report');expect(requests).toBe(0);
});

test('first run is focused; See sample is offline and trust copy reflects local history',async({page,isMobile})=>{
 let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/audit')requests++;});await page.goto('/');
 await expect(page.locator('.ws-summary')).not.toBeVisible();await expect(page.locator('.ws-first-run')).toBeVisible();
 await expect(page.locator('.ws-first-run').getByRole('button',{name:'Run audit',exact:true})).toHaveCount(1);
 await expect(page.locator('.ws-trust li')).toHaveCount(3);await expect(page.locator('.ws-trust')).toContainText('Nothing stored on our servers');
 await expect(page.locator('.ws-storage-note')).toContainText('browser');
 await page.screenshot({path:`docs/screenshots/landing-${isMobile?'390':'1280'}.png`,fullPage:true});
 await page.getByRole('button',{name:'See sample',exact:true}).click();await expect(page.locator('.ws-summary')).toBeVisible();await expect(page.locator('.ws-report-kind')).toContainText('Offline sample');expect(requests).toBe(0);
});
test('running audit shows steps and skeletons; Cancel discards a late response',async({page})=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/audit',async route=>{await gate;await route.fulfill({json:live}).catch(()=>{});});
 await page.goto('/');await page.locator('#persistent-url').fill(live.url);await page.locator('.ws-url').getByRole('button').click();
 const running=page.getByRole('status',{name:'Running audit'});await expect(running).toBeVisible();
 for(const label of ['Fetching page','Checking robots.txt and sitemap','Rendering','Scoring'])await expect(running).toContainText(label);
 await expect(page.getByRole('status',{name:'Preparing score summary'})).toBeVisible();await expect(page.locator('.ws-summary')).not.toBeVisible();
 await running.getByRole('button',{name:'Cancel',exact:true}).click();release();
 await expect(page.locator('.ws-url').getByRole('button')).toBeEnabled();await expect(running).not.toBeVisible();await expect(page.locator('.ws-summary')).not.toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
});
test('category rings, strengths, and fix cards open matching evidence after refresh and Back',async({page,isMobile})=>{
 await audit(page);await page.locator('.ws-score-rings').getByRole('button').filter({hasText:'Overall'}).click();await expect(page).toHaveURL(/scoring.*finding=overall/);await expect(page.locator('.score-calculation details[open]')).toHaveCount(4);for(const label of ['SEO foundations','Content quality','AI / GEO readiness','Performance & mobile']){
 await go(page,'overview',isMobile);await page.locator('.ws-score-rings').getByRole('button').filter({hasText:label}).click();
 await expect(page).toHaveURL(/finding=/);await expect(page.locator('.ws-inspector')).toContainText('Evidence');await page.reload();await expect(page.locator('.ws-inspector')).toBeVisible();
 }
 await go(page,'overview',isMobile);await page.locator('.ws-strength-link').first().click();await expect(page.locator('.ws-inspector')).toContainText('Good');await page.goBack();await expect(page.locator('.ws-summary')).toBeVisible();
});
for(const [kind,message] of [['invalid','Enter a valid public website URL.'],['blocked','This address is blocked. Use a public website domain.'],['timeout','The website took too long to respond.'],['not-html','This page does not return an HTML document.']] as const){
 test(`${kind} errors explain the problem and allow a successful retry`,async({page})=>{
 await page.route('**/api/audit',route=>route.fulfill({status:400,json:{error:message}}));await page.goto('/');await page.locator('#persistent-url').fill(live.url);await page.locator('.ws-url').getByRole('button').click();await expect(page.getByRole('alert')).toContainText(message);
 await page.route('**/api/audit',route=>route.fulfill({json:live}));await page.getByRole('button',{name:'Try again',exact:true}).click();await expect(page.locator('.ws-summary')).toBeVisible();await expect(page.getByRole('alert')).toHaveCount(0);
 });
}

test('browser measurement can be canceled without losing the scored report',async({page})=>{
 await page.route('**/api/render?**',route=>route.fulfill({contentType:'text/html',body:'<html><body>Pending lab fixture</body></html>'}));await audit(page);
 const running=page.getByRole('status',{name:'Running audit'});await expect(running).toContainText('Your report is ready');await running.getByRole('button',{name:'Cancel',exact:true}).click();
 await expect(running).not.toBeVisible();await expect(page.locator('iframe.rendered-dom-frame')).toHaveCount(0);await expect(page.locator('.ws-summary')).toContainText(live.url);
});

test('invalid syntax and unsupported protocols are explained before any request',async({page})=>{
 let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/audit')requests++;});await page.goto('/');
 for(const value of ['','not a url','ftp://example.com/']){await page.locator('#persistent-url').fill(value);await page.locator('.ws-url').getByRole('button').click();await expect(page.getByRole('alert')).toContainText('valid');}
 expect(requests).toBe(0);
});

test('recommendation status and category chips intersect; reset recovers empty results',async({page,isMobile})=>{
 await audit(page);await go(page,'recommendations',isMobile);
 const statuses=page.getByRole('group',{name:'Priority filters'}),categories=page.getByRole('group',{name:'Category filters'});
 for(const [status,label] of [['all','All'],['critical','Critical'],['improvement','Improvement'],['good','Good'],['optional','Optional']] as const){
  await statuses.getByRole('button',{name:label,exact:true}).click();await expect(statuses.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');
  for(const [category,name] of [['seo','SEO'],['content','Content'],['geo','AI/GEO'],['performance','Performance']] as const){
   await categories.getByRole('button',{name,exact:true}).click();const expected=live.findings.filter(f=>(status==='all'||f.status===status)&&f.category===category);
   await expect(page.locator('.ws-task')).toHaveCount(expected.length);
  }
 }
 await statuses.getByRole('button',{name:'Done',exact:true}).click();await expect(page.getByRole('heading',{name:'No findings match these filters'})).toBeVisible();await page.getByRole('button',{name:'Reset filters'}).click();await expect(page.locator('.ws-task')).toHaveCount(live.findings.length);
 const rows=await page.locator('.ws-task').evaluateAll(elements=>elements.map(el=>({impact:Number(el.getAttribute('data-impact')),effort:Number(el.getAttribute('data-effort')),actionable:['critical','improvement'].includes(el.getAttribute('data-status')||'')})));
 for(let i=1;i<rows.length;i++){expect(Number(rows[i].actionable)).toBeLessThanOrEqual(Number(rows[i-1].actionable));if(rows[i].actionable===rows[i-1].actionable){expect(rows[i].impact).toBeLessThanOrEqual(rows[i-1].impact);if(rows[i].impact===rows[i-1].impact)expect(rows[i].effort).toBeGreaterThanOrEqual(rows[i-1].effort);}}
 await page.getByLabel('Sort by',{exact:true}).selectOption('effort');for(const statusGroup of ['critical,improvement','good,optional']){const efforts=await page.locator('.ws-task').evaluateAll((elements,statusGroup)=>elements.filter(el=>statusGroup.split(',').includes(el.getAttribute('data-status')||'')).map(el=>Number(el.getAttribute('data-effort'))),statusGroup);expect(efforts).toEqual([...efforts].sort((a,b)=>a-b));}
});
test('Good and Optional completion count equally, persist locally, and never change the score',async({page,isMobile})=>{
 let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/audit')requests++;});await audit(page);await go(page,'recommendations',isMobile);
 const filters=page.getByRole('group',{name:'Priority filters'});
 for(const label of ['Good','Optional']){await filters.getByRole('button',{name:label,exact:true}).click();await page.locator('.ws-task').first().getByRole('checkbox').check();}
 await expect(page.locator('.ws-task-progress')).toContainText(`2 of ${live.findings.length} done`);await page.reload();await expect(page.locator('.ws-task-progress')).toContainText(`2 of ${live.findings.length} done`);
 await go(page,'overview',isMobile);await expect(page.locator('.ws-score-rings').getByRole('button').filter({hasText:'Overall'})).toHaveAttribute('aria-label',new RegExp(`${live.score} of 100`));expect(requests).toBe(1);
});
test('all-done checklist has a verification empty state and can be reopened',async({page,isMobile})=>{
 await page.addInitScript(({url,ids})=>localStorage.setItem('signal-completed:'+url,JSON.stringify(ids)),{url:live.url,ids:live.findings.map(f=>f.id)});
 await audit(page);await go(page,'recommendations',isMobile);await expect(page.getByRole('heading',{name:'Your checklist is complete'})).toBeVisible();await expect(page.locator('.ws-task-progress')).toContainText(`${live.findings.length} of ${live.findings.length} done`);
 await page.locator('.ws-task').first().getByRole('checkbox').uncheck();await expect(page.getByRole('heading',{name:'Your checklist is complete'})).not.toBeVisible();await expect(page.locator('.ws-task-progress')).toContainText(`${live.findings.length-1} of ${live.findings.length} done`);
});
test('recommendation keyboard movement wraps and leaves child controls alone',async({page,isMobile})=>{
 await audit(page);await go(page,'recommendations',isMobile);const rows=page.locator('.ws-task');await rows.first().focus();await page.keyboard.press('k');await expect(rows.last()).toBeFocused();await page.keyboard.press('j');await expect(rows.first()).toBeFocused();await page.keyboard.press('x');await expect(rows.first().getByRole('checkbox')).toBeChecked();await page.keyboard.press('x');await expect(rows.first().getByRole('checkbox')).not.toBeChecked();
 await page.getByLabel('Sort by',{exact:true}).focus();await page.keyboard.press('x');await expect(page.locator('.ws-task-progress')).toContainText('0 of');
 await rows.first().focus();await page.keyboard.press('Enter');const detail=isMobile?page.getByRole('dialog'):rows.first().locator('.ws-fix-detail');await expect(detail.getByRole('heading',{name:'Evidence',exact:true})).toBeVisible();await detail.getByRole('button',{name:'Copy fix',exact:true}).click();await expect(page.locator('[data-sonner-toast]').filter({hasText:'Fix example copied'})).toBeVisible();
});
test('completion survives unavailable storage in memory and copy errors give useful feedback',async({page,isMobile})=>{
 await page.addInitScript(()=>{const get=Storage.prototype.getItem,set=Storage.prototype.setItem;Storage.prototype.getItem=function(key){if(key.startsWith('signal-completed:'))throw new Error('storage blocked');return get.call(this,key);};Storage.prototype.setItem=function(key,value){if(key.startsWith('signal-completed:'))throw new Error('storage blocked');return set.call(this,key,value);};Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('clipboard blocked'))}});});
 await audit(page);await go(page,'recommendations',isMobile);await expect(page.locator('.ws-recommendations')).toContainText('Browser storage is unavailable');const row=page.locator('.ws-task').first();await row.getByRole('checkbox').check();await expect(page.locator('.ws-task-progress')).toContainText('1 of');await row.getByRole('button',{name:/^Open /}).click();const detail=isMobile?page.getByRole('dialog'):row.locator('.ws-fix-detail');await detail.getByRole('button',{name:'Copy fix',exact:true}).click();await expect(page.locator('[data-sonner-toast]').filter({hasText:'Copy failed'})).toBeVisible();
});
