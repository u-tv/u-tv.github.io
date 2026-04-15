import requests
import os
import re

API_KEY = "5bf61a62fd4647aa7debed7d6f2db079"
BASE_DOMAIN = "https://u-tv.pages.dev"
TEMPLATE_FILE = "index.html"
OUTPUT_DIR = "movies"

def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower().strip()).strip("-")

def run_sync():
    if not os.path.exists(TEMPLATE_FILE):
        print("❌ Template index.html not found.")
        return
    with open(TEMPLATE_FILE, "r", encoding="utf-8") as f:
        template = f.read()

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    all_movies = []
    for page in range(1, 8):  # 7 pages ~ 350 movies
        try:
            url = f"https://api.themoviedb.org/3/discover/movie?api_key={API_KEY}&page={page}&language=hi-IN"
            res = requests.get(url, timeout=10)
            if res.status_code == 200:
                page_data = res.json()
                if "results" in page_data:
                    all_movies.extend(page_data["results"])
        except Exception as e:
            print(f"⚠ Page {page} error: {e}")
            continue

    sitemap_links = [f"{BASE_DOMAIN}/"]

    for m in all_movies:
        try:
            m_id = str(m.get("id"))
            if not m_id:
                continue
            title = m.get("title", "Movie") or "Movie"
            desc = (m.get("overview") or "Watch in HD quality.").replace('"', "'")
            poster_path = m.get("poster_path")
            if not poster_path:
                continue
            poster = f"https://image.tmdb.org/t/p/w500{poster_path}"
            slug = f"{slugify(title)}-{m_id}"
            file_path = os.path.join(OUTPUT_DIR, f"{slug}.html")
            canon = f"{BASE_DOMAIN}/movies/{slug}.html"

            content = template.replace("${MOVIE_TITLE}", title)\
                          .replace("${MOVIE_DESC}", desc)\
                          .replace("${CANONICAL_URL}", canon)\
                          .replace("${POSTER_PATH}", poster)\
                          .replace("${MOVIE_ID}", m_id)

            with open(file_path, "w", encoding="utf-8") as f:
                f.write(content)
            sitemap_links.append(canon)
        except Exception as e:
            print(f"⚠ Movie {m_id} error: {e}")
            continue

    with open("sitemap.xml", "w", encoding="utf-8") as s:
        s.write('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        for loc in sitemap_links:
            s.write(f"<url><loc>{loc}</loc></url>")
        s.write("</urlset>")
    print("✅ sync_movies.py finished.")

if __name__ == "__main__":
    run_sync()
