import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';
import { DEFAULT_SEO_KEYWORDS } from './seo.keywords';
import { SeoPageConfig } from './seo.types';

const JSON_LD_ID = 'colombiadepie-jsonld';
const CANONICAL_ID = 'colombiadepie-canonical';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  siteName = 'Colombia de Pie';

  origin(): string {
    const configured = environment.siteUrl?.replace(/\/$/, '');
    if (configured) return configured;
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://colombiadepie.com';
  }

  absoluteUrl(path: string): string {
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${this.origin()}${clean === '/' ? '/' : clean}`;
  }

  apply(config: SeoPageConfig): void {
    const fullTitle = config.title.includes(this.siteName)
      ? config.title
      : `${config.title} | ${this.siteName}`;
    const url = this.absoluteUrl(config.path);
    const image = this.absoluteUrl(config.image || '/og-default.png');
    const keywords = (config.keywords?.length
      ? config.keywords
      : DEFAULT_SEO_KEYWORDS
    ).join(', ');
    const robots = config.robots || 'index,follow,max-image-preview:large';
    const type = config.type || 'website';

    this.title.setTitle(fullTitle);

    this.upsertName('description', config.description);
    this.upsertName('keywords', keywords);
    this.upsertName('robots', robots);
    this.upsertName('author', this.siteName);
    this.upsertName('theme-color', '#2f5d4a');

    this.upsertProperty('og:type', type);
    this.upsertProperty('og:site_name', this.siteName);
    this.upsertProperty('og:locale', 'es_CO');
    this.upsertProperty('og:title', fullTitle);
    this.upsertProperty('og:description', config.description);
    this.upsertProperty('og:url', url);
    this.upsertProperty('og:image', image);
    this.upsertProperty('og:image:alt', `${this.siteName} — albergues y ayuda de última milla`);

    this.upsertName('twitter:card', 'summary_large_image');
    this.upsertName('twitter:title', fullTitle);
    this.upsertName('twitter:description', config.description);
    this.upsertName('twitter:image', image);

    this.setCanonical(url);
  }

  setJsonLd(data: Record<string, unknown> | Record<string, unknown>[]): void {
    if (typeof document === 'undefined') return;
    let el = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
    if (!el) {
      el = document.createElement('script');
      el.id = JSON_LD_ID;
      el.type = 'application/ld+json';
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
  }

  clearJsonLd(): void {
    if (typeof document === 'undefined') return;
    document.getElementById(JSON_LD_ID)?.remove();
  }

  private setCanonical(url: string): void {
    if (typeof document === 'undefined') return;
    let link = document.getElementById(CANONICAL_ID) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement('link');
      link.id = CANONICAL_ID;
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  private upsertName(name: string, content: string): void {
    if (this.meta.getTag(`name="${name}"`)) {
      this.meta.updateTag({ name, content });
    } else {
      this.meta.addTag({ name, content });
    }
  }

  private upsertProperty(property: string, content: string): void {
    if (this.meta.getTag(`property="${property}"`)) {
      this.meta.updateTag({ property, content });
    } else {
      this.meta.addTag({ property, content });
    }
  }
}
