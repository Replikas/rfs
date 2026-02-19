
import os
from camoufox.sync_api import Camoufox

def run_audit():
    with Camoufox(headless=True) as browser:
        page = browser.new_page()
        print("Auditing https://rickortystream.vercel.app/ ...")
        page.goto("https://rickortystream.vercel.app/")
        page.wait_for_load_state("networkidle")
        
        # Check UI elements
        title = page.title()
        body = page.inner_text("body")
        
        # Check for Season 8 specifically
        s8_found = "Season 8" in body
        
        # Take a look at the layout
        page.screenshot(path="site_audit.png")
        
        print(f"Title: {title}")
        print(f"Season 8 found: {s8_found}")
        print(f"Body snippet: {body[:200]}")

if __name__ == "__main__":
    run_audit()
