import assert from 'node:assert/strict';
import {readHtml,readText} from '../lib/audit/fetch';

const limit=3_000_000;
const tooLarge=/3 MB HTML limit/;
const htmlResponse=(body:string,headers:Record<string,string>={})=>new Response(body,{headers:{'content-type':'text/html',...headers}});

for(const size of [1_500_001,limit-1,limit]){
 const body='x'.repeat(size);
 const result=await readHtml(htmlResponse(body,{'content-length':String(size)}));
 assert.equal(result.bytes,size,'pages above the old cap and through 3 MB are accepted');
 assert.equal(result.html,body,'the complete body is returned without truncation');
}
await assert.rejects(()=>readHtml(htmlResponse('x'.repeat(limit+1))),tooLarge,'streamed bodies above the limit are rejected without Content-Length');
await assert.rejects(()=>readHtml(htmlResponse('x'.repeat(limit+1),{'content-length':'10','content-encoding':'gzip'})),tooLarge,'a small declared compressed size cannot bypass the decoded body limit');

let declaredCancelled=false;
const declared=new Response(new ReadableStream<Uint8Array>({cancel(){declaredCancelled=true;}}),{headers:{'content-type':'text/html','content-length':String(limit+1)}});
await assert.rejects(()=>readHtml(declared),tooLarge,'oversized declared responses are rejected before reading');
assert.equal(declaredCancelled,true,'oversized declared responses are cancelled');

let streamedCancelled=false;
let chunk=0;
const streamed=new Response(new ReadableStream<Uint8Array>({
 pull(controller){controller.enqueue(new Uint8Array(chunk++===0?limit:1));},
 cancel(){streamedCancelled=true;},
}),{headers:{'content-type':'text/html'}});
await assert.rejects(()=>readHtml(streamed),tooLarge,'the limit applies across chunk boundaries');
assert.equal(streamedCancelled,true,'reading stops and cancels when the streaming cap is exceeded');

const unicode='é'.repeat(limit/2);
assert.equal((await readHtml(htmlResponse(unicode))).bytes,limit,'the limit measures UTF-8 bytes, not character count');
await assert.rejects(()=>readHtml(htmlResponse(`${unicode}é`)),tooLarge);
await assert.rejects(()=>readText(new Response('x'.repeat(200_001))),/too large/,'robots and other text response limits are unchanged');
await assert.rejects(()=>readHtml(new Response('file',{headers:{'content-type':'application/pdf'}})),/does not return an HTML webpage/);
await assert.rejects(()=>readHtml(new Response('Unavailable',{status:503})),/HTTP 503/);

console.log('HTML fetch size boundaries passed (3,000,000 bytes).');
