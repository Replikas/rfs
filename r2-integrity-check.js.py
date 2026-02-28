
import os
import json
import subprocess

# R2 Config (Read from env or hardcoded from repo analysis)
R2_URL = "https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev/videos"

def get_r2_status():
    print("🛸 C-137 R2 INTEGRITY CHECK 🛸")
    # Verify the hardcoded URL in the frontend matches the reality
    test_ep = f"{R2_URL}/episode-1.mp4"
    print(f"Testing primary link: {test_ep}")
    
    try:
        # Check if the file exists using a HEAD request
        res = subprocess.run(["curl", "-I", "-s", test_ep], capture_output=True, text=True)
        if "200 OK" in res.stdout:
            print("✅ R2 Storage is RESPONDING. Links are valid.")
        else:
            print("⚠️ R2 Storage returned non-200 status. Check bucket permissions.")
    except Exception as e:
        print(f"❌ Connection failed: {e}")

if __name__ == "__main__":
    get_r2_status()
