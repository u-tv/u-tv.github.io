const fs = require('fs');
const path = require('path');

// ==================== CONFIG ====================
const TMDB_API_KEYS = [
  '174d0214bf933dd59b3d5ec68a0c967f',
  '5bf61a62fd4647aa7debed7d6f2db079'
];
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const SITE_URL = 'https://u-tv.pages.dev';
const OUTPUT_DIR = './public';
const MAX_PAGES = 100;
const DELAY_MS = 200;

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

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

async function fetchWithFallback(endpoint, params = {}) {
  for (const apiKey of TMDB_API_KEYS) {
    try {
      const url = new URL(`${BASE_URL}${endpoint}`);
      url.searchParams.append('api_key', apiKey);
      url.searchParams.append('language', 'hi-IN');
      
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null) url.searchParams.append(k, v);
      }

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });

      if (res.status === 401) {
        console.warn(`⚠️ TMDB Key ${apiKey.slice(0, 8)}... returned 401. Trying next key...`);
        continue; 
      }
      if (!res.ok) continue;
      
      let data = await res.json();
      
      if (data.results?.length === 0 && !endpoint.includes('/movie/')) {
        const enUrl = new URL(`${BASE_URL}${endpoint}`);
        enUrl.searchParams.append('api_key', apiKey);
        enUrl.searchParams.append('language', 'en-US');
        for (const [k, v] of Object.entries(params)) if (v) enUrl.searchParams.append(k, v);
        
        const enRes = await fetch(enUrl.toString(), {
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        if (enRes.ok) data = await enRes.json();
      }
      
      if (data.results?.length) return data;
      if (!data.results && data.id) return data;
    } catch (e) { 
      console.warn(`❌ Network error for key ${apiKey.slice(0,8)}... : ${e.message}`); 
    }
  }
  throw new Error('All TMDB API keys exhausted or strictly blocked (401)');
}

async function getAllMovies() {
  let allMovies = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`Fetching page ${page}...`);
    try {
      const data = await fetchWithFallback('/movie/popular', { page });
      if (data.results?.length) allMovies.push(...data.results);
      else break;
    } catch (err) {
      console.error(`Stopping fetch loop: ${err.message}`);
      break;
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  return allMovies;
}

async function getMovieDetails(id) {
  const [details, credits] = await Promise.all([
    fetchWithFallback(`/movie/${id}`),
    fetchWithFallback(`/movie/${id}/credits`)
  ]);
  return { ...details, credits };
}

async function generateMoviePage(movie, details) {
  const movieDir = path.join(OUTPUT_DIR, 'movie', movie.id.toString());
  if (!fs.existsSync(movieDir)) fs.mkdirSync(movieDir, { recursive: true });

  const poster = movie.poster_path ? `${IMG_BASE}/w500${movie.poster_path}` : '';
  const backdrop = movie.backdrop_path ? `${IMG_BASE}/original${movie.backdrop_path}` : poster;
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const runtime = details.runtime ? `${details.runtime} min` : 'N/A';
  const genres = (details.genres || []).map(g => g.name).join(', ');
  const cast = (details.credits?.cast || []).slice(0, 10).map(c => c.name).join(', ');

  const serverButtons = EMBED_SERVERS.map((s, i) => `<button class="server-btn ${i === 0 ? 'active' : ''}" data-url="${s.url.replace('%ID%', movie.id)}">${s.name}</button>`).join('');

  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(movie.title)} (${releaseYear}) - Watch Free HD | U-TV</title>
  <meta name="description" content="Watch ${escapeHtml(movie.title)} full movie free online. ${escapeHtml((movie.overview || '').slice(0, 150))}...">
  <link rel="canonical" href="${SITE_URL}/movie/${movie.id}/">
  <meta property="og:title" content="${escapeHtml(movie.title)} (${releaseYear})">
  <meta property="og:image" content="${IMG_BASE}/w780${movie.poster_path}">
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
    .cast-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .cast-item { background: #1e1f2a; padding: 4px 12px; border-radius: 30px; font-size: 0.8rem; }
    .player-section { background: #0e0f16; border-radius: 24px; padding: 20px; margin-top: 30px; }
    .server-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
    .server-btn { background: #222; border: none; padding: 8px 18px; border-radius: 40px; color: white; cursor: pointer; }
    .server-btn.active { background: #e50914; }
    .video-container { position: relative; padding-bottom: 56.25%; height: 0; background: black; border-radius: 12px; overflow: hidden; }
    .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .ad-container { background: #0e0f16; margin: 20px 0; padding: 12px; border-radius: 12px; text-align: center; }
    .smart-link { display: inline-block; background: #e50914; color: white; padding: 10px 20px; border-radius: 40px; text-decoration: none; font-weight: bold; }
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
      <div><strong>Cast:</strong><div class="cast-list">${cast.split(',').map(name => `<div class="cast-item">${escapeHtml(name.trim())}</div>`).join('')}</div></div>
    </div>
  </div>
  <div class="ad-container">
    <script async data-cfasync="false" src="https://pl28831952.effectivegatecpm.com/e1fcb13904d27c4fe4e794fb5b4db78d/invoke.js"></script>
    <div id="container-e1fcb13904d27c4fe4e794fb5b4db78d"></div>
  </div>
  <div class="player-section">
    <div class="server-buttons" id="serverButtons">${serverButtons}</div>
    <div class="video-container">
      <iframe id="playerFrame" src="${EMBED_SERVERS[0].url.replace('%ID%', movie.id)}" allowfullscreen></iframe>
    </div>
  </div>
  <div class="ad-container">
    <a class="smart-link" href="https://www.effectivegatecpm.com/sa8mca36sv?key=3711015d24018cf89ccb362976c4a2e0" target="_blank">⚡ High‑Speed Stream Mirror / Download</a>
  </div>
</div>
<footer><p>© U-TV | All data from TMDB | DMCA: <a href="mailto:HELP.WOWMOVIES@GMAIL.COM">HELP.WOWMOVIES@GMAIL.COM</a></p></footer>
<script src="https://pl28831952.effectivegatecpm.com/08/eb/75/08eb7538aa9646008f732c0721d2a5cc.js"></script>
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
  console.log(`✅ Movie: /movie/${movie.id}/`);
}

function copyAllFilesRecursively(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === path.basename(OUTPUT_DIR)) continue;
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) copyAllFilesRecursively(srcPath, destPath);
    else fs.copyFileSync(srcPath, destPath);
  }
}

function getAllFilesRecursively(dir, baseDir = '') {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === path.basename(OUTPUT_DIR)) continue;
    const fullPath = path.join(dir, entry.name);
    const relPath = baseDir ? path.join(baseDir, entry.name) : entry.name;
    if (entry.isDirectory()) results = results.concat(getAllFilesRecursively(fullPath, relPath));
    else results.push({ name: entry.name, path: relPath, fullPath });
  }
  return results;
}

function injectAllFilesIntoHomepage() {
  const sourceIndex = path.join(process.cwd(), 'index.html');
  if (!fs.existsSync(sourceIndex)) { console.error('index.html not found'); return; }
  let html = fs.readFileSync(sourceIndex, 'utf8');
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
  console.log(`✅ Homepage successfully copied to public without file injection.`);
}

function generateSitemap(movies, allFiles) {
  let urls = `<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`;
  for (const movie of movies) urls += `<url><loc>${SITE_URL}/movie/${movie.id}/</loc><priority>0.8</priority></url>`;
  for (const file of allFiles) {
    if (!file.path.startsWith('movie/') && !file.path.startsWith('public/')) {
      urls += `<url><loc>${SITE_URL}/${file.path.replace(/\\/g, '/')}</loc><priority>0.5</priority></url>`;
    }
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), `<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
}

function generateRobots() {
  fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
}

(async () => {
  console.log('🚀 Generating site...');
  const rootDir = process.cwd();
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  copyAllFilesRecursively(rootDir, OUTPUT_DIR);
  const allFiles = getAllFilesRecursively(rootDir);
  console.log(`📄 Copied ${allFiles.length} repo files.`);

  try {
    const allMovies = await getAllMovies();
    console.log(`🎬 ${allMovies.length} movies fetched.`);
    for (let i = 0; i < allMovies.length; i++) {
      const details = await getMovieDetails(allMovies[i].id).catch(() => null);
      if (details) {
        await generateMoviePage(allMovies[i], details);
      }
      console.log(`   ${i+1}/${allMovies.length}`);
    }
    injectAllFilesIntoHomepage();
    generateSitemap(allMovies, allFiles);
    generateRobots();
    console.log('🎉 Build complete successfully!');
  } catch (err) {
    console.error(`❌ Build Failed critical error: ${err.message}`);
  }
})();
