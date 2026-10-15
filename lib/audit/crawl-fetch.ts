import {createFetcher,FetchSafetyError,readText} from './fetch';
import {robotsAllows} from './robots';
// Check every redirect destination before fetching it, and fail closed when
// crawler access cannot be established. Robots resources use public-only egress.
export function createCrawler(signal?:AbortSignal){
 const resource=createFetcher({signal});
 const cache=new Map<string,Promise<{text:string;status:number;url:string;redirects:number}>>();
 function robots(address:string){const origin=new URL(address).origin;if(!cache.has(origin))cache.set(origin,(async()=>{
  const result=await resource(origin+'/robots.txt','GET',5000);
  const status=result.response.status;
  if(status===404||status===410){await result.response.body?.cancel();return {text:'',status,url:result.url,redirects:result.redirects};}
  if(!result.response.ok){await result.response.body?.cancel();throw new FetchSafetyError('blocked','Crawler access could not be confirmed from robots.txt. Try another page.');}
  return {text:await readText(result.response),status,url:result.url,redirects:result.redirects};
 })());return cache.get(origin)!;}
 const fetchPage=createFetcher({signal,beforeRequest:async address=>{const rules=await robots(address);if(robotsAllows(rules.text,address)===false)throw new FetchSafetyError('blocked','This page is blocked for SignalAudit by robots.txt.');}});
 return {fetchPage,robots};
}
