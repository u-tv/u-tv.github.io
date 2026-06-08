// scraper.js – 100% Working with vidsrc.in
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '174d0214bf933dd59b3d5ec68a0c967f';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const SITE_URL = 'https://u-tv.pages.dev';
const MAX_MOVIES = 100;
const DELAY_MS = 300;

// ✅ ONLY WORKING SERVERS (vidsrc.in is best)
const WORKING_SERVERS = [
  'https://vidsrc.in/embed/movie/%ID%',
  'https://vidsrc.net/embed/movie/%ID%',
  'https://embed.su/embed/movie/%ID%',
  'https://www.2embed.cc/embed/movie/%ID%'
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' })[m]);
}

async function fetchTMDB(endpoint) {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}&language=hi-IN`;
  let res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  let data = await res.json();
  if ((data.results && data.results.length === 0) || !data.title) {
    const enUrl = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}&language=en-US`;
    const enRes = await fetch(enUrl);
    if (enRes.ok) data = await enRes.json();
  }
  return data;
}

async function getMovies() {
  const data = await fetchTMDB('/movie/popular?page=1');
  return data.results.slice(0, MAX_MOVIES);
}

async function getMovieDetails(id) {
  return await fetchTMDB(`/movie/${id}?append_to_response=credits,videos`);
}

async function generateMoviePage(movie, details) {
  const movieDir = path.join('movie', movie.id.toString());
  if (!fs.existsSync(movieDir)) fs.mkdirSync(movieDir, { recursive: true });

  const title = details.title;
  const poster = details.poster_path ? IMG_BASE + details.poster_path : '';
  const backdrop = details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : poster;
  const rating = details.vote_average?.toFixed(1) || 'N/A';
  const year = (details.release_date || '').split('-')[0] || 'N/A';
  const runtime = details.runtime ? `${details.runtime} min` : 'N/A';
  const genres = (details.genres || []).map(g => g.name).join(', ') || 'General';
  const overview = details.overview || 'No description available.';
  const tagline = details.tagline || '';
  const voteCount = details.vote_count || 0;
  const cast = (details.credits?.cast || []).slice(0, 8).map(c => c.name).join(', ');
  const trailer = (details.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');

  // Build server buttons from WORKING_SERVERS
  let serverButtons = '';
  for (let s of WORKING_SERVERS) {
    const url = s.replace('%ID%', movie.id);
    serverButtons += `<button class="server-btn" data-url="${url}">${s.split('/')[2]}</button>`;
  }
  if (trailer) {
    serverButtons += `<button class="server-btn" data-url="https://www.youtube.com/embed/${trailer.key}">🎬 Official Trailer</button>`;
  }

  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} (${year}) - Watch Free HD | U-TV</title>
  <meta name="description" content="${escapeHtml(overview.substring(0,160))}">
  <link rel="canonical" href="${SITE_URL}/movie/${movie.id}">
  <meta property="og:title" content="${escapeHtml(title)} (${year})">
  <meta property="og:image" content="${backdrop}">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#050508;color:#fff;font-family:sans-serif;padding:20px}
    .container{max-width:1000px;margin:0 auto}
    .backdrop{width:100%;border-radius:20px;margin-bottom:20px}
    .info{background:#1e1f2a;border-radius:20px;padding:20px;margin-bottom:20px}
    h1{color:#e50914}
    .meta{color:#aaa;margin:10px 0;display:flex;gap:20px;flex-wrap:wrap}
    .server-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}
    .server-btn{background:#e50914;border:none;padding:8px 14px;border-radius:40px;cursor:pointer;color:#fff;font-weight:bold}
    .server-btn:hover{background:#b00710}
    .player{position:relative;padding-bottom:56.25%;height:0;margin-top:20px}
    .player iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:16px}
    .footer{text-align:center;margin-top:30px;color:#666}
  </style>
</head>
<body>
<div class="container">
  <img class="backdrop" src="${backdrop}" alt="${escapeHtml(title)}">
  <div class="info">
    <h1>${escapeHtml(title)} (${year})</h1>
    ${tagline ? `<p>✨ ${escapeHtml(tagline)}</p>` : ''}
    <div class="meta">⭐ ${rating} (${voteCount}) | 📅 ${year} | ⏱️ ${runtime} | 🎭 ${genres}</div>
    <p>${escapeHtml(overview)}</p>
    <div><strong>Cast:</strong> ${escapeHtml(cast)}</div>
    <div><strong>Streaming Servers:</strong></div>
    <div class="server-buttons">${serverButtons}</div>
  </div>
  <div class="player"><iframe id="playerFrame" src="${WORKING_SERVERS[0].replace('%ID%', movie.id)}" allowfullscreen></iframe></div>
  <div class="footer"><a href="/" style="color:#e50914;">← Back to Home</a> | © U-TV</div>
</div>
<script>
  document.querySelectorAll('.server-btn').forEach(btn => {
    btn.onclick = () => document.getElementById('playerFrame').src = btn.dataset.url;
  });
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(movieDir, 'index.html'), html);
  console.log(`✅ Generated /movie/${movie.id}/`);
}

// ========== SITEMAP & ROBOTS (No homepage overwrite) ==========
function generateSitemap(movies) {
  let urls = `<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`;
  for (let m of movies) {
    urls += `<url><loc>${SITE_URL}/movie/${m.id}</loc><priority>0.8</priority></url>`;
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  fs.writeFileSync('sitemap.xml', sitemap);
  fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
  console.log('✅ sitemap.xml & robots.txt updated');
}

// ========== MAIN ==========
(async () => {
  console.log('🚀 Starting movie page generation...');
  const movies = await getMovies();
  console.log(`📦 Fetched ${movies.length} movies.`);

  if (fs.existsSync('./movie')) fs.rmSync('./movie', { recursive: true, force: true });
  fs.mkdirSync('./movie');

  for (let i = 0; i < movies.length; i++) {
    const details = await getMovieDetails(movies[i].id);
    await generateMoviePage(movies[i], details);
    console.log(`   Progress: ${i+1}/${movies.length}`);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  generateSitemap(movies);
  console.log('🎉 All movie pages generated! Your custom index.html remains untouched.');
})();
