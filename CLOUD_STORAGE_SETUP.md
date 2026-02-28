# ☁️ Cloud Storage Setup Guide

Store your videos in Google Cloud Storage instead of locally! This keeps your site fast and handles large video collections easily.

## Benefits

✅ **No local storage needed** - Videos stored in Google's cloud  
✅ **Fast global CDN** - Quick streaming anywhere in the world  
✅ **Unlimited capacity** - Store hundreds of episodes  
✅ **Automatic fallback** - Uses local storage if cloud isn't configured  
✅ **Easy sharing** - Public URLs work from anywhere

## Quick Setup (15 minutes)

### Step 1: Create Google Cloud Account

1. Go to https://console.cloud.google.com/
2. Sign in or create a free account
3. **Free tier includes:**
   - 5GB free storage per month
   - First 1GB/month egress free
   - Perfect for testing!

### Step 2: Create a New Project

1. Click **"Select a project"** → **"New Project"**
2. Name it: `rick-morty-stream` (or anything you like)
3. Click **"Create"**

### Step 3: Create Storage Bucket

1. Go to **Cloud Storage** → **Buckets**
2. Click **"Create Bucket"**
3. Configure:
   - **Name**: `rick-morty-episodes-[yourname]` (must be globally unique)
   - **Location**: Choose your region or "Multi-region" for global
   - **Storage class**: Standard
   - **Access control**: Fine-grained
4. Click **"Create"**

### Step 4: Make Bucket Public

1. Go to your bucket → **Permissions** tab
2. Click **"Grant Access"**
3. Add:
   - **New principals**: `allUsers`
   - **Role**: `Storage Object Viewer`
4. Click **"Save"** → **"Allow Public Access"**

⚠️ **Note**: This makes uploaded videos publicly accessible via URL. Only use for content you have rights to share.

### Step 5: Create Service Account

1. Go to **IAM & Admin** → **Service Accounts**
2. Click **"Create Service Account"**
3. Details:
   - **Name**: `video-uploader`
   - **Description**: "Uploads videos to storage bucket"
4. Click **"Create and Continue"**
5. **Grant permissions**:
   - Role: `Storage Object Admin`
6. Click **"Continue"** → **"Done"**

### Step 6: Generate Credentials

1. Find your new service account in the list
2. Click the **⋮** (three dots) → **"Manage keys"**
3. Click **"Add Key"** → **"Create new key"**
4. Choose **JSON** format
5. Click **"Create"**
6. A JSON file will download - **save it safely!**

### Step 7: Add to Your Project

1. Open the downloaded JSON file in a text editor
2. **Copy the entire contents** (it's one long JSON object)
3. Open/create `.env.local` in your project root
4. Add these lines:

```env
# Google Cloud Storage Configuration
GOOGLE_CLOUD_BUCKET_NAME=your-bucket-name-here
GOOGLE_CLOUD_CREDENTIALS={"type":"service_account","project_id":"your-project",...}
```

**Important:**
- Replace `your-bucket-name-here` with your actual bucket name
- Paste the ENTIRE JSON content on one line for `GOOGLE_CLOUD_CREDENTIALS`
- Keep the quotes around the JSON

### Step 8: Restart Your Server

```bash
# Stop current server (Ctrl+C)
npm run dev
```

## ✅ Verification

After restarting, upload a video through the admin panel. You should see:

- Console message: `✅ Uploaded to Google Cloud Storage: https://...`
- Videos appear as public URLs in `lib/videoSources.ts`
- Episodes stream from Google's CDN

## How It Works

1. **Upload via admin panel** → Video goes to Google Cloud Storage
2. **Public URL generated** → `https://storage.googleapis.com/your-bucket/videos/episode-1.mp4`
3. **URL saved** → Automatically added to `videoSources.ts`
4. **Stream anywhere** → Videos accessible via fast CDN

## Fallback Behavior

If cloud storage isn't configured:
- ✅ Videos still work
- ✅ Automatically saves locally to `public/videos/`
- ✅ No errors or failures
- ⚠️ Uses your local disk space

## Cost Estimates

**Google Cloud Storage Pricing (2024):**
- **Storage**: $0.02/GB per month
- **Free tier**: First 5GB free
- **Bandwidth**: First 1GB/month free, then varies by region

**Example for 50 episodes (500MB each = 25GB):**
- Storage: ~$0.50/month (25GB × $0.02)
- Bandwidth: Depends on views (usually minimal for private use)

**For 100+ episodes:**
- ~$1-2/month typical cost
- Still much cheaper than video hosting services!

## Troubleshooting

**"Cloud storage not configured" message:**
- Check `.env.local` exists in project root
- Verify `GOOGLE_CLOUD_CREDENTIALS` is valid JSON on one line
- Restart dev server after adding credentials

**"Upload failed" errors:**
- Check service account has `Storage Object Admin` role
- Verify bucket name is correct
- Ensure bucket is in the same project as service account

**Videos not playing:**
- Make sure bucket is public (see Step 4)
- Check CORS settings if needed (usually automatic)
- Verify video URLs in browser

**Credentials errors:**
- JSON must be on ONE line in `.env.local`
- No line breaks in the credentials string
- Keep all quotes and braces intact

## Security Best Practices

1. **Never commit `.env.local`** - Already in `.gitignore`
2. **Keep service account JSON safe** - Don't share publicly
3. **Limit bucket permissions** - Only make videos public, not bucket metadata
4. **Consider signed URLs** - For private content (advanced)
5. **Monitor usage** - Check Google Cloud console for costs

## Alternative: Local Storage

Prefer to keep videos local? Just don't add cloud credentials:
- Videos save to `public/videos/`
- Works perfectly for small collections
- No cloud costs
- Simpler setup

## Need Help?

Check out:
- [Google Cloud Storage Docs](https://cloud.google.com/storage/docs)
- [Service Account Guide](https://cloud.google.com/iam/docs/service-accounts)
- Your project console: https://console.cloud.google.com/

Happy streaming! 🎬☁️
