# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

**Frontend** (in `frontend/`):
```bash
npm run dev      # dev server on port 5173
npm run build    # production build
npm run preview  # preview production build
```

**Backend** (in `backend/`):
```bash
npm run dev   # nodemon watch mode
npm start     # node server.js
```

Backend listens on port 3002. Copy `backend/env.example` to `backend/.env` for local setup.

## Architecture

**Frontend**: Vue 3 SPA (Vite, Pinia, Element Plus, Vue Router)  
**Backend**: Express.js REST API, SQLite via Sequelize ORM, Aliyun OSS for file storage

The production frontend is built and served as static files by the Express backend. In development, Vite proxies API calls to `localhost:3002`.

### Key backend structure
- `server.js` — Express app entry, class-based `Server`
- `routes/` — route registration (materials, feedback, visits, auth, drawer-config, proxy)
- `controllers/` — request handlers
- `services/MaterialService.js` — OSS upload/delete, CDN URL generation
- `models/` — Sequelize models (Material, Feedback, Visit, DrawerConfig)
- `config/sequelize.js` — SQLite at `backend/database/drawer_config.db`

### Key frontend structure
- `src/views/Gallery.vue` — main product gallery, ~2400 lines; uses `shallowRef` for large arrays for performance
- `src/views/ColorCard.vue` — color swatch card generator
- `src/router/index.js` — routes, JWT guard for `/admin/*`, visit tracking in `afterEach`, 30s heartbeat
- `src/stores/` — Pinia stores (material, feedback, user)
- `src/axiosConfig.js` — axios instance with base URL from `VITE_API_BASE_URL`
- `src/composables/useApi.js` — wraps API calls with loading/error state; prefer this over raw axios in components

## Important Patterns

**OSS vs local storage**: `MaterialService` uploads to Aliyun OSS when `ALI_OSS_*` env vars are set; falls back to local `backend/uploads/` otherwise. Both modes return the same API shape.

**CDN URL transformation**: OSS URLs (`*.aliyuncs.com`) are rewritten to the CDN domain `assets.fangdutex.cn`. Backend: `MaterialService.generateThumbnailUrl()` uses `CDN_BASE_URL` env var. Frontend: `toCdnUrl()` in Gallery.vue does the same regex replace. Thumbnail OSS processing params: `?x-oss-process=image/resize,m_fill,w_300,quality,q_80`.

**Auth**: JWT stored in `localStorage` as `authToken`. Admin routes have a `beforeEnter` guard. Backend uses Bearer token middleware.

**Visit deduplication**: Same session within 5 minutes counts as one visit. When debugging stats appearing too low, check `VisitService` dedup logic before suspecting tracking bugs.

**Timezone**: SQLite always stores UTC. CST (UTC+8) range queries use:
```sql
datetime('now', '+8 hours', 'start of day', '-8 hours')
```

**Environment files**:
- `frontend/.env.development` and `.env.production` — Vite vars (prefix `VITE_`)
- `backend/.env` — copied from `env.example`; key vars: `CDN_BASE_URL`, `ALI_OSS_*`, `JWT_SECRET`, `ADMIN_USERNAME/PASSWORD`

## Design System

Primary green accent: `#5a8f73` (muted sage), dark base: `#0a3d22`  
Standard gradient: `linear-gradient(135deg, #0a3d22, #5a8f73)`  
Avoid purple or AI-generic color schemes anywhere in the UI.
