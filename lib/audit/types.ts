export type Category = 'seo' | 'content' | 'geo' | 'performance';
export type Status = 'critical' | 'improvement' | 'good' | 'optional';
export type Finding = { id: string; category: Category; status: Status; title: string; evidence: string; recommendation: string; weight: number; };
export type LinkResult = { url: string; status: number | null; state: 'ok' | 'broken' | 'unknown'; redirects: number };
export type ResourceCheck = { url: string; status: number | null; redirects: number };
export type ImageAssetCheck = { url: string; status: number | null; bytes: number | null; state: 'ok' | 'large' | 'unknown' };
export type LabPerformance = { accessibility?:{violations:{id:string;impact:string|null;help:string;url:string;count:number}[];incomplete:number}|null; renderedWords: number; fcpMs: number | null; lcpMs: number | null; cls: number | null; loadMs: number | null; ttfbMs: number | null; longTasks: number; transferKb: number | null; mobileOverflow: boolean; smallTapTargets: number; oversizedImages: {url:string;width:number;height:number;displayWidth:number;displayHeight:number}[] };
export type BotAccess = { bot: string; state: 'allowed' | 'blocked' | 'unknown'; source: string; rule: string };
export type PagePreview = { image: string | null; favicon: string | null; headline: string; };
export type Audit = {
  url: string; requestedUrl: string; title: string; description: string; date: string; sample?: boolean;
  scores: Record<Category, number>; score: number; findings: Finding[];
  metrics: { words: number; rawHtmlWords: number; scriptCount: number; readingEase: number | null; headings: number; h1: number; h2: number; images: number; missingAlt: number; links: number; checkedLinks: number; responseMs: number; htmlKb: number; schemaTypes: string[]; redirects: number; robotsTxt: ResourceCheck; sitemapXml: ResourceCheck; };
  keywords: { word: string; count: number; density: number }[]; headings: { level: number; text: string }[]; linkResults: LinkResult[]; limitations: string[];
  preview: PagePreview;
  performance: { checkedImages: ImageAssetCheck[]; largeImages: ImageAssetCheck[]; renderBlockingScripts: number; stylesheets: number; lazyImages: number; fixedWidthRisks: number; lab: LabPerformance | null; };
  aiReadiness: { bots: BotAccess[]; llmsTxt: ResourceCheck; questionHeadings: number; conciseAnswers: number; authorSignals: string[]; dateSignals: string[]; jsonLdBlocks: number; invalidJsonLd: number; relevantSchemaTypes: string[]; };
};
export const categories: Record<Category, string> = {seo:'SEO foundations',content:'Content quality',geo:'AI / GEO readiness',performance:'Performance & mobile'};
