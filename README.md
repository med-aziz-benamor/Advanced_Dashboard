# AdvancedDashboard

Enterprise Kubernetes AIOps Control Center with JWT Authentication, Prometheus/Grafana Integration, and AI Chatbot Support

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Client                         │
│            http://localhost:8088                 │
└─────────────────┬───────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────┐
│              Nginx (Port 8088)                   │
│  ┌───────────────────────────────────────────┐  │
│  │  Static Files → /usr/share/nginx/html/    │  │
│  │  (React Frontend)                         │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │  Reverse Proxy → /api/* → api:8000       │  │
│  └───────────────────────────────────────────┘  │
└─────────────────┬───────────────────────────────┘
                  │ /api/*
                  ▼
┌─────────────────────────────────────────────────┐
│         FastAPI Backend (Port 8000)              │
│              Python 3.11                         │
└─────────────────────────────────────────────────┘
```

## 📁 Project Structure

```
AdvancedDashboard/
├── frontend/                    # React + Vite + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   └── BackendStatus.tsx
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── README.md
├── nginx/                       # Nginx configuration
│   ├── Dockerfile
│   └── nginx.conf
├── tests/                       # Backend tests
│   ├── __init__.py
│   └── test_api_smoke.py
├── main.py                      # FastAPI application
├── config.py                    # Backend configuration
├── requirements.txt             # Python dependencies
├── Dockerfile                   # Backend Docker image
├── docker-compose.yml           # Orchestration
└── README.md                    # This file
```

## 🚀 Quick Start

### Prerequisites
- **Production**: Docker 20+ & Docker Compose 2+
- **Development**: Python 3.11+, Node.js 18+, npm 9+

### Option 1: Development Mode (Hot Reload)

**Terminal 1 - Backend:**
```bash
# Install dependencies
pip install -r requirements.txt

# Create .env file (or copy from .env.example)
cp .env.example .env
# Edit .env and set your SECRET_KEY

# Run FastAPI backend
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend

# Install dependencies
npm install

# Create .env.development (or copy from .env.example)
cp .env.example .env.development
# Edit .env.development if needed

# Run Vite dev server
npm run dev
```

Access:
- **Frontend**: http://localhost:5175
- **Backend API**: http://localhost:8000

### Option 2: Production with Docker (Recommended)

```bash
# Configure environment
cp .env.example .env
nano .env  # Edit SECRET_KEY and other variables

# Build and start all services
docker compose up --build -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

Access:
- **Application**: http://localhost:8088
- **API Health**: http://localhost:8088/api/health

### Test Credentials

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Admin** | admin@example.com | admin123 | Full access (users, audit logs, settings) |
| **Operator** | operator@example.com | operator123 | Monitoring, analytics, reports |
| **Viewer** | viewer@example.com | viewer123 | Read-only dashboards |

### First Login

1. Navigate to http://localhost:8088 (or :5175 in dev mode)
2. Login with admin credentials
3. Explore:
   - **Dashboard**: Resource overview, health metrics
   - **Analytics**: Time-series charts, cost analysis
   - **Audit**: Admin-only access logs
   - **Settings**: User preferences, external integrations

### Environment Variables

**Backend (.env):**
```env
# CRITICAL: Generate secure key for production!
SECRET_KEY=your-secret-key-here  # Use: openssl rand -hex 32

# JWT token expiration (minutes)
ACCESS_TOKEN_EXPIRE_MINUTES=60

# Data source mode: 'auto', 'prometheus', or 'demo'
DATA_MODE=auto

# Prometheus endpoint (if using Prometheus data source)
PROMETHEUS_BASE_URL=http://192.168.1.211:30090
```

**Frontend (.env.development / .env.production):**
```env
# Backend API URL
VITE_API_BASE_URL=http://localhost:8000  # Dev mode
# VITE_API_BASE_URL=/api  # Production (Nginx proxy)

# External integrations
VITE_PROMETHEUS_URL=http://192.168.1.211:30090
VITE_GRAFANA_URL=http://192.168.1.211:30382

# Chatbase AI chatbot (optional)
VITE_CHATBASE_ENABLED=true
VITE_CHATBASE_ID=your-chatbase-id
```

See [.env.example](.env.example) and [frontend/.env.example](frontend/.env.example) for full documentation.

## ✨ Features

### Authentication & Authorization
- **JWT-based authentication** with secure token management
- **Role-based access control (RBAC)**: Admin, Operator, Viewer
- **Protected routes** with automatic redirection
- **Password hashing** with bcrypt (cost factor: 12)
- **Token expiration** and refresh handling

### Dashboard & Analytics
- **Real-time metrics** from Prometheus or demo data source
- **Time-series charts** with Recharts visualization
- **Resource monitoring**: CPU, memory, storage, network
- **Cost analysis** and trend tracking
- **Health status** indicators and alerts

### External Integrations
- **Prometheus monitoring** with auto-detection and fallback
- **Grafana dashboards** quick access (admin/operator only)
- **Chatbase AI chatbot** for user assistance (optional)
- **Integration health monitoring** with live status badges

### Administration
- **User management** (admin only)
- **Audit logs** with activity tracking (admin/operator)
- **Settings management** with external integrations panel
- **Data source mode** switching (auto/prometheus/demo)

### Technical Features
- **Responsive design** with Tailwind CSS soft-dark theme
- **Hot-reload development** for rapid iteration
- **Docker deployment** with multi-stage builds
- **Environment-based configuration** for dev/prod
- **Health checks** and monitoring endpoints
- **CORS enabled** with secure defaults
- **Nginx reverse proxy** for production deployment

## 📦 Services

### Frontend (`frontend/`)
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Features**: 
  - Enterprise soft-dark theme
  - Backend health status monitoring
  - Real-time API integration
  - Responsive design

[See frontend/README.md for detailed documentation](frontend/README.md)

### Backend (`main.py`)
- **Framework**: FastAPI
- **Language**: Python 3.11
- **Features**:
  - RESTful API
  - Health check endpoint
  - CORS enabled
  - File upload support

### Nginx (`nginx/`)
- **Version**: 1.25 Alpine
- **Role**: 
  - Serves frontend static files
  - Reverse proxy for backend API
  - Request routing
  - Static asset caching

## 🔌 API Endpoints

### Health Check
```bash
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "provider": "openstack",
  "cluster": "production",
  "version": "1.0.0",
  "timestamp": "2026-02-17T10:30:00Z"
}
```

### Other Endpoints
See `main.py` for complete API documentation.

## 🐳 Docker Services

### `frontend-builder`
Builds the React application to static files.

- **Image**: `node:20-alpine`
- **Output**: `dist/` directory (stored in Docker volume)
- **Runs**: `npm install && npm run build`

### `api`
FastAPI backend service.

- **Image**: Custom (built from `Dockerfile`)
- **Port**: 8000 (internal)
- **Health Check**: `curl localhost:8000/api/health`

### `nginx`
Web server and reverse proxy.

- **Image**: Custom (built from `nginx/Dockerfile`)
- **Port**: 8088:80 (host:container)
- **Volumes**: Mounts `frontend-dist` volume
- **Depends On**: `frontend-builder` + `api`

## 🔧 Configuration

### Environment Variables

Backend (`api` service):
```yaml
MAX_UPLOAD_SIZE_MB: 100
TEMP_DIR: /tmp
LOG_LEVEL: info
```

### Ports

- **8088**: Nginx (main application entry point)
- **8000**: FastAPI backend (internal only)
- **5173**: Vite dev server (development only)

## 🛠️ Development Workflow

### Making Frontend Changes

```bash
# Option A: Use Vite dev server (hot reload)
cd frontend
npm run dev
# Edit files in frontend/src/
# Changes appear instantly at http://localhost:5173

# Option B: Test with full stack
docker compose up --build
# Wait for rebuild (slower but tests full integration)
```

### Making Backend Changes

```bash
# Option A: Local development
uvicorn app.main:app --reload
# Changes auto-reload

# Option B: Docker
docker compose up --build api
```

### Nginx Configuration Changes

```bash
# Edit nginx/nginx.conf
# Rebuild nginx service
docker compose up --build nginx
```

## 📊 How Frontend Reaches Backend

### Development Mode (Vite Dev Server)
1. Frontend runs on `localhost:5173`
2. Vite proxy intercepts `/api/*` requests
3. Proxies to `http://localhost:8088/api/*`
4. Nginx forwards to backend `api:8000`

Configured in `frontend/vite.config.ts`:
```typescript
proxy: {
  '/api': {
    target: 'http://localhost:8088',
    changeOrigin: true,
  },
}
```

### Production Mode (Docker Compose)
1. User visits `http://localhost:8088`
2. Nginx serves React app from `/usr/share/nginx/html/`
3. React app makes fetch to `/api/health`
4. Nginx proxies `/api/*` to `http://api:8000/*`
5. FastAPI backend responds

Configured in `nginx/nginx.conf`:
```nginx
location /api {
    proxy_pass http://api_backend;
    # ... proxy headers
}
```

## 🧪 Testing

### Frontend Tests
```bash
cd frontend
npm run lint
```

### Backend Tests
```bash
pytest
```

## 📋 Prerequisites

### For Docker (Recommended)
- Docker 20+
- Docker Compose 2+

### For Local Development
- **Frontend**: Node.js 18+, npm 9+
- **Backend**: Python 3.11+, pip

## 🐛 Troubleshooting

### Authentication Issues

**Can't login with test credentials:**
```bash
# Check backend logs
docker compose logs api | grep -i auth

# Verify users exist
curl http://localhost:8088/api/health
```

**Token expired errors:**
- Default expiration is 60 minutes
- Logout and login again to get a new token
- Adjust `ACCESS_TOKEN_EXPIRE_MINUTES` in `.env` if needed

**Protected routes redirect to login:**
- Verify token is stored in localStorage
- Check browser console for authentication errors
- Clear localStorage and login again

### Integration Issues

**Chatbase widget not loading:**
- Check `VITE_CHATBASE_ENABLED=true` in frontend `.env` file
- Verify `VITE_CHATBASE_ID` is set correctly
- Check browser console for script loading errors

**Prometheus/Grafana links not showing:**
- Links only visible to admin and operator roles
- Login with admin@example.com or operator@example.com
- Check TopBar dropdown (lightning bolt icon)

**Prometheus shows "Unreachable":**
- Verify `PROMETHEUS_BASE_URL` in backend `.env`
- Test connectivity: `curl http://192.168.1.211:30090/api/v1/status/config`
- Set `DATA_MODE=demo` to use demo data as fallback

### Frontend not loading
```bash
# Check if nginx is serving files
docker compose logs nginx

# Verify frontend was built
docker compose logs frontend-builder

# Check volume contents
docker compose exec nginx ls -la /usr/share/nginx/html/
```

### API requests failing
```bash
# Check backend health
curl http://localhost:8088/api/health

# Check nginx config
docker compose exec nginx nginx -t

# View error logs
docker compose logs api
```

### Port already in use
```bash
# Find process using port 8088
sudo lsof -i :8088

# Or change port in docker-compose.yml
# Update NGINX_PORT environment variable
```

### Clean rebuild
```bash
# Remove all containers, volumes, and images
docker compose down -v
docker system prune -a

# Fresh build
docker compose up --build
```

## 🚀 Deployment

### Ubuntu Server Deployment

For complete Ubuntu 22.04 LTS deployment instructions, see [DEPLOYMENT.md](DEPLOYMENT.md).

Quick overview:
```bash
# Install Docker
curl -fsSL https://get.docker.com | sh

# Clone repository
git clone https://github.com/med-aziz-benamor/Advanced_Dashboard.git
cd Advanced_Dashboard

# Configure environment
cp .env.example .env
nano .env  # Set SECRET_KEY and other variables

# Deploy
docker compose up --build -d
```

### Production Checklist

- [ ] Change `SECRET_KEY` in `.env` (use `openssl rand -hex 32`)
- [ ] Set `DATA_MODE` to `auto` or `prometheus`
- [ ] Update `PROMETHEUS_BASE_URL` to your instance
- [ ] Configure firewall (ufw) to allow port 8088
- [ ] Setup HTTPS with reverse proxy or Let's Encrypt
- [ ] Configure backup strategy
- [ ] Setup log rotation
- [ ] Monitor resource usage (`docker stats`)
- [ ] Test all user roles and permissions
- [ ] Review security headers in nginx.conf

### Scaling Considerations

1. **Environment Variables**: Use secrets management (Docker secrets, Vault)
2. **HTTPS**: Add SSL/TLS termination to Nginx
3. **Orchestration**: Deploy to Kubernetes for high availability
4. **Logging**: Configure centralized logging (ELK, Loki)
5. **Monitoring**: Add Prometheus scraping and Grafana dashboards
6. **Database**: Migrate from in-memory to PostgreSQL/MongoDB
7. **Caching**: Add Redis for session management and caching

### Build for Production

```bash
# Build production images
docker compose build

# Tag images
docker tag advanceddashboard-nginx:latest registry.example.com/advanceddashboard-nginx:1.0.0
docker tag advanceddashboard-api:latest registry.example.com/advanceddashboard-api:1.0.0

# Push to registry
docker push registry.example.com/advanceddashboard-nginx:1.0.0
docker push registry.example.com/advanceddashboard-api:1.0.0
```

## 📝 Roadmap

### ✅ Completed
- [x] React Router with multi-page navigation
- [x] JWT authentication and RBAC
- [x] Protected routes with role-based access
- [x] Prometheus/Grafana integration with UI links
- [x] Chatbase AI chatbot integration
- [x] Environment-based configuration
- [x] Docker deployment with docker-compose
- [x] Ubuntu deployment documentation

### 🔜 Planned Features
- [ ] Real-time WebSocket updates for live metrics
- [ ] Persistent database (PostgreSQL/MongoDB)
- [ ] Advanced user management (password reset, 2FA)
- [ ] Custom alerting and notifications
- [ ] E2E tests (Playwright/Cypress)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Kubernetes manifests for cloud deployment
- [ ] Multi-cluster support
- [ ] Advanced analytics with ML predictions

## 📄 License

Enterprise Internal Use

---

**Built with ❤️ for Enterprise AIOps**
