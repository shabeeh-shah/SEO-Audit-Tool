import {normalizeUrl} from './fetch';
import {isIssue,prioritize} from './priorities';
import type {Audit} from './types';

export type ShareSummary={version:1;url:string;score:number;scores:{seo:number;content:number;geo:number;performance:number};fixes:string[]};

const BASE64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const MAX_TOKEN_LENGTH=1400;
const MAX_JSON_BYTES=1000;
const MAX_URL_LENGTH=500;
const MAX_FIX_LENGTH=120;

function cleanText(value:string){return value.replace(/[\u0000-\u001f\u007f]/g,' ').replace(/[<>]/g,'').replace(/\s+/g,' ').trim();}
function validScore(value:unknown):value is number{return typeof value==='number'&&Number.isInteger(value)&&value>=0&&value<=100;}
function cleanPublicUrl(value:unknown){
 if(typeof value!=='string'||value.length>MAX_URL_LENGTH)throw new Error('The shared page URL is invalid.');
 const url=normalizeUrl(value);url.search='';url.hash='';
 if(url.href.length>MAX_URL_LENGTH)throw new Error('The shared page URL is too long.');
 return url.href;
}
function validateSummary(value:unknown):ShareSummary{
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('The shared report is malformed.');
 const input=value as Record<string,unknown>;
 if(Object.keys(input).sort().join(',')!=='fixes,score,scores,url,version'||input.version!==1)throw new Error('The shared report format is not supported.');
 if(!input.scores||typeof input.scores!=='object'||Array.isArray(input.scores))throw new Error('The shared scores are malformed.');
 const scores=input.scores as Record<string,unknown>;
 if(Object.keys(scores).sort().join(',')!=='content,geo,performance,seo'||![input.score,scores.seo,scores.content,scores.geo,scores.performance].every(validScore))throw new Error('The shared scores are invalid.');
 if(!Array.isArray(input.fixes)||input.fixes.length>3||input.fixes.some(item=>typeof item!=='string'||item.length>MAX_FIX_LENGTH))throw new Error('The shared fixes are invalid.');
 const fixes=input.fixes.map(item=>cleanText(item as string)).filter(Boolean);
 if(fixes.length!==input.fixes.length)throw new Error('The shared fixes are invalid.');
 return {version:1,url:cleanPublicUrl(input.url),score:input.score as number,scores:{seo:scores.seo as number,content:scores.content as number,geo:scores.geo as number,performance:scores.performance as number},fixes};
}
function encodeBytes(bytes:Uint8Array){let result='';for(let index=0;index<bytes.length;index+=3){const a=bytes[index],b=bytes[index+1],c=bytes[index+2];const value=(a<<16)|((b||0)<<8)|(c||0);result+=BASE64[(value>>18)&63]+BASE64[(value>>12)&63]+(index+1<bytes.length?BASE64[(value>>6)&63]:'=')+(index+2<bytes.length?BASE64[value&63]:'=');}return result.replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');}
function decodeBytes(token:string){if(!/^[A-Za-z0-9_-]+$/.test(token)||token.length%4===1)throw new Error('The shared report link is malformed.');const source=token.replace(/-/g,'+').replace(/_/g,'/');const bytes:number[]=[];for(let index=0;index<source.length;index+=4){const chars=[source[index],source[index+1],source[index+2],source[index+3]];const values=chars.map(char=>char===undefined?0:BASE64.indexOf(char));if(values.some(value=>value<0))throw new Error('The shared report link is malformed.');const value=(values[0]<<18)|(values[1]<<12)|(values[2]<<6)|values[3];bytes.push((value>>16)&255);if(chars[2]!==undefined)bytes.push((value>>8)&255);if(chars[3]!==undefined)bytes.push(value&255);}return new Uint8Array(bytes);}

export function summaryFromAudit(audit:Audit):ShareSummary{return validateSummary({version:1,url:audit.url,score:audit.score,scores:audit.scores,fixes:prioritize(audit.findings).filter(isIssue).slice(0,3).map(finding=>finding.title)});}
export function encodeShareSummary(summary:ShareSummary){const json=new TextEncoder().encode(JSON.stringify(validateSummary(summary)));if(json.byteLength>MAX_JSON_BYTES)throw new Error('The shared report is too large.');const token=encodeBytes(json);if(token.length>MAX_TOKEN_LENGTH)throw new Error('The shared report link is too long.');return token;}
export function decodeShareSummary(token:string){try{if(typeof token!=='string'||token.length<2||token.length>MAX_TOKEN_LENGTH)return null;const bytes=decodeBytes(token);if(bytes.byteLength>MAX_JSON_BYTES)return null;return validateSummary(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes)) as unknown);}catch{return null;}}
export function gradeForScore(score:number){return score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F';}
