import requests
import os
import re

API_KEY = "5bf61a62fd4647aa7debed7d6f2db079"
BASE_DOMAIN = "https://u-tv.pages.dev"
TEMPLATE_FILE = "index.html"
OUTPUT_DIR = "movies"

def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower()).strip('-')

def run_sync():
    # 50 pages fetch karke ~1000 movies nikalna
    all_movies = []
    for p in range(1, 51):
        try:
            r = requests.get(f"https://api.themoviedb.org/3/discover/movie?api_key={API_KEY}&page={p}&language=hi-IN").json()
            if 'results' in r: all_movies.extend(r['results'])
        except: continue

    if not os.path.exists(TEMPLATE_FILE): return
    with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
        template = f.read()

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    sitemap_links = [f"{BASE_DOMAIN}/"]

    for m in all_movies:
        m_id = str(m.get('id'))
        title = m.get('title', 'Movie')
        desc = (m.get('overview') or "Watch in HD quality.").replace('"', "'")
        poster = f"https://image.tmdb.org/t/p/w500{m.get('poster_path')}"
        slug = f"{slugify(title)}-{m_id}"
        
        file_path = f"{OUTPUT_DIR}/{slug}.html"
        canon = f"{BASE_DOMAIN}/{file_path}"

        # FIX: Sabhi placeholders ko TMDB data se replace karna
        content = template.replace("${MOVIE_TITLE}", title)\
                          .replace("${MOVIE_DESC}", desc)\
                          .replace("${CANONICAL_URL}", canon)\
                          .replace("${POSTER_PATH}", poster)\
                          .replace("${MOVIE_ID}", m_id)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        sitemap_links.append(canon)

    # Google Sitemap generate karna
    with open("sitemap.xml", "w", encoding='utf-8') as s:
        s.write('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')
        for l in sitemap_links: s.write(f'<url><loc>{l}</loc></url>')
        s.write('</urlset>')

if __name__ == "__main__":
    run_sync()
