import type {Audit} from './types';
export function fixDrafts(audit:Audit,organization:string,description:string,policy:'allow'|'block'){
 const safe=(value:string)=>value.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
 const schema={'@context':'https://schema.org','@type':'Organization',name:organization,url:new URL(audit.url).origin};
 return {schema:'<script type="application/ld+json">\n'+JSON.stringify(schema,null,2).replace(/</g,'\\u003c')+'\n</script>',robots:['# Merge these groups with your existing robots.txt; review duplicate groups.',...['GPTBot','ClaudeBot','PerplexityBot','Google-Extended','CCBot'].map(bot=>`User-agent: ${bot}\n${policy==='block'?'Disallow':'Allow'}: /\n`)].join('\n'),description:`<meta name="description" content="${safe(description)}">`};
}
