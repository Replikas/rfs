# 🚀 Wispbyte Deployment Guide

Deploy your Rick and Morty streaming site to Wispbyte hosting.

## Before You Start

**What's Being Deployed:**
- Your streaming site (Next.js app)
- Admin panel for managing episodes
- Episode catalog with thumbnails

**What You'll Need Later:**
- Cloud storage for videos (Cloudflare R2 recommended)
- For now, videos can use local storage (limited space)

---

## Step 1: Prepare Your Project

### 1.1 Create Production Build

```bash
npm run build
```

This creates an optimized production version of your site.

### 1.2 Test Production Locally

```bash
npm start
```

Visit http://localhost:3000 to make sure everything works.

---

## Step 2: Deploy to Wispbyte

### 2.1 Sign Up for Wispbyte

1. Go to https://wispbyte.com/
2. Click "Sign Up" or "Get Started"
3. Create your account (free tier available)

### 2.2 Create New Project

1. Log into Wispbyte dashboard
2. Click "Create New Project" or "New Application"
3. Choose **"Node.js"** or **"Web Application"**

### 2.3 Upload Your Code

**Option A: Git Deploy (Recommended if available)**
1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR-USERNAME/rick-morty-stream.git
git push -u origin main
```
2. Connect GitHub repo in Wispbyte dashboard

**Option B: File Upload**
1. Zip your entire project folder
2. Upload through Wispbyte panel
3. Extract in the project directory

### 2.4 Configure Build Settings

In Wispbyte project settings:

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm start
```

**Node Version:**
- Select Node.js **18.x** or **20.x** (latest LTS)

**Port:**
- `3000` (Next.js default)

---

## Step 3: Environment Variables

Add these in Wispbyte's environment variables section:

### Required:
```env
NEXT_PUBLIC_TMDB_API_KEY=02269a98332ab91c6579fa12ef995e5a
NODE_ENV=production
```

### Optional (Add when you set up cloud storage):
```env
CLOUDFLARE_ACCOUNT_ID=your-account-id
CLOUDFLARE_R2_ACCESS_KEY_ID=your-key
CLOUDFLARE_R2_SECRET_ACCESS_KEY=your-secret
CLOUDFLARE_R2_BUCKET_NAME=rick-morty-videos
```

---

## Step 4: Deploy!

1. Click **"Deploy"** or **"Start Application"**
2. Wait for build to complete (2-5 minutes)
3. Your site will be live at: `your-app.wispbyte.app` (or similar)

---

## Step 5: Access Your Site

### Your Live URLs:

**Main Site:**
```
https://your-app.wispbyte.app
```

**Admin Panel:**
```
https://your-app.wispbyte.app/admin
```

**Test Episode Page:**
```
https://your-app.wispbyte.app/watch/1
```

---

## 📹 Video Storage Options

### Current Setup (Local Storage):
- ⚠️ Videos save to Wispbyte server
- Limited space (check Wispbyte limits)
- Good for testing only

### Recommended: Add Cloudflare R2
Once you're ready to upload episodes:

1. Follow `CLOUDFLARE_R2_SETUP.md` (15 min)
2. Add R2 credentials to Wispbyte environment variables
3. Redeploy your app
4. Upload videos → They go to R2 cloud automatically!

**Cost:** ~$1.50/month for 100GB storage

---

## 🔧 Troubleshooting

### Build Fails:
**Error:** "Module not found"
- Run `npm install` locally first
- Make sure `package.json` is in root directory
- Check Node.js version matches (18.x or 20.x)

### Site Shows 404:
- Check start command is `npm start`
- Verify port is set to `3000`
- Look at Wispbyte logs for errors

### Thumbnails Not Loading:
- Make sure `NEXT_PUBLIC_TMDB_API_KEY` is set
- Restart application after adding environment variables

### Admin Panel Not Working:
- Check that file upload limits allow video files
- Verify write permissions on server
- Consider using cloud storage instead of local

---

## 📊 After Deployment Checklist

✅ **Site loads** at your Wispbyte URL  
✅ **Home page shows** all seasons and episodes  
✅ **Thumbnails load** from TMDB  
✅ **Admin panel accessible** at `/admin`  
✅ **Can navigate** through episodes  

⚠️ **Video Upload**:
- Test uploading one small video first
- Check Wispbyte storage limits
- Set up cloud storage before uploading full library

---

## 🚀 Next Steps

### Now:
1. Test your deployed site
2. Share URL with friends
3. Upload 1-2 test episodes

### Soon:
1. Set up Cloudflare R2 storage (recommended)
2. Bulk upload your episode collection
3. Enjoy unlimited streaming!

---

## 💡 Pro Tips

**Custom Domain:**
- Check if Wispbyte supports custom domains
- Point `stream.yourdomain.com` to your Wispbyte app

**Automatic Updates:**
- Connect GitHub for automatic deployments
- Push to main branch → Wispbyte auto-deploys

**Monitoring:**
- Check Wispbyte dashboard for:
  - CPU/Memory usage
  - Storage space used
  - Bandwidth consumption

**Storage Warning:**
- 50-100GB needed for all episodes
- If Wispbyte limits are low, use R2 from day 1
- It's cheaper anyway (~$1.50/month vs server costs)

---

## 📞 Need Help?

**Wispbyte Support:**
- Discord: Check Wispbyte website
- Docs: https://wispbyte.com/docs (if available)

**Your Site Issues:**
- Check `SETUP.md` for general site info
- See `CLOUDFLARE_R2_SETUP.md` for storage setup

Good luck with your deployment! 🎬
