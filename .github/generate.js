#!/usr/bin/env node
/**
 * generate.js – U-TV Complete Site Generator
 * Generates dynamic SEO-friendly pages for each movie, home page, and sitemap.
 */

const fs = require('fs');
const https = require('https');

// ========== CONFIGURATION (आप यहाँ बदलाव कर सकते हैं) ==========
const CONFIG = {
  TMDB_API_KEY: '5bf61a62fd4647aa7debed7d6f2db079',
  TMDB_BASE_URL: 'https://api.themoviedb.org/3',
  TMDB_IMAGE_URL: 'https://image.tmdb.org/t/p/w500',
  SITE_URL: 'https://u-tv.pages.dev',
  SITE_NAME: 'U-TV',
  GA_ID: 'G-V43E3PG5RD',   // Google Analytics ID
  MOVIES_JSON: './movie-details.json'
};

// ========== HELPER: Fetch from TMDB ==========
function fetchTMDB(endpoint) {
  return new Promise((resolve, reject) => {
    const url = `${CONFIG.TMDB_BASE_URL}${endpoint}?api_key=${CONFIG.TMDB_API_KEY}&language=hi-IN`;
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
    const movie = await fetchTMDB(`/movie/${id}`);
    return {
      id: movie.id,
      title: movie.title,
      overview: movie.overview || 'No description available.',
      release_date: movie.release_date || '',
      vote_average: movie.vote_average || 0,
      poster_path: movie.poster_path || '',
      genres: movie.genres ? movie.genres.map(g => g.name).join(', ') : ''
    };
  } catch (err) {
    console.error(`❌ TMDB error for ID ${id}:`, err.message);
    return null;
  }
}

// ========== GENERATE ALL PAGES ==========
async function generateAll() {
  console.log('🚀 Generating U-TV site with complete SEO fixes...');

  if (!fs.existsSync(CONFIG.MOVIES_JSON)) {
    console.error(`❌ ${CONFIG.MOVIES_JSON} not found!`);
    process.exit(1);
  }
  const movieList = JSON.parse(fs.readFileSync(CONFIG.MOVIES_JSON, 'utf8'));
  console.log(`📊 Found ${movieList.length} movies.`);

  const allMoviesData = [];

  for (let i = 0; i < movieList.length; i++) {
    const id = movieList[i].id;
    console.log(`[${i+1}/${movieList.length}] Processing movie ID: ${id}...`);
    const movie = await getMovieDetails(id);
    if (!movie) continue;

    allMoviesData.push(movie);
    const dir = `./movie/${id}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const posterUrl = movie.poster_path ? CONFIG.TMDB_IMAGE_URL + movie.poster_path : '';
    const year = movie.release_date ? movie.release_date.split('-')[0] : '';

    const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${movie.title} (${year}) – Watch Full Movie Online | ${CONFIG.SITE_NAME}</title>
  <meta name="description" content="${movie.overview.substring(0, 160)}">
  <meta name="keywords" content="${movie.title}, watch online, free movie, ${movie.genres}">
  <link rel="canonical" href="${CONFIG.SITE_URL}/movie/${id}/">
  <meta property="og:title" content="${movie.title}">
  <meta property="og:description" content="${movie.overview.substring(0, 160)}">
  <meta property="og:image" content="${posterUrl}">
  <meta property="og:type" content="video.movie">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${movie.title}">
  <meta name="twitter:description" content="${movie.overview.substring(0, 160)}">
  <meta name="twitter:image" content="${posterUrl}">
  <link rel="alternate" hreflang="hi" href="${CONFIG.SITE_URL}/movie/${id}/">
  <link rel="alternate" hreflang="en" href="${CONFIG.SITE_URL}/en/movie/${id}/">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Movie",
    "name": "${movie.title}",
    "description": "${movie.overview.replace(/"/g, '\\"')}",
    "datePublished": "${movie.release_date}",
    "image": "${posterUrl}",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "${movie.vote_average}"
    }
  }
  </script>
  ${CONFIG.GA_ID ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${CONFIG.GA_ID}');
  </script>` : ''}
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0a; color: white; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: auto; background: #1a1a1a; padding: 20px; border-radius: 20px; }
    img { max-width: 100%; border-radius: 12px; }
    h1 { color: #ffc107; }
    .btn { background: #e50914; color: white; padding: 10px 20px; border-radius: 40px; text-decoration: none; display: inline-block; margin-top: 20px; }
    footer { margin-top: 40px; text-align: center; font-size: 0.8rem; color: #aaa; }
  </style>
</head>
<body>
<div class="container">
  <h1>${movie.title}</h1>
  ${posterUrl ? `<img src="${posterUrl}" alt="${movie.title} movie poster">` : ''}
  <p>⭐ ${movie.vote_average} | 📅 ${year} | 🎭 ${movie.genres}</p>
  <p>${movie.overview}</p>
  <a href="https://www.themoviedb.org/movie/${id}" target="_blank" class="btn">View on TMDB</a>
  <footer>© ${CONFIG.SITE_NAME} – Free movie streaming</footer>
</div>
</body>
</html>`;
    fs.writeFileSync(`${dir}/index.html`, html);
    console.log(`✅ Generated: /movie/${id}/`);
  }

  // Home page
  let homeList = '';
  for (const movie of allMoviesData) {
    const year = movie.release_date ? movie.release_date.split('-')[0] : '';
    homeList += `<li><a href="/movie/${movie.id}/">${movie.title} (${year})</a></li>\n`;
  }
  const homeHtml = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>${CONFIG.SITE_NAME} – Watch Free Movies Online</title>
  <meta name="description" content="Watch latest movies online for free. Best collection.">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="canonical" href="${CONFIG.SITE_URL}/">
  <style>
    body { font-family: Arial; background: #0a0a0a; color: white; padding: 20px; }
    .container { max-width: 800px; margin: auto; }
    a { color: #ffc107; text-decoration: none; }
    li { margin: 10px 0; }
  </style>
  ${CONFIG.GA_ID ? `
  <script async src="https://www.googletagmanager.com/gtag/js?id=${CONFIG.GA_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${CONFIG.GA_ID}');
  </script>` : ''}
</head>
<body>
<div class="container">
  <h1>📺 ${CONFIG.SITE_NAME} – Free Movies</h1>
  <ul>${homeList}</ul>
  <footer>© ${CONFIG.SITE_NAME}</footer>
</div>
</body>
</html>`;
  fs.writeFileSync('./index.html', homeHtml);
  console.log('✅ Generated: index.html');

  // Sitemap
  let sitemapUrls = `<url><loc>${CONFIG.SITE_URL}/</loc><lastmod>${new Date().toISOString().split('T')[0]}</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>`;
  for (const movie of allMoviesData) {
    const year = movie.release_date ? movie.release_date.split('-')[0] : '2025';
    sitemapUrls += `<url><loc>${CONFIG.SITE_URL}/movie/${movie.id}/</loc><lastmod>${year}-01-01</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>`;
  }
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls}
</urlset>`;
  fs.writeFileSync('./sitemap.xml', sitemapXml);
  console.log('✅ Generated: sitemap.xml');

  console.log(`\n🎉 Success! Total pages: ${allMoviesData.length} movies + home + sitemap`);
  console.log(`📍 Site URL: ${CONFIG.SITE_URL}`);
}

generateAll().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
