# Vercel Deployment Guide for Mind-Mesh

This guide provides step-by-step instructions for deploying the Mind-Mesh application to Vercel.

## Architecture Overview

Mind-Mesh consists of two parts:
- **Client (Frontend)**: React + Vite application
- **Server (Backend)**: Node.js + Express API

## Deployment Options

### Option 1: Full Vercel Deployment (Recommended for Testing)
Deploy both frontend and backend to Vercel using serverless functions.

### Option 2: Hybrid Deployment (Recommended for Production)
- Frontend on Vercel
- Backend on a dedicated service (Railway, Render, Heroku, or VPS)

---

## Option 1: Full Vercel Deployment

### Step 1: Prepare the Backend for Serverless

Create `server/api/index.js` (Vercel serverless entry point):

```javascript
import app from '../index.js'

export default app
```

Update `server/index.js` to export the app instead of calling `listen`:

```javascript
// At the end of server/index.js, change from:
// app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))

// To:
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`))
}

export default app
```

### Step 2: Create Vercel Configuration

Create `vercel.json` in the **root** directory:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "client/package.json",
      "use": "@vercel/static-build",
      "config": {
        "distDir": "client/dist"
      }
    },
    {
      "src": "server/api/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/api/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/client/$1"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Step 3: Configure Environment Variables

Create `.env.example` files for reference:

**Root `.env.example`:**
```env
# No env vars needed at root
```

**`server/.env.example`:**
```env
# AI API Keys
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
DEEPSEEK_API_KEY=your_deepseek_key_here
AIML_API_KEY=your_aiml_key_here

# Server Configuration
PORT=4000
NODE_ENV=production
```

**`client/.env.example`:**
```env
VITE_API_URL=/api
```

### Step 4: Update Client API URL

Ensure `client/.env.production` uses relative path:

```env
VITE_API_URL=/api
```

### Step 5: Deploy to Vercel

#### Using Vercel CLI:

1. Install Vercel CLI:
```bash
npm install -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

3. Deploy from root directory:
```bash
vercel --prod
```

4. Set environment variables:
```bash
vercel env add GEMINI_API_KEY
vercel env add GROQ_API_KEY
vercel env add DEEPSEEK_API_KEY
vercel env add AIML_API_KEY
```

#### Using Vercel Dashboard:

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: Leave as root (`.`)
   - **Build Command**: `npm run build` (will be auto-detected)
   - **Output Directory**: `client/dist`
5. Add Environment Variables in Settings → Environment Variables
6. Deploy!

---

## Option 2: Hybrid Deployment (Frontend on Vercel, Backend Separate)

### Step 1: Deploy Backend to Railway/Render/Heroku

#### Railway Deployment:

1. Go to [railway.app](https://railway.app)
2. Create new project from GitHub repo
3. Select the `server` folder as root
4. Add environment variables
5. Deploy
6. Copy the deployed URL (e.g., `https://your-app.railway.app`)

#### Render Deployment:

1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect GitHub repo
4. Configure:
   - **Root Directory**: `server`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Add environment variables
6. Deploy
7. Copy the deployed URL

### Step 2: Deploy Frontend to Vercel

Create `vercel.json` in **client** directory:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

Create `client/.env.production`:

```env
VITE_API_URL=https://your-backend-url.railway.app
```

Deploy client:

```bash
cd client
vercel --prod
```

Or use Vercel Dashboard:
1. New Project
2. Select GitHub repo
3. Configure:
   - **Root Directory**: `client`
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Add `VITE_API_URL` environment variable
5. Deploy

---

## Environment Variables Reference

### Required for Server:

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `GEMINI_API_KEY` | Google Gemini API key | [Google AI Studio](https://makersuite.google.com/app/apikey) |
| `GROQ_API_KEY` | Groq API key | [Groq Console](https://console.groq.com) |
| `DEEPSEEK_API_KEY` | DeepSeek API key | [DeepSeek Platform](https://platform.deepseek.com) |
| `AIML_API_KEY` | AIML API key | [AIML API](https://aimlapi.com) |

### Optional for Client:

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:4000` |

---

## Important Caveats & Limitations

### Vercel Serverless Limitations:

1. **10-second timeout** for serverless functions (Hobby plan)
   - Summarization might timeout for large documents
   - Consider Pro plan (60s timeout) or use Option 2

2. **Limited cold start performance**
   - First request may be slow
   - Backend services have better cold start

3. **File upload size limits**
   - Vercel: 4.5 MB request body limit
   - May need external storage for large files

4. **No persistent file system**
   - Uploads are stored in `/tmp` (temporary)
   - Use cloud storage (Cloudinary, S3) for production

### CORS Configuration:

If using Option 2 (separate backend), update `server/index.js` CORS:

```javascript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3001', 
    'https://your-vercel-app.vercel.app'
  ],
  credentials: true
}))
```

---

## Testing Deployment

### Test Endpoints:

1. **Health Check**: `https://your-app.vercel.app/health`
2. **Frontend**: `https://your-app.vercel.app`
3. **API**: `https://your-app.vercel.app/api/summarize` (POST)

### Test API with cURL:

```bash
curl -X POST https://your-app.vercel.app/api/summarize \
  -H "Content-Type: application/json" \
  -d '{"text": "Test document content here", "provider": "gemini", "summaryStyle": "short"}'
```

---

## Troubleshooting

### Build Fails:

1. Check Node.js version compatibility
2. Clear Vercel cache: `vercel --force`
3. Verify all dependencies are in `package.json`

### API Timeout:

1. Reduce document size
2. Use faster AI providers (Groq)
3. Upgrade Vercel plan or use Option 2

### CORS Errors:

1. Add your Vercel domain to CORS whitelist
2. Check `VITE_API_URL` is correctly set
3. Ensure API routes start with `/api`

### Environment Variables Not Working:

1. Redeploy after adding env vars
2. Check variable names match exactly
3. Use Vercel dashboard to verify

---

## Production Checklist

- [ ] All environment variables set
- [ ] API keys validated and working
- [ ] CORS configured for production domain
- [ ] Rate limiting configured
- [ ] Error handling tested
- [ ] Large file uploads tested
- [ ] Mobile responsiveness verified
- [ ] Analytics/monitoring setup (optional)
- [ ] Custom domain configured (optional)

---

## Recommended: Option 2 for Production

For production use, we recommend **Option 2** (Hybrid Deployment):

**Pros:**
- ✅ No timeout issues
- ✅ Better performance
- ✅ More control over backend
- ✅ Can handle larger files
- ✅ Better for background jobs

**Why:**
- Document processing can take >10 seconds
- AI API calls need stable connections
- File uploads need reliable handling

---

## Getting Help

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **Vercel Support**: [vercel.com/support](https://vercel.com/support)
- **GitHub Issues**: Report deployment issues in the repo

---

## Next Steps

After deployment:
1. Test all features thoroughly
2. Monitor error rates and performance
3. Set up custom domain (optional)
4. Configure analytics (optional)
5. Set up monitoring/alerts (optional)

---

**Happy Deploying! 🚀**
