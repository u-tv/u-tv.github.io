#!/usr/bin/env node
const fs = require('fs');
const https = require('https');
const path = require('path');

const CONFIG = {
  TMDB_API_KEY: 'YOUR_TMDB_API_KEY',
  TMDB_IMAGE_URL: 'https://image.tmdb.org/t/p/w500',
  BACKDROP_URL: 'https://image.tmdb.org/t/p/original',
  SITE_URL: 'https://u-tv.pages.dev',
  SITE_NAME: 'U-TV',
  GA_ID: 'G-V43E3PG5RD',
  MOVIES_JSON: './movie-details.json',
  OUTPUT_DIR: './output'
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
}

function fetchTMDB(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${CONFIG.TMDB_API_KEY}&language=hi-IN`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function getMovieDetails(id) {
  try {
    const movie = await fetchTMDB(`/movie/${id}?append_to_response=credits,similar,videos`);
    return {
      id: movie.id,
      title: movie.title || '',
      overview: movie.overview || 'No description available.',
      release_date: movie.release_date || '',
      vote_average: movie.vote_average || 0,
      vote_count: movie.vote_count || 0,
      poster_path: movie.poster_path || '',
      backdrop_path: movie.backdrop_path || '',
      genres: Array.isArray(movie.genres) ? movie.genres.map(g => g.name).join(', ') : '',
      cast: movie.credits?.cast?.slice(0, 12) || [],
      similar: movie.similar?.results?.slice(0, 8) || [],
      trailer_key: movie.videos?.results?.find(v => v.type === 'Trailer')?.key || null
    };
  } catch (err) {
    console.error(`TMDB error for ID ${id}: ${err.message}`);
    return null;
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function getYear(dateStr) {
  return (dateStr || '').split('-')[0] || '';
}

function generateHomepage(movies) {
  const cards = movies.map(m => {
    const poster = m.poster_path ? CONFIG.TMDB_IMAGE_URL + m.poster_path : '';
    const year = getYear(m.release_date);
    return `<div class="movie-card" onclick="location.href='/movie/${m.id}/'">
      <img src="${poster}" alt="${escapeHtml(m.title)}" loading="lazy">
      <div class="movie-title">${escapeHtml(m.title)} (${year})</div>
    </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${CONFIG.SITE_NAME} - Movies</title>
  <meta name="description" content="Browse movies">
  <link rel="canonical" href="${CONFIG.SITE_URL}/">
  ${CONFIG.GA_ID ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${CONFIG.GA_ID}');
  </script>` : ''}
  <style>
    *{box-sizing:border-box} body{margin:0;font-family:system-ui;background:#0a0a0a;color:#eee;padding:20px}
    h1{text-align:center;color:#e50914}
    .movie-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-top:24px}
    .movie-card{cursor:pointer;background:#1a1a1a;border-radius:12px;overflow:hidden}
    .movie-card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}
    .movie-title{padding:8px;font-size:.9rem;text-align:center}
    a{color:inherit;text-decoration:none}
  </style>
</head>
<body>
  <h1>${CONFIG.SITE_NAME}</h1>
  <div class="movie-grid">${cards}</div>
</body>
</html>`;
}

function generateMoviePage(movie) {
  const posterUrl = movie.poster_path ? CONFIG.TMDB_IMAGE_URL + movie.poster_path : '';
  const backdropUrl = movie.backdrop_path ? CONFIG.BACKDROP_URL + movie.backdrop_path : '';
  const year = getYear(movie.release_date);
  const rating = Number(movie.vote_average || 0).toFixed(1);
  const description = escapeHtml(movie.overview);

  const castHtml = (movie.cast || []).map(actor => {
    const img = actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : 'https://placehold.co/70x70';
    return `<div class="cast-card"><img src="${img}" alt="${escapeHtml(actor.name)}" loading="lazy"><div>${escapeHtml(actor.name)}</div></div>`;
  }).join('');

  const similarHtml = (movie.similar || []).map(sim => {
    const simPoster = sim.poster_path ? CONFIG.TMDB_IMAGE_URL + sim.poster_path : '';
    return `<div class="similar-card" onclick="window.location.href='/movie/${sim.id}/'"><img src="${simPoster}" alt="${escapeHtml(sim.title)}"><div class="similar-title">${escapeHtml(sim.title)}</div></div>`;
  }).join('');

  return `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=yes">
  <title>${escapeHtml(movie.title)} (${year}) - ${CONFIG.SITE_NAME}</title>
  <meta name="description" content="${description.slice(0,160)}">
  <meta name="keywords" content="${escapeHtml(movie.title)}, movies, ${escapeHtml(movie.genres)}">
  <link rel="canonical" href="${CONFIG.SITE_URL}/movie/${movie.id}/">
  <meta property="og:title" content="${escapeHtml(movie.title)}">
  <meta property="og:description" content="${description.slice(0,160)}">
  <meta property="og:image" content="${posterUrl}">
  <meta property="og:type" content="video.movie">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">
  ${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Movie",
    name: movie.title,
    description: movie.overview,
    datePublished: movie.release_date,
    image: posterUrl,
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: rating,
      ratingCount: movie.vote_count
    }
  })}
  </script>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#0a0a0a;color:#e5e5e5;font-family:system-ui,sans-serif}
    .hero{background:linear-gradient(to bottom, rgba(0,0,0,.7), #0a0a0a), url('${backdropUrl}') center/cover;min-height:50vh;display:flex;align-items:flex-end;padding:40px 20px}
    h1{font-size:2.5rem;color:#e50914}
    .container{max-width:1200px;margin:0 auto;padding:20px}
    .poster{width:200px;border-radius:16px;float:left;margin-right:24px}
    .info{margin:24px 0}
    .cast-scroll,.similar-scroll{display:flex;gap:12px;overflow-x:auto;padding:10px 0;margin:20px 0}
    .cast-card{min-width:80px;text-align:center}
    .cast-card img{width:70px;height:70px;border-radius:50%;object-fit:cover}
    .similar-card{flex:0 0 110px;cursor:pointer;text-align:center}
    .similar-card img{width:100%;border-radius:12px}
    .section-title{margin-top:24px}
    footer{margin-top:40px;padding:20px 0;border-top:1px solid #222;text-align:center}
    @media (max-width:768px){h1{font-size:2rem}.poster{width:120px}}
  </style>
</head>
<body>
  <div class="hero"><h1>${escapeHtml(movie.title)}</h1></div>
  <div class="container">
    <img class="poster" src="${posterUrl}" alt="${escapeHtml(movie.title)} poster" loading="lazy">
    <div class="info">
      <p>⭐ ${rating} | 📅 ${year} | 🎭 ${escapeHtml(movie.genres)}</p>
      <p>${description}</p>
    </div>
    <div style="clear:both"></div>

    <h3 class="section-title">Cast</h3>
    <div class="cast-scroll">${castHtml}</div>

    <h3 class="section-title">Similar Movies</h3>
    <div class="similar-scroll">${similarHtml}</div>
  </div>
  <footer>© ${CONFIG.SITE_NAME}</footer>
</body>
</html>`;
}

function generateSitemap(movies) {
  const base = CONFIG.SITE_URL;
  const today = new Date().toISOString().split('T')[0];
  const urls = [
    `<url><loc>${base}/</loc><lastmod>${today}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...movies.map(m => `<url><loc>${base}/movie/${m.id}/</loc><lastmod>${m.release_date ? `${getYear(m.release_date)}-01-01` : today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`)
  ].join('');
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
}

async function main() {
  console.log('Generating static movie site...');
  ensureDir(CONFIG.OUTPUT_DIR);

  if (!fs.existsSync(CONFIG.MOVIES_JSON)) {
    throw new Error(`${CONFIG.MOVIES_JSON} not found`);
  }

  const moviesList = readJson(CONFIG.MOVIES_JSON);
  if (!Array.isArray(moviesList)) throw new Error('movie-details.json must be an array');

  const allMovies = [];
  for (const item of moviesList) {
    if (!item || typeof item.id !== 'number') continue;
    console.log(`Processing movie ID ${item.id}`);
    const movie = await getMovieDetails(item.id);
    if (!movie) continue;
    allMovies.push(movie);

    const movieDir = path.join(CONFIG.OUTPUT_DIR, 'movie', String(movie.id));
    ensureDir(movieDir);
    writeFile(path.join(movieDir, 'index.html'), generateMoviePage(movie));
  }

  writeFile(path.join(CONFIG.OUTPUT_DIR, 'index.html'), generateHomepage(allMovies));
  writeFile(path.join(CONFIG.OUTPUT_DIR, 'sitemap.xml'), generateSitemap(allMovies));

  console.log(`Success: generated ${allMovies.length} pages`);
}

main().catch(err => {
  console.error('Build failed:', err.message);
  process.exit(1);
});
