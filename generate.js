const fs = require('fs');
const path = require('path');

const TMDB_API_KEYS = [
  '174d0214bf933dd59b3d5ec68a0c967f',
  '5bf61a62fd4647aa7debed7d6f2db079'
];

const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const SITE_URL = 'https://u-tv.pages.dev';
const OUTPUT_DIR = path.join(process.cwd(), 'public');
const MAX_PAGES = 25;
const DELAY_MS = 200;

const EMBED_SERVERS = [
  { name: 'Server 1', url: 'https://vidsrc.to/embed/%TYPE%/%ID%' },
  { name: 'Server 2', url: 'https://vidsrc.xyz/embed/%TYPE%/%ID%' },
  { name: 'Server 3', url: 'https://embed.su/embed/%TYPE%/%ID%' },
  { name: 'Server 4', url: 'https://autoembed.to/%TYPE%/tmdb/%ID%' },
  { name: 'Server 5', url: 'https://vidlink.pro/%TYPE%/%ID%' },
  { name: 'Server 6', url: 'https://moviesapi.club/%TYPE%/%ID%' },
  { name: 'Server 7', url: 'https://2embed.org/embed/%TYPE%/%ID%' },
  { name: 'Server 8', url: 'https://embed.smashystream.com/%TYPE%/%ID%' },
  { name: 'Server 9', url: 'https://multiembed.cx/?video_id=%ID%&tmdb=1' },
  { name: 'Server 10', url: 'https://vidsrc.cc/v2/embed/%TYPE%/%ID%' }
];

function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}

async function fetchWithFallback(endpoint, params = {}) {
  for (const apiKey of TMDB_API_KEYS) {
    try {
      const url = new URL(`${BASE_URL}${endpoint}`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('language', params.language || 'hi-IN');
      for (const [k, v] of Object.entries(params)) {
        if (k !== 'language' && v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
      }

      const res = await fetch(url.toString(), { headers: { Accept: 'application/json' } });
      if (res.status === 401) continue;
      if (!res.ok) continue;

      let data = await res.json();

      if (data.results?.length === 0 && !endpoint.includes('/movie/') && !endpoint.includes('/tv/')) {
        const enUrl = new URL(`${BASE_URL}${endpoint}`);
        enUrl.searchParams.set('api_key', apiKey);
        enUrl.searchParams.set('language', 'en-US');
        for (const [k, v] of Object.entries(params)) {
          if (k !== 'language' && v !== undefined && v !== null && v !== '') enUrl.searchParams.set(k, v);
        }
        const enRes = await fetch(enUrl.toString(), { headers: { Accept: 'application/json' } });
        if (enRes.ok) data = await enRes.json();
      }

      if (data.results?.length) return data;
      if (!data.results && data.id) return data;
    } catch (_) {}
  }
  throw new Error('All TMDB API keys exhausted');
}

async function getContent(type) {
  const allItems = [];
  const endpoint = type === 'movie' ? '/movie/popular' : '/tv/popular';

  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`Fetching ${type} page ${page}...`);
    try {
      const data = await fetchWithFallback(endpoint, { page });
      if (data.results?.length) {
        data.results.forEach(item => item.media_type_custom = type);
        allItems.push(...data.results);
      } else {
        break;
      }
    } catch (err) {
      console.error(`Stopping ${type}: ${err.message}`);
      break;
    }
    await new Promise(r => setTimeout(r, DELAY_MS));
  }

  return allItems;
}

async function getContentDetails(type, id) {
  const [details, credits] = await Promise.all([
    fetchWithFallback(`/${type}/${id}`),
    fetchWithFallback(`/${type}/${id}/credits`)
  ]);
  return { ...details, credits };
}

function writeFileSafe(filePath, content) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function buildMovieHtml(item, details, type) {
  const title = item.title || item.name || 'Untitled';
  const poster = item.poster_path ? `${IMG_BASE}/w500${item.poster_path}` : '';
  const backdrop = item.backdrop_path ? `${IMG_BASE}/original${item.backdrop_path}` : poster;
  const releaseDate = item.release_date || item.first_air_date || 'N/A';
  const releaseYear = releaseDate !== 'N/A' ? new Date(releaseDate).getFullYear() : '';
  const runtime = type === 'movie'
    ? (details.runtime ? `${details.runtime} min` : 'N/A')
    : (details.episode_run_time?.length ? `${details.episode_run_time[0]} min` : 'N/A');

  const genres = (details.genres || []).map(g => g.name).join(', ');
  const castNames = (details.credits?.cast || []).slice(0, 10).map(c => c.name).filter(Boolean);
  const creatorOrDirector = type === 'movie'
    ? ((details.credits?.crew || []).find(c => c.job === 'Director')?.name || 'N/A')
    : ((details.created_by || []).map(c => c.name).join(', ') || 'N/A');

  const voteAverage = item.vote_average?.toFixed(1) || 'N/A';
  const voteCount = details.vote_count || 0;
  const tagline = details.tagline || '';
  const overview = details.overview || item.overview || 'No description available.';
  const pageUrl = `${SITE_URL}/${type}/${item.id}/`;

  const serverButtons = EMBED_SERVERS.map((s, i) => {
    const finalUrl = s.url.replace('%TYPE%', type).replace('%ID%', item.id);
    return `<button class="server-btn ${i === 0 ? 'active' : ''}" data-url="${finalUrl}">${escapeHtml(s.name)}</button>`;
  }).join('');

  const initialPlayerSrc = EMBED_SERVERS[0].url.replace('%TYPE%', type).replace('%ID%', item.id);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} (${releaseYear}) | U-TV</title>
  <meta name="description" content="Watch ${escapeHtml(title)} (${releaseYear}). Rating ${voteAverage}/10, duration ${runtime}, genres ${escapeHtml(genres)}.">
  <link rel="canonical" href="${pageUrl}">
  <meta property="og:title" content="${escapeHtml(title)} (${releaseYear})">
  <meta property="og:description" content="${escapeHtml(overview).slice(0, 160)}">
  <meta property="og:image" content="${poster}">
  <meta property="og:type" content="${type === 'movie' ? 'video.movie' : 'video.tv_show'}">
  <meta property="og:url" content="${pageUrl}">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#050508;color:#e2e8f0;font-family:system-ui,sans-serif}
    .backdrop{position:fixed;inset:0;background:url('${backdrop}') no-repeat center/cover;filter:blur(25px) brightness(.25);z-index:-1}
    .container{max-width:1200px;margin:0 auto;padding:20px}
    .movie-box{background:rgba(14,15,22,.92);backdrop-filter:blur(12px);border-radius:28px;display:flex;flex-wrap:wrap;gap:35px;padding:30px;border:1px solid rgba(229,9,20,.3)}
    .poster{width:280px;border-radius:20px;box-shadow:0 20px 30px -10px rgba(0,0,0,.5)}
    .info{flex:1;min-width:280px}
    h1{font-size:2rem;margin-bottom:10px}
    .tagline{font-style:italic;color:#e50914;margin-bottom:15px;font-size:1rem}
    .meta{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:20px;color:#cbd5e1;font-size:.85rem}
    .meta span{background:#1e1f2a;padding:4px 12px;border-radius:20px}
    .overview{line-height:1.6;margin-bottom:20px}
    .cast-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}
    .cast-item{background:#1e1f2a;padding:4px 14px;border-radius:30px;font-size:.8rem}
    .player-section{background:#0e0f16;border-radius:24px;padding:20px;margin-top:30px}
    .server-buttons{display:flex;flex-wrap:wrap;gap:10px;margin-bottom:15px}
    .server-btn{background:#222;border:none;padding:8px 16px;border-radius:40px;color:#fff;cursor:pointer;font-size:.8rem}
    .server-btn.active,.server-btn:hover{background:#e50914}
    .video-container{position:relative;padding-bottom:56.25%;height:0;background:#000;border-radius:12px;overflow:hidden}
    .video-container iframe{position:absolute;inset:0;width:100%;height:100%;border:none}
    .ad-container{background:#0e0f16;margin:20px 0;padding:12px;border-radius:12px;text-align:center}
    .smart-link{display:inline-block;background:#e50914;color:#fff;padding:10px 20px;border-radius:40px;text-decoration:none;font-weight:bold}
    footer{text-align:center;padding:30px;margin-top:40px;border-top:1px solid #1e1f2a;font-size:.8rem}
    footer a{color:#e50914;text-decoration:none}
    @media (max-width:768px){.movie-box{flex-direction:column;align-items:center}.poster{width:200px}}
  </style>
</head>
<body>
<div class="backdrop"></div>
<div class="container">
  <div class="movie-box">
    <img class="poster" src="${poster}" alt="${escapeHtml(title)} poster">
    <div class="info">
      <h1>${escapeHtml(title)} (${releaseYear})</h1>
      ${tagline ? `<div class="tagline">"${escapeHtml(tagline)}"</div>` : ''}
      <div class="meta">
        <span>⭐ ${voteAverage}/10 (${voteCount} votes)</span>
        <span>📅 ${releaseDate}</span>
        <span>⏱️ ${runtime}</span>
        <span>🎭 ${escapeHtml(genres || 'General')}</span>
        <span>🎬 ${type === 'movie' ? 'Director' : 'Creator'}: ${escapeHtml(creatorOrDirector)}</span>
      </div>
      <p class="overview">${escapeHtml(overview)}</p>
      <div><strong>Star Cast:</strong><div class="cast-list">${castNames.map(name => `<div class="cast-item">${escapeHtml(name)}</div>`).join('')}</div></div>
    </div>
  </div>

  <div class="ad-container">
    <script async data-cfasync="false" src="https://pl28831972.effectivegatecpm.com/e1fcb13904d27c4fe4e794fb5b4db78d/invoke.js"></script>
    <div id="container-e1fcb13904d27c4fe4e794fb5b4db78d"></div>
  </div>

  <div class="player-section">
    <div class="server-buttons" id="serverButtons">${serverButtons}</div>
    <div class="video-container">
      <iframe id="playerFrame" src="${initialPlayerSrc}" allowfullscreen></iframe>
    </div>
  </div>

  <div class="ad-container">
    <a class="smart-link" href="https://www.effectivegatecpm.com/sa8mca36sv?key=3711015d24018cf89ccb362976c4a2e0" target="_blank" rel="noopener noreferrer">Open Smart Link</a>
  </div>
</div>

<footer>
  <p>© U-TV | TMDB data | DMCA: <a href="mailto:help.wowmovies@gmail.com">help.wowmovies@gmail.com</a></p>
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
}

function copyHomepage() {
  const sourceIndex = path.join(process.cwd(), 'index.html');
  const destIndex = path.join(OUTPUT_DIR, 'index.html');
  if (!fs.existsSync(sourceIndex)) throw new Error('Root index.html not found');
  fs.copyFileSync(sourceIndex, destIndex);
}

function generateSitemap(items) {
  const today = new Date().toISOString().split('T')[0];
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`;
  xml += `  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod><priority>1.0</priority></url>
`;
  for (const item of items) {
    const type = item.media_type_custom;
    xml += `  <url><loc>${SITE_URL}/${type}/${item.id}/</loc><lastmod>${today}</lastmod><priority>0.8</priority></url>
`;
  }
  xml += `</urlset>`;
  writeFileSafe(path.join(OUTPUT_DIR, 'sitemap.xml'), xml);
}

function generateRobots() {
  const txt = `User-agent: *
Allow: /
Sitemap: ${SITE_URL}/sitemap.xml
`;
  writeFileSafe(path.join(OUTPUT_DIR, 'robots.txt'), txt);
}

function generateRedirects() {
  const txt = `/about /about/ 301
/dmca /dmca/ 301
/disclaimer /disclaimer/ 301
/contact /contact/ 301
/privacy /privacy/ 301
/terms /terms/ 301
/movie/* /movie/:splat/ 200
/tv/* /tv/:splat/ 200
`;
  writeFileSafe(path.join(OUTPUT_DIR, '_redirects'), txt);
}

function generateHeaders() {
  const txt = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=()
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  Cache-Control: public, max-age=0, must-revalidate
`;
  writeFileSafe(path.join(OUTPUT_DIR, '_headers'), txt);
}

(async () => {
  try {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });

    copyHomepage();

    const movies = await getContent('movie');
    const tvShows = await getContent('tv');
    const allContent = [...movies, ...tvShows];

    for (let i = 0; i < movies.length; i++) {
      const item = movies[i];
      const details = await getContentDetails('movie', item.id).catch(() => null);
      if (details) {
        writeFileSafe(path.join(OUTPUT_DIR, 'movie', String(item.id), 'index.html'), buildMovieHtml(item, details, 'movie'));
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }

    for (let i = 0; i < tvShows.length; i++) {
      const item = tvShows[i];
      const details = await getContentDetails('tv', item.id).catch(() => null);
      if (details) {
        writeFileSafe(path.join(OUTPUT_DIR, 'tv', String(item.id), 'index.html'), buildMovieHtml(item, details, 'tv'));
      }
      await new Promise(r => setTimeout(r, DELAY_MS));
    }

    generateSitemap(allContent);
    generateRobots();
    generateRedirects();
    generateHeaders();

    console.log(`Done. Total Pages Generated: ${allContent.length}. Output: ${OUTPUT_DIR}`);
  } catch (err) {
    console.error(`Build failed: ${err.message}`);
    process.exitCode = 1;
  }
})();
