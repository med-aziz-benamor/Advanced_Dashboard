# Ubuntu Server Deployment Guide

Complete guide to deploy AdvancedDashboard on Ubuntu 22.04 LTS.

## Prerequisites

- Ubuntu 22.04 LTS (fresh install)
- Root or sudo access
- Internet connection

## Step 1: Install Docker & Docker Compose

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install prerequisites
sudo apt install -y ca-certificates curl gnupg lsb-release

# Add Docker GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify installation
docker --version
docker compose version

# Add current user to docker group (optional - allows running docker without sudo)
sudo usermod -aG docker $USER
newgrp docker  # Or logout/login

# Test Docker
docker run hello-world
```

## Step 2: Clone Repository

```bash
# Install git if needed
sudo apt install -y git

# Clone repository
cd ~
git clone https://github.com/med-aziz-benamor/Advanced_Dashboard.git
cd Advanced_Dashboard
```

## Step 3: Configure Environment Variables

```bash
# Create .env file from example
cp .env.example .env

# Edit environment variables
nano .env
```

**Minimum required changes in `.env`:**
```env
# CRITICAL: Change this in production!
SECRET_KEY=$(openssl rand -hex 32)

# Prometheus endpoint (update if different)
PROMETHEUS_BASE_URL=http://192.168.1.211:30090

# Data source mode
DATA_MODE=auto  # Will use Prometheus if available, fallback to demo
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 4: Configure Firewall

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow application port
sudo ufw allow 8089/tcp

# Allow Prometheus & Grafana (if needed)
sudo ufw allow 30090/tcp  # Prometheus
sudo ufw allow 30382/tcp  # Grafana

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

## Step 5: Build and Deploy

```bash
# Build and start all services
docker compose up --build -d

# Check service status
docker compose ps

# View logs
docker compose logs -f

# Check specific service logs
docker compose logs api
docker compose logs nginx
```

## Step 6: Verify Deployment

```bash
# Test health endpoint
curl http://localhost:8088/api/health

# Expected output:
# {
#   "status": "healthy",
#   "provider": "kubernetes",
#   "cluster": "k8s-openstack",
#   "version": "1.0.0",
#   "timestamp": "2026-02-18T..."
# }

# Test login endpoint
curl -X POST http://localhost:8088/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'

# Expected: JWT token response
```

## Step 7: Access Application

Open browser to:
- **Application**: http://YOUR_SERVER_IP:8088
- **Login**: Use admin@example.com / admin123

## Updating the Application

```bash
cd ~/Advanced_Dashboard

# Pull latest changes
git pull

# Rebuild and restart
docker compose down
docker compose up --build -d

# Check logs
docker compose logs -f
```

## Monitoring & Maintenance

### View Logs
```bash
# All services
docker compose logs -f

# Last 100 lines from API
docker compose logs --tail=100 api

# Follow nginx logs
docker compose logs -f nginx
```

### Restart Services
```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart api
docker compose restart nginx
```

### Stop Services
```bash
# Stop all services
docker compose stop

# Stop and remove containers
docker compose down

# Stop and remove containers + volumes
docker compose down -v
```

### Cleanup
```bash
# Remove unused images
docker image prune -a

# Remove all unused resources
docker system prune -af

# WARNING: This removes ALL stopped containers, unused networks, images, and build cache
```

## Production Checklist

- [ ] Change `SECRET_KEY` in `.env`
- [ ] Set `DATA_MODE=auto` or `prometheus`
- [ ] Update `PROMETHEUS_BASE_URL` to your Prometheus instance
- [ ] Configure firewall (UFW) with proper rules
- [ ] Setup HTTPS with reverse proxy (Nginx/Caddy) or Let's Encrypt
- [ ] Configure backup strategy for data
- [ ] Setup log rotation
- [ ] Monitor resource usage (`docker stats`)
- [ ] Test all user roles (admin, operator, viewer)
- [ ] Review security headers in nginx.conf

## Troubleshooting

### Port 8088 already in use
```bash
# Find process
sudo lsof -i :8088

# Or use netstat
sudo netstat -tulpn | grep 8088

# Kill process (replace PID)
sudo kill -9 <PID>
```

### Docker build fails
```bash
# Clear everything and rebuild
docker compose down -v
docker system prune -af
docker compose up --build -d
```

### Can't connect to Prometheus
```bash
# Test from server
curl http://192.168.1.211:30090/api/v1/status/config

# Check if DATA_MODE is set correctly
docker compose exec api env | grep PROMETHEUS

# View API logs
docker compose logs api | grep -i prometheus
```

### Frontend shows white screen
```bash
# Check nginx logs
docker compose logs nginx

# Verify frontend build
docker compose exec nginx ls -la /usr/share/nginx/html

# Should show index.html and assets/
```

## Optional: Setup Reverse Proxy with SSL

If you want to use HTTPS with a domain name:

```bash
# Install Nginx on host (different from Docker Nginx)
sudo apt install -y nginx certbot python3-certbot-nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/dashboard

# Add configuration (replace yourdomain.com)
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8088;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Renew automatically
sudo certbot renew --dry-run
```

## Support

For issues, create a GitHub issue at:
https://github.com/med-aziz-benamor/Advanced_Dashboard/issues

---

**Deployment Complete! 🎉**
