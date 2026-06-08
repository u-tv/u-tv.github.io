// scraper.js – TMDB API + Embed Server Scraper (Auto-Sync)
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

// ========== CONFIGURATION ==========
const TMDB_API_KEY = process.env.TMDB_API_KEY || '174d0214bf933dd59b3d5ec68a0c967f';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const SITE_URL = 'https://u-tv.pages.dev';   // आपका मुख्य डोमेन
const MAX_MOVIES = 100;   // कितनी मूवीज प्रोसेस करनी हैं (ज्यादा रखेंगे तो बिल्ड टाइम बढ़ेगा)
const DELAY_MS = 300;      // API रेट लिमिट से बचने के लिए

// फॉलबैक सर्वर (अगर स्क्रैपिंग से कम मिलें)
const FALLBACK_SERVERS = [
  'https://vidsrc.to/embed/movie/%ID%',
  'https://autoembed.to/movie/tmdb/%ID%',
  'https://multiembed.cx/?video_id=%ID%&tmdb=1',
  'https://2embed.org/embed/movie/%ID%',
  'https://vidlink.pro/movie/%ID%',
  'https://moviesapi.club/movie/%ID%',
  'https://embed.su/embed/movie/%ID%',
  'https://vidsrc.cc/v2/embed/movie/%ID%',
  'https://embed.smashystream.com/movie/%ID%',
  'https://vidsrc.xyz/embed/movie/%ID%'
];

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' })[m]);
}

// ========== TMDB API ==========
async function fetchTMDB(endpoint) {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}&language=hi-IN`;
  const res = await fetch(url);
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

// ========== एम्बेड लिंक्स स्क्रैप करना ==========
async function scrapeEmbedLinks(movieId) {
  const sources = [
    `https://2embed.org/embed/tmdb/movie?id=${movieId}`,
    `https://vidsrc.pro/embed/movie/${movieId}`,
    `https://multiembed.cx/?video_id=${movieId}&tmdb=1`,
    `https://embed.su/embed/movie/${movieId}`
  ];
  let foundLinks = [];
  for (const src of sources) {
    try {
      const { data } = await axios.get(src, { timeout: 5000, headers: { 'User-Agent': 'Mozilla/5.0' } });
      const $ = cheerio.load(data);
      $('iframe').each((i, el) => {
        let srcUrl = $(el).attr('src');
        if (srcUrl && srcUrl.startsWith('http')) {
          foundLinks.push(srcUrl);
        }
      });
      if (foundLinks.length >= 10) break;
    } catch(e) { /* ignore */ }
  }
  return [...new Set(foundLinks)];
}

// ========== मूवी डिटेल (जेनर, कास्ट, आदि) ==========
async function getMovieDetails(id) {
  const details = await fetchTMDB(`/movie/${id}?append_to_response=credits,videos`);
  return details;
}

// ========== मूवी पेज जनरेट करना ==========
async function generateMoviePage(movie, details, embedLinks) {
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

  // स्क्रैप किए हुए लिंक + फॉलबैक (10 बटन बनाने के लिए)
  let allServers = [...embedLinks];
  if (allServers.length < 10) {
    for (let fb of FALLBACK_SERVERS) {
      if (allServers.length >= 10) break;
      allServers.push(fb.replace('%ID%', movie.id));
    }
  }
  allServers = [...new Set(allServers)].slice(0, 10);

  let serverButtons = '';
  for (let i = 0; i < allServers.length; i++) {
    serverButtons += `<button class="server-btn" data-url="${allServers[i]}">Server ${i+1}</button>`;
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
  <meta property="og:type" content="video.movie">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": "${escapeHtml(title)}",
    "description": "${escapeHtml(overview.replace(/"/g, '\\"'))}",
    "image": "https://image.tmdb.org/t/p/original${details.poster_path || ''}",
    "datePublished": "${details.release_date || ''}",
    "genre": ${JSON.stringify(genres.split(', '))},
    "duration": "PT${details.runtime || 0}M",
    "aggregateRating": { "@type": "AggregateRating", "ratingValue": ${details.vote_average || 0}, "ratingCount": ${details.vote_count || 0} }
  }
  </script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#050508;color:#fff;font-family:sans-serif;padding:20px}
    .container{max-width:1000px;margin:0 auto}
    .backdrop{width:100%;border-radius:20px;margin-bottom:20px}
    .info{background:#1e1f2a;border-radius:20px;padding:20px;margin-bottom:20px}
    h1{color:#e50914;margin-bottom:10px}
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
  <img class="backdrop" src="${backdrop}" alt="${escapeHtml(title)} backdrop">
  <div class="info">
    <h1>${escapeHtml(title)} (${year})</h1>
    ${tagline ? `<p style="color:#aaa;">✨ ${escapeHtml(tagline)}</p>` : ''}
    <div class="meta">⭐ ${rating} (${voteCount} votes) | 📅 ${year} | ⏱️ ${runtime} | 🎭 ${genres}</div>
    <p>${escapeHtml(overview)}</p>
    <div><strong>🎭 Cast:</strong> ${escapeHtml(cast) || 'N/A'}</div>
    <div><strong>🎬 Streaming Servers:</strong></div>
    <div class="server-buttons">${serverButtons}</div>
  </div>
  <div class="player"><iframe id="playerFrame" src="${allServers[0]}" allowfullscreen></iframe></div>
  <div class="footer"><a href="/" style="color:#e50914;">← Back to Home</a> | © U-TV</div>
</div>
<script>
  document.querySelectorAll('.server-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('playerFrame').src = btn.dataset.url;
    });
  });
</script>
</body>
</html>`;
  fs.writeFileSync(path.join(movieDir, 'index.html'), html);
  console.log(`✅ Generated: /movie/${movie.id}/`);
}

// ========== होमपेज ==========
async function generateHomepage(movies) {
  let cards = '';
  for (let m of movies.slice(0, 24)) {
    const poster = m.poster_path ? IMG_BASE + m.poster_path : 'https://placehold.co/342x513?text=No+Poster';
    cards += `<div class="card" onclick="location.href='/movie/${m.id}'">
                <img src="${poster}" loading="lazy">
                <div class="title">${escapeHtml(m.title)}</div>
                <div class="rating">⭐ ${(m.vote_average||0).toFixed(1)}</div>
              </div>`;
  }
  const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head><meta charset="UTF-8"><title>U-TV – Watch Free Movies</title><meta name="description" content="Stream latest movies in HD. 10+ servers."><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#050508;color:#fff;font-family:sans-serif;padding:20px}h1{text-align:center;color:#e50914;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px;max-width:1400px;margin:auto}.card{background:#1e1f2a;border-radius:16px;overflow:hidden;cursor:pointer;transition:0.2s}.card:hover{transform:translateY(-5px);box-shadow:0 10px 20px rgba(229,9,20,0.3)}.card img{width:100%;aspect-ratio:2/3;object-fit:cover}.title{padding:12px;font-weight:bold;text-align:center}.rating{text-align:center;padding-bottom:12px;color:#ffcc00}footer{text-align:center;color:#666;margin-top:40px}</style></head>
<body><h1>🎬 U-TV – Watch Free Movies</h1><div class="grid">${cards}</div><footer>© U-TV | 10+ servers | Auto-sync every 3h</footer></body></html>`;
  fs.writeFileSync('index.html', html);
  console.log('✅ Homepage generated');
}

// ========== साइटमैप और robots.txt ==========
function generateSitemap(movies) {
  let urls = `<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`;
  for (let m of movies) {
    urls += `<url><loc>${SITE_URL}/movie/${m.id}</loc><priority>0.8</priority></url>`;
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  fs.writeFileSync('sitemap.xml', sitemap);
  fs.writeFileSync('robots.txt', `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml`);
  console.log('✅ sitemap.xml & robots.txt generated');
}

// ========== मुख्य प्रक्रिया ==========
(async () => {
  console.log('🚀 Starting scraper-based sync...');
  const movies = await getMovies();
  console.log(`📦 Fetched ${movies.length} movies from TMDB.`);

  // पुराना movie फोल्डर हटाएँ
  if (fs.existsSync('./movie')) fs.rmSync('./movie', { recursive: true, force: true });
  fs.mkdirSync('./movie');

  for (let i = 0; i < movies.length; i++) {
    const movie = movies[i];
    console.log(`Processing ${i+1}/${movies.length}: ${movie.title}`);
    const details = await getMovieDetails(movie.id);
    const embedLinks = await scrapeEmbedLinks(movie.id);
    await generateMoviePage(movie, details, embedLinks);
    await new Promise(r => setTimeout(r, DELAY_MS));
  }
  await generateHomepage(movies);
  generateSitemap(movies);
  console.log('🎉 All pages generated successfully!');
})();
