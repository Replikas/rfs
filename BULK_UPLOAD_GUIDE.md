# Bulk Upload Guide

## ✨ New Feature: Upload Multiple Episodes at Once!

The admin panel now supports **bulk uploads**, making it super easy to add entire seasons quickly.

## How to Use

### Step 1: Access Admin Panel
Navigate to `http://localhost:3000/admin` or click the "Admin" button on the home page.

### Step 2: Select Multiple Files
1. Click the **"Select Video Files"** button
2. In the file picker:
   - **Windows**: Hold `Ctrl` and click each file you want to upload
   - **Mac**: Hold `Cmd` and click each file you want to upload
3. Click "Open" to add all selected files to the upload queue

### Step 3: Map Files to Episodes
For each file in the queue:
1. Find the file in the list (shows filename and file size)
2. Use the dropdown next to it to select which episode it is
3. Repeat for all files

**💡 Tip:** Name your video files clearly (e.g., `s01e01.mp4`, `s01e02.mp4`) so you can easily match them to episodes!

### Step 4: Upload Everything
1. Click the **"Upload All"** button
2. Watch the progress as each file uploads (status icons show:
   - 📹 Pending
   - ⏳ Uploading (spinning)
   - ✅ Success (green)
   - ❌ Error (red))
3. Files upload sequentially to avoid overwhelming your system

### Step 5: Clean Up
- Click **"Clear Completed"** to remove successfully uploaded files from the list
- Failed uploads remain in the queue so you can retry them

## Example Workflow: Upload an Entire Season

Let's say you want to upload all of Season 1 (11 episodes):

1. **Prepare your files:**
   ```
   s01e01.mp4
   s01e02.mp4
   s01e03.mp4
   ...
   s01e11.mp4
   ```

2. **Select all 11 files** using Ctrl/Cmd + Click

3. **Map each file:**
   - `s01e01.mp4` → Episode 1: Pilot
   - `s01e02.mp4` → Episode 2: Lawnmower Dog
   - etc.

4. **Click "Upload All"** and wait for completion

5. **Done!** All 11 episodes are now available to stream

## Features

✅ **Multiple file selection** - Upload 10+ episodes at once
✅ **Individual episode mapping** - Match each file to its episode
✅ **Progress tracking** - See status for each upload
✅ **Error handling** - Failed uploads stay in queue for retry
✅ **Easy cleanup** - Remove completed uploads with one click
✅ **No page reload needed** - Everything happens in the browser

## Technical Details

- **Supported formats**: MP4, WebM, MOV
- **File size limit**: Depends on your system (2GB+ files work fine)
- **Upload speed**: Depends on file size and disk speed
- **Storage location**: `public/videos/`
- **Automatic mapping**: Files are automatically added to `lib/videoSources.ts`

## Tips for Fast Bulk Uploads

1. **Name files consistently**: Use patterns like `s01e01.mp4` for easy identification
2. **Sort by name**: Keep your files organized in folders by season
3. **Check file sizes**: Aim for 200-500MB per episode for good quality/speed balance
4. **Use good compression**: H.264 codec with AAC audio works best
5. **Upload in batches**: If you have 71 episodes, consider uploading one season at a time

## Troubleshooting

**Files not uploading?**
- Check that you've selected an episode for each file
- Ensure files are valid video formats
- Try uploading fewer files at once if you have memory issues

**Upload failed?**
- File might be corrupted - try re-encoding the video
- Check disk space in `public/videos/`
- Look at browser console for error messages

**Episode doesn't show up?**
- Refresh the home page
- Check that the episode ID was correctly mapped
- Look in `lib/videoSources.ts` to verify the mapping was added

## What's Next?

After uploading:
1. Return to the home page
2. Click on any uploaded episode
3. Start streaming!
4. Share the link with friends: `http://YOUR-IP:3000`

Enjoy your bulk uploading! 🎉
