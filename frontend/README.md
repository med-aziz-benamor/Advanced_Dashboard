# AdvancedDashboard Frontend

Enterprise Kubernetes AIOps Control Center - React + Vite + TypeScript + Tailwind CSS

## 🚀 Quick Start

### Local Development (Frontend Only)

Run the frontend development server with hot-reload:

```bash
cd frontend
npm install
npm run dev
```

The dev server will start at `http://localhost:5173` and proxy API requests to `http://localhost:8088/api/*`.

**Prerequisites for local dev:**
- Node.js 18+ and npm
- Backend running on `http://localhost:8088` (or update proxy in `vite.config.ts`)

### Full Stack Development

Run both frontend and backend with Docker Compose:

```bash
# From the repository root
docker compose up --build
```

Access the application at: `http://localhost:8088`

## 📁 Project Structure

```
frontend/
├── src/
│   ├── components/
│   │   └── BackendStatus.tsx    # Backend health check component
│   ├── App.tsx                   # Main application component
│   ├── main.tsx                  # Application entry point
│   ├── index.css                 # Tailwind imports & global styles
│   └── vite-env.d.ts            # TypeScript environment definitions
├── public/                       # Static assets
├── index.html                    # HTML entry point
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind CSS configuration
└── postcss.config.js             # PostCSS configuration
```

## 🛠️ Available Scripts

- `npm run dev` - Start development server (hot reload)
- `npm run build` - Build for production (outputs to `dist/`)
- `npm run preview` - Preview production build locally
- `npm run lint` - Lint code with ESLint

## 🎨 Tech Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Utility-first CSS framework
- **ESLint** - Code linting

## 🔌 API Integration

The frontend communicates with the backend via `/api/*` endpoints.

### Development Mode
In dev mode, Vite proxies `/api/*` requests to `http://localhost:8088` (configured in `vite.config.ts`).

### Production Mode
In production (Docker), Nginx serves the frontend and proxies `/api/*` to the backend container.

### Example: Health Check

The `BackendStatus` component demonstrates API integration:

```typescript
const response = await fetch('/api/health')
const data = await response.json()
```

This calls the backend's `/api/health` endpoint and displays:
- Status (healthy/unhealthy)
- Provider information
- Cluster details
- Version info

## 🐳 Docker Deployment

The frontend is built and served via a multi-stage Docker Compose setup:

1. **Frontend Builder Service** - Builds the React app to static files (`dist/`)
2. **Nginx Service** - Serves the built frontend and proxies `/api/*` to the backend

### Build Process

```bash
# Build and start all services
docker compose up --build

# Rebuild just the frontend
docker compose up --build frontend-builder nginx
```

### How It Works

1. `frontend-builder` service installs dependencies and runs `npm run build`
2. Build output (`dist/`) is stored in a Docker volume (`frontend-dist`)
3. Nginx mounts the volume and serves files from `/usr/share/nginx/html`
4. Nginx proxies `/api/*` requests to the `api` service (FastAPI backend)

## 🎨 Design System

### Color Palette

- **Background**: Soft charcoal gradient (`charcoal-900` to `charcoal-800`)
- **Text**: Light gray (`gray-100`, `gray-200`, `gray-400`)
- **Borders**: Subtle charcoal borders (`charcoal-700`)
- **Cards**: Semi-transparent dark backgrounds with backdrop blur

### Custom Tailwind Colors

Extended charcoal color scale (50-950) defined in `tailwind.config.js`:

```javascript
colors: {
  'charcoal': {
    900: '#2f3136',
    800: '#36383e',
    700: '#3e4048',
    // ... more shades
  }
}
```

## 📦 Production Build

Build artifacts are optimized for production:

- Code splitting (vendor chunks)
- Tree shaking
- Minification
- Asset optimization

Build output location: `frontend/dist/`

## 🔧 Configuration

### Vite Config (`vite.config.ts`)

- Dev server port: `5173`
- API proxy: `/api` → `http://localhost:8088`
- Build output: `dist/`

### TypeScript Config

- Target: ES2020
- Module: ESNext
- Strict mode enabled
- React JSX transform

## 🚨 Troubleshooting

### API Requests Fail in Dev Mode

Ensure the backend is running on `http://localhost:8088` or update the proxy in `vite.config.ts`.

### Tailwind Classes Not Working

1. Verify `tailwind.config.js` content paths include your files
2. Ensure `index.css` imports Tailwind directives
3. Restart the dev server

### Docker Build Fails

```bash
# Clean volumes and rebuild
docker compose down -v
docker compose up --build
```

## 📝 Next Steps

Future enhancements planned:
- React Router for multi-page navigation
- Real-time cluster metrics visualization
- Chart libraries (Chart.js/Recharts)
- Advanced AIOps dashboards
- User authentication & authorization

---

**Enterprise Ready** | **Type Safe** | **Modern Stack**
