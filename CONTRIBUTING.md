# Guía de contribución

Gracias por ayudar a **Colombia de Pie**. Este proyecto conecta albergues, necesidades abiertas y ofertas de ayuda en contextos de desastre. Las contribuciones son bienvenidas: correcciones, mejoras de UX, accesibilidad, documentación y nuevas funcionalidades alineadas con ese propósito.

## Antes de empezar

1. Revisa si ya existe un [issue](../../issues) relacionado con tu idea o bug.
2. Para cambios grandes (nueva feature, refactor amplio, cambio de esquema), abre un issue primero y comenta el enfoque. Así evitamos trabajo duplicado.
3. Lee el [README](./README.md) y, según toques backend o frontend, los README de [`backend/`](./backend/README.md) y [`frontend/`](./frontend/README.md).

## Entorno local

### Requisitos

- Node.js 20+
- Docker (recomendado para PostgreSQL local)
- npm

### Base de datos

```bash
docker start colombiadepie-pg
# primera vez:
# docker run -d --name colombiadepie-pg \
#   -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres \
#   -e POSTGRES_DB=colombiadepie -p 5432:5432 postgres:16-alpine
```

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run migrate
npm run db:seed
npm run dev
```

API en `http://localhost:3000`. Health check: `GET /health`.

Usuarios demo tras el seed (password: `Password123!`):

| Email | Rol |
|-------|-----|
| `coordinador@colombiadepie.local` | coordinador |
| `verificador@colombiadepie.local` | verificador |
| `responsable@colombiadepie.local` | responsable_albergue |
| `oferente@colombiadepie.local` | oferente |

### Frontend

```bash
cd frontend
npm install
npm start
```

App en `http://localhost:4200` (apunta al API local en el puerto 3000).

### Verificar tu cambio

```bash
# Backend — build de arranque sin errores
cd backend && npm run dev

# Frontend — build de producción
cd frontend && npm run build:prod
```

No hay suite de tests automatizada aún; describe en el PR cómo probaste el cambio manualmente.

## Flujo de trabajo (Pull Request)

1. **Fork** del repositorio (si no tienes acceso directo de escritura).
2. Crea una rama desde `main`:
   ```bash
   git checkout -b fix/descripcion-corta
   # o: feat/nombre-feature
   ```
3. Haz commits **pequeños y enfocados** (un propósito por commit cuando sea posible).
4. Push a tu fork y abre un **Pull Request** hacia `main`.
5. En la descripción del PR incluye:
   - **Qué** cambia y **por qué**
   - **Cómo probarlo** (pasos concretos)
   - Capturas o GIF si es cambio de UI
   - Migraciones nuevas, si aplica
   - Riesgos o limitaciones conocidas

Los mantenedores revisarán el PR. Puede haber comentarios; no hace falta que esté perfecto en el primer intento.

## Convenciones de código

Guías detalladas para agentes y contribuidores en [`.cursor/skills/`](./.cursor/skills/README.md).

### Backend (Express + Sequelize)

Arquitectura obligatoria por componente:

```
Route → Controller → Repository → Model
```

- Nuevos endpoints: carpeta en `backend/src/components/<nombre>/` con `*.routes.js`, `*.controller.js`, `*.repository.js`, `*.model.js`.
- Migraciones en `backend/src/migrations/` con timestamp `YYYYMMDDHHMMSS-descripcion.js`.
- Columnas y tablas en `snake_case`; PK UUID.
- No expongas datos sensibles en rutas públicas (`responsable_contacto`, `oferente_contacto`, etc.). Revisa `backend/src/utils/privacy.js`.

### Frontend (Angular 19)

- Componentes **standalone**; preferir **signals** y `computed` donde encaje.
- Textos de interfaz en **español**, tono claro y directo (usuarios bajo estrés / baja conectividad).
- Estilos globales reutilizables en `frontend/src/styles.scss`; evita duplicar patrones de formulario (`.field`, `.btn`, `.panel`).
- No subas secretos ni URLs de prod en commits; usa `environment.ts` local y `.env` / `.env.deploy` (gitignored).

### General

- Cambios **mínimos**: no mezcles refactor no relacionado con el objetivo del PR.
- No incluyas `.env`, credenciales, dumps de BD ni archivos generados (`node_modules`, `dist`, uploads de evidencias).
- Respeta la licencia [Apache 2.0](./LICENSE).

## Cambios en base de datos

1. Crea migración Sequelize reversible cuando sea posible (`up` / `down`).
2. Si el cambio afecta la API, actualiza el frontend en el mismo PR (o documenta por qué no aplica).
3. En el PR indica si hay que correr `npm run migrate` en staging/prod.

## Seguridad y datos reales

- No uses datos personales reales en seeds, capturas o logs del PR.
- Reporta vulnerabilidades de forma **privada** a los mantenedores del repo (no abras un issue público con detalles explotables).
- Cuidado con XSS, subida de archivos y permisos por rol (`coordinador`, `verificador`, `responsable_albergue`).

## Deploy y producción

Los colaboradores externos **no necesitan** credenciales AWS para contribuir. Deploy a Lambda/S3/CloudFront lo hacen los mantenedores tras merge.

No incluyas en el PR:

- IDs de cuenta AWS, ARNs, tokens, `DATABASE_URL_*` de producción
- Cambios solo de configuración de infra de un entorno concreto sin valor para el resto del equipo

## Código de conducta

Sé respetuoso y constructivo. Este proyecto sirve a personas en situación de emergencia; priorizamos claridad, accesibilidad y confiabilidad por encima de perfeccionismo estético.

## ¿Dudas?

Abre un issue con la etiqueta que corresponda o comenta en un PR existente. Si no estás seguro de si una idea encaja, pregunta antes de invertir muchas horas.

---

¡Gracias por sumarte a Colombia de Pie!
