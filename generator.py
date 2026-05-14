import requests
import os
import time

api_key = "174d0214bf933dd59b3d5ec68a0c967f"
pages_to_fetch = 250  # 5,000 movies
base_url = "https://u-tv.pages.dev" 

html_template = """<!DOCTYPE html><html lang="hi"><head><meta charset="UTF-8"><title>{title} - PRI-MOVIES</title><meta name="description" content="{overview}"><meta property="og:image" content="https://image.tmdb.org/t/p/w500{poster}"><style>body{{background:#000;color:#fff;text-align:center;font-family:sans-serif;padding:20px;}}.player{{margin:20px auto;border:2px solid red;max-width:800px;}}img{{width:250px;border-radius:10px;}}p{{color:#ccc;max-width:700px;margin:20px auto;}}</style></head><body><h1>{title}</h1><img src="https://image.tmdb.org/t/p/w500{poster}"><div class="player"><iframe src="https://vidsrc.me/embed/movie?tmdb={tmdb_id}" width="100%" height="450" frameborder="0" allowfullscreen></iframe></div><p>{overview}</p><a href="index.html" style="color:red;">Back to List</a></body></html>"""

all_movies_li = []
sitemap_urls = ['<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">']

print("Processing: 0 movies done...", end="\r")

count = 0
for page in range(1, pages_to_fetch + 1):
    try:
        url = f"https://api.themoviedb.org/3/movie/popular?api_key={api_key}&language=hi-IN&page={page}"
        data = requests.get(url).json()

        for movie in data.get('results', []):
            mid, title, poster = movie['id'], movie['title'], movie.get('poster_path', '')
            overview = movie.get('overview', 'Watch full movie online.').replace('"', "'")
            
            with open(f"{mid}.html", "w", encoding="utf-8") as f:
                f.write(html_template.format(title=title, tmdb_id=mid, overview=overview, poster=poster))

            all_movies_li.append(f'<li><a href="{mid}.html" style="color:white;">{title}</a></li>')
            sitemap_urls.append(f'<url><loc>{base_url}/{mid}.html</loc><image:image><image:loc>https://image.tmdb.org/t/p/w500{poster}</image:loc><image:title>{title}</image:title></image:image></url>')
            
            count += 1
        
        print(f"Processing: {count} movies done...", end="\r")

    except:
        time.sleep(1)

with open("index.html", "w", encoding="utf-8") as f:
    f.write(f"<html><body style='background:#111;color:white;'><h1>PRI-MOVIES ({count} Movies)</h1><ul>{''.join(all_movies_li)}</ul></body></html>")

sitemap_urls.append('</urlset>')
with open("sitemap.xml", "w", encoding="utf-8") as f:
    f.write("\n".join(sitemap_urls))

print(f"\nSUCCESS! Poori {count} movies aur Sitemap tayyar hain.")