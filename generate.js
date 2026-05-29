#!/usr/bin/env node
const fs = require('fs');
const https = require('https');

const CONFIG = {
  TMDB_API_KEY: '5bf61a62fd4647aa7debed7d6f2db079',
  TMDB_IMAGE_URL: 'https://image.tmdb.org/t/p/w500',
  BACKDROP_URL: 'https://image.tmdb.org/t/p/original',
  SITE_URL: 'https://u-tv.pages.dev',
  SITE_NAME: 'U-TV',
  GA_ID: 'G-V43E3PG5RD',
  MOVIES_JSON: './movie-details.json'
};

function fetchTMDB(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${CONFIG.TMDB_API_KEY}&language=hi-IN`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function getMovieDetails(id) {
  try {
    const movie = await fetchTMDB(`/movie/${id}?append_to_response=credits,similar,videos`);
    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview || 'No description available.',
      release_date: movie.release_date || '',
      vote_average: movie.vote_average || 0,
      vote_count: movie.vote_count || 0,
      poster_path: movie.poster_path || '',
      backdrop_path: movie.backdrop_path || '',
      genres: movie.genres ? movie.genres.map(g => g.name).join(', ') : '',
      cast: movie.credits?.cast?.slice(0, 12) || [],
      similar: movie.similar?.results?.slice(0, 8) || [],
      trailer_key: movie.videos?.results?.find(v => v.type === 'Trailer')?.key || null
    };
  } catch (err) {
    console.error(`❌ TMDB error for ID ${id}:`, err.message);
    return null;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function generateMoviePage(movie) {
  const dir = `./movie/${movie.id}`;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const posterUrl = movie.poster_path ? CONFIG.TMDB_IMAGE_URL + movie.poster_path : '';
  const backdropUrl = movie.backdrop_path ? CONFIG.BACKDROP_URL + movie.backdrop_path : '';
  const year = movie.release_date.split('-')[0] || '';
  const rating = movie.vote_average.toFixed(1);
  const description = movie.overview;

  const servers = [
    { name: "SRV 1", url: `https://vidsrc.to/embed/movie/${movie.id}` },
    { name: "SRV 2", url: `https://embed.su/embed/movie/${movie.id}` },
    { name: "SRV 3", url: `https://vidsrc.me/embed/movie?tmdb=${movie.id}` },
    { name: "SRV 4", url: `https://moviesapi.club/movie/${movie.id}` },
    { name: "SRV 5", url: `https://autoembed.to/movie/tmdb/${movie.id}` },
    { name: "SRV 6", url: `https://2embed.cc/embed/movie?tmdb=${movie.id}` },
    { name: "SRV 7", url: `https://multiembed.mov/directstream.php?video_id=${movie.id}` },
    { name: "SRV 8", url: `https://vidbinge.dev/embed/movie/${movie.id}` }
  ];

  let castHtml = '<div class="cast-scroll">';
  for (const actor of movie.cast) {
    const img = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://placehold.co/70x70';
    castHtml += `<div class="cast-card"><img src="${img}" alt="${actor.name}" loading="lazy"><div>${actor.name}</div></div>`;
  }
  castHtml += '</div>';

  let similarHtml = '<div class="similar-scroll">';
  for (const sim of movie.similar) {
    const simPoster = sim.poster_path ? CONFIG.TMDB_IMAGE_URL + sim.poster_path : '';
    similarHtml += `<div class="similar-card" onclick="window.location.href='/movie/${sim.id}/'"><img src="${simPoster}" alt="${sim.title}"><div class="similar-title">${sim.title}</div></div>`;
  }
  similarHtml += '</div>';

  const serversJson = JSON.stringify(servers).replace(/\\/g, '\\\\');

  let html = '<!DOCTYPE html>\n';
  html += '<html lang="hi-IN">\n<head>\n';
  html += '<meta charset="UTF-8">\n';
  html += '<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">\n';
  html += '<title>' + movie.title + ' (' + year + ') - Watch Full Movie Online | ' + CONFIG.SITE_NAME + '</title>\n';
  html += '<meta name="description" content="' + escapeHtml(description.substring(0, 160)) + '">\n';
  html += '<meta name="keywords" content="' + movie.title + ', watch online, free movie, ' + movie.genres + '">\n';
  html += '<link rel="canonical" href="' + CONFIG.SITE_URL + '/movie/' + movie.id + '/">\n';
  html += '<meta property="og:title" content="' + movie.title + '">\n';
  html += '<meta property="og:description" content="' + escapeHtml(description.substring(0, 160)) + '">\n';
  html += '<meta property="og:image" content="' + posterUrl + '">\n';
  html += '<meta property="og:type" content="video.movie">\n';
  html += '<meta name="twitter:card" content="summary_large_image">\n';
  html += '<meta name="twitter:title" content="' + movie.title + '">\n';
  html += '<meta name="twitter:description" content="' + escapeHtml(description.substring(0, 160)) + '">\n';
  html += '<meta name="twitter:image" content="' + posterUrl + '">\n';
  html += '<link rel="alternate" hreflang="hi" href="' + CONFIG.SITE_URL + '/movie/' + movie.id + '/">\n';
  html += '<link rel="alternate" hreflang="en" href="' + CONFIG.SITE_URL + '/en/movie/' + movie.id + '/">\n';
  html += '<script type="application/ld+json">\n';
  html += '{\n  "@context": "https://schema.org",\n  "@type": "Movie",\n  "name": "' + movie.title + '",\n';
  html += '  "description": "' + escapeHtml(description.replace(/"/g, '\\"')) + '",\n  "datePublished": "' + movie.release_date + '",\n';
  html += '  "image": "' + posterUrl + '",\n  "aggregateRating": { "@type": "AggregateRating", "ratingValue": "' + rating + '", "ratingCount": ' + movie.vote_count + ' }\n}\n';
  html += '</script>\n';
  if (CONFIG.GA_ID) {
    html += '<script async src="https://www.googletagmanager.com/gtag/js?id=' + CONFIG.GA_ID + '"></script>\n';
    html += '<script>\n';
    html += '  window.dataLayer = window.dataLayer || [];\n';
    html += '  function gtag(){dataLayer.push(arguments);}\n';
    html += '  gtag("js", new Date());\n';
    html += '  gtag("config", "' + CONFIG.GA_ID + '");\n';
    html += '</script>\n';
  }
  html += '<style>\n';
  html += '* { margin: 0; padding: 0; box-sizing: border-box; }\n';
  html += 'body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, sans-serif; }\n';
  html += 'body.light { background: #f0f2f5; color: #111; }\n';
  html += '.container { max-width: 1200px; margin: 0 auto; padding: 20px; }\n';
  html += '.hero { background: linear-gradient(to bottom, rgba(0,0,0,0.7), #0a0a0a), url(' + backdropUrl + ') center/cover; min-height: 60vh; display: flex; align-items: flex-end; padding: 40px 20px; }\n';
  html += 'h1 { font-size: 3rem; color: #e50914; }\n';
  html += '.poster { width: 200px; border-radius: 16px; float: left; margin-right: 30px; }\n';
  html += '.info { margin: 30px 0; }\n';
  html += '.cast-scroll, .similar-scroll { display: flex; gap: 15px; overflow-x: auto; padding: 10px 0; margin: 20px 0; }\n';
  html += '.cast-card { text-align: center; min-width: 80px; }\n';
  html += '.cast-card img { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; }\n';
  html += '.similar-card { flex: 0 0 110px; cursor: pointer; text-align: center; }\n';
  html += '.similar-card img { width: 100%; border-radius: 12px; }\n';
  html += '.server-tabs { display: flex; gap: 12px; overflow-x: auto; margin: 20px 0; }\n';
  html += '.server-tab { background: #1a1a1f; border: 1px solid #333; border-radius: 40px; padding: 8px 16px; cursor: pointer; }\n';
  html += '.server-tab.active { background: #e50914; border-color: #e50914; color: white; }\n';
  html += 'iframe { width: 100%; aspect-ratio: 16/9; border: none; margin: 20px 0; }\n';
  html += 'button { background: #e50914; border: none; padding: 8px 16px; border-radius: 30px; color: white; cursor: pointer; margin: 5px; }\n';
  html += '.error-msg { color: #ff9999; text-align: center; margin: 20px; }\n';
  html += 'footer { text-align: center; margin-top: 50px; padding: 20px; border-top: 1px solid #222; }\n';
  html += '@media (max-width: 768px) { h1 { font-size: 2rem; } .poster { width: 120px; } }\n';
  html += '</style>\n';
  html += '</head>\n<body>\n';
  html += '<div class="hero"><h1>' + movie.title + '</h1></div>\n';
  html += '<div class="container">\n';
  html += '<img class="poster" src="' + posterUrl + '" alt="' + movie.title + ' poster" loading="lazy">\n';
  html += '<div class="info"><p>⭐ ' + rating + ' | 📅 ' + year + ' | 🎭 ' + movie.genres + '</p><p>' + description + '</p></div>\n';
  html += '<div style="clear:both"></div>\n';
  html += '<div class="server-tabs" id="serverTabs"></div>\n';
  html += '<iframe id="playerIframe" src="" allowfullscreen></iframe>\n';
  html += '<div id="errorMsg" class="error-msg" style="display:none;">⚠️ Video not loading? Try another server above.</div>\n';
  html += '<div><button id="watchlistBtn">➕ Add to Watchlist</button> <button id="shareBtn">📤 Share</button> <button id="trailerBtn">🎬 Trailer</button> <button id="themeToggle">🌙 Dark/Light</button></div>\n';
  html += '<h3>Cast & Crew</h3>' + castHtml + '\n';
  html += '<h3>Similar Movies</h3>' + similarHtml + '\n';
  html += '</div>\n';
  html += '<footer>© ' + CONFIG.SITE_NAME + ' | <a href="/">Home</a> | <a href="#" id="dmcaLink">DMCA</a></footer>\n';
  html += '<script>\n';
  html += 'const movieId = ' + movie.id + ';\n';
  html += 'const servers = ' + serversJson + ';\n';
  html += 'let currentServer = 0;\n';
  html += 'const iframe = document.getElementById("playerIframe");\n';
  html += 'const errorDiv = document.getElementById("errorMsg");\n';
  html += 'function loadServer(index) {\n';
  html += '  iframe.src = servers[index].url;\n';
  html += '  errorDiv.style.display = "none";\n';
  html += '  document.querySelectorAll(".server-tab").forEach((tab,i)=>tab.classList.toggle("active",i===index));\n';
  html += '  iframe.onerror = () => { errorDiv.style.display = "block"; };\n';
  html += '  iframe.onload = () => { errorDiv.style.display = "none"; };\n';
  html += '}\n';
  html += 'const tabsDiv = document.getElementById("serverTabs");\n';
  html += 'tabsDiv.innerHTML = servers.map((s,i) => "<button class=\\"server-tab" + (i===0 ? " active" : "") + "\\" data-idx=\\"" + i + "\\">" + s.name + "</button>").join("");\n';
  html += 'document.querySelectorAll(".server-tab").forEach(btn => { btn.addEventListener("click", function() { loadServer(parseInt(this.dataset.idx)); }); });\n';
  html += 'loadServer(0);\n';
  html += 'let watchlist = JSON.parse(localStorage.getItem("watchlist")||"[]");\n';
  html += 'function updateWatchlistBtn(){ document.getElementById("watchlistBtn").innerText = watchlist.some(w=>w.id===movieId) ? "❤️ In Watchlist" : "➕ Add to Watchlist"; }\n';
  html += 'updateWatchlistBtn();\n';
  html += 'document.getElementById("watchlistBtn").onclick = function(){\n';
  html += '  const idx = watchlist.findIndex(w=>w.id===movieId);\n';
  html += '  if(idx===-1){ watchlist.push({id:movieId, title:"' + movie.title + '", poster:"' + posterUrl + '"}); alert("Added to watchlist"); }\n';
  html += '  else{ watchlist.splice(idx,1); alert("Removed from watchlist"); }\n';
  html += '  localStorage.setItem("watchlist",JSON.stringify(watchlist));\n';
  html += '  updateWatchlistBtn();\n';
  html += '};\n';
  html += 'document.getElementById("shareBtn").onclick = function(){\n';
  html += '  if(navigator.share) navigator.share({title:"' + movie.title + '", url:window.location.href});\n';
  html += '  else navigator.clipboard.writeText(window.location.href).then(()=>alert("Link copied!"));\n';
  html += '};\n';
  html += 'document.getElementById("trailerBtn").onclick = function(){\n';
  html += '  const key = "' + (movie.trailer_key || '') + '";\n';
  html += '  if(key) window.open("https://www.youtube.com/watch?v=" + key, "_blank");\n';
  html += '  else alert("Trailer not available");\n';
  html += '};\n';
  html += 'const theme = localStorage.getItem("theme")||"dark";\n';
  html += 'document.body.classList.toggle("light", theme==="light");\n';
  html += 'document.getElementById("themeToggle").onclick = function(){\n';
  html += '  const isLight = document.body.classList.toggle("light");\n';
  html += '  localStorage.setItem("theme", isLight ? "light" : "dark");\n';
  html += '};\n';
  html += 'document.getElementById("dmcaLink").onclick = function(e){ e.preventDefault(); alert("DMCA: Contact dmca@u-tv.pages.dev"); };\n';
  html += '</script>\n';
  html += '</body>\n</html>';

  fs.writeFileSync(`${dir}/index.html`, html);
  console.log(`✅ Generated: /movie/${movie.id}/`);
}

function generateHomepage(movies) {
  let movieCards = '';
  for (const m of movies) {
    const poster = m.poster_path ? CONFIG.TMDB_IMAGE_URL + m.poster_path : '';
    const year = m.release_date ? m.release_date.split('-')[0] : '';
    movieCards += `<div class="movie-card" onclick="location.href='/movie/${m.id}/'"><img src="${poster}" alt="${m.title}" loading="lazy"><div class="movie-title">${m.title} (${year})</div></div>`;
  }
  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${CONFIG.SITE_NAME} - Watch Free Movies Online</title>
  <meta name="description" content="Watch latest movies online free. High quality streaming with multiple servers.">
  <link rel="canonical" href="${CONFIG.SITE_URL}/">
  ${CONFIG.GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${CONFIG.GA_ID}');</script>` : ''}
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0a0a0a; color:#e5e5e5; font-family: system-ui; padding:20px; }
    .movie-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(160px,1fr)); gap:20px; margin-top:30px; }
    .movie-card { cursor:pointer; border-radius:12px; overflow:hidden; background:#1a1a1a; transition:0.2s; }
    .movie-card:hover { transform:scale(1.02); border-color:#e50914; }
    .movie-card img { width:100%; aspect-ratio:2/3; object-fit:cover; }
    .movie-title { padding:8px; font-size:0.8rem; text-align:center; }
    h1 { text-align:center; margin:20px 0; color:#e50914; }
    footer { text-align:center; margin-top:40px; }
  </style>
</head>
<body>
<h1>${CONFIG.SITE_NAME} – Free Movies</h1>
<div class="movie-grid">${movieCards}</div>
<footer>© ${CONFIG.SITE_NAME} | <a href="/sitemap.xml">Sitemap</a></footer>
</body>
</html>`;
  fs.writeFileSync('./index.html', html);
  console.log('✅ Generated: index.html');
}

function generateSitemap(movies) {
  const base = CONFIG.SITE_URL;
  let urls = `<url><loc>${base}/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`;
  for (const m of movies) {
    urls += `<url><loc>${base}/movie/${m.id}/</loc><lastmod>${m.release_date?.split('-')[0]||'2025'}-01-01</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  fs.writeFileSync('./sitemap.xml', sitemap);
  console.log('✅ Generated: sitemap.xml');
}

async function main() {
  console.log('🚀 Generating static movie site...');
  if (!fs.existsSync(CONFIG.MOVIES_JSON)) {
    console.error(`❌ ${CONFIG.MOVIES_JSON} not found!`);
    process.exit(1);
  }
  const moviesList = JSON.parse(fs.readFileSync(CONFIG.MOVIES_JSON, 'utf8'));
  const allMovies = [];
  for (const item of moviesList) {
    console.log(`Processing movie ID ${item.id}...`);
    const movie = await getMovieDetails(item.id);
    if (!movie) continue;
    allMovies.push(movie);
    generateMoviePage(movie);
  }
  generateHomepage(allMovies);
  generateSitemap(allMovies);
  console.log(`🎉 Success! Generated ${allMovies.length} movie pages.`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
