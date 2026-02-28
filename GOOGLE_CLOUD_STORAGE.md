# Google Cloud Storage Setup (Optional)

If you want to use Google Cloud Storage instead of local storage for your videos, follow this guide.

## Why Use Google Cloud Storage?

- ✅ **Large storage** - Much more space than local hosting
- ✅ **Fast delivery** - Global CDN with fast streaming
- ✅ **Reliability** - 99.9% uptime guarantee
- ✅ **Free tier** - 5GB free storage per month

## Setup Steps

### 1. Create a Google Cloud Account

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (e.g., "Rick and Morty Stream")

### 2. Create a Storage Bucket

1. Navigate to **Cloud Storage** → **Buckets**
2. Click **Create Bucket**
3. Configure:
   - **Name**: Choose a unique name (e.g., `rick-morty-episodes-yourname`)
   - **Location**: Choose closest to you or "Multi-region" for global access
   - **Storage class**: Standard
   - **Access control**: Fine-grained
4. Click **Create**

### 3. Make Bucket Public (for streaming)

1. Go to your bucket → **Permissions** tab
2. Click **Grant Access**
3. Add:
   - **New principals**: `allUsers`
   - **Role**: `Storage Object Viewer`
4. Click **Save**

⚠️ **Warning**: This makes your videos publicly accessible. Only use for content you have rights to share.

### 4. Upload Videos

**Option A: Via Console (Manual)**
1. Go to your bucket
2. Click **Upload Files**
3. Select and upload your video files
4. Note the public URL for each file

**Option B: Using gsutil (Command Line)**
```bash
# Install Google Cloud SDK
# Then authenticate
gcloud auth login

# Upload a file
gsutil cp /path/to/video.mp4 gs://your-bucket-name/

# Upload multiple files
gsutil -m cp /path/to/videos/*.mp4 gs://your-bucket-name/
```

### 5. Get Video URLs

After uploading, your video URLs will be:
```
https://storage.googleapis.com/your-bucket-name/video-filename.mp4
```

### 6. Update Your Site

Edit `lib/videoSources.ts`:

```typescript
export const videoSources: Record<string, string> = {
  "1": "https://storage.googleapis.com/your-bucket-name/s01e01.mp4",
  "2": "https://storage.googleapis.com/your-bucket-name/s01e02.mp4",
  "3": "https://storage.googleapis.com/your-bucket-name/s01e03.mp4",
  // ... continue for all episodes
};
```

## Cost Estimates

**Google Cloud Storage Pricing (as of 2024):**
- **Storage**: $0.02/GB per month (Standard class)
- **Free tier**: First 5GB free
- **Network egress**: First 1GB/month free, then varies by location

**Example for Rick and Morty (all 71 episodes):**
- Assume ~500MB per episode = ~35GB total
- Storage cost: ~$0.70/month (35GB × $0.02)
- Bandwidth depends on viewership

## Advanced: Automatic Upload to Cloud

If you want the admin panel to upload directly to Google Cloud Storage instead of local storage, you'll need to:

1. Install the Google Cloud Storage SDK:
   ```bash
   npm install @google-cloud/storage
   ```

2. Set up authentication with a service account
3. Modify `app/api/upload/route.ts` to use the Cloud Storage API

This is more advanced and requires additional configuration. Let me know if you want help with this!

## Alternatives

- **AWS S3** - Similar to Google Cloud, slightly different pricing
- **Cloudflare R2** - No egress fees (best for high traffic)
- **Backblaze B2** - Cheapest storage option

## Tips

- **Compression**: Use H.264 codec for best compatibility
- **Quality**: 720p is usually sufficient for streaming
- **File size**: Aim for 200-500MB per episode for good quality
- **Naming**: Use consistent naming like `s01e01.mp4`, `s01e02.mp4`, etc.
