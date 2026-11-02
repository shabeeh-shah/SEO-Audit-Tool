import {test,expect,type Page} from '@playwright/test';
import {sampleAudit} from '../../lib/audit/sample';
import {workspaceNav} from '../../lib/workspace-nav';
import {analyzeCrawlPage,crawlSummary} from '../../lib/audit/crawl';
const live={...structuredClone(sampleAudit),sample:false,url:'https://example.com/',requestedUrl:'https://example.com/',date:'2026-11-02T12:00:00Z'};
test.beforeEach(async({page,context})=>{
 await page.addInitScript(()=>localStorage.setItem('signal-tour-complete','1'));
 await context.route('https://**/*',route=>route.fulfill({contentType:'text/html',body:'<h1>External destination fixture</h1>'}));
 await page.route('**/api/audit',route=>route.fulfill({json:live}));
 await page.route('**/api/render?**',route=>route.fulfill({contentType:'text/html',body:`<html><body><script>parent.postMessage(${JSON.stringify({type:'signal-render-diagnostics',token:new URL(route.request().url()).searchParams.get('token'),metrics:sampleAudit.performance.lab})},'*')</script></body></html>`}));
 await page.route('**/api/bulk',route=>route.fulfill({json:{results:[{requestedUrl:live.url,audit:live}]}}));
 const item=analyzeCrawlPage('<html lang="en"><head><title>Fixture page</title></head><body><h1>Page content</h1></body></html>',{url:live.url,finalUrl:live.url,status:200,redirects:0,attempts:1,issue:''});
 await page.route('**/api/crawl',route=>route.fulfill({json:crawlSummary([item],[],25,false)}));
});
async function command(page:Page,text:string){await page.keyboard.press('Control+k');await expect(page.getByLabel('Search commands')).toBeFocused();await page.keyboard.type(text);await page.keyboard.press('Enter');}
async function start(page:Page){await page.goto('/');await page.keyboard.press('/');await page.keyboard.type(live.url);await page.keyboard.press('Enter');await expect(page.locator('.ws-summary-url')).toContainText(live.url);}
async function axe(page:Page){
 await page.addScriptTag({path:'public/vendor/axe.min.js'});
 return page.evaluate(async()=>{
  const audit=(window as unknown as {axe:{run:(context:Document,options:unknown)=>Promise<{violations:{id:string;nodes:{target:string[];failureSummary:string}[]}[]}>}}).axe;
  const result=await audit.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']},resultTypes:['violations']});
  return result.violations.map(rule=>({id:rule.id,nodes:rule.nodes.map(node=>({target:node.target,why:node.failureSummary}))}));
 });
}

async function contrast(page:Page){return page.evaluate(()=>{
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const context=canvas.getContext('2d',{willReadFrequently:true})!;
 const color=(value:string)=>{context.clearRect(0,0,1,1);context.fillStyle=value;context.fillRect(0,0,1,1);return Array.from(context.getImageData(0,0,1,1).data);};
 const mix=(foreground:number[],background:number[])=>foreground.slice(0,3).map((channel,index)=>channel*(foreground[3]/255)+background[index]*(1-foreground[3]/255));
 const lum=(rgb:number[])=>rgb.map(value=>{const n=value/255;return n<=.04045?n/12.92:((n+.055)/1.055)**2.4;}).reduce((sum,value,index)=>sum+value*[.2126,.7152,.0722][index],0);
 const failures:{text:string;ratio:number;foreground:string;background:number[]}[]=[];
 const checked=new Set<Element>();const check=(element:HTMLElement,text:string,placeholder=false)=>{
  if(checked.has(element)||!element.checkVisibility({checkVisibilityCSS:true})||!element.getClientRects().length||element.closest('.sr-only,script,style,option,[disabled],[aria-hidden="true"]'))return;checked.add(element);
  const style=getComputedStyle(element);if(style.visibility==='hidden'||style.opacity==='0')return;
  const ancestors:HTMLElement[]=[];for(let parent:HTMLElement|null=element;parent;parent=parent.parentElement)ancestors.unshift(parent);
  let background=[255,255,255];for(const ancestor of ancestors)background=mix(color(getComputedStyle(ancestor).backgroundColor),background);
  const foreground=placeholder?getComputedStyle(element,'::placeholder').color:style.color;
  const a=lum(mix(color(foreground),background)),b=lum(background);const ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  if(ratio<4.5)failures.push({text:text.trim().slice(0,75),ratio:Math.round(ratio*100)/100,foreground,background});
 };
 const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node:Node|null;while((node=walker.nextNode())){if(node.textContent?.trim()&&node.parentElement)check(node.parentElement,node.textContent);}
 document.querySelectorAll<HTMLInputElement|HTMLTextAreaElement>('input:not([type=checkbox]):not([type=file]),textarea').forEach(element=>check(element,element.value||element.placeholder,!element.value));
 return failures;
});}

test('keyboard-only audit, all routes, fixes, completion, share, and exports',async({page,isMobile})=>{
 await page.goto('/');await page.keyboard.press('Tab');await expect(page.getByRole('link',{name:'Skip to content'})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByRole('main')).toBeFocused();
 await page.keyboard.press('/');await expect(page.locator('#persistent-url')).toBeFocused();await page.keyboard.type(live.url);await page.keyboard.press('Enter');await expect(page.locator('.ws-summary')).toBeVisible();
 for(const nav of workspaceNav){await command(page,`Go to ${nav.label}`);await expect(page.locator('#workspace-title')).toBeFocused();await expect(page.locator('#workspace-title')).toHaveText(nav.label);await expect(page).toHaveURL(new RegExp(`/report/${nav.id}`));}
 await command(page,'Go to Recommendations');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'Re-run to verify',exact:true})).toBeFocused();
 // Reach a finding through the normal tab order; no mouse or programmatic focus.
 for(let i=0;i<30&&!await page.locator('.ws-task').first().evaluate(node=>node===document.activeElement);i++)await page.keyboard.press('Tab');
 await expect(page.locator('.ws-task').first()).toBeFocused();await page.keyboard.press('x');await expect(page.locator('.ws-task').first().getByRole('checkbox')).toBeChecked();await page.keyboard.press('Enter');
 await expect(isMobile?page.getByRole('dialog'):page.locator('.ws-fix-detail').filter({visible:true})).toBeVisible();if(isMobile)await page.keyboard.press('Escape');
 await command(page,'Go to AI search readiness');await page.reload();await expect(page.locator('#workspace-title')).toHaveText('AI search readiness');await expect(page.locator('#persistent-url')).toHaveValue(live.url);
 await command(page,'Export JSON');await expect(page.getByText('JSON report downloaded.',{exact:true})).toBeVisible();
 await page.keyboard.press('/');await page.keyboard.press('Tab');await page.keyboard.press('Tab');if(!isMobile){await expect(page.getByRole('button',{name:'Open command palette'})).toBeFocused();await page.keyboard.press('Tab');}await expect(page.getByRole('button',{name:'Share report',exact:true})).toBeFocused();await page.keyboard.press('Enter');
 await expect(page.getByRole('dialog',{name:'Share this audit'})).toBeVisible();await expect(page.getByRole('button',{name:'Copy link',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(page.getByLabel('Share URL')).toHaveValue(/\/report\//);await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Share report',exact:true})).toBeFocused();
});

test('palette arrows wrap, empty results explain recovery, every action is reachable',async({page,isMobile})=>{
 await start(page);await page.keyboard.press('Meta+k');const search=page.getByLabel('Search commands');await expect(search).toBeFocused();await search.fill('Export');
 await page.keyboard.press('ArrowDown');await expect(page.getByRole('button',{name:'Export PDF',exact:true})).toBeFocused();await page.keyboard.press('ArrowUp');await expect(page.getByRole('button',{name:'Export CSV',exact:true})).toBeFocused();await page.keyboard.press('Home');await expect(page.getByRole('button',{name:'Export PDF',exact:true})).toBeFocused();await page.keyboard.press('End');await expect(page.getByRole('button',{name:'Export CSV',exact:true})).toBeFocused();
 await search.fill('not-a-command');await page.keyboard.press('Enter');await expect(page.getByText('No matching commands. Try a tab name, “export”, or “theme”.')).toBeVisible();await search.fill('');
 await page.screenshot({path:`docs/screenshots/navigation-palette-${isMobile?'390':'1280'}.png`});await page.keyboard.press('Escape');
 await command(page,'Toggle theme');await expect(page.locator('html')).toHaveClass(/dark/);await command(page,'Run a new audit');await expect(page.locator('#persistent-url')).toBeFocused();
 const popup=page.waitForEvent('popup');await command(page,'Open GitHub');await expect(await popup).toHaveURL('https://github.com/shabeeh-shah/SEO-Audit-Tool');await (await popup).close();
 await page.locator('#workspace-title').focus();await page.keyboard.press('?');await expect(page.getByRole('dialog',{name:'Keyboard shortcuts'})).toBeVisible();await expect(page.getByRole('dialog')).toContainText('Single-key shortcuts stay inactive while you type');await page.keyboard.press('Escape');
});

test('shortcuts leave editable fields and other modal dialogs alone',async({page})=>{
 await start(page);await page.locator('#persistent-url').fill('');await page.keyboard.type('/?');await expect(page.locator('#persistent-url')).toHaveValue('/?');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.keyboard.press('Control+k');await page.keyboard.type('/?');await expect(page.getByLabel('Search commands')).toHaveValue('/?');await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'Share report',exact:true}).click();await page.keyboard.press('/');await page.keyboard.press('?');await page.keyboard.press('Control+k');await expect(page.getByRole('dialog')).toHaveCount(1);await expect(page.getByRole('dialog',{name:'Share this audit'})).toBeVisible();await page.keyboard.press('Escape');await page.getByRole('button',{name:'Help',exact:true}).click();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Help',exact:true})).toBeFocused();await page.keyboard.press('?');await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Help',exact:true})).toBeFocused();
});

test('first-visit tour is keyboard accessible, offline, dismissible, and shown once',async({browser,baseURL,isMobile})=>{
 const context=await browser.newContext({viewport:isMobile?{width:390,height:844}:{width:1280,height:900},reducedMotion:'reduce'});const page=await context.newPage();let requests=0;page.on('request',request=>{if(new URL(request.url()).pathname==='/api/audit')requests++;});
 await context.route('https://**/*',route=>route.abort());await page.goto(baseURL||'http://127.0.0.1:8792/');const tour=page.getByRole('dialog',{name:'Welcome to Signal'});await expect(tour).toBeFocused();await expect(tour).toContainText('1 OF 3');await expect(page.locator('#persistent-url')).toHaveAttribute('aria-describedby','tour-description');
 await page.keyboard.press('Tab');await page.keyboard.press('Tab');await expect(tour.getByRole('button',{name:'Next',exact:true})).toBeFocused();await page.keyboard.press('Enter');await expect(tour).toContainText('2 OF 3');
 await expect(page.locator(isMobile?'.ws-bottom':'.ws-sidebar')).toHaveAttribute('data-tour-target','true');await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.keyboard.press('Enter');await expect(tour).toContainText('3 OF 3');await expect(page.locator('.ws-top-fixes')).toBeVisible();expect(requests).toBe(0);
 await expect(tour.getByRole('button',{name:'Got it',exact:true})).toBeInViewport();await tour.getByRole('button',{name:'Got it',exact:true}).click({trial:true});await page.screenshot({path:`docs/screenshots/navigation-tour-${isMobile?'390':'1280'}.png`});await page.keyboard.press('Escape');await expect(tour).toHaveCount(0);expect(await page.evaluate(()=>localStorage.getItem('signal-tour-complete'))).toBe('1');await expect(page.locator('[data-tour-target]')).toHaveCount(0);
 await page.reload();await expect(tour).toHaveCount(0);await page.locator('#workspace-title').focus();await page.keyboard.press('?');await page.getByRole('button',{name:'Replay welcome tour'}).click();await expect(tour).toBeFocused();await tour.getByRole('button',{name:'Dismiss tour'}).click();await expect(tour).toHaveCount(0);await context.close();
});

test('landmarks, focus restoration, live feedback, and reduced motion are exposed',async({page,isMobile})=>{
 await start(page);await expect(page.getByRole('banner')).toHaveCount(1);await expect(page.getByRole('main')).toHaveAttribute('tabindex','-1');await expect(page.getByRole('navigation',{name:'Breadcrumb'})).toContainText('Overview');
 await expect(page.locator('section[aria-label^="Audit notifications"]')).toHaveAttribute('aria-live','polite');await expect(page.locator('.ws-sidebar nav a[aria-current="page"]')).toHaveAttribute('aria-label','Overview');
 if(isMobile){await page.getByRole('button',{name:'More',exact:true}).click();await page.getByRole('dialog').getByRole('link',{name:'Pages',exact:true}).click();await expect(page.locator('#workspace-title')).toBeFocused();await expect(page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('button',{name:'More',exact:true})).toHaveAttribute('aria-current','page');}
 await command(page,'Go to Overview');await page.locator('.ws-top-fixes').getByRole('button',{name:'Open fix'}).first().click();await expect(page.locator('.ws-inspector')).toBeFocused();
 const motion=await page.evaluate(()=>{const button=document.querySelector('.ws-url button')!;return {reduced:matchMedia('(prefers-reduced-motion: reduce)').matches,transition:getComputedStyle(button).transitionDuration,animation:getComputedStyle(button).animationName,scroll:getComputedStyle(document.documentElement).scrollBehavior};});expect(motion.reduced).toBe(true);expect(motion.transition).toBe('0s');expect(motion.animation).toBe('none');expect(motion.scroll).not.toBe('smooth');
});

test('all views and key dialogs pass WCAG checks in both themes',async({page,isMobile})=>{
 test.setTimeout(120_000);const issues:unknown[]=[];
 await page.goto('/');for(const dark of [false,true]){if(dark)await command(page,'Toggle theme');const wcag=await axe(page),ratios=await contrast(page);if(wcag.length||ratios.length)issues.push({theme:dark?'dark':'light',view:'first-run',wcag,ratios});}await command(page,'Toggle theme');await start(page);
 for(const dark of [false,true]){
  if(dark)await command(page,'Toggle theme');
  for(const nav of workspaceNav){
   await command(page,`Go to ${nav.label}`);
   if(nav.id==='competitors')await page.getByRole('button',{name:'Explore sample comparison'}).click();
   if(nav.id==='bulk'){await page.getByLabel('Website URLs',{exact:true}).fill(live.url);await page.getByRole('button',{name:'Run bulk audit',exact:true}).click();await expect(page.locator('.bulk-table-wrap')).toBeVisible();}
   if(nav.id==='pages'){await page.locator('.ws-page-actions').getByRole('button',{name:'Audit pages'}).click();await expect(page.getByRole('table').last()).toBeVisible();}
   const wcag=await axe(page),ratios=await contrast(page);if(wcag.length||ratios.length)issues.push({theme:dark?'dark':'light',viewport:isMobile?390:1280,view:nav.id,wcag,ratios});
  }
  await page.getByRole('button',{name:'Share report',exact:true}).click();const share=await axe(page);if(share.length)issues.push({theme:dark?'dark':'light',view:'share',wcag:share});await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');const palette=await axe(page);if(palette.length)issues.push({theme:dark?'dark':'light',view:'palette',wcag:palette});await page.keyboard.press('Escape');
 }
 await test.info().attach('accessibility-findings',{body:JSON.stringify(issues,null,2),contentType:'application/json'});expect(issues).toEqual([]);
});
