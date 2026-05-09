import requests
import json
import os
import time

API_KEY = os.getenv('TMDB_KEY')
SITE_URL = os.getenv('SITE_URL', 'https://u-tv.github.io')
TOTAL_PAGES = 150

def update_site_with_sitemap():
    movies_list = []
    os.makedirs('movies', exist_ok=True)
    print("Fetching movies...")

    for page in range(1, TOTAL_PAGES + 1):
        url = f"https://api.themoviedb.org/3/discover/movie?api_key={API_KEY}&sort_by=popularity.desc&page={page}"
        try:
            resp = requests.get(url)
            resp.raise_for_status()
            data = resp.json().get('results', [])
            for movie in data:
                m_id = movie.get('id')
                title = movie.get('title', 'Unknown').replace('"', "'")
                movies_list.append({"id": m_id, "title": title})

                # Fixed Embed (2Embed - reliable, TMDB ID support)
                embed_url = f"https://2embed.to/embed/tmdb/movie/{m_id}"
                html = f"""<!DOCTYPE html><html><head><title>{title}</title><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:20px;background:#000;color:#fff;font-family:Arial;"><h1>{title}</h1>
<iframe src="{embed_url}" width="100%" height="500" allowfullscreen style="border:none;"></iframe></body></html>"""
                with open(f"movies/{m_id}.html", "w", encoding="utf-8") as f:
                    f.write(html)
            print(f"Page {page} done ({len(data)} movies)")
        except Exception as e:
            print(f"Error page {page}: {e}")
        time.sleep(0.3)  # Rate limit safe

    # Sitemap
    with open("sitemap.xml", "w", encoding="utf-8") as s:
        s.write('<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
')
        s.write(f'  <url><loc>{SITE_URL}/</loc></url>
')
        for m in movies_list:
            s.write(f'  <url><loc>{SITE_URL}/movies/{m["id"]}.html</loc></url>
')
        s.write('</urlset>')
    print(f"Sitemap created! {len(movies_list)} movies.")

if __name__ == "__main__":
    update_site_with_sitemap()
