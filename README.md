# Colombia de Pie

Herramienta cívica para la respuesta a desastre en Colombia: directorio vivo de albergues y emparejamiento de necesidades de última milla.

## Estructura

- [`backend/`](./backend) — API Node.js + Express + Sequelize (PostgreSQL)
- [`frontend/`](./frontend) — Angular 19 PWA offline-first

## Arranque rápido

### Base de datos (Docker)

```bash
docker start colombiadepie-pg
# o la primera vez:
# docker run -d --name colombiadepie-pg -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=colombiadepie -p 5432:5432 postgres:16-alpine
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

API: `http://localhost:3000`

### Frontend

```bash
cd frontend
npm install
npm start
```

App: `http://localhost:4200`

## Contribuir

¿Quieres colaborar? Lee [CONTRIBUTING.md](./CONTRIBUTING.md): setup local, convenciones y cómo abrir un Pull Request.

Convenciones para agentes/editores: [`.cursor/skills/`](./.cursor/skills/README.md).

## SEO (producción)

1. Pon el dominio real en `frontend/src/environments/environment.prod.ts` → `siteUrl`.
2. Actualiza la misma URL en `frontend/public/robots.txt`, `frontend/public/sitemap.xml`, `frontend/public/llms.txt` e `index.html` (canonical / og:url).
3. Tras el deploy, envía el sitemap en [Google Search Console](https://search.google.com/search-console) y valida JSON-LD en [Rich Results Test](https://search.google.com/test/rich-results).
4. Páginas pensadas para búsqueda: `/`, `/ayuda-humanitaria`, `/ayudar`, `/puntos/nuevo`, `/albergues/{municipio}`.
