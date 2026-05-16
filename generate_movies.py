import json
import os
from datetime import datetime

# ⚙️ CONFIG
BASE_URL = "https://yourusername.github.io"
STATIC_DIR = "static"      # HTML + robots, sitemap, index bhi yahi
JSON_FILE = "movies.json"

# Ensure static folder
os.makedirs(STATIC_DIR, exist_ok=True)

# HTML template for each movie page
TMPL = '''<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<title>{title} - ({year}) Watch Online | PRI-MOVIES</title>
<meta name="description" content="{desc}">
<meta property="og:title" content="{title} - Full Movie Online | PRI-MOVIES">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{base_url}/{id}.html">
<meta property="og:image" content="{poster}">
<meta property="og:type" content="video.movie">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="canonical" href="{base_url}/{id}.html">
<style>
body {{ background:#000; color:#fff; text-align:center; font-family:sans-serif; padding:20px; }}
h1 {{ margin:10px 0; font-size:1.8em; }}
.player {{ margin:20px auto; border:2px solid red; max-width:800px; }}
img {{ width:250px; border-radius:10px; }}
p {{ color:#ccc; max-width:700px; margin:20px auto; font-size:0.9em; }}
a {{ color:#f00; text-decoration:underline; }}
</style>
</head>
<body>
<h1>{title}</h1>
<div class="player">
<iframe src="https://vidsrc.me/embed/movie?tmdb={tmdb_id}" width="100%" height="500" frameborder="0" allowfullscreen allow="autoplay; fullscreen"></iframe>
</div>
<p>{desc}</p>
<a href="index.html" style="color:red;">Back to List</a>
<script type="application/ld+json">
{{
  "@context": "https://schema.org",
  "@type": "Movie",
  "name": "{title}",
  "url": "{base_url}/{id}.html",
  "description": "{desc}"
}}
</script>
</body>
</html>'''.strip()

def generate_movie_pages():
    with open(JSON_FILE, encoding="utf-8") as f:
        movies = json.load(f)

    urls = []
    links = []

    for movie in movies:
        movie_id = movie["id"]
        title = movie["title"]
        tmdb_id = movie.get("tmdb_id", 1)  # fallback

        year = "2025"
        desc = f"Watch {title} full movie online free. Streaming on PRI-MOVIES."

        poster = "https://image.tmdb.org/t/p/w500/nvK6gYa4diCnQkDVN42uoYXPrdT.jpg"

        html = TMPL.format(
            title=title,
            year=year,
            desc=desc,
            poster=poster,
            base_url=BASE_URL,
            id=movie_id,
            tmdb_id=tmdb_id
        )

        path = os.path.join(STATIC_DIR, f"{movie_id}.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)

        print(f"✅ {movie_id}.html generated")

        urls.append(f"{BASE_URL}/{movie_id}.html")
        links.append(f'<a href="{movie_id}.html">{title}</a>')
    
    return urls, links


def generate_index_html(links):
    links_html = "
".join([f"  <li>{link}</li>" for link in links])

    index_html = f'''<!DOCTYPE html>
<html lang="hi">
<head>
<meta charset="UTF-8">
<title>PRI-MOVIES (4960 Movies) - Full Movie List</title>
<meta name="description" content="PRI-MOVIES - Watch 4960+ movies online free. All movies list with direct links.">
<meta property="og:title" content="PRI-MOVIES - 4960+ Movies List">
<meta property="og:url" content="{BASE_URL}/index.html">
<meta property="og:type" content="website">
<link rel="canonical" href="{BASE_URL}/index.html">
<style>
body {{ background:#000; color:#fff; font-family:sans-serif; padding:20px; }}
h1 {{ color:#f00; }}
ul {{ padding-left:0; list-style:none; }}
li {{ margin:8px 0; }}
a {{ color:#ccc; text-decoration:none; }}
a:hover {{ color:#f00; }}
</style>
</head>
<body>
<h1>PRI-MOVIES (4960 Movies)</h1>
<ul>
{links_html}
</ul>
<p><a href="sitemap.xml" style="color:#f00;">Sitemap</a></p>
</body>
</html>'''.strip()

    with open(os.path.join(STATIC_DIR, "index.html"), "w", encoding="utf-8") as f:
        f.write(index_html)


def generate_sitemap(urls):
    today = datetime.today().strftime("%Y-%m-%d")
    xml = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ]
    for url in urls:
        xml.append("  <url>")
        xml.append(f"    <loc>{url}</loc>")
        xml.append(f"    <lastmod>{today}</lastmod>")
        xml.append("    <changefreq>weekly</changefreq>")
        xml.append("    <priority>0.8</priority>")
        xml.append("  </url>")
    xml.append("</urlset>")
    xml = "
".join(xml)

    with open(os.path.join(STATIC_DIR, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write(xml)

    print("✅ sitemap.xml generated")


def generate_robots_txt():
    robots = f"""User-agent: *
Allow: /

Sitemap: {BASE_URL}/sitemap.xml
"""

    with open(os.path.join(STATIC_DIR, "robots.txt"), "w", encoding="utf-8") as f:
        f.write(robots)
    print("✅ robots.txt generated")


if __name__ == "__main__":
    urls, links = generate_movie_pages()
    generate_index_html(links)
    generate_sitemap(urls)
    generate_robots_txt()
    print("
🚀 All pages, index.html, sitemap.xml, robots.txt ready. Push to GitHub Pages and submit sitemap.xml in Google Search Console.")
