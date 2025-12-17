# Deployment Guide

This guide will help you deploy the AllSports application to production.

## 🌐 Production URLs

- **Frontend**: `https://allsports.sedx3d.com`
- **Backend API**: `https://api.sedx3d.com`

## 📋 Prerequisites

1. Node.js (v18 or higher)
2. Nginx (for reverse proxy)
3. PM2 or similar process manager (recommended)
4. SSL certificates (Let's Encrypt recommended)
5. Firebase service account key (`backend/private-key.json`)
6. Stripe account with API keys

## 🚀 Deployment Steps

### 1. Frontend Deployment

#### Build the Frontend

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

The build output will be in the `dist/` directory.

#### Nginx Configuration for Frontend

Create or update your Nginx configuration at `/etc/nginx/sites-available/allsports.sedx3d.com`:

```nginx
server {
    listen 80;
    server_name allsports.sedx3d.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name allsports.sedx3d.com;

    ssl_certificate /etc/letsencrypt/live/allsports.sedx3d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/allsports.sedx3d.com/privkey.pem;

    root /var/www/allsports/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Serve static files
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

#### Environment Variables for Frontend

Create a `.env` file in the project root (copy from `.env.example`):

```env
VITE_API_BASE_URL=https://api.sedx3d.com
VITE_STRIPE_PRICE_BASIC=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx
VITE_STRIPE_PRICE_PREMIUM=price_xxxxxxxxxxxxx
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxxxxxxxxxx
```

**Important**: After updating `.env`, rebuild the frontend:
```bash
npm run build
```

### 2. Backend Deployment

#### Environment Variables for Backend

Create a `.env` file in the project root (copy from `backend/.env.example`):

```env
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://allsports.sedx3d.com
ALLOWED_ORIGINS=https://allsports.sedx3d.com
STRIPE_SECRET_KEY=sk_live_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
GEMINI_API_KEY=your_gemini_api_key_here
```

#### Install Dependencies and Start Backend

```bash
cd backend
npm install --production
npm start
```

#### Using PM2 (Recommended)

```bash
# Install PM2 globally
npm install -g pm2

# Start the backend with PM2
cd backend
pm2 start index.js --name allsports-backend

# Save PM2 configuration
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

#### Nginx Configuration for Backend API

Create or update your Nginx configuration at `/etc/nginx/sites-available/api.sedx3d.com`:

```nginx
server {
    listen 80;
    server_name api.sedx3d.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.sedx3d.com;

    ssl_certificate /etc/letsencrypt/live/api.sedx3d.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.sedx3d.com/privkey.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Increase body size limit for image uploads
    client_max_body_size 10M;

    # Proxy to Node.js backend
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

#### Enable Nginx Sites

```bash
# Create symlinks
sudo ln -s /etc/nginx/sites-available/allsports.sedx3d.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.sedx3d.com /etc/nginx/sites-enabled/

# Test Nginx configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### 3. SSL Certificates

Install SSL certificates using Let's Encrypt:

```bash
# Install Certbot
sudo apt-get update
sudo apt-get install certbot python3-certbot-nginx

# Get certificates
sudo certbot --nginx -d allsports.sedx3d.com
sudo certbot --nginx -d api.sedx3d.com

# Auto-renewal is set up automatically
```

### 4. Stripe Webhook Configuration

1. Go to [Stripe Dashboard](https://dashboard.stripe.com) → **Developers** → **Webhooks**
2. Click **Add endpoint**
3. **Endpoint URL**: `https://api.sedx3d.com/api/subscriptions/webhook`
4. **Events to send**:
   - `checkout.session.completed`
   - `invoice.paid` ⭐ **CRITICAL** (credits reset here!)
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add it to your backend `.env` file as `STRIPE_WEBHOOK_SECRET`

### 5. Firebase Configuration

1. Ensure `backend/private-key.json` is present with your Firebase service account credentials
2. The storage bucket will be auto-detected, or set `FIREBASE_STORAGE_BUCKET` in `.env`

### 6. Verify Deployment

1. **Frontend**: Visit `https://allsports.sedx3d.com`
2. **Backend API**: Test with `curl https://api.sedx3d.com/api/health` (if health endpoint exists)
3. **Stripe Webhooks**: Test by creating a subscription and checking backend logs

## 🔧 Troubleshooting

### Backend not accessible
- Check if backend is running: `pm2 list` or `ps aux | grep node`
- Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
- Check backend logs: `pm2 logs allsports-backend`
- Verify firewall allows port 3001 (if not using Nginx proxy)

### CORS errors
- Verify `ALLOWED_ORIGINS` in backend `.env` includes `https://allsports.sedx3d.com`
- Check backend logs for CORS warnings

### Stripe webhooks not working
- Verify webhook URL in Stripe Dashboard matches `https://api.sedx3d.com/api/subscriptions/webhook`
- Check webhook signing secret in backend `.env`
- Test webhook delivery in Stripe Dashboard → Webhooks → Your endpoint → Recent events

### Frontend can't connect to backend
- Verify `VITE_API_BASE_URL` in frontend `.env` is `https://api.sedx3d.com`
- Rebuild frontend after changing `.env`: `npm run build`
- Check browser console for CORS or network errors

## 📝 Environment Variables Summary

### Frontend (`.env` in project root)
- `VITE_API_BASE_URL` - Backend API URL
- `VITE_STRIPE_PRICE_BASIC` - Stripe Basic plan price ID
- `VITE_STRIPE_PRICE_PRO` - Stripe Pro plan price ID
- `VITE_STRIPE_PRICE_PREMIUM` - Stripe Premium plan price ID
- `VITE_STRIPE_PUBLISHABLE_KEY` - Stripe publishable key (optional)

### Backend (`.env` in project root)
- `PORT` - Backend port (default: 3001)
- `NODE_ENV` - Environment (production/development)
- `FRONTEND_URL` - Frontend URL for redirects
- `ALLOWED_ORIGINS` - Comma-separated list of allowed CORS origins
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `GEMINI_API_KEY` - Google Gemini API key
- `FIREBASE_STORAGE_BUCKET` - Firebase storage bucket (optional, auto-detected)

## 🔐 Security Checklist

- [ ] SSL certificates installed and auto-renewing
- [ ] `.env` files are not committed to git (already in `.gitignore`)
- [ ] `backend/private-key.json` is not committed to git (already in `.gitignore`)
- [ ] Using production Stripe keys (not test keys)
- [ ] CORS is properly configured
- [ ] Nginx security headers are set
- [ ] Backend is running behind Nginx (not directly exposed)
- [ ] Firewall is configured properly

## 📞 Support

For issues or questions, check:
- Backend logs: `pm2 logs allsports-backend`
- Nginx logs: `/var/log/nginx/error.log`
- Stripe webhook logs: Stripe Dashboard → Webhooks → Your endpoint




