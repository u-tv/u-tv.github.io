#!/usr/bin/env node
const fs = require('fs');
const https = require('https');

// ========== CONFIG ==========
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

  // Cast HTML
  let castHtml = '<div class="cast-scroll">';
  movie.cast.forEach(actor => {
    const img = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://placehold.co/70x70';
    castHtml += `<div class="cast-card"><img src="${img}" alt="${actor.name}" loading="lazy"><div>${actor.name}</div></div>`;
  });
  castHtml += '</div>';

  // Similar movies HTML
  let similarHtml = '<div class="similar-scroll">';
  movie.similar.forEach(sim => {
    const simPoster = sim.poster_path ? CONFIG.TMDB_IMAGE_URL + sim.poster_path : '';
    similarHtml += `<div class="similar-card" onclick="window.location.href='/movie/${sim.id}/'"><img src="${simPoster}" alt="${sim.title}"><div class="similar-title">${sim.title}</div></div>`;
  });
  similarHtml += '</div>';

  const serversJson = JSON.stringify(servers).replace(/\\/g, '\\\\');

  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${movie.title} (${year}) - Watch Full Movie Online | ${CONFIG.SITE_NAME}</title>
  <meta name="description" content="${escapeHtml(description.substring(0, 160))}">
  <meta name="keywords" content="${movie.title}, watch online, free movie, ${movie.genres}">
  <link rel="canonical" href="${CONFIG.SITE_URL}/movie/${movie.id}/">
  <meta property="og:title" content="${movie.title}">
  <meta property="og:description" content="${escapeHtml(description.substring(0, 160))}">
  <meta property="og:image" content="${posterUrl}">
  <meta property="og:type" content="video.movie">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${movie.title}">
  <meta name="twitter:description" content="${escapeHtml(description.substring(0, 160))}">
  <meta name="twitter:image" content="${posterUrl}">
  <link rel="alternate" hreflang="hi" href="${CONFIG.SITE_URL}/movie/${movie.id}/">
  <link rel="alternate" hreflang="en" href="${CONFIG.SITE_URL}/en/movie/${movie.id}/">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": "${movie.title}",
    "description": "${escapeHtml(description.replace(/"/g, '\\"'))}",
    "datePublished": "${movie.release_date}",
    "image": "${posterUrl}",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "${rating}",
      "ratingCount": ${movie.vote_count}
    }
  }
  </script>
  ${CONFIG.GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${CONFIG.GA_ID}');
  </script>` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0a; color: #e5e5e5; font-family: system-ui, sans-serif; }
    body.light { background: #f0f2f5; color: #111; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .hero { background: linear-gradient(to bottom, rgba(0,0,0,0.7), #0a0a0a), url('${backdropUrl}') center/cover; min-height: 60vh; display: flex; align-items: flex-end; padding: 40px 20px; }
    h1 { font-size: 3rem; color: #e50914; }
    .poster { width: 200px; border-radius: 16px; float: left; margin-right: 30px; }
    .info { margin: 30px 0; }
    .cast-scroll, .similar-scroll { display: flex; gap: 15px; overflow-x: auto; padding: 10px 0; margin: 20px 0; }
    .cast-card { text-align: center; min-width: 80px; }
    .cast-card img { width: 70px; height: 70px; border-radius: 50%; object-fit: cover; }
    .similar-card { flex: 0 0 110px; cursor: pointer; text-align: center; }
    .similar-card img { width: 100%; border-radius: 12px; }
    .server-tabs { display: flex; gap: 12px; overflow-x: auto; margin: 20px 0; }
    .server-tab { background: #1a1a1f; border: 1px solid #333; border-radius: 40px; padding: 8px 16px; cursor: pointer; }
    .server-tab.active { background: #e50914; border-color: #e50914; color: white; }
    iframe { width: 100%; aspect-ratio: 16/9; border: none; margin: 20px 0; }
    button { background: #e50914; border: none; padding: 8px 16px; border-radius: 30px; color: white; cursor: pointer; margin: 5px; }
    .error-msg { color: #ff9999; text-align: center; margin: 20px; }
    footer { text-align: center; margin-top: 50px; padding: 20px; border-top: 1px solid #222; }
    @media (max-width: 768px) { h1 { font-size: 2rem; } .poster { width: 120px; } }
  </style>
</head>
<body>
<div class="hero"><h1>${movie.title}</h1></div>
<div class="container">
  <img class="poster" src="${posterUrl}" alt="${movie.title} poster" loading="lazy">
  <div class="info"><p>⭐ ${rating} | 📅 ${year} | 🎭 ${movie.genres}</p><p>${description}</p></div>
  <div style="clear:both"></div>
  
  <div class="server-tabs" id="serverTabs"></div>
  <iframe id="playerIframe" src="" allowfullscreen></iframe>
  <div id="errorMsg" class="error-msg" style="display:none;">⚠️ Video not loading? Try another server above.</div>
  
  <div><button id="watchlistBtn">➕ Add to Watchlist</button> <button id="shareBtn">📤 Share</button> <button id="trailerBtn">🎬 Trailer</button> <button id="themeToggle">🌙 Dark/Light</button></div>
  
  <h3>Cast & Crew</h3>${castHtml}
  <h3>Similar Movies</h3>${similarHtml}
</div>
<footer>© ${CONFIG.SITE_NAME} | <a href="/">Home</a> | <a href="#" id="dmcaLink">DMCA</a></footer>
<script>
  const movieId = ${movie.id};
  const servers = ${serversJson};
  let currentServer = 0;
  const iframe = document.getElementById('playerIframe');
  const errorDiv = document.getElementById('errorMsg');
  function loadServer(index) {
    iframe.src = servers[index].url;
    errorDiv.style.display = 'none';
    document.querySelectorAll('.server-tab').forEach((tab,i)=>tab.classList.toggle('active',i===index));
    iframe.onerror = () => { errorDiv.style.display = 'block'; };
    iframe.onload = () => { errorDiv.style.display = 'none'; };
  }
  const tabsDiv = document.getElementById('serverTabs');
  tabsDiv.innerHTML = servers.map((s,i) => '<button class="server-tab' + (i===0 ? ' active' : '') + '" data-idx="' + i + '">' + s.name + '</button>').join('');
  document.querySelectorAll('.server-tab').forEach(btn => { btn.addEventListener('click', function() { loadServer(parseInt(this.dataset.idx)); }); });
  loadServer(0);
  
  let watchlist = JSON.parse(localStorage.getItem('watchlist')||'[]');
  function updateWatchlistBtn(){ document.getElementById('watchlistBtn').innerText = watchlist.some(w=>w.id===movieId) ? '❤️ In Watchlist' : '➕ Add to Watchlist'; }
  updateWatchlistBtn();
  document.getElementById('watchlistBtn').onclick = function(){
    const idx = watchlist.findIndex(w=>w.id===movieId);
    if(idx===-1){ watchlist.push({id:movieId, title:"${movie.title}", poster:"${posterUrl}"}); alert('Added to watchlist'); }
    else{ watchlist.splice(idx,1); alert('Removed from watchlist'); }
    localStorage.setItem('watchlist',JSON.stringify(watchlist));
    updateWatchlistBtn();
  };
  document.getElementById('shareBtn').onclick = function(){
    if(navigator.share) navigator.share({title:"${movie.title}", url:window.location.href});
    else navigator.clipboard.writeText(window.location.href).then(()=>alert('Link copied!'));
  };
  document.getElementById('trailerBtn').onclick = function(){
    const key = "${movie.trailer_key || ''}";
    if(key) window.open('https://www.youtube.com/watch?v=' + key, '_blank');
    else alert('Trailer not available');
  };
  const theme = localStorage.getItem('theme')||'dark';
  document.body.classList.toggle('light', theme==='light');
  document.getElementById('themeToggle').onclick = function(){
    const isLight = document.body.classList.toggle('light');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
  };
  document.getElementById('dmcaLink').onclick = function(e){ e.preventDefault(); alert('DMCA: Contact dmca@u-tv.pages.dev'); };
</script>
</body>
</html>`;
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
  console.log(`🎉 Done! ${allMovies.length} movies generated.`);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
