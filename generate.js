const fs = require('fs');
const path = require('path');
const nunjucks = require('nunjucks');

// कॉन्फ़िगरेशन
const TMDB_API_KEY = '174d0214bf933dd59b3d5ec68a0c967f';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const SITE_URL = 'https://u-tv.pages.dev'; // अपना असली डोमेन बाद में बदलना
const OUTPUT_DIR = './public';
const MAX_MOVIE_PAGES = 20;  // 400 मूवीज़ (बढ़ा सकते हैं)

// 10 एम्बेड सर्वर
const EMBED_SERVERS = [
  { name: 'Server 1 (VidSrc)', url: 'https://vidsrc.to/embed/movie/%ID%' },
  { name: 'Server 2 (VidSrc 2)', url: 'https://vidsrc.xyz/embed/movie/%ID%' },
  { name: 'Server 3 (EmbedSU)', url: 'https://embed.su/embed/movie/%ID%' },
  { name: 'Server 4 (AutoEmbed)', url: 'https://autoembed.to/movie/tmdb/%ID%' },
  { name: 'Server 5 (VidLink)', url: 'https://vidlink.pro/movie/%ID%' },
  { name: 'Server 6 (MoviesAPI)', url: 'https://moviesapi.club/movie/%ID%' },
  { name: 'Server 7 (2Embed)', url: 'https://2embed.org/embed/movie/%ID%' },
  { name: 'Server 8 (SmashyStream)', url: 'https://embed.smashystream.com/movie/%ID%' },
  { name: 'Server 9 (MultiEmbed)', url: 'https://multiembed.cx/?video_id=%ID%&tmdb=1' },
  { name: 'Server 10 (VidSrc CC)', url: 'https://vidsrc.cc/v2/embed/movie/%ID%' }
];

// सुनिश्चित करें कि आउटपुट फोल्डर मौजूद है
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(path.join(OUTPUT_DIR, 'movie'))) fs.mkdirSync(path.join(OUTPUT_DIR, 'movie'), { recursive: true });

// Nunjucks एनवायरनमेंट सेट करें
nunjucks.configure({ autoescape: true });

// ---------- TMDB API हेल्पर ----------
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  url.searchParams.append('language', 'hi-IN');
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.append(k, v);
  const res = await fetch(url);
  let data = await res.json();
  if (data.results && data.results.length === 0) {
    const enUrl = new URL(`${BASE_URL}${endpoint}`);
    enUrl.searchParams.append('api_key', TMDB_API_KEY);
    enUrl.searchParams.append('language', 'en-US');
    for (const [k, v] of Object.entries(params)) if (v) enUrl.searchParams.append(k, v);
    const enRes = await fetch(enUrl);
    data = await enRes.json();
  }
  return data;
}

// सारी पॉपुलर मूवीज़ फेच करें (मल्टीपल पेज)
async function getAllMovies() {
  let allMovies = [];
  for (let page = 1; page <= MAX_MOVIE_PAGES; page++) {
    console.log(`Fetching popular movies page ${page}...`);
    const data = await fetchTMDB('/movie/popular', { page });
    if (data.results && data.results.length) allMovies.push(...data.results);
    else break;
    await new Promise(r => setTimeout(r, 200));
  }
  return allMovies;
}

// मूवी डिटेल (credits, runtime, genres)
async function getMovieDetails(id) {
  const [details, credits] = await Promise.all([
    fetchTMDB(`/movie/${id}`),
    fetchTMDB(`/movie/${id}/credits`)
  ]);
  return { ...details, credits };
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// ---------- मूवी डिटेल पेज जनरेट करना (Nunjucks टेम्पलेट के बिना – सीधा HTML स्ट्रिंग) ----------
async function generateMoviePage(movie, details) {
  const movieDir = path.join(OUTPUT_DIR, 'movie', movie.id.toString());
  if (!fs.existsSync(movieDir)) fs.mkdirSync(movieDir, { recursive: true });
  
  const poster = movie.poster_path ? `${IMG_BASE}/w500${movie.poster_path}` : '';
  const backdrop = movie.backdrop_path ? `${IMG_BASE}/original${movie.backdrop_path}` : poster;
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const runtime = details.runtime ? `${details.runtime} min` : 'N/A';
  const genres = (details.genres || []).map(g => g.name).join(', ');
  const cast = (details.credits?.cast || []).slice(0, 10).map(c => c.name).join(', ');
  
  // सर्वर बटन बनाएँ
  const serverButtons = EMBED_SERVERS.map((s, i) => `
    <button class="server-btn ${i === 0 ? 'active' : ''}" data-url="${s.url.replace('%ID%', movie.id)}">${s.name}</button>
  `).join('');
  
  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(movie.title)} (${releaseYear}) - Watch Free | U-TV</title>
  <meta name="description" content="Watch ${escapeHtml(movie.title)} full movie free online. ${escapeHtml((movie.overview || '').slice(0, 150))}...">
  <meta name="robots" content="index, follow">
  <link rel="canonical" href="${SITE_URL}/movie/${movie.id}/">
  <meta property="og:title" content="${escapeHtml(movie.title)} (${releaseYear})">
  <meta property="og:image" content="https://image.tmdb.org/t/p/w780${movie.poster_path}">
  <meta property="og:type" content="video.movie">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #050508; color: #e2e8f0; font-family: system-ui, sans-serif; }
    .backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: url('${backdrop}') no-repeat center/cover; filter: blur(20px) brightness(0.3); z-index: -1; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .movie-box { background: rgba(14,15,22,0.9); backdrop-filter: blur(10px); border-radius: 24px; display: flex; flex-wrap: wrap; gap: 30px; padding: 25px; }
    .poster { width: 280px; border-radius: 16px; }
    .info { flex: 1; }
    h1 { font-size: 2rem; margin-bottom: 10px; }
    .meta { color: #cbd5e1; margin-bottom: 15px; }
    .overview { line-height: 1.6; margin-bottom: 20px; }
    .cast h3 { color: #e50914; margin-bottom: 8px; }
    .cast-list { display: flex; flex-wrap: wrap; gap: 8px; }
    .cast-item { background: #1e1f2a; padding: 4px 12px; border-radius: 30px; font-size: 0.8rem; }
    .player-section { background: #0e0f16; border-radius: 24px; padding: 20px; margin-top: 30px; }
    .server-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
    .server-btn { background: #222; border: none; padding: 8px 18px; border-radius: 40px; color: white; cursor: pointer; }
    .server-btn.active { background: #e50914; }
    .video-container { position: relative; padding-bottom: 56.25%; height: 0; background: black; border-radius: 12px; overflow: hidden; }
    .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    footer { text-align: center; padding: 30px; margin-top: 40px; border-top: 1px solid #1e1f2a; }
    @media (max-width: 768px) { .movie-box { flex-direction: column; align-items: center; } .poster { width: 200px; } }
  </style>
</head>
<body>
<div class="backdrop"></div>
<div class="container">
  <div class="movie-box">
    <img class="poster" src="${poster}" alt="${escapeHtml(movie.title)}">
    <div class="info">
      <h1>${escapeHtml(movie.title)} (${releaseYear})</h1>
      <div class="meta">⭐ ${movie.vote_average?.toFixed(1)} | ${runtime} | ${genres}</div>
      <p class="overview">${escapeHtml(movie.overview || 'Synopsis not available.')}</p>
      <div class="cast"><h3>Cast</h3><div class="cast-list">${cast.split(',').map(name => `<div class="cast-item">${escapeHtml(name.trim())}</div>`).join('')}</div></div>
    </div>
  </div>
  <div class="player-section">
    <div class="server-buttons" id="serverButtons">${serverButtons}</div>
    <div class="video-container">
      <iframe id="playerFrame" src="${EMBED_SERVERS[0].url.replace('%ID%', movie.id)}" allowfullscreen></iframe>
    </div>
  </div>
</div>
<footer><p>© U-TV | All data from TMDB | We do not host videos</p></footer>
<script>
  document.querySelectorAll('.server-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('playerFrame').src = btn.dataset.url;
    });
  });
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(movieDir, 'index.html'), html);
  console.log(`✅ Generated: /movie/${movie.id}/`);
}

// ---------- होमपेज कॉपी करें (आपका index.html रिपो में होना चाहिए) ----------
function copyHomepage() {
  const sourceIndex = path.join(__dirname, 'index.html');
  if (fs.existsSync(sourceIndex)) {
    fs.copyFileSync(sourceIndex, path.join(OUTPUT_DIR, 'index.html'));
    console.log('✅ Homepage copied.');
  } else {
    console.error('❌ index.html not found in repository root!');
  }
}

// ---------- साइटमैप और रोबोट्स ----------
function generateSitemap(movies) {
  let urls = `<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`;
  for (const movie of movies) {
    urls += `<url><loc>${SITE_URL}/movie/${movie.id}/</loc><priority>0.8</priority></url>`;
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap);
  console.log('✅ sitemap.xml generated');
}

function generateRobots() {
  fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
  console.log('✅ robots.txt generated');
}

// ---------- मुख्य फ़ंक्शन ----------
(async () => {
  console.log('🚀 Starting static site generation...');
  const allMovies = await getAllMovies();
  console.log(`Total movies fetched: ${allMovies.length}`);
  
  for (const movie of allMovies) {
    const details = await getMovieDetails(movie.id);
    await generateMoviePage(movie, details);
    await new Promise(r => setTimeout(r, 150));
  }
  
  copyHomepage();
  generateSitemap(allMovies);
  generateRobots();
  console.log('🎉 Build complete! Output folder: ./public');
})();
