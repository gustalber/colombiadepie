/** Municipios de cobertura: Valle del Cauca, Chocó, Risaralda, Quindío y Caldas. */

export interface DepartamentoMunicipios {
  departamento: string;
  municipios: string[];
}

export const MUNICIPIOS_POR_DEPARTAMENTO: DepartamentoMunicipios[] = [
  {
    departamento: 'Valle del Cauca',
    municipios: [
      'Alcalá',
      'Andalucía',
      'Ansermanuevo',
      'Argelia',
      'Bolívar',
      'Buenaventura',
      'Buga',
      'Bugalagrande',
      'Caicedonia',
      'Cali',
      'Calima',
      'Candelaria',
      'Cartago',
      'Dagua',
      'El Águila',
      'El Cairo',
      'El Cerrito',
      'El Dovio',
      'Florida',
      'Ginebra',
      'Guacarí',
      'Jamundí',
      'La Cumbre',
      'La Unión',
      'La Victoria',
      'Obando',
      'Palmira',
      'Pradera',
      'Restrepo',
      'Riofrío',
      'Roldanillo',
      'San Pedro',
      'Sevilla',
      'Toro',
      'Trujillo',
      'Tuluá',
      'Ulloa',
      'Versalles',
      'Vijes',
      'Yotoco',
      'Yumbo',
      'Zarzal',
    ],
  },
  {
    departamento: 'Chocó',
    municipios: [
      'Acandí',
      'Alto Baudó',
      'Atrato',
      'Bagadó',
      'Bahía Solano',
      'Bajo Baudó',
      'Belén de Bajirá',
      'Bojayá',
      'Carmen del Darién',
      'Cértegui',
      'Condoto',
      'El Cantón del San Pablo',
      'El Carmen de Atrato',
      'El Litoral del San Juan',
      'Istmina',
      'Juradó',
      'Lloró',
      'Medio Atrato',
      'Medio Baudó',
      'Medio San Juan',
      'Nóvita',
      'Nuquí',
      'Quibdó',
      'Río Iró',
      'Río Quito',
      'Riosucio (Chocó)',
      'San José del Palmar',
      'Sipí',
      'Tadó',
      'Unguía',
      'Unión Panamericana',
    ],
  },
  {
    departamento: 'Risaralda',
    municipios: [
      'Apía',
      'Balboa',
      'Belén de Umbría',
      'Dosquebradas',
      'Guática',
      'La Celia',
      'La Virginia',
      'Marsella',
      'Mistrató',
      'Pereira',
      'Pueblo Rico',
      'Quinchía',
      'Santa Rosa de Cabal',
      'Santuario',
    ],
  },
  {
    departamento: 'Quindío',
    municipios: [
      'Armenia',
      'Buenavista',
      'Calarcá',
      'Circasia',
      'Córdoba',
      'Filandia',
      'Génova',
      'La Tebaida',
      'Montenegro',
      'Pijao',
      'Quimbaya',
      'Salento',
    ],
  },
  {
    departamento: 'Caldas',
    municipios: [
      'Aguadas',
      'Anserma',
      'Aranzazu',
      'Belalcázar',
      'Chinchiná',
      'Filadelfia',
      'La Dorada',
      'La Merced',
      'Manizales',
      'Manzanares',
      'Marmato',
      'Marquetalia',
      'Marulanda',
      'Neira',
      'Norcasia',
      'Pácora',
      'Palestina',
      'Pensilvania',
      'Riosucio (Caldas)',
      'Risaralda',
      'Salamina',
      'Samaná',
      'San José',
      'Supía',
      'Victoria',
      'Villamaría',
      'Viterbo',
    ],
  },
];

/** Lista plana de municipios (orden de departamentos arriba). */
export const MUNICIPIOS: string[] = MUNICIPIOS_POR_DEPARTAMENTO.flatMap(
  (d) => d.municipios
);

export function normalizeMunicipioText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const SKIP_MUNICIPIO_SEGMENTS = new Set([
  'colombia',
  'valle del cauca',
  'choco',
  'risaralda',
  'quindio',
  'caldas',
]);

/** Match a known coverage municipio from free text (URL label, address, geocoder). */
export function matchMunicipioFromText(text: string): string | null {
  const raw = text.trim();
  if (!raw) return null;

  const catalog = MUNICIPIOS.map((name) => ({
    name,
    norm: normalizeMunicipioText(name),
  }));

  const segments = raw
    .split(/[,;|]/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (let i = segments.length - 1; i >= 0; i--) {
    const segNorm = normalizeMunicipioText(segments[i]);
    if (!segNorm || SKIP_MUNICIPIO_SEGMENTS.has(segNorm)) continue;

    const exact = catalog.find((item) => item.norm === segNorm);
    if (exact) return exact.name;

    for (const item of catalog) {
      if (segNorm === item.norm) return item.name;
      if (segNorm.endsWith(` ${item.norm}`) || segNorm.startsWith(`${item.norm} `)) {
        return item.name;
      }
    }
  }

  const haystack = normalizeMunicipioText(raw);
  const byLength = [...catalog].sort((a, b) => b.norm.length - a.norm.length);
  for (const item of byLength) {
    if (haystack.includes(item.norm)) return item.name;
  }

  return null;
}

export function matchMunicipioFromLabels(labels: Array<string | null | undefined>): string | null {
  for (const label of labels) {
    if (!label) continue;
    const match = matchMunicipioFromText(label);
    if (match) return match;
  }
  return null;
}
