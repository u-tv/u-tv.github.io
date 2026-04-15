import requests
import os
import re
from pathlib import Path

API_KEY = "5bf61a62fd4647aa7debed7d6f2db079"
BASE_DOMAIN = "https://u-tv.pages.dev"
TEMPLATE_FILE = "index.html"
OUTPUT_DIR = "movies"

def slugify(text):
    return re.sub(r'[^a-z0-9]+', '-', text.lower().strip()).strip('-')

def ensure_template_exists():
    """Check if template exists, if not create minimal one"""
    if not os.path.exists(TEMPLATE_FILE):
        print(f"⚠️  {TEMPLATE_FILE} not found, creating minimal template...")
        minimal_template = '''<!DOCTYPE html>
<html>
<head><title>${MOVIE_TITLE}</title></head>
<body>
<h1>${MOVIE_TITLE}</h1>
<p>${MOVIE_DESC}</p>
</body>
</html>'''
        with open(TEMPLATE_FILE, 'w', encoding='utf-8') as f:
            f.write(minimal_template)
        print("✅ Minimal template created")

def run_sync():
    print("🚀 Starting movie sync...")
    
    # Create required directories
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Ensure template exists
    ensure_template_exists()
    
    # Fetch 1000 movies (20 pages x 50 movies)
    all_movies = []
    for page in range(1, 21):
        try:
            print(f"📥 Fetching page {page}...")
            url = f"https://api.themoviedb.org/3/discover/movie?api_key={API_KEY}&page={page}&language=hi-IN"
            r = requests.get(url, timeout=10).json()
            if 'results' in r:
                movies = [m for m in r['results'] if m.get('poster_path')]
                all_movies.extend(movies)
                print(f"   Added {len(movies)} movies")
        except Exception as e:
            print(f"⚠️  Page {page} error: {e}")
            continue
    
    print(f"🎯 Total movies to process: {len(all_movies)}")
    
    # Read template
    try:
        with open(TEMPLATE_FILE, 'r', encoding='utf-8') as f:
            template = f.read()
    except:
        print("❌ Failed to read template")
        return
    
    sitemap_links = [f"{BASE_DOMAIN}/"]
    created_count = 0
    
    # Generate movie pages
    for i, m in enumerate(all_movies):
        try:
            m_id = str(m.get('id', ''))
            if not m_id: continue
                
            title = (m.get('title') or 'Unknown Movie')[:100]
            desc = (m.get('overview') or "Watch HD movies online free.")[:500].replace('"', "'").replace('
', ' ')
            poster = f"https://image.tmdb.org/t/p/w500{m.get('poster_path')}"
            slug = f"{slugify(title)}-{m_id}"
            
            file_path = f"{OUTPUT_DIR}/{slug}.html"
            canon = f"{BASE_DOMAIN}/movies/{slug}.html"
            
            # Safe template replacement
            content = (template
                .replace("${MOVIE_TITLE}", title)
                .replace("${MOVIE_DESC}", desc)
                .replace("${CANONICAL_URL}", canon)
                .replace("${POSTER_PATH}", poster)
                .replace("${MOVIE_ID}", m_id)
            )
            
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            
            sitemap_links.append(canon)
            created_count += 1
            
            if created_count % 50 == 0:
                print(f"✅ Created {created_count} pages...")
                
        except Exception as e:
            print(f"⚠️  Movie {i} error: {e}")
            continue
    
    # Generate sitemap
    try:
        sitemap_content = '<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
'
        for link in sitemap_links[:5000]:  # Limit sitemap size
            sitemap_content += f'<url><loc>{link}</loc><lastmod>{requests.utils.format_date().replace(" ", "T")[:-1]}Z</lastmod></url>
'
        sitemap_content += '</urlset>'
        
        with open("sitemap.xml", "w", encoding='utf-8') as f:
            f.write(sitemap_content)
        print("✅ Sitemap generated")
    except Exception as e:
        print(f"⚠️  Sitemap error: {e}")
    
    print(f"🎉 Sync complete! Created {created_count} movie pages")

if __name__ == "__main__":
    run_sync()
