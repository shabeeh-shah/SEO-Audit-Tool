let currentUrl='';
const status=document.getElementById('status'),results=document.getElementById('results');
document.getElementById('inspect').addEventListener('click',async()=>{
 try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const url=new URL(tab.url);if(!['http:','https:'].includes(url.protocol))throw new Error('Open a normal webpage first.');currentUrl=url.href;status.textContent='Checking rendered HTML…';
  const [response]=await chrome.scripting.executeScript({target:{tabId:tab.id},func:()=>{const all=selector=>Array.from(document.querySelectorAll(selector));const title=all('title');return [`Title: ${title.length} tag(s), ${document.title.length} characters`, `Meta description: ${document.querySelector('meta[name="description"]')?.content?'present':'missing'}`,`H1: ${all('h1').length} · H2: ${all('h2').length}`,`Images without alt: ${all('img:not([alt])').length}`,`Canonical: ${all('link[rel~="canonical"]').length} tag(s)`,`Viewport: ${document.querySelector('meta[name="viewport"]')?'present':'missing'}`,`HTML language: ${document.documentElement.lang||'missing'}`,`JSON-LD blocks: ${all('script[type="application/ld+json"]').length}`];}});
  results.replaceChildren();for(const text of response.result){const li=document.createElement('li');li.textContent=text;results.appendChild(li);}status.textContent='Local check complete. These counts are review prompts, not a ranking score.';document.getElementById('full').hidden=false;
 }catch(error){status.textContent=error.message||'Unable to inspect this tab.';}
});
document.getElementById('full').addEventListener('click',()=>{if(currentUrl)chrome.tabs.create({url:'https://signal-audit-lab.shabeehshah42.chatgpt.site/?url='+encodeURIComponent(currentUrl)});});
