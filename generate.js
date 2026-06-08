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
const OUTPUT_DIR = './';
const MAX_PAGES = 50;
const DELAY_MS = 200;

// ✅ 10 WORKING EMBED SERVERS
const EMBED_SERVERS = [
  { name: 'Server 1 (VidSrc.to)', url: 'https://vidsrc.to/embed/movie/%ID%' },
  { name: 'Server 2 (VidSrc.xyz)', url: 'https://vidsrc.xyz/embed/movie/%ID%' },
  { name: 'Server 3 (Embed.su)', url: 'https://embed.su/embed/movie/%ID%' },
  { name: 'Server 4 (AutoEmbed.to)', url: 'https://autoembed.to/movie/tmdb/%ID%' },
  { name: 'Server 5 (VidLink.pro)', url: 'https://vidlink.pro/movie/%ID%' },
  { name: 'Server 6 (MoviesAPI.club)', url: 'https://moviesapi.club/movie/%ID%' },
  { name: 'Server 7 (2Embed.cc)', url: 'https://2embed.org/embed/movie/%ID%' },
  { name: 'Server 8 (SmashyStream)', url: 'https://embed.smashystream.com/movie/%ID%' },
  { name: 'Server 9 (MultiEmbed.cx)', url: 'https://multiembed.cx/?video_id=%ID%&tmdb=1' },
  { name: 'Server 10 (VidSrc.cc)', url: 'https://vidsrc.cc/v2/embed/movie/%ID%' }
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
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (res.status === 401) {
        console.warn(`⚠️ Key ${apiKey.slice(0,8)}... 401, trying next...`);
        continue;
      }
      if (!res.ok) continue;
      
      let data = await res.json();
      
      if (data.results?.length === 0 && !endpoint.includes('/movie/')) {
        const enUrl = new URL(`${BASE_URL}${endpoint}`);
        enUrl.searchParams.append('api_key', apiKey);
        enUrl.searchParams.append('language', 'en-US');
        for (const [k, v] of Object.entries(params)) if (v) enUrl.searchParams.append(k, v);
        
        const enRes = await fetch(enUrl.toString());
        if (enRes.ok) data = await enRes.json();
      }
      
      if (data.results?.length) return data;
      if (!data.results && data.id) return data;
    } catch (e) { 
      console.warn(`❌ Error: ${e.message}`); 
    }
  }
  throw new Error('All TMDB API keys exhausted');
}

async function getAllMovies() {
  let allMovies = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`Fetching page ${page}...`);
    try {
      const data = await fetchWithFallback('/movie/popular', { page });
      if (data.results?.length) {
        allMovies.push(...data.results);
        console.log(`   Got ${data.results.length} movies`);
      } else break;
    } catch (err) {
      console.error(`Stopping: ${err.message}`);
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
  const releaseDate = movie.release_date || 'N/A';
  const runtime = details.runtime ? `${details.runtime} min` : 'N/A';
  const genres = (details.genres || []).map(g => g.name).join(', ');
  const cast = (details.credits?.cast || []).slice(0, 10).map(c => c.name).join(', ');
  const director = (details.credits?.crew || []).find(c => c.job === 'Director')?.name || 'N/A';
  const voteAverage = movie.vote_average?.toFixed(1) || 'N/A';
  const voteCount = details.vote_count || 0;
  const tagline = details.tagline || '';
  const overview = movie.overview || 'No description available.';

  // Server buttons with active class on first
  const serverButtons = EMBED_SERVERS.map((s, i) => `<button class="server-btn ${i === 0 ? 'active' : ''}" data-url="${s.url.replace('%ID%', movie.id)}">${s.name}</button>`).join('');

  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(movie.title)} (${releaseYear}) - Watch Free HD Online | U-TV</title>
  <meta name="description" content="Watch ${escapeHtml(movie.title)} (${releaseYear}) full movie free online in HD. ⭐ ${voteAverage}/10 | ${runtime} | ${genres}. Starring: ${escapeHtml(cast.substring(0, 100))}">
  <meta name="keywords" content="${escapeHtml(movie.title)}, watch ${escapeHtml(movie.title)} online, free movie, ${releaseYear} movies, ${genres}, hindi dubbed">
  <link rel="canonical" href="${SITE_URL}/movie/${movie.id}/">
  <meta property="og:title" content="${escapeHtml(movie.title)} (${releaseYear})">
  <meta property="og:description" content="${escapeHtml(overview.substring(0, 160))}">
  <meta property="og:image" content="${poster}">
  <meta property="og:type" content="video.movie">
  <meta property="og:url" content="${SITE_URL}/movie/${movie.id}/">
  <meta name="twitter:card" content="summary_large_image">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #050508; color: #e2e8f0; font-family: system-ui, sans-serif; }
    .backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: url('${backdrop}') no-repeat center/cover; filter: blur(25px) brightness(0.25); z-index: -1; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .movie-box { background: rgba(14,15,22,0.92); backdrop-filter: blur(12px); border-radius: 28px; display: flex; flex-wrap: wrap; gap: 35px; padding: 30px; border: 1px solid rgba(229,9,20,0.3); }
    .poster { width: 280px; border-radius: 20px; box-shadow: 0 20px 30px -10px rgba(0,0,0,0.5); }
    .info { flex: 1; }
    h1 { font-size: 2rem; margin-bottom: 10px; }
    .tagline { font-style: italic; color: #e50914; margin-bottom: 15px; font-size: 1rem; }
    .meta { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; color: #cbd5e1; font-size: 0.85rem; }
    .meta span { background: #1e1f2a; padding: 4px 12px; border-radius: 20px; }
    .overview { line-height: 1.6; margin-bottom: 20px; }
    .cast-list { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; }
    .cast-item { background: #1e1f2a; padding: 4px 14px; border-radius: 30px; font-size: 0.8rem; }
    .player-section { background: #0e0f16; border-radius: 24px; padding: 20px; margin-top: 30px; }
    .server-buttons { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 15px; }
    .server-btn { background: #222; border: none; padding: 8px 16px; border-radius: 40px; color: white; cursor: pointer; font-size: 0.8rem; transition: 0.2s; }
    .server-btn:hover { background: #e50914; transform: scale(0.98); }
    .server-btn.active { background: #e50914; }
    .video-container { position: relative; padding-bottom: 56.25%; height: 0; background: black; border-radius: 12px; overflow: hidden; }
    .video-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .ad-container { background: #0e0f16; margin: 20px 0; padding: 12px; border-radius: 12px; text-align: center; }
    .smart-link { display: inline-block; background: #e50914; color: white; padding: 10px 20px; border-radius: 40px; text-decoration: none; font-weight: bold; }
    footer { text-align: center; padding: 30px; margin-top: 40px; border-top: 1px solid #1e1f2a; font-size: 0.8rem; }
    footer a { color: #e50914; text-decoration: none; }
    @media (max-width: 768px) { .movie-box { flex-direction: column; align-items: center; } .poster { width: 200px; } .server-btn { padding: 6px 12px; font-size: 0.7rem; } }
  </style>
</head>
<body>
<div class="backdrop"></div>
<div class="container">
  <div class="movie-box">
    <img class="poster" src="${poster}" alt="${escapeHtml(movie.title)} poster">
    <div class="info">
      <h1>${escapeHtml(movie.title)} (${releaseYear})</h1>
      ${tagline ? `<div class="tagline">✨ "${escapeHtml(tagline)}"</div>` : ''}
      <div class="meta">
        <span>⭐ ${voteAverage}/10 (${voteCount} votes)</span>
        <span>📅 ${releaseDate}</span>
        <span>⏱️ ${runtime}</span>
        <span>🎭 ${genres || 'General'}</span>
        <span>🎬 Director: ${escapeHtml(director)}</span>
      </div>
      <p class="overview">${escapeHtml(overview)}</p>
      <div><strong>🎭 Star Cast:</strong><div class="cast-list">${cast.split(',').map(name => `<div class="cast-item">${escapeHtml(name.trim())}</div>`).join('')}</div></div>
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
<footer>
  <p>© U-TV | All data from TMDB | DMCA: <a href="mailto:HELP.WOWMOVIES@GMAIL.COM">HELP.WOWMOVIES@GMAIL.COM</a></p>
  <p><a href="/">Home</a> | <a href="/sitemap.xml">Sitemap</a></p>
</footer>
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

// ✅ FIXED SITEMAP - Sahi format mein
function generateSitemap(movies) {
  let urls = '<?xml version="1.0" encoding="UTF-8"?>\n';
  urls += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  
  // Homepage
  urls += `  <url>\n    <loc>${SITE_URL}/</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <priority>1.0</priority>\n  </url>\n`;
  
  // Movie pages - sahi format mein
  for (const movie of movies) {
    urls += `  <url>\n    <loc>${SITE_URL}/movie/${movie.id}/</loc>\n    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>\n    <priority>0.8</priority>\n  </url>\n`;
  }
  
  urls += '</urlset>';
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), urls);
  console.log('✅ sitemap.xml generated correctly with', movies.length, 'movies');
}

function generateRobots() {
  const robots = `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n\n# Crawl delay for bots\nCrawl-delay: 1\n\n# Block unwanted bots\nUser-agent: GPTBot\nDisallow: /\n\nUser-agent: CCBot\nDisallow: /`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), robots);
  console.log('✅ robots.txt generated');
}

// ========== MAIN FUNCTION ==========
(async () => {
  console.log('🚀 Starting movie page generation...');
  console.log('📡 Fetching movies from TMDB...');
  
  try {
    const allMovies = await getAllMovies();
    console.log(`🎬 Total ${allMovies.length} movies fetched.`);
    
    // Clean old movie folders (optional - comment if you want to keep)
    if (fs.existsSync('./movie')) {
      console.log('🗑️ Cleaning old movie folders...');
      fs.rmSync('./movie', { recursive: true, force: true });
    }
    fs.mkdirSync('./movie', { recursive: true });
    
    for (let i = 0; i < allMovies.length; i++) {
      console.log(`📝 Generating page ${i+1}/${allMovies.length}: ${allMovies[i].title}`);
      const details = await getMovieDetails(allMovies[i].id).catch(() => null);
      if (details) {
        await generateMoviePage(allMovies[i], details);
      } else {
        console.log(`   ⚠️ Skipping ${allMovies[i].title} - details not found`);
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }
    
    generateSitemap(allMovies);
    generateRobots();
    console.log('🎉 Build complete successfully!');
    console.log('✅ Sitemap URL:', SITE_URL + '/sitemap.xml');
    console.log('✅ Robots URL:', SITE_URL + '/robots.txt');
    
  } catch (err) {
    console.error(`❌ Build Failed: ${err.message}`);
  }
})();
