# Docker Deployment Guide

This guide explains how to build and run the AllSports application using Docker.

## 📋 Prerequisites

- Docker installed (version 20.10 or higher)
- Docker Compose installed (version 2.0 or higher)
- `.env` file configured with all required variables
- `backend/private-key.json` file (Firebase service account key)

## 🚀 Quick Start

### 1. Prepare Environment

Make sure you have:
- `.env` file in the project root (copy from `.env.example`)
- `backend/private-key.json` file with your Firebase credentials

### 2. Build and Run with Docker Compose

```bash
# Build and start both services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 3. Access the Application

- **Frontend**: http://localhost:5004
- **Backend API**: http://localhost:5001

## 🐳 Building Individual Services

### Build Frontend Only

```bash
docker build -f Dockerfile.frontend -t allsports-frontend .
docker run -p 5004:5004 allsports-frontend
```

### Build Backend Only

```bash
docker build -f Dockerfile.backend -t allsports-backend .
docker run -p 5001:5001 -v $(pwd)/.env:/app/.env:ro -v $(pwd)/backend/private-key.json:/app/private-key.json:ro allsports-backend
```

## 📝 Environment Variables

The Docker setup uses the `.env` file from the project root. Make sure it contains:

```env
# Frontend
VITE_API_BASE_URL=http://localhost:5001

# Backend
PORT=5001
FRONTEND_URL=http://localhost:5004
ALLOWED_ORIGINS=http://localhost:5004
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
GEMINI_API_KEY=...
```

**Note**: For production, update `VITE_API_BASE_URL` and `FRONTEND_URL` to your production domains.

## 🔧 Docker Compose Commands

```bash
# Start services in background
docker-compose up -d

# Start services with logs
docker-compose up

# Stop services
docker-compose down

# Rebuild and restart
docker-compose up -d --build

# View logs
docker-compose logs -f
docker-compose logs -f frontend
docker-compose logs -f backend

# Execute command in container
docker-compose exec backend sh
docker-compose exec frontend sh

# Remove containers and volumes
docker-compose down -v
```

## 🏗️ Production Deployment

### 1. Update Environment Variables

Update `.env` with production values:

```env
VITE_API_BASE_URL=https://api.sedx3d.com
FRONTEND_URL=https://allsports.sedx3d.com
ALLOWED_ORIGINS=https://allsports.sedx3d.com
NODE_ENV=production
```

### 2. Build Production Images

```bash
# Build both services
docker-compose build

# Or build individually
docker build -f Dockerfile.frontend -t allsports-frontend:latest .
docker build -f Dockerfile.backend -t allsports-backend:latest .
```

### 3. Tag and Push to Registry (Optional)

```bash
# Tag images
docker tag allsports-frontend:latest your-registry/allsports-frontend:latest
docker tag allsports-backend:latest your-registry/allsports-backend:latest

# Push to registry
docker push your-registry/allsports-frontend:latest
docker push your-registry/allsports-backend:latest
```

### 4. Run with Production Configuration

```bash
# Use production docker-compose file (if you create one)
docker-compose -f docker-compose.prod.yml up -d
```

## 🔍 Troubleshooting

### Frontend can't connect to backend

1. Check if backend is running: `docker-compose ps`
2. Verify `VITE_API_BASE_URL` in `.env` matches backend URL
3. Check backend logs: `docker-compose logs backend`
4. Ensure both services are on the same Docker network

### Backend can't find .env file

1. Verify `.env` file exists in project root
2. Check volume mount in `docker-compose.yml`
3. Verify file permissions

### Firebase private key not found

1. Ensure `backend/private-key.json` exists
2. Check volume mount in `docker-compose.yml`
3. Verify file permissions (should be readable)

### Port already in use

If ports 5004 or 5001 are already in use, update `docker-compose.yml`:

```yaml
ports:
  - "8080:5004"  # Use different host port
```

### Rebuild after code changes

```bash
# Rebuild and restart
docker-compose up -d --build

# Or rebuild specific service
docker-compose build frontend
docker-compose up -d frontend
```

## 📦 Image Sizes

- **Frontend**: ~50MB (nginx:alpine + built assets)
- **Backend**: ~150MB (node:18-alpine + dependencies)

## 🔐 Security Notes

1. **Never commit `.env` or `private-key.json`** to version control
2. Use Docker secrets or environment variables in production
3. Consider using a secrets management service (AWS Secrets Manager, HashiCorp Vault, etc.)
4. Keep base images updated for security patches

## 🧪 Development with Docker

For development, you might want to mount source code as volumes:

```yaml
# In docker-compose.yml (development)
volumes:
  - ./src:/app/src  # Hot reload for frontend
  - ./backend:/app  # Hot reload for backend
```

However, for production, use the built images as shown in the current setup.

## 📞 Support

- Check container logs: `docker-compose logs`
- Inspect container: `docker-compose exec backend sh`
- Check network: `docker network inspect allsports_allsports-network`


