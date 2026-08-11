export interface SeoPageConfig {
  title: string;
  description: string;
  keywords?: string[];
  path: string;
  robots?: string;
  type?: 'website' | 'article';
  image?: string;
}

export interface JsonLdGraph {
  '@context': 'https://schema.org';
  '@graph': Record<string, unknown>[];
}
