# Rick and Morty Stream - Setup Guide

A modern streaming platform to watch Rick and Morty episodes (Seasons 1-8) with your friends.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📹 Adding Video Files

### Method 1: Admin Upload Interface ⭐ (EASIEST!)

The site includes a built-in admin panel with **bulk upload** support!

1. **Access the admin panel:**
   - Click the "Admin" button in the top-right corner
   - Or navigate to `http://localhost:3000/admin`

2. **Upload multiple videos at once:**
   - Click "Select Video Files"
   - Hold **Ctrl** (Windows) or **Cmd** (Mac) to select multiple files
   - For each file, choose its corresponding episode from the dropdown
   - Click "Upload All" to upload everything at once!
   - Episodes become available immediately

**That's it!** Videos are stored in `public/videos/` and automatically mapped. You can upload entire seasons in minutes!

### Method 2: Manual File Upload

If you prefer to manually manage files:

1. Create a `videos` folder in the `public` directory:
   ```
   public/
   └── videos/
       ├── rick-and-morty-s01e01.mp4
       ├── rick-and-morty-s01e02.mp4
       └── ...
   ```

2. Update `lib/videoSources.ts` to map episode IDs to your video files:
   ```typescript
   export const videoSources: Record<string, string> = {
     "1": "/videos/rick-and-morty-s01e01.mp4",
     "2": "/videos/rick-and-morty-s01e02.mp4",
     // ... add all episodes
   };
   ```

### Method 3: External URLs (Cloud Storage)

For Google Cloud Storage, AWS S3, or other CDN:

```typescript
export const videoSources: Record<string, string> = {
  "1": "https://storage.googleapis.com/your-bucket/s01e01.mp4",
  "2": "https://your-cdn.com/s01e02.mp4",
};
```

## 🔍 Episode ID Reference

Episode IDs from the Rick and Morty API:
- Season 1: IDs 1-11
- Season 2: IDs 12-21
- Season 3: IDs 22-31
- Season 4: IDs 32-41
- Season 5: IDs 42-51
- Season 6: IDs 52-61
- Season 7: IDs 62-71
- (Note: API might have updated episode counts)

You can verify exact episode IDs by visiting your site - they're displayed on each episode card.

## 🌐 Hosting for Friends

### Development Server (Local Network)

1. Find your local IP address:
   ```bash
   # Windows
   ipconfig
   # Look for "IPv4 Address" (e.g., 192.168.1.100)
   ```

2. Run the dev server:
   ```bash
   npm run dev -- -H 0.0.0.0
   ```

3. Share with friends on the same network:
   ```
   http://YOUR-IP-ADDRESS:3000
   ```

### Production Deployment

For internet access, deploy to platforms like:
- **Vercel** (easiest - `vercel deploy`)
- **Netlify**
- **Your own server**

⚠️ **Important:** Ensure you have the legal rights to host and stream the content.

## 🎨 Customization

### Colors

Edit `app/globals.css` to change the theme:
```css
:root {
  --accent: #00b5cc;      /* Primary accent color */
  --accent-glow: #b2df28; /* Highlight color */
}
```

### Site Title

Edit the header in `app/page.tsx`

## 📁 Project Structure

```
├── app/
│   ├── page.tsx           # Home page (episode catalog)
│   ├── admin/page.tsx     # Admin upload interface
│   ├── watch/[id]/        # Video player pages
│   ├── api/
│   │   ├── upload/        # Video upload API
│   │   └── videos/        # Video list API
│   └── globals.css        # Global styles
├── components/
│   ├── EpisodeCard.tsx    # Episode preview card
│   └── SeasonSection.tsx  # Season grouping
├── lib/
│   ├── api.ts             # Rick and Morty API integration
│   └── videoSources.ts    # Video URL mappings
└── public/
    └── videos/            # Uploaded video files (auto-created)
```

## 🛠️ Tech Stack

- **Next.js 15** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Lucide React** - Icons
- **Rick and Morty API** - Episode metadata

## 📝 Notes

- The site automatically fetches episode metadata (titles, air dates, episode codes) from the Rick and Morty API
- Video files are NOT included - you must provide your own
- All 8 seasons are supported (based on Rick and Morty API data)
