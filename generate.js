import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =================== CONFIGURATION ===================
const TMDB_API_KEY = '174d0214bf933dd59b3d5ec68a0c967f';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p';
const SITE_URL = 'https://u-tv.pages.dev'; // change to your actual domain
const OUTPUT_DIR = './public';
const MAX_MOVIE_PAGES = 20; // 20 pages * 20 movies = 400 movies (increase if needed)
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

// Ensure output folders exist
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(path.join(OUTPUT_DIR, 'movie'))) fs.mkdirSync(path.join(OUTPUT_DIR, 'movie'), { recursive: true });

// Helper: fetch JSON from TMDB
async function fetchTMDB(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.append('api_key', TMDB_API_KEY);
  url.searchParams.append('language', 'hi-IN'); // Hindi first
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.append(k, v);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  const data = await res.json();
  // fallback to English if Hindi data missing for certain fields
  if (data.title === undefined && endpoint.includes('/movie/')) {
    const enUrl = new URL(`${BASE_URL}${endpoint}`);
    enUrl.searchParams.append('api_key', TMDB_API_KEY);
    enUrl.searchParams.append('language', 'en-US');
    const enRes = await fetch(enUrl);
    if (enRes.ok) return await enRes.json();
  }
  return data;
}

// Get list of popular movies (multiple pages)
async function getAllMovies() {
  let allMovies = [];
  for (let page = 1; page <= MAX_MOVIE_PAGES; page++) {
    console.log(`Fetching popular movies page ${page}...`);
    const data = await fetchTMDB('/movie/popular', { page });
    if (data.results && data.results.length) {
      allMovies.push(...data.results);
    } else break;
    await new Promise(r => setTimeout(r, 200)); // rate limit delay
  }
  return allMovies;
}

// Get detailed movie info (cast, runtime, genres)
async function getMovieDetails(id) {
  const [details, credits] = await Promise.all([
    fetchTMDB(`/movie/${id}`),
    fetchTMDB(`/movie/${id}/credits`)
  ]);
  return { ...details, credits };
}

// Escape HTML
function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

// Generate slug from title
function getSlug(title, id) {
  let slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return `${slug}-${id}`;
}

// ------------------- GENERATE MOVIE PAGE -------------------
async function generateMoviePage(movie, details) {
  const slug = getSlug(movie.title, movie.id);
  const movieDir = path.join(OUTPUT_DIR, 'movie', movie.id.toString());
  if (!fs.existsSync(movieDir)) fs.mkdirSync(movieDir, { recursive: true });
  
  const poster = movie.poster_path ? `${IMG_BASE}/w500${movie.poster_path}` : '';
  const backdrop = movie.backdrop_path ? `${IMG_BASE}/original${movie.backdrop_path}` : poster;
  const releaseYear = movie.release_date ? new Date(movie.release_date).getFullYear() : '';
  const genres = (details.genres || []).map(g => g.name).join(', ');
  const cast = (details.credits?.cast || []).slice(0, 10).map(c => c.name).join(', ');
  const runtime = details.runtime ? `${details.runtime} min` : 'N/A';
  
  // Build embed server buttons and iframes
  const serverButtons = EMBED_SERVERS.map((s, i) => `
    <button class="server-btn ${i === 0 ? 'active' : ''}" data-url="${s.url.replace('%ID%', movie.id)}">${s.name}</button>
  `).join('');
  
  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${escapeHtml(movie.title)} (${releaseYear}) - Watch Free HD | U-TV</title>
  <meta name="description" content="Watch ${escapeHtml(movie.title)} full movie free online. ${escapeHtml(movie.overview?.slice(0, 150))}...">
  <meta name="keywords" content="${escapeHtml(movie.title)}, watch free, movie streaming, ${genres}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <link rel="canonical" href="${SITE_URL}/movie/${movie.id}/">
  <meta property="og:title" content="${escapeHtml(movie.title)} (${releaseYear})">
  <meta property="og:description" content="${escapeHtml(movie.overview?.slice(0, 150))}">
  <meta property="og:image" content="https://image.tmdb.org/t/p/w780${movie.poster_path}">
  <meta property="og:url" content="${SITE_URL}/movie/${movie.id}/">
  <meta property="og:type" content="video.movie">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": "${escapeHtml(movie.title)}",
    "description": "${escapeHtml(movie.overview || '')}",
    "image": "https://image.tmdb.org/t/p/original${movie.poster_path}",
    "datePublished": "${movie.release_date}",
    "genre": ${JSON.stringify(details.genres?.map(g => g.name) || [])},
    "duration": "PT${details.runtime || 0}M",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": ${movie.vote_average || 0},
      "ratingCount": ${movie.vote_count || 0}
    },
    "actors": ${JSON.stringify((details.credits?.cast || []).slice(0, 5).map(c => c.name))}
  }
  </script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #050508; color: #e2e8f0; font-family: system-ui, 'Segoe UI', sans-serif; }
    .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
    .movie-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: url('${backdrop}') no-repeat center center/cover; filter: blur(20px) brightness(0.3); z-index: -1; }
    .movie-card { background: rgba(14, 15, 22, 0.9); border-radius: 24px; overflow: hidden; backdrop-filter: blur(10px); margin-bottom: 30px; display: flex; flex-wrap: wrap; gap: 30px; padding: 25px; }
    .poster { width: 300px; border-radius: 16px; box-shadow: 0 15px 30px rgba(0,0,0,0.5); }
    .info { flex: 1; }
    h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .meta { color: #cbd5e1; margin-bottom: 20px; font-size: 0.9rem; }
    .overview { line-height: 1.6; margin-bottom: 20px; }
    .cast { margin-top: 20px; }
    .cast h3 { margin-bottom: 10px; color: #e50914; }
    .cast-list { display: flex; flex-wrap: wrap; gap: 10px; }
    .cast-item { background: #1e1f2a; padding: 5px 12px; border-radius: 30px; font-size: 0.8rem; }
    .player-section { background: #0e0f16; border-radius: 24px; padding: 20px; margin-top: 20px; }
    .server-buttons { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
    .server-btn { background: #222; border: none; padding: 10px 20px; border-radius: 40px; color: white; cursor: pointer; transition: 0.2s; }
    .server-btn.active { background: #e50914; }
    .embed-container { position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 16px; background: black; }
    .embed-container iframe { position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none; }
    .ad-slot { background: #1a1a22; text-align: center; padding: 20px; margin: 20px 0; border-radius: 12px; }
    .footer { text-align: center; padding: 30px; border-top: 1px solid #1e1f2a; margin-top: 40px; font-size: 0.8rem; }
    @media (max-width: 768px) { .movie-card { flex-direction: column; align-items: center; } .poster { width: 200px; } h1 { font-size: 1.8rem; } }
  </style>
</head>
<body>
<div class="movie-backdrop"></div>
<div class="container">
  <div class="movie-card">
    <img class="poster" src="${poster}" alt="${escapeHtml(movie.title)}">
    <div class="info">
      <h1>${escapeHtml(movie.title)} (${releaseYear})</h1>
      <div class="meta">⭐ ${movie.vote_average?.toFixed(1)}/10 | ${runtime} | ${releaseYear} | ${genres}</div>
      <p class="overview">${escapeHtml(movie.overview || 'Synopsis not available.')}</p>
      <div class="cast"><h3>Top Cast</h3><div class="cast-list">${cast.split(',').map(name => `<div class="cast-item">${escapeHtml(name.trim())}</div>`).join('')}</div></div>
    </div>
  </div>
  <div class="player-section">
    <div class="server-buttons" id="serverButtons">${serverButtons}</div>
    <div class="embed-container" id="embedContainer">
      <iframe id="playerFrame" src="${EMBED_SERVERS[0].url.replace('%ID%', movie.id)}" allowfullscreen></iframe>
    </div>
    <div class="ad-slot">[Advertisement]</div>
  </div>
</div>
<footer class="footer">
  <p>© U-TV | All rights reserved. This site does not host any videos – all content is embedded from third-party sources.</p>
  <p><a href="${SITE_URL}/" style="color:#e50914;">Home</a> | <a href="${SITE_URL}/sitemap.xml">Sitemap</a></p>
</footer>
<script>
  document.querySelectorAll('.server-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.server-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const url = btn.dataset.url;
      document.getElementById('playerFrame').src = url;
    });
  });
</script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(movieDir, 'index.html'), html);
  console.log(`Generated: /movie/${movie.id}/`);
}

// ------------------- GENERATE HOMEPAGE -------------------
async function generateHomepage(trending, popular, topRated, nowPlaying) {
  function renderMovieRow(title, movies) {
    if (!movies.length) return '';
    return `
      <div class="movie-row">
        <h2>${title}</h2>
        <div class="movie-grid">
          ${movies.map(m => `
            <div class="movie-card" onclick="location.href='/movie/${m.id}/'">
              <img src="https://image.tmdb.org/t/p/w342${m.poster_path}" loading="lazy" alt="${escapeHtml(m.title)}">
              <div class="movie-title">${escapeHtml(m.title)}</div>
              <div class="rating">⭐ ${m.vote_average?.toFixed(1)}</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  
  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>U-TV - Watch Free Movies Online HD</title>
  <meta name="description" content="Stream thousands of free movies in HD. Latest releases, trending, popular movies. No signup required.">
  <meta name="keywords" content="free movies, watch online, movie streaming, U-TV">
  <link rel="canonical" href="${SITE_URL}/">
  <link rel="sitemap" href="/sitemap.xml">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #050508; color: #e2e8f0; font-family: system-ui, 'Segoe UI', sans-serif; }
    .header { background: rgba(5,5,8,0.95); backdrop-filter: blur(10px); position: sticky; top:0; z-index:100; padding: 15px 20px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e1f2a; }
    .logo { font-size: 1.8rem; font-weight: bold; color: #e50914; text-decoration: none; }
    .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
    .hero { height: 60vh; background: linear-gradient(135deg, #0a0a12, #010101); display: flex; align-items: center; justify-content: center; text-align: center; border-radius: 24px; margin-bottom: 40px; }
    .hero h1 { font-size: 3rem; margin-bottom: 10px; }
    .hero p { font-size: 1.2rem; margin-bottom: 20px; }
    .btn { background: #e50914; padding: 12px 30px; border-radius: 40px; text-decoration: none; color: white; display: inline-block; }
    .movie-row { margin-bottom: 50px; }
    .movie-row h2 { font-size: 1.8rem; margin-bottom: 20px; border-left: 4px solid #e50914; padding-left: 15px; }
    .movie-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
    .movie-card { background: #0e0f16; border-radius: 16px; overflow: hidden; transition: 0.2s; cursor: pointer; }
    .movie-card:hover { transform: translateY(-5px); box-shadow: 0 10px 20px rgba(229,9,20,0.2); }
    .movie-card img { width: 100%; aspect-ratio: 2/3; object-fit: cover; }
    .movie-title { padding: 8px; font-weight: 600; text-align: center; }
    .rating { padding: 0 8px 8px; text-align: center; color: #d4af37; font-size: 0.8rem; }
    .footer { background: #0a0a0f; text-align: center; padding: 30px; margin-top: 50px; border-top: 1px solid #1e1f2a; }
    @media (max-width: 768px) { .movie-grid { grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); } .hero h1 { font-size: 2rem; } }
  </style>
</head>
<body>
<header class="header">
  <div class="logo">U-TV</div>
  <div><input type="text" id="search" placeholder="Search movies..." style="padding: 8px 15px; border-radius: 30px; border: none; background: #1e1f2a; color: white;"></div>
</header>
<div class="container">
  <div class="hero">
    <div><h1>Unlimited Cinema</h1><p>Stream thousands of movies free – no signup, no ads.</p><a href="#movies" class="btn">Explore Now</a></div>
  </div>
  ${renderMovieRow('🔥 Trending Now', trending)}
  ${renderMovieRow('⭐ Popular', popular)}
  ${renderMovieRow('🏆 Top Rated', topRated)}
  ${renderMovieRow('🎬 Now Playing', nowPlaying)}
</div>
<footer class="footer">
  <p>© U-TV | All movies data from TMDB. We do not host any videos.</p>
</footer>
<script>
  document.getElementById('search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      window.location.href = '/search?q=' + encodeURIComponent(e.target.value);
    }
  });
</script>
</body>
</html>`;
  
  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), html);
  console.log('✅ Generated homepage');
}

// ------------------- GENERATE SITEMAP & ROBOTS -------------------
function generateSitemap(movies) {
  let urls = `<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`;
  for (const movie of movies) {
    urls += `<url><loc>${SITE_URL}/movie/${movie.id}/</loc><priority>0.8</priority></url>`;
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  fs.writeFileSync(path.join(OUTPUT_DIR, 'sitemap.xml'), sitemap);
  console.log('✅ Generated sitemap.xml');
}

function generateRobots() {
  fs.writeFileSync(path.join(OUTPUT_DIR, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
}

// ------------------- MAIN -------------------
(async () => {
  console.log('🚀 Starting static site generation...');
  
  // Fetch data for homepage
  console.log('Fetching trending movies...');
  const trending = (await fetchTMDB('/trending/movie/day')).results || [];
  console.log('Fetching popular movies...');
  const popular = (await fetchTMDB('/movie/popular')).results || [];
  console.log('Fetching top rated...');
  const topRated = (await fetchTMDB('/movie/top_rated')).results || [];
  console.log('Fetching now playing...');
  const nowPlaying = (await fetchTMDB('/movie/now_playing')).results || [];
  
  await generateHomepage(trending.slice(0, 20), popular.slice(0, 20), topRated.slice(0, 20), nowPlaying.slice(0, 20));
  
  // Fetch all movies for detailed pages (popular, multiple pages)
  const allMovies = await getAllMovies();
  console.log(`Total movies fetched: ${allMovies.length}`);
  
  for (const movie of allMovies) {
    const details = await getMovieDetails(movie.id);
    await generateMoviePage(movie, details);
    await new Promise(r => setTimeout(r, 150)); // delay to avoid rate limits
  }
  
  generateSitemap(allMovies);
  generateRobots();
  console.log('✅ Static site generation completed! Public folder ready for deployment.');
})();
