import { DEFAULT_SEO_KEYWORDS, SEO_PRIMARY_KEYWORDS } from './seo.keywords';
import { SeoPageConfig } from './seo.types';

export const SEO_PAGES: Record<string, SeoPageConfig> = {
  home: {
    path: '/',
    title: 'Puedo ayudar: qué hace falta cerca de ti',
    description:
      'Consulta necesidades abiertas en albergues por municipio — agua, alimentos, reconstrucción, transporte — y registra tu oferta de ayuda sin crear cuenta.',
    keywords: [
      'donar ayuda desastre',
      'ofrecer ayuda humanitaria',
      'donaciones inundaciones',
      'donar cobijas alimentos agua',
      ...SEO_PRIMARY_KEYWORDS,
    ],
  },
  mapa: {
    path: '/mapa',
    title: 'Mapa de albergues y puntos de acogida',
    description:
      'Encuentra albergues con cupos, reporta necesidades y ofrece ayuda humanitaria de última milla. Mapa vivo para respuesta a desastre en Valle, Chocó, Risaralda, Quindío y Caldas.',
    keywords: [...DEFAULT_SEO_KEYWORDS],
  },
  registrar: {
    path: '/puntos/nuevo',
    title: 'Registrar un albergue o punto de acogida',
    description:
      'Publica un albergue, refugio temporal o punto comunitario con cupos y ubicación. Queda visible de inmediato para quien busca dónde ayudar o refugiarse.',
    keywords: [
      'registrar albergue',
      'punto de acogida',
      'refugio temporal Colombia',
      'publicar albergue',
      ...SEO_PRIMARY_KEYWORDS,
    ],
  },
  ayudaHumanitaria: {
    path: '/ayuda-humanitaria',
    title: 'Ayuda humanitaria y albergues: cómo funciona',
    description:
      'Guía clara para encontrar albergues, pedir ayuda de última milla y donar en emergencias en Colombia. Glosario, pasos y preguntas frecuentes.',
    keywords: [...DEFAULT_SEO_KEYWORDS],
  },
  login: {
    path: '/login',
    title: 'Entrar',
    description: 'Acceso para coordinación, verificación o responsables de albergue.',
    robots: 'noindex,nofollow',
  },
  coordinacion: {
    path: '/coordinacion',
    title: 'Panel de coordinación',
    description: 'Panel interno de verificación y emparejamiento de ayuda.',
    robots: 'noindex,nofollow',
  },
};
