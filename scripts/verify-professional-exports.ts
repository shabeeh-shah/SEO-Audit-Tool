import assert from 'node:assert/strict';
import {bulkCsv,parseBulkInput,type BulkAuditResult} from '../lib/audit/bulk';
import {reportHtml} from '../lib/audit/export';
import {sampleAudit} from '../lib/audit/sample';

const parsed=parseBulkInput('url\nhttps://example.com\n"https://example.org/path",note\nhttps://example.com');
assert.deepEqual(parsed,['https://example.com/','https://example.org/path']);
assert.throws(()=>parseBulkInput(''),/at least one/i);
assert.throws(()=>parseBulkInput('x'.repeat(50_001)),/50 KB/i);
assert.throws(()=>parseBulkInput(Array.from({length:21},(_,index)=>`https://example${index}.com`).join('\n')),/up to 20/i);
assert.throws(()=>parseBulkInput('http://localhost:3000'),/local|public/i);
assert.throws(()=>parseBulkInput('http://127.0.0.1'),/local|private|public/i);
assert.throws(()=>parseBulkInput('ftp://example.com'),/HTTP/i);

const audit={...sampleAudit,url:'https://example.com/',score:84,scores:{seo:81,content:92,geo:70,performance:93},findings:[
 {id:'quoted',category:'seo' as const,status:'critical' as const,title:'Missing "title", tag',evidence:'None',recommendation:'Add it',weight:3},
 ...sampleAudit.findings,
]};
const results:BulkAuditResult[]=[{requestedUrl:audit.url,audit},{requestedUrl:'https://failed.example/',error:'=FORMULA()'}];
const csv=bulkCsv(results);
assert.match(csv,/"Overall grade"/);
assert.match(csv,/"B","84","81","92","70","93"/);
assert.match(csv,/"Missing ""title"", tag"/);
assert.match(csv,/"'=FORMULA\(\)"/);
assert.equal(csv.split('\r\n').length,3);

const logo='data:image/png;base64,aGVsbG8=';
const html=reportHtml(audit,{companyName:'Client <Studio>',logoDataUrl:logo});
assert.match(html,/Prepared for Client &lt;Studio&gt;/);
assert.match(html,/EXECUTIVE SUMMARY/);
assert.match(html,/Priority fix list/);
assert.match(html,/data:image\/png;base64,aGVsbG8=/);
assert.ok(html.indexOf('Missing &quot;title&quot;, tag')<html.indexOf('Topics found'));
assert.doesNotMatch(reportHtml(audit,{logoDataUrl:'data:image/svg+xml;base64,PHN2Zz4='}),/data:image\/svg/);
assert.match(html,/do not predict rankings, traffic, indexing, crawler visits, AI visibility, or citations/i);

console.log('Professional export and bulk-input checks passed.');
