---
name: colombiadepie-frontend
description: >-
  Frontend Colombia de Pie: Angular 19 standalone, signals, PWA. Usar al crear o
  modificar pantallas, componentes, rutas y estilos en frontend/. Exige SEO
  (SeoService, meta, JSON-LD) en páginas indexables y estilos uniformes con
  design tokens globales en styles.scss.
---

# Colombia de Pie — Frontend

Stack: Angular 19 (standalone + signals), PWA, Leaflet, Dexie outbox. Código en `frontend/src/`.

## Principios de producto

- Usuarios bajo **estrés** y **baja conectividad** (emergencia / desastre)
- Textos en **español**, claros, sin jerga innecesaria
- Botones grandes, jerarquía obvia, feedback de error visible
- Mobile-first; probar layout estrecho (~360px)

## Estructura

```
frontend/src/app/
├── core/           # servicios, SEO, HTTP, utils compartidos
├── features/       # pantallas por dominio (mapa, ayudar, punto-detail…)
├── layout/         # shell, navegación
└── app.routes.ts   # rutas lazy-loaded
```

Componentes **standalone**; estado con **signals** / `computed` cuando aplique.

## SEO (obligatorio en páginas públicas indexables)

### Cuándo aplicar

Toda ruta que deba aparecer en buscadores o compartirse (home, mapa, albergues, landings SEO, detalle público de albergue).

**No indexar** (`robots: 'noindex,nofollow'`): login, coordinación, formularios internos, cuenta.

### Cómo implementar

1. **`SeoService`** (`core/seo/seo.service.ts`) en `ngOnInit` de la página:
   ```typescript
   private readonly seo = inject(SeoService);

   ngOnInit(): void {
     this.seo.apply({
       path: '/ruta',
       title: 'Título descriptivo',
       description: '1–2 frases con keywords naturales (máx. ~160 caracteres).',
       keywords: ['...'], // opcional; default en seo.keywords.ts
     });
     // Opcional: JSON-LD
     this.seo.setJsonLd(placeShelterSchema({ ... }));
   }
   ```

2. **Páginas estáticas recurrentes** — registrar en `core/seo/seo.pages.ts` y reutilizar.

3. **Páginas dinámicas** (albergue, municipio) — título/description con municipio + nombre; schema en `core/seo/seo.schema.ts`.

4. **Nueva ruta pública** — actualizar si aplica:
   - `app.routes.ts`
   - `public/sitemap.xml`
   - `core/seo/seo.pages.ts` o lógica dinámica en la página

5. **`environment.prod.ts`** — `siteUrl` coherente con canonical y og:url.

Checklist SEO antes de cerrar:
- [ ] `title` y `description` únicos
- [ ] `path` correcto para canonical
- [ ] Imagen OG (`/og-default.png` o específica)
- [ ] JSON-LD si es entidad local (albergue, FAQ)

## Estilos uniformes

**Fuente de verdad:** `frontend/src/styles.scss` (design tokens en `:root`).

### Tokens (usar variables, no hex sueltos)

| Token | Uso |
|-------|-----|
| `--canopy`, `--canopy-deep` | Marca, títulos, botones primary |
| `--ink`, `--ink-soft` | Texto |
| `--paper`, `--line` | Fondos y bordes |
| `--rose`, `--amber` | Errores, urgencia |
| `--font-body` | Atkinson Hyperlegible |
| `--font-display` | Fraunces (h1–h3) |
| `--radius`, `--radius-sm` | Bordes |

### Clases globales (reutilizar antes de inventar)

- **Layout:** `.shell`, `.panel`, `.empty`, `.banner`, `.banner.ok`, `.banner.danger`
- **Formularios:** `.field`, `.field label`, `.field input`, `.hint`, `.form-grid`, `.form-filters`
- **Botones:** `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-ghost`, `.btn-sm`
- **Tags:** `.tag`, `.tag.ok`
- **Público albergue:** `.public-*` (needs, quick-offer, CTA)
- **Ayuda listado:** `.ayudar-*`

### Reglas de estilo

1. **Preferir clases globales** en `styles.scss` para patrones repetidos (formulario, tarjeta, lista).
2. Estilos en `styles: [...]` del `@Component` solo para layout **específico** de esa pantalla; si se repite en 2+ sitios → subir a `styles.scss`.
3. No introducir fuentes ni paletas nuevas sin motivo.
4. Contraste legible; targets táctiles ≥ 44px en acciones principales.
5. Componentes reutilizables en `core/components/` (ej. `QuickOfferPanelComponent`, `MunicipioSelectComponent`).

### Anti-patrones

- Inputs sin `.field` (bordes/padding inconsistentes)
- `routerLink="/"` hardcodeado sin query cuando el contexto es municipio
- Páginas públicas sin `SeoService.apply`
- Duplicar lógica de oferta rápida — usar `QuickOfferPanelComponent`

## API y entornos

- Local: `environment.ts` → `http://localhost:3000`
- Servicios HTTP: `core/api-client.service.ts` + `core/api.services.ts`
- Errores: `core/http/api-error.mapper.ts`

## Build

```bash
cd frontend
npm run build:prod
```

## Referencias

- SEO: `core/seo/`
- Labels/categorías: `core/utils/labels.ts`, `categoria-meta.ts`
- Contribución: `CONTRIBUTING.md`
