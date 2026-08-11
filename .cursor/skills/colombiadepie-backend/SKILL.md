---
name: colombiadepie-backend
description: >-
  Backend Colombia de Pie: Express + Sequelize con capas Route → Controller →
  Repository → Model en backend/src/components/. Usar siempre que se cree o
  modifique API, CRUD, módulos, endpoints, modelos o migraciones en este repo.
  Obliga a evaluar si hace falta migración Sequelize antes de cerrar el cambio.
---

# Colombia de Pie — Backend

Stack: Node 20+, Express, Sequelize, PostgreSQL. Código en `backend/src/`.

## Arquitectura obligatoria (4 capas)

```
backend/src/components/<nombre>/
├── <nombre>.routes.js      # HTTP: métodos, paths, middlewares
├── <nombre>.controller.js  # Validación, reglas de negocio, respuestas JSON
├── <nombre>.repository.js  # ÚNICO acceso a Sequelize (queries)
└── <nombre>.model.js       # define() + asociaciones
```

| Capa | Sí | No |
|------|----|----|
| **Route** | Montar router, auth middleware | Lógica de negocio, queries |
| **Controller** | Validar input, HTTP status, orquestar repo | `findAll`/`create` directo |
| **Repository** | Queries Sequelize puras | `req`/`res`, reglas de negocio |
| **Model** | Campos, tipos, hooks de dato | Lógica de aplicación |

Montar rutas nuevas en `backend/src/app.js`.

Convenciones del repo:
- Tablas prefijo `r_` (ej. `r_puntos_demanda`, `r_necesidades`)
- Columnas `snake_case`; timestamps `created_at` / `updated_at`
- PK UUID (`DataTypes.UUID`, default UUIDV4)
- Respuestas JSON: `{ data: ... }` o `{ error: '...' }`
- Rutas públicas: sanitizar con `backend/src/utils/privacy.js` (no filtrar contactos a anónimos)

## Checklist de migraciones (OBLIGATORIO)

Antes de dar por terminado un cambio de backend, **decidir explícitamente** si hace falta migración.

### Sí → crear migración en `backend/src/migrations/`

- Nueva tabla
- Nueva columna, índice o constraint
- Cambio de tipo, ENUM, nullable, default
- Renombrar tabla/columna
- Datos iniciales que deben existir en todos los entornos (considerar seeder vs migración)

Nombre: `YYYYMMDDHHMMSS-descripcion-kebab.js` (timestamp posterior al último archivo en `migrations/`).

Plantilla:

```javascript
'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ...
  },

  async down(queryInterface, Sequelize) {
    // revertir up cuando sea posible
  },
};
```

Tras crear migración, indicar en el PR: `npm run migrate` (local) y si aplica staging/prod.

### No → documentar por qué

- Solo lógica en controller/repository sin cambio de esquema
- Fix de validación, permisos, formato JSON
- Refactor sin alterar BD

### Verificación local

```bash
cd backend
npm run migrate:status
npm run migrate
npm run dev
```

Si agregas ENUM o categorías, revisa también `backend/src/constants/categorias.js`.

## Flujo para un endpoint nuevo

1. **Model** — campos y `tableName: 'r_...'`, `underscored: true`
2. **Migración** — si la tabla/columna no existe aún
3. **Repository** — métodos de datos (`findById`, `findAndCountAll`, etc.)
4. **Controller** — validación + llamadas al repository
5. **Routes** — verbos HTTP + `auth.middleware` según rol
6. **app.js** — `app.use('/ruta', routes)`
7. **README backend** — tabla de endpoints si es ruta pública relevante

## Auth y roles

Middleware: `backend/src/middlewares/auth.middleware.js`.

Roles: `coordinador`, `verificador`, `responsable_albergue`, `oferente`.

`responsable_albergue` solo opera sobre su `punto_id`.

## Privacidad

No exponer en respuestas públicas: `responsable_contacto`, `oferente_contacto`, tokens, hashes.

Reutilizar `sanitizeForViewer` / `sanitizeListForViewer` de `utils/privacy.js`.

## Qué no hacer

- SQL crudo salvo último recurso (preferir Sequelize)
- Commitear `.env` o URLs de producción
- Subir archivos en `uploads/` (gitignored; en Lambda el disco es efímero)
- Mezclar capas o poner queries en el controller

## Referencias en el repo

- Ejemplo completo: `backend/src/components/necesidades/`
- Migraciones: `backend/src/migrations/`
- Seed demo (solo local): `npm run db:seed`
