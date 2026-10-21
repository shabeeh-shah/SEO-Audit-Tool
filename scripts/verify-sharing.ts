import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {encodeShareSummary,decodeShareSummary,summaryFromAudit,type ShareSummary} from '../lib/audit/share';
import {sampleAudit} from '../lib/audit/sample';

const liveAudit={...structuredClone(sampleAudit),sample:false,url:'https://www.signal-test.com/services/audit?campaign=private#results',requestedUrl:'https://www.signal-test.com/services/audit?campaign=private#results'};
const summary=summaryFromAudit(liveAudit);
assert.equal(summary.url,'https://www.signal-test.com/services/audit','share URLs omit query strings and fragments');
assert.equal(summary.fixes.length,3,'share summaries contain at most three prioritized fixes');
const token=encodeShareSummary(summary);
assert.match(token,/^[A-Za-z0-9_-]+$/,'share token is URL-safe');
assert.deepEqual(decodeShareSummary(token),summary,'share summary round-trips through the permalink token');

const sanitized:ShareSummary={...summary,fixes:['<img src=x onerror=alert(1)>','Useful\u0000 fix']};
const cleaned=decodeShareSummary(encodeShareSummary(sanitized));
assert.deepEqual(cleaned?.fixes,['img src=x onerror=alert(1)','Useful fix'],'display text is sanitized before encoding and after decoding');

const raw=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
for(const malformed of ['',token+'!',raw({...summary,version:2}),raw({...summary,score:101}),raw({...summary,url:'http://localhost/admin'}),raw({...summary,extra:'hidden'}),'a'.repeat(1401)])assert.equal(decodeShareSummary(malformed),null,`rejected malformed token: ${malformed.slice(0,24)}`);

const component=readFileSync('components/signal-app.tsx','utf8');
for(const label of ['Share on LinkedIn','Copy link','Download PNG'])assert.match(component,new RegExp(label));
assert.match(component,/linkedin\.com\/sharing\/share-offsite\/\?url=/);
assert.doesNotMatch(component,/fetch\('\/api\/reports'/,'sharing does not create a server-side report');
assert.match(readFileSync('app/report/[id]/og/route.tsx','utf8'),/width:1200,height:630/);
console.log('Stateless report sharing, validation, LinkedIn URL, and PNG controls verified.');
