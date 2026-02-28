
import subprocess
import concurrent.futures

R2_BASE = "https://pub-31bfa27fce4142d7895e90af0a51d430.r2.dev/videos"

def check_episode(id):
    url = f"{R2_BASE}/episode-{id}.mp4"
    res = subprocess.run(["curl", "-I", "-s", "-o", "/dev/null", "-w", "%{http_code}", url], capture_output=True, text=True)
    status = res.stdout.strip()
    return id, status == "200"

def run_audit():
    print("🛸 SCANNING R2 VAULT FOR ALL 81 EPISODES...")
    results = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(check_episode, i) for i in range(1, 82)]
        for future in concurrent.futures.as_completed(futures):
            results.append(future.result())
    
    results.sort()
    missing = [id for id, exists in results if not exists]
    
    if not missing:
        print("✅ FULL SPECTRUM DETECTED. All 81 episodes are live on R2.")
    else:
        print(f"⚠️ TOTAL MISSING: {len(missing)}")
        print(f"Missing IDs: {missing}")

if __name__ == "__main__":
    run_audit()
