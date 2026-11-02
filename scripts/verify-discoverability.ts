import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import robots from '../app/robots';
import sitemap from '../app/sitemap';
import {faq,faqPageSchema,siteDescription,siteMetadata,siteTitle,siteUrl,socialTagline,softwareApplicationSchema} from '../lib/site';

const root=process.cwd();
const read=(path:string)=>readFileSync(join(root,path),'utf8');
const imageUrl=`${siteUrl}/og`;

const openGraph=siteMetadata.openGraph as {type?:string;url?:string;images?:unknown};
const twitter=siteMetadata.twitter as {card?:string;images?:unknown};
assert.equal(siteMetadata.title,siteTitle);
assert.equal(siteMetadata.description,siteDescription);
assert.equal(siteMetadata.metadataBase?.toString(),`${siteUrl}/`);
assert.equal(siteMetadata.alternates?.canonical,siteUrl);
assert.equal(openGraph.type,'website');
assert.equal(openGraph.url,siteUrl);
assert.deepEqual(openGraph.images,[{url:imageUrl,width:1200,height:630,alt:`signal. — ${socialTagline}`}]);
assert.equal(twitter.card,'summary_large_image');
assert.deepEqual(twitter.images,[imageUrl]);
assert.deepEqual(siteMetadata.icons,{icon:'/favicon.svg',shortcut:'/favicon.svg'});

assert.equal(softwareApplicationSchema['@type'],'SoftwareApplication');
assert.equal(softwareApplicationSchema.url,siteUrl);
assert.equal(softwareApplicationSchema.operatingSystem,'Any');
assert.equal(softwareApplicationSchema.isAccessibleForFree,true);
assert.equal(softwareApplicationSchema.offers.price,'0');

assert.equal(faq.length,5);
assert.deepEqual(faqPageSchema.mainEntity,faq.map(item=>({
 '@type':'Question',
 name:item.question,
 acceptedAnswer:{'@type':'Answer',text:item.answer},
})));

const productInfo=read('components/product-info.tsx');
assert.match(productInfo,/faqPageSchema/);
assert.match(productInfo,/faq\.map/);
const ogSource=read('app/og/route.tsx');
assert.match(ogSource,/socialTagline/);
assert.match(ogSource,/width:1200/);
assert.match(ogSource,/height:630/);

assert.deepEqual(robots(),{
 rules:{userAgent:'*',allow:'/',disallow:['/api/']},
 sitemap:`${siteUrl}/sitemap.xml`,
 host:siteUrl,
});
assert.deepEqual(sitemap(),[{url:siteUrl,changeFrequency:'weekly',priority:1}]);

const license=read('LICENSE');
assert.match(license,/MIT License/);
assert.match(license,/Copyright \(c\) 2026 Shabeeh Shah/);

assert.match(read('public/favicon.svg'),/<svg/);

const readme=read('README.md');
for(const heading of ['## What it checks','## Screenshot placeholder','## Quick start','## How scoring works','## Limitations','## Roadmap','## Contributing']){
 assert.ok(readme.includes(heading),`README is missing ${heading}`);
}

console.log('Discoverability metadata, schemas, public files, and documentation verified.');
