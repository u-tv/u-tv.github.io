#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');

const CONFIG = {
  TMDB_API_KEY: '5bf61a62fd4647aa7debed7d6f2db079',
  TMDB_IMAGE_URL: 'https://image.tmdb.org/t/p/w500',
  BACKDROP_URL: 'https://image.tmdb.org/t/p/original',
  SITE_URL: 'https://u-tv.pages.dev',
  SITE_NAME: 'U-TV',
  GA_ID: 'G-V43E3PG5RD',
  MOVIES_JSON: './movie-details.json'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m]));
}

function getYear(dateStr) {
  return (dateStr || '').split('-')[0] || '';
}

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

// ================= 10 BEST WORKING EMBED SERVERS (WORLDWIDE) =================
function getServers(movieId) {
  return [
    { name: "Server 1", url: `https://vidsrc.net/embed/movie/${movieId}` },
    { name: "Server 2", url: `https://vidsrc.xyz/embed/movie/${movieId}` },
    { name: "Server 3", url: `https://2embed.cc/embed/movie?tmdb=${movieId}` },
    { name: "Server 4", url: `https://autoembed.to/movie/tmdb/${movieId}` },
    { name: "Server 5", url: `https://multiembed.mov/directstream.php?video_id=${movieId}` },
    { name: "Server 6", url: `https://embed.su/embed/movie/${movieId}` },
    { name: "Server 7", url: `https://vidsrc.me/embed/movie?tmdb=${movieId}` },
    { name: "Server 8", url: `https://vidbinge.dev/embed/movie/${movieId}` },
    { name: "Server 9", url: `https://moviesapi.club/movie/${movieId}` },
    { name: "Server 10", url: `https://primesrc.me/embed/movie?tmdb=${movieId}` }
  ];
}

function generateMoviePage(movie) {
  const posterUrl = movie.poster_path ? CONFIG.TMDB_IMAGE_URL + movie.poster_path : '';
  const backdropUrl = movie.backdrop_path ? CONFIG.BACKDROP_URL + movie.backdrop_path : '';
  const year = getYear(movie.release_date);
  const rating = movie.vote_average.toFixed(1);
  const description = movie.overview;
  const servers = getServers(movie.id);

  let castHtml = '<div class="cast-scroll">';
  for (const actor of movie.cast.slice(0, 12)) {
    const img = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://placehold.co/70x70';
    castHtml += `<div class="cast-card"><img src="${img}" alt="${actor.name}"><span>${actor.name}</span></div>`;
  }
  castHtml += '</div>';

  let similarHtml = '<div class="similar-scroll">';
  for (const sim of movie.similar.slice(0, 8)) {
    const simPoster = sim.poster_path ? CONFIG.TMDB_IMAGE_URL + sim.poster_path : '';
    similarHtml += `<div class="similar-card" onclick="location.href='/movie/${sim.id}/'"><img src="${simPoster}" alt="${sim.title}"><span>${sim.title}</span></div>`;
  }
  similarHtml += '</div>';

  const serversJson = JSON.stringify(servers).replace(/\\/g, '\\\\');

  return `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${escapeHtml(movie.title)} (${year}) - Watch Full Movie | U-TV</title>
  <meta name="description" content="${escapeHtml(description.substring(0, 160))}">
  <link rel="canonical" href="${CONFIG.SITE_URL}/movie/${movie.id}/">
  <meta property="og:title" content="${escapeHtml(movie.title)}">
  <meta property="og:image" content="${posterUrl}">
  <meta name="twitter:card" content="summary_large_image">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": "${escapeHtml(movie.title)}",
    "description": "${escapeHtml(description.replace(/"/g, '\\"'))}",
    "datePublished": "${movie.release_date}",
    "image": "${posterUrl}",
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": "${rating}", "ratingCount": ${movie.vote_count} }
  }
  </script>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#0a0a0a; color:#e5e5e5; font-family:'Inter',sans-serif; }
    .hero { background:linear-gradient(to bottom,rgba(0,0,0,0.7),#0a0a0a), url('${backdropUrl}') center/cover; min-height:50vh; display:flex; align-items:flex-end; padding:40px 20px; }
    h1 { font-size:2.5rem; color:#e50914; }
    .container { max-width:1200px; margin:0 auto; padding:20px; }
    .poster { width:200px; border-radius:16px; float:left; margin-right:24px; }
    .cast-scroll, .similar-scroll { display:flex; gap:12px; overflow-x:auto; margin:20px 0; }
    .cast-card, .similar-card { text-align:center; min-width:80px; cursor:pointer; }
    .cast-card img { width:70px; height:70px; border-radius:50%; object-fit:cover; }
    .similar-card img { width:100%; border-radius:12px; }
    .server-tabs { display:flex; gap:12px; flex-wrap:wrap; margin:20px 0; }
    .server-tab { background:#1a1a1f; border:1px solid #333; border-radius:40px; padding:8px 16px; cursor:pointer; transition:0.2s; }
    .server-tab.active { background:#e50914; border-color:#e50914; color:white; }
    iframe { width:100%; aspect-ratio:16/9; border:none; margin:20px 0; }
    button { background:#e50914; border:none; padding:8px 16px; border-radius:30px; color:white; cursor:pointer; margin:5px; }
    footer { text-align:center; margin-top:40px; padding:20px; border-top:1px solid #222; }
    @media (max-width:768px){ h1{font-size:2rem} .poster{width:120px} }
  </style>
</head>
<body>
<div class="hero"><h1>${escapeHtml(movie.title)}</h1></div>
<div class="container">
  <img class="poster" src="${posterUrl}" alt="${escapeHtml(movie.title)}">
  <div><p>⭐ ${rating} | 📅 ${year} | 🎭 ${escapeHtml(movie.genres)}</p><p>${escapeHtml(description)}</p></div>
  <div style="clear:both"></div>

  <div class="server-tabs" id="serverTabs"></div>
  <iframe id="playerIframe" src="" allowfullscreen></iframe>
  <div id="errorMsg" style="display:none;color:#ff9999;margin:10px 0;">⚠️ Video not loading? Try another server above.</div>

  <button id="watchlistBtn">➕ Watchlist</button>
  <button id="shareBtn">📤 Share</button>
  <button id="trailerBtn">🎬 Trailer</button>
  <button id="themeToggle">🌙 Dark/Light</button>

  <h3>⭐ Cast</h3>${castHtml}
  <h3>🎬 Similar Movies</h3>${similarHtml}
</div>
<footer>© U-TV</footer>
<script>
  const movieId = ${movie.id};
  const servers = ${serversJson};
  let current = 0;
  const iframe = document.getElementById('playerIframe');
  const errorDiv = document.getElementById('errorMsg');
  function loadServer(idx) {
    iframe.src = servers[idx].url;
    errorDiv.style.display = 'none';
    document.querySelectorAll('.server-tab').forEach((btn,i)=>btn.classList.toggle('active',i===idx));
    iframe.onerror = () => errorDiv.style.display = 'block';
    iframe.onload = () => errorDiv.style.display = 'none';
  }
  const tabsDiv = document.getElementById('serverTabs');
  tabsDiv.innerHTML = servers.map((s,i) => '<button class="server-tab' + (i===0 ? ' active' : '') + '" data-idx="'+i+'">'+s.name+'</button>').join('');
  document.querySelectorAll('.server-tab').forEach(btn => btn.onclick = () => loadServer(parseInt(btn.dataset.idx)));
  loadServer(0);
  
  let watchlist = JSON.parse(localStorage.getItem('watchlist')||'[]');
  function updateWatchlistBtn(){ document.getElementById('watchlistBtn').innerText = watchlist.some(w=>w.id===movieId) ? '❤️ In Watchlist' : '➕ Add to Watchlist'; }
  updateWatchlistBtn();
  document.getElementById('watchlistBtn').onclick = () => {
    const idx = watchlist.findIndex(w=>w.id===movieId);
    if(idx===-1) watchlist.push({id:movieId, title:"${escapeHtml(movie.title)}", poster:"${posterUrl}"});
    else watchlist.splice(idx,1);
    localStorage.setItem('watchlist',JSON.stringify(watchlist));
    updateWatchlistBtn();
    alert(watchlist.some(w=>w.id===movieId)?'Added':'Removed');
  };
  document.getElementById('shareBtn').onclick = () => navigator.share ? navigator.share({title:"${escapeHtml(movie.title)}",url:location.href}) : navigator.clipboard.writeText(location.href).then(()=>alert('Link copied!'));
  document.getElementById('trailerBtn').onclick = () => { const key = "${movie.trailer_key || ''}"; if(key) window.open('https://www.youtube.com/watch?v='+key); else alert('No trailer'); };
  const theme = localStorage.getItem('theme')||'dark';
  document.body.classList.toggle('light', theme==='light');
  document.getElementById('themeToggle').onclick = () => { const isLight = document.body.classList.toggle('light'); localStorage.setItem('theme', isLight ? 'light' : 'dark'); };
</script>
</body>
</html>`;
}

function generateSitemap(movies) {
  const base = CONFIG.SITE_URL;
  const today = new Date().toISOString().split('T')[0];
  let urls = `<url><loc>${base}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`;
  for (const m of movies) {
    urls += `<url><loc>${base}/movie/${m.id}/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

async function main() {
  console.log('🚀 Generating movie pages only (homepage untouched)...');
  ensureDir('.');

  if (!fs.existsSync(CONFIG.MOVIES_JSON)) {
    console.error(`❌ movie-details.json not found!`);
    process.exit(1);
  }
  const moviesList = JSON.parse(fs.readFileSync(CONFIG.MOVIES_JSON, 'utf8'));
  const allMovies = [];

  for (const item of moviesList) {
    console.log(`Processing movie ID ${item.id}...`);
    const movie = await getMovieDetails(item.id);
    if (!movie) continue;
    allMovies.push(movie);
    const movieDir = path.join('.', 'movie', String(movie.id));
    ensureDir(movieDir);
    fs.writeFileSync(path.join(movieDir, 'index.html'), generateMoviePage(movie));
  }

  fs.writeFileSync('./sitemap.xml', generateSitemap(allMovies));
  console.log(`🎉 Success! Generated ${allMovies.length} movie pages.`);
  console.log('✅ Your homepage (index.html) was NOT overwritten.');
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
