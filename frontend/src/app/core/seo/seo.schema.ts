import { SeoService } from './seo.service';

export function organizationAndWebsiteGraph(seo: SeoService): Record<string, unknown> {
  const origin = seo.origin();
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'Colombia de Pie',
        url: origin,
        description:
          'Plataforma cívica de albergues y ayuda humanitaria de última milla para respuesta a desastre en Colombia.',
        logo: `${origin}/icons/icon-512x512.png`,
        areaServed: {
          '@type': 'Country',
          name: 'Colombia',
        },
        knowsAbout: [
          'albergues',
          'ayuda humanitaria',
          'ayuda de última milla',
          'puntos de acogida',
          'respuesta a desastre',
        ],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: 'Colombia de Pie',
        description:
          'Encuentra albergues, reporta necesidades y ofrece donaciones de última milla.',
        inLanguage: 'es-CO',
        publisher: { '@id': `${origin}/#organization` },
      },
    ],
  };
}

export function faqEntity(
  seo: SeoService,
  path: string,
  faqs: { question: string; answer: string }[]
): Record<string, unknown> {
  return {
    '@type': 'FAQPage',
    '@id': `${seo.absoluteUrl(path)}#faq`,
    url: seo.absoluteUrl(path),
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function howToEntity(
  name: string,
  description: string,
  steps: string[]
): Record<string, unknown> {
  return {
    '@type': 'HowTo',
    name,
    description,
    inLanguage: 'es-CO',
    step: steps.map((text, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: `Paso ${i + 1}`,
      text,
    })),
  };
}

export function breadcrumbEntity(
  seo: SeoService,
  items: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: seo.absoluteUrl(item.path),
    })),
  };
}

export function placeShelterSchema(opts: {
  name: string;
  description: string;
  url: string;
  municipio: string;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
}): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'EmergencyService',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    areaServed: opts.municipio,
    address: {
      '@type': 'PostalAddress',
      addressLocality: opts.municipio,
      addressCountry: 'CO',
      streetAddress: opts.address || undefined,
    },
  };
  if (opts.lat != null && opts.lng != null) {
    schema['geo'] = {
      '@type': 'GeoCoordinates',
      latitude: opts.lat,
      longitude: opts.lng,
    };
  }
  return schema;
}
