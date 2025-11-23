# 🖼️ Automatic Episode Thumbnails Setup

Your site now automatically fetches episode screenshots from TMDB (The Movie Database)!

## Quick Setup (5 minutes)

### Step 1: Get Free TMDB API Key

1. Go to https://www.themoviedb.org/signup
2. Create a free account
3. Verify your email
4. Go to **Settings** → **API** → **Request an API Key**
5. Choose **"Developer"** option
6. Fill out the form (use your site URL or just put "Personal Project")
7. Copy your API key

### Step 2: Add API Key to Your Project

1. Create a file named `.env.local` in your project root:
   ```bash
   # In c:/Users/User/Desktop/site/
   ```

2. Add this line to `.env.local`:
   ```
   NEXT_PUBLIC_TMDB_API_KEY=your_actual_api_key_here
   ```

3. Replace `your_actual_api_key_here` with the key you copied

### Step 3: Restart Your Server

```bash
# Stop the current server (Ctrl+C)
# Then restart:
npm run dev
```

## How It Works

✅ **Automatic fetching**: Episode cards now automatically fetch official screenshots from TMDB
✅ **High quality**: 500px wide images, perfect for thumbnails  
✅ **Cached**: Images are cached for 24 hours to save API calls
✅ **Fallback**: If an image isn't found, uses a placeholder
✅ **Free tier**: 40,000 API requests per day (way more than you need)

## What You'll See

- **Beautiful episode cards** with official screenshots
- **Hover effect** with play button overlay
- **Episode badges** showing S##E## codes
- **Professional look** like Netflix/Hulu

## Without API Key

If you don't add the API key, the site will still work but show placeholder images instead of real screenshots.

## Alternative: Manual Thumbnails

If you prefer to use your own thumbnails:

1. Create a `thumbnails` folder in `public/`
2. Add images named by episode ID: `1.jpg`, `2.jpg`, etc.
3. Edit `lib/episodeThumbnails.ts` to map them:
   ```typescript
   export const episodeThumbnails: Record<string, string> = {
     "1": "/thumbnails/1.jpg",
     "2": "/thumbnails/2.jpg",
     // ...
   };
   ```

## Troubleshooting

**Images not loading?**
- Check that `.env.local` exists and has the correct API key
- Restart the dev server after adding `.env.local`
- Check console for errors

**Rate limited?**
- Free tier allows 40,000 requests/day
- Images are cached, so you shouldn't hit this limit
- If you do, upgrade to paid TMDB plan (very cheap)

**Wrong images?**
- TMDB uses Rick and Morty series ID: 60625
- Should match correctly for seasons 1-7
- Season 8 images might be limited since it's new

Enjoy your professional-looking streaming site! 🎬
