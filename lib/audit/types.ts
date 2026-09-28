export type Category = 'seo' | 'content' | 'geo';
export type Status = 'critical' | 'improvement' | 'good';
export type Finding = { id: string; category: Category; status: Status; title: string; evidence: string; recommendation: string; weight: number; };
export type LinkResult = { url: string; status: number | null; state: 'ok' | 'broken' | 'unknown'; redirects: number };
export type ResourceCheck = { url: string; status: number | null; redirects: number };
export type PagePreview = { image: string | null; favicon: string | null; headline: string; };
export type Audit = {
  url: string; requestedUrl: string; title: string; description: string; date: string; sample?: boolean;
  scores: Record<Category, number>; score: number; findings: Finding[];
  metrics: { words: number; readingEase: number | null; headings: number; h1: number; h2: number; images: number; missingAlt: number; links: number; checkedLinks: number; responseMs: number; htmlKb: number; schemaTypes: string[]; redirects: number; robotsTxt: ResourceCheck; sitemapXml: ResourceCheck; };
  keywords: { word: string; count: number; density: number }[]; headings: { level: number; text: string }[]; linkResults: LinkResult[]; limitations: string[];
  preview: PagePreview;
};
export const categories: Record<Category, string> = {seo:'SEO foundations',content:'Content quality',geo:'AI / GEO readiness'};
