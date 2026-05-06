import os
import requests
from datetime import datetime

# --- CONFIGURATION ---
TMDB_API_KEY = "174d0214bf933dd59b3d5ec68a0c967f"
BASE_URL = "https://api.themoviedb.org/3"
OUTPUT_DIR = "movies"
MY_SITE_URL = "https://u-tv.pages.dev" # Aapki site yahan fix kar di hai

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

def get_daily_content():
    """Daily trending 25 Movies aur 25 TV Shows fetch karne ke liye"""
    content_list = []
    
    movie_url = f"{BASE_URL}/trending/movie/day?api_key={TMDB_API_KEY}"
    tv_url = f"{BASE_URL}/trending/tv/day?api_key={TMDB_API_KEY}"
    
    try:
        m_res = requests.get(movie_url).json().get('results', [])[:25]
        t_res = requests.get(tv_url).json().get('results', [])[:25]
        
        for m in m_res: m['media_type'] = 'movie'
        for t in t_res: t['media_type'] = 'tv'
        
        content_list = m_res + t_res
    except Exception as e:
        print(f"Error fetching data: {e}")
        
    return content_list

def create_page(item):
    name = item.get('title') or item.get('name')
    m_id = item.get('id')
    m_type = item.get('media_type') 
    rating = round(item.get('vote_average', 8.0), 1)
    desc = item.get('overview', 'Watch latest content online.').replace('"', "'")
    poster = f"https://image.tmdb.org/t/p/w500{item.get('poster_path')}"
    
    # SEO Friendly Slug
    slug = "".join([c if c.isalnum() else "-" for c in name.lower()]).replace("--", "-").strip("-")
    
    # REAL EMBED PLAYER (vidsrc.to - Professional Choice)
    if m_type == 'movie':
        embed_url = f"https://vidsrc.to/embed/movie/{m_id}"
    else:
        embed_url = f"https://vidsrc.to/embed/tv/{m_id}/1/1"

    html_template = f"""<!DOCTYPE html>
<html lang="hi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Watch {name} Full Movie Online - U-TV</title>
    <meta name="description" content="Stream {name} in HD quality. Rating: {rating}. {desc[:140]}...">
    <link rel="canonical" href="{MY_SITE_URL}/movies/{slug}.html">
    <style>
        body {{ font-family: 'Roboto', sans-serif; background: #080808; color: white; margin: 0; text-align: center; }}
        header {{ background: #e50914; padding: 15px; font-size: 1.8rem; font-weight: bold; letter-spacing: 2px; }}
        .player-box {{ width: 100%; max-width: 1100px; margin: 20px auto; aspect-ratio: 16/9; background: #000; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
        iframe {{ width: 100%; height: 100%; border: none; }}
        .content-info {{ max-width: 1100px; margin: 20px auto; display: flex; gap: 30px; padding: 25px; background: #141414; border-radius: 12px; text-align: left; flex-wrap: wrap; }}
        .content-info img {{ width: 220px; border-radius: 10px; border: 3px solid #333; }}
        .badge {{ background: #f5c518; color: black; padding: 4px 12px; border-radius: 4px; font-weight: bold; font-size: 0.9rem; }}
        h1 {{ margin: 0 0 10px 0; color: #fff; }}
        p {{ line-height: 1.6; color: #ccc; }}
        .server-btn {{ background: #e50914; color: white; border: none; padding: 12px 24px; border-radius: 5px; cursor: pointer; font-weight: bold; margin-top: 15px; }}
    </style>
</head>
<body>
    <header>U-TV</header>
    <div class="player-box">
        <iframe src="{embed_url}" allowfullscreen="true" scrolling="no"></iframe>
    </div>
    <div class="content-info">
        <img src="{poster}" alt="{name}">
        <div style="flex: 1; min-width: 300px;">
            <h1>{name} <small style="color: #666;">({m_type.upper()})</small></h1>
            <p><span class="badge">⭐ IMDb {rating}</span></p>
            <p>{desc}</p>
            <button class="server-btn" onclick="location.reload()">REFRESH PLAYER</button>
        </div>
    </div>
</body>
</html>"""

    filename = f"{OUTPUT_DIR}/{slug}.html"
    with open(filename, "w", encoding="utf-8") as f:
        f.write(html_template)
    return f"movies/{slug}.html"

def update_sitemap():
    files = [f"movies/{f}" for f in os.listdir(OUTPUT_DIR) if f.endswith('.html')]
    with open("sitemap.xml", "w", encoding="utf-8") as s:
        s.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n')
        for f in files:
            s.write(f'  <url><loc>{MY_SITE_URL}/{f}</loc></url>\n')
        s.write('</urlset>')

if __name__ == "__main__":
    content = get_daily_content()
    print(f"Total {len(content)} items found. Generating pages...")
    for item in content:
        create_page(item)
    update_sitemap()
    print("All pages created and Sitemap updated for u-tv.pages.dev!")
