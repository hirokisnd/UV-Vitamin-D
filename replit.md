# replit.md

## Overview

UV Info is a mobile/web application that displays UV (ultraviolet) radiation data for weather stations across Japan. It shows vitamin D synthesis times, sunburn risk durations, and UV index information sourced from Japan's National Institute for Environmental Studies (NIES). The app supports Japanese language throughout and targets Japanese weather monitoring stations.

The project uses a dual architecture: an Expo/React Native frontend (supporting iOS, Android, and web) paired with an Express.js backend server. The backend scrapes/proxies UV data from NIES and serves it via a REST API, while the frontend displays the data with station selection, favorites, and pull-to-refresh functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (Expo / React Native)
- **Framework**: Expo SDK 54 with React Native 0.81, using the new architecture (`newArchEnabled: true`)
- **Routing**: expo-router with file-based routing (`app/` directory). Currently a single-screen app with `app/index.tsx` as the main screen
- **State Management**: TanStack React Query for server state/caching, React useState for local UI state
- **Persistence**: AsyncStorage for client-side preferences (favorite stations)
- **Styling**: React Native StyleSheet with a dark theme defined in `constants/colors.ts`. Uses expo-linear-gradient for gradient backgrounds
- **Fonts**: Noto Sans JP (400, 500, 700 weights) loaded via `@expo-google-fonts/noto-sans-jp`
- **Key UI Libraries**: react-native-gesture-handler, react-native-reanimated, react-native-safe-area-context, react-native-keyboard-controller, expo-haptics
- **API Communication**: Uses `expo/fetch` with a centralized API client in `lib/query-client.ts`. The base URL is derived from `EXPO_PUBLIC_DOMAIN` environment variable

### Backend (Express.js)
- **Framework**: Express 5 running on Node.js with TypeScript (compiled via tsx in dev, esbuild for production)
- **API Routes**: Defined in `server/routes.ts`. The main endpoint fetches UV data from NIES (Japan's National Institute for Environmental Studies) for specific weather stations
- **Data Source**: UV data is scraped/fetched from NIES JSON endpoints, not stored locally. The server acts as a proxy/transformer
- **CORS**: Dynamic CORS configuration supporting Replit domains and localhost for development
- **Static Serving**: In production, serves PWA web app from `server/templates/landing-page.html`, static PWA assets from `server/public/` (manifest.json, sw.js, pwa-icons)
- **PWA Support**: Full PWA with manifest.json, service worker (sw.js), maskable icons (192px, 512px), install banner, and offline caching. Explicit Express routes for `/manifest.json` and `/sw.js` to avoid proxy conflicts. Landing page IS the full web app (not just an Expo Go QR code page)
- **Storage Layer**: `server/storage.ts` defines an `IStorage` interface with a `MemStorage` implementation (in-memory). Currently only has user CRUD — the UV data is fetched on-demand, not persisted

### Database Schema (Drizzle ORM)
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema**: Defined in `shared/schema.ts` — currently only has a `users` table with `id` (UUID), `username`, and `password`
- **Validation**: Uses drizzle-zod for schema-to-Zod validation
- **Migration**: Drizzle Kit configured with `DATABASE_URL` env var; migrations output to `./migrations/`
- **Current State**: The database schema exists but the app's core functionality (UV data) doesn't use the database. The user system appears to be scaffolding that isn't fully integrated yet

### Build & Deployment
- **Development**: Two processes run concurrently — Expo dev server (`expo:dev`) and Express server (`server:dev`)
- **Production Build**: Custom build script (`scripts/build.js`) handles Expo static web export, then Express serves the built files
- **Server Build**: esbuild bundles `server/index.ts` to `server_dist/` for production
- **Environment**: Relies on Replit environment variables (`REPLIT_DEV_DOMAIN`, `REPLIT_INTERNAL_APP_DOMAIN`, `DATABASE_URL`)

### Key Design Decisions
- **Proxy Architecture**: The Express server proxies NIES data rather than caching it in a database, keeping the app simple but dependent on the external API's availability
- **Shared Types**: The `shared/` directory contains schema definitions used by both frontend and backend
- **In-Memory Storage**: Currently uses MemStorage instead of PostgreSQL for user data, though the Drizzle schema is ready for database migration via `db:push`
- **Multi-Platform**: Single codebase targets iOS, Android, and web. The web version includes PWA features (offline caching, installability)

## External Dependencies

### Third-Party Services
- **NIES (National Institute for Environmental Studies)**: Primary data source for UV radiation measurements across Japanese weather stations. Data is fetched in JSON format from NIES endpoints
- **Google Fonts CDN**: Noto Sans JP font loaded both via expo-font (native) and Google Fonts CDN (web landing page)

### Database
- **PostgreSQL**: Configured via `DATABASE_URL` environment variable. Drizzle ORM handles schema management. Currently the schema is minimal (users table only) and the app uses in-memory storage as the active implementation

### Key NPM Dependencies
- **expo** (~54.0.27): Core mobile framework
- **express** (^5.0.1): Backend HTTP server
- **drizzle-orm** (^0.39.3) + **drizzle-kit**: Database ORM and migration tooling
- **@tanstack/react-query** (^5.83.0): Data fetching and caching
- **cheerio** (^1.2.0): HTML parsing (likely for scraping NIES data)
- **pg** (^8.16.3): PostgreSQL client driver
- **zod**: Runtime type validation (via drizzle-zod)
- **http-proxy-middleware**: Development proxy support between Expo and Express servers