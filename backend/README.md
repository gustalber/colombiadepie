# Colombia de Pie — Backend

Plataforma de coordinación de albergues y emparejamiento de necesidades (respuesta a desastre).

## Stack

- Node.js + Express + Sequelize
- PostgreSQL
- Serverless Framework (AWS Lambda + API Gateway)

## Requisitos

- Node.js 20+
- PostgreSQL 14+
- Serverless Framework CLI (`npm i -g serverless` o `npx sls`) para deploy/offline

## Setup

1. Copia las variables de entorno:

```bash
cd backend
cp .env.example .env
```

2. Ajusta `.env`:
   - **Local (`npm run dev`)**: `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
   - **Neon (deploy)**: `DATABASE_URL_DEV`, `DATABASE_URL_STAGING`, `DATABASE_URL_PROD` — solo la del stage se inyecta en Lambda; `DB_*` **no** se sube

3. Crea la base de datos:

```bash
createdb colombiadepie
# o con psql:
# psql -U postgres -c "CREATE DATABASE colombiadepie;"
```

4. Instala dependencias:

```bash
npm install
```

5. Corre migraciones y seed de ejemplo:

```bash
npm run migrate
npm run db:seed
```

6. Arranca el servidor:

```bash
npm run dev
# o: npm start
```

Health check: `GET http://localhost:3000/health`

### Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Servidor HTTP local con `--watch` (`bin/index.js`) |
| `npm start` | Arranque local sin watch |
| `npm run sls:dev` | API con `serverless-offline` (puerto 3000) |
| `npm run sls:deploy:dev` | Deploy stage `dev` |
| `npm run sls:deploy:staging` | Deploy stage `staging` |
| `npm run sls:deploy:prod` | Deploy stage `prod` |
| `npm run domain:create:dev` | Crea custom domain (ACM + Route53) para `dev` |
| `npm run logs:app:dev` | Tail de logs Lambda `app` en `dev` |
| `npm run migrate` | Aplica migraciones pendientes |
| `npm run migrate:dev` | Migraciones en local (`DB_*`) |
| `npm run migrate:staging` | Migraciones en Neon staging (`DATABASE_URL_STAGING`) |
| `npm run migrate:prod` | Migraciones en Neon prod (`DATABASE_URL_PROD`) |
| `npm run migrate:undo` | Revierte la última migración |
| `npm run migrate:undo:staging` | Revierte última migración en staging |
| `npm run migrate:undo:prod` | Revierte última migración en prod |
| `npm run migrate:undo:all` | Revierte todas las migraciones (incluye DROP de ENUMs) |
| `npm run migrate:status` | Estado de migraciones |
| `npm run migrate:status:dev` | Estado en local |
| `npm run migrate:status:staging` | Estado en Neon staging |
| `npm run migrate:status:prod` | Estado en Neon prod |
| `npm run db:seed` | Ejecuta seeders |

### Serverless

Express se envuelve con `serverless-http` en `bin/index.js`. Deploy usa el profile AWS **`colombiadepie`** (`provider.profile` + `AWS_PROFILE` en los scripts).

1. Configura el profile: `aws configure --profile colombiadepie` y verifica con `aws sts get-caller-identity --profile colombiadepie`.
2. En `.env`: `DB_*` para local; `DATABASE_URL_PROD` (y `_DEV` / `_STAGING` si aplica) para Neon. Al hacer deploy solo sube la URL del stage, no tus credenciales locales.
3. Migraciones prod contra Neon: `npm run migrate:prod` (usa `DATABASE_URL_PROD`).
4. Primera vez con dominio: `npm run domain:create:dev` y luego `npm run sls:deploy:dev`.
5. Local con emulación Lambda: `npm run sls:dev` (usa `DATABASE_URL_DEV` en Lambda offline).

Nota: las evidencias en `uploads/` son filesystem local; en Lambda el disco es efímero (habrá que mover a S3 si se despliega en producción).

## Auth (JWT)

`POST /auth/login` con body `{ "email", "password" }` → `{ data: { token, user } }`.

Usar el token en rutas protegidas:

```http
Authorization: Bearer <token>
```

Usuarios demo (password: `Password123!`) — **solo local** (`npm run db:seed`):

| Email | Rol |
|-------|-----|
| `coordinador@colombiadepie.local` | coordinador |
| `verificador@colombiadepie.local` | verificador |
| `responsable@colombiadepie.local` | responsable_albergue (Coliseo Municipal) |
| `oferente@colombiadepie.local` | oferente |

### Primer coordinador en producción (Neon)

En prod **no** corras `db:seed`. Crea el admin con:

```bash
cd backend
BOOTSTRAP_ADMIN_EMAIL=coordinador@ejemplo.com \
BOOTSTRAP_ADMIN_PASSWORD='tu-contraseña-segura' \
BOOTSTRAP_ADMIN_NOMBRE='Nombre Coordinador' \
npm run bootstrap:admin:prod
```

Requisitos: `DATABASE_URL_PROD` en `.env`. La contraseña debe tener **mínimo 10 caracteres**.

Si el usuario ya existe y olvidaste la clave:

```bash
BOOTSTRAP_ADMIN_EMAIL=coordinador@ejemplo.com \
BOOTSTRAP_ADMIN_PASSWORD='nueva-contraseña' \
BOOTSTRAP_RESET_PASSWORD=true \
npm run bootstrap:admin:prod
```

**Responsables de albergue** no se crean así: el coordinador los crea desde el detalle del albergue (una vez verificado).

Variables: `JWT_SECRET`, `JWT_EXPIRES_IN` (default `12h`).

## Endpoints (PuntoDemanda)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/puntos` | Público | Lista (filtros: `municipio`, `estado`, `limit`, `offset`) |
| GET | `/puntos/:id` | Público | Detalle + necesidades abiertas |
| POST | `/puntos` | coordinador, responsable_albergue | Crear (dedup 409) |
| PUT/PATCH | `/puntos/:id` | coordinador, responsable_albergue | Actualizar |
| DELETE | `/puntos/:id` | coordinador | Eliminar |
| PATCH | `/puntos/:id/verificar` | coordinador, verificador | Marcar verificado |

## Endpoints (Necesidad)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/puntos/:puntoId/necesidades` | coordinador, responsable_albergue, verificador | Lista (filtros: `estado`, `categoria`, `urgencia`) |
| GET | `/puntos/:puntoId/necesidades/:id` | idem | Detalle |
| POST | `/puntos/:puntoId/necesidades` | coordinador, responsable_albergue | Crear |
| PUT/PATCH | `/puntos/:puntoId/necesidades/:id` | coordinador, responsable_albergue | Actualizar |
| PATCH | `/puntos/:puntoId/necesidades/:id/estado` | coordinador, responsable_albergue | Cambiar estado |
| DELETE | `/puntos/:puntoId/necesidades/:id` | coordinador, responsable_albergue | Eliminar |
| PATCH | `/necesidades/:id/verificar` | coordinador, verificador | Marcar verificado |

## Endpoints (Oferta)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/ofertas` | Público | "Puedo ayudar" (no devuelve contacto) |
| GET | `/ofertas` | coordinador, verificador | Lista (filtros: `categoria`, `estado`) |
| GET | `/ofertas/:id` | coordinador, verificador | Detalle |
| PUT/PATCH | `/ofertas/:id` | coordinador | Actualizar |
| PATCH | `/ofertas/:id/estado` | coordinador | Cambiar estado |
| DELETE | `/ofertas/:id` | coordinador | Eliminar |

## Endpoints (Emparejamiento)

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/emparejamientos` | coordinador | Lista (filtros: `estado`, `necesidad_id`, `oferta_id`) |
| GET | `/emparejamientos/:id` | coordinador | Detalle con necesidad y oferta |
| POST | `/emparejamientos` | coordinador | Emparejar necesidad ↔ oferta |
| PUT/PATCH | `/emparejamientos/:id` | coordinador | Actualizar |
| PATCH | `/emparejamientos/:id/estado` | coordinador | Cambiar estado |
| DELETE | `/emparejamientos/:id` | coordinador | Eliminar |

Al crear/cambiar estado de emparejamiento se sincroniza:
- `propuesto` / `confirmado` / `en_camino` → necesidad `en_camino`, oferta `comprometida`
- `entregado` → necesidad `cubierta`, oferta `entregada`
- `cancelado` → oferta vuelve a `disponible` (si no hay otros matches activos); necesidad `abierta` si estaba `en_camino`

Notas:
- `responsable_contacto` y `oferente_contacto` no se exponen en respuestas públicas (solo rol `coordinador`).
- Cada albergue incluye `sin_confirmar: true` si ni su ficha ni ninguna necesidad se han actualizado en más de 10 horas.
- JWT: `POST /auth/login` + header `Authorization: Bearer <token>`.
- `responsable_albergue` solo accede a su `punto_id`.
- Emparejamiento exige misma `categoria` entre necesidad y oferta.
## Esquema (tablas)

- `r_puntos_demanda` — albergues / nodos de demanda
- `r_usuarios` — usuarios con roles JWT
- `r_necesidades` — necesidades por punto
- `r_ofertas` — ofertas de ayuda
- `r_emparejamientos` — join necesidad ↔ oferta con historial de estado

Convenciones: PK UUID (UUIDV4 a nivel de app), columnas `snake_case`, timestamps `created_at` / `updated_at`, ENUMs nativos de Postgres. Arquitectura: Route → Controller → Repository → Model.
