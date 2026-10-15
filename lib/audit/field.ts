export type FieldResult={state:'available'|'unavailable'|'not-configured';message:string;scope?:string;url?:string;period?:string;lcp?:number|null;inp?:number|null;cls?:number|null};
export function parseCrux(data:unknown,url:string):FieldResult{
 const record=(data as {record?:{key?:{url?:string;origin?:string};collectionPeriod?:{firstDate:{year:number;month:number;day:number};lastDate:{year:number;month:number;day:number}};metrics?:Record<string,{percentiles?:{p75?:number|string}}>}})?.record;
 if(!record?.metrics)return {state:'unavailable',message:'No real-user field record was returned.'};
 const metric=(name:string)=>{const value=record.metrics?.[name]?.percentiles?.p75;return value!==undefined&&Number.isFinite(Number(value))?Number(value):null;};
 const date=(value:{year:number;month:number;day:number})=>`${value.year}-${String(value.month).padStart(2,'0')}-${String(value.day).padStart(2,'0')}`;
 return {state:'available',message:'Chrome UX Report · mobile · 75th percentile',scope:record.key?.url?'Page':'Origin',url:record.key?.url||record.key?.origin||url,period:record.collectionPeriod?`${date(record.collectionPeriod.firstDate)} to ${date(record.collectionPeriod.lastDate)}`:undefined,lcp:metric('largest_contentful_paint'),inp:metric('interaction_to_next_paint'),cls:metric('cumulative_layout_shift')};
}
