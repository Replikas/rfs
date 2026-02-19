#!/bin/bash
# RickFlix VPS Setup Script
# Run this after cloning the repo: bash vps-setup.sh

echo "Setting up RickFlix on VPS..."

# Create .env.local
cat > .env.local << 'EOF'
NEXT_PUBLIC_TMDB_API_KEY=02269a98332ab91c6579fa12ef995e5a

# Cloudflare R2 Storage
CLOUDFLARE_ACCOUNT_ID=a52c58eca06d45b7c1b7a7c26d825275
CLOUDFLARE_R2_ACCESS_KEY_ID=19d36d2d0021015005cc9f3dc833b03b
CLOUDFLARE_R2_SECRET_ACCESS_KEY=0f3fa4789f860ea3a0fb742131bc9677828e75cbfddb4ed9f3e7a588abbcdf24
CLOUDFLARE_R2_BUCKET_NAME=rem
CLOUDFLARE_R2_PUBLIC_URL=https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev

NEXT_PUBLIC_TRANSCODER_URL=https://transcodingrem-production.up.railway.app
CLOUDFLARE_STREAM_API_TOKEN=bgpBGs2Z0Mnw4FIpKscB3Z7yGwnnaBkbF4Q8MUCu
NEXT_PUBLIC_MAINTENANCE_MODE=true
EOF

echo "✅ Created .env.local"

# Create auto-episode-config.json with Linux paths
cat > auto-episode-config.json << 'EOF'
{
  "torrentSites": {
    "primary": {
      "name": "EZTV",
      "searchUrl": "https://eztv1.xyz/search/rick-and-morty",
      "enabled": true,
      "note": "EZTV changes domains frequently - use eztv-monitor.js to find active domain"
    }
  },
  "qualityChecks": {
    "videoCodec": {
      "preferred": ["h264", "avc"],
      "acceptable": ["hevc", "h265"],
      "reject": ["vp8", "vp9"]
    },
    "audioCodec": {
      "preferred": ["aac"],
      "acceptable": ["mp3"],
      "reject": ["ac3", "dts"]
    },
    "resolution": {
      "minimum": "720p",
      "preferred": "1080p",
      "reject": ["480p", "360p"]
    },
    "fileSize": {
      "minimum_mb": 200,
      "maximum_mb": 2000,
      "preferred_range": [400, 800]
    },
    "sources": {
      "preferred": ["WEB-DL", "WEBRip", "HDTV"],
      "acceptable": ["BluRay"],
      "reject": ["CAM", "TS", "TC"]
    }
  },
  "automation": {
    "autoDownload": false,
    "requireManualApproval": true,
    "checkInterval_minutes": 30,
    "maxConcurrentDownloads": 2
  },
  "notifications": {
    "enabled": true,
    "notifyOnNewEpisode": true,
    "notifyOnQualityIssue": true,
    "notifyOnUploadComplete": true
  },
  "storage": {
    "downloadPath": "/home/user/downloads/rickandmorty",
    "processedPath": "/home/user/downloads/rickandmorty/processed",
    "failedPath": "/home/user/downloads/rickandmorty/failed"
  },
  "showInfo": {
    "name": "Rick and Morty",
    "searchTerms": ["rick and morty", "rick.and.morty"],
    "currentSeason": 8,
    "lastEpisodeId": 81,
    "nextSeason": 9,
    "nextSeasonYear": 2026,
    "monitorForNewSeason": true
  }
}
EOF

echo "✅ Created auto-episode-config.json"

# Create download directories
mkdir -p /home/user/downloads/rickandmorty/processed
mkdir -p /home/user/downloads/rickandmorty/failed
echo "✅ Created download directories"

# Install dependencies
echo "Installing npm dependencies..."
npm install
echo "✅ Dependencies installed"

echo ""
echo "========================================"
echo "✅ RickFlix VPS setup complete!"
echo "========================================"
echo ""
echo "To run the Season 9 monitor:"
echo "  node auto-season9-workflow.js --watch --auto-download"
echo ""
echo "To run the episode uploader:"
echo "  node auto-episode-uploader.js"
echo ""
