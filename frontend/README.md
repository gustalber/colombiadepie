# Colombia de Pie — Frontend

Angular 19 (standalone + signals) · PWA · Leaflet · Dexie outbox.

## Diseño

Interfaz calmada para uso bajo estrés y baja conectividad:
- Tipografía Atkinson Hyperlegible
- Cinta de estado siempre visible (online/offline + pendientes de sync)
- Textos en español, botones grandes, frescura (“actualizado hace X”)

## Setup

```bash
cd frontend
npm install
npm start
```

Abre `http://localhost:4200`.

El API local debe estar en `http://localhost:3000` (`src/environments/environment.ts`).

## Build por ambiente

| Comando | API | Sitio (SEO) |
|---------|-----|-------------|
| `npm start` | `http://localhost:3000` | local |
| `npm run build:staging` | `https://api-staging.colombiadepie.com` | `https://staging.colombiadepie.com` |
| `npm run build:prod` | `https://api.colombiadepie.com` | `https://colombiadepie.com` |

Los builds de staging/prod reemplazan `environment.ts` vía `angular.json` (`fileReplacements`).

## Deploy (S3 + CloudFront)

Flujo: build de producción → `aws s3 sync` → invalidación de CloudFront. Requiere AWS CLI y un profile configurado (por defecto `colombiadepie`).

1. Copia config de deploy:

```bash
cp .env.deploy.example .env.deploy
```

2. Completa buckets S3 y IDs de CloudFront por stage en `.env.deploy`.

3. Deploy:

```bash
npm run deploy:prod       # build production → S3 prod
npm run deploy:staging    # build staging → S3 staging
```

El script sube assets con cache largo e `index.html` / `ngsw*` sin cache (PWA).

Si falta el ID de CloudFront o el usuario IAM no tiene `cloudfront:CreateInvalidation`, el deploy a S3 igual termina y verás un aviso. Opciones:
- Agregar `cloudfront:CreateInvalidation` al rol o usuario de deploy
- Poner `SKIP_CLOUDFRONT_INVALIDATION=true` en `.env.deploy`
- Invalidar manualmente en la consola de CloudFront tras cada deploy

## Pantallas

| Ruta | Descripción |
|------|-------------|
| `/` | Mapa + lista de albergues |
| `/puntos/:id` | Detalle + necesidades abiertas |
| `/puntos/nuevo` | Registrar albergue (offline-ready) |
| `/puntos/:id/editar` | Editar albergue |
| `/puntos/:id/necesidades/nueva` | Nueva necesidad (offline-ready) |
| `/ayudar` | Puedo ayudar (oferta pública) |
| `/login` | Login JWT |
| `/coordinacion` | Verificar y emparejar |

## Offline

Escrituras de albergue/necesidad se encolan en IndexedDB (Dexie) si no hay red y se sincronizan al reconectar.
