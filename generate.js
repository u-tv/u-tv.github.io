const fs = require('fs');
const https = require('https');

// अपनी TMDB API key (आपकी दी हुई)
const API_KEY = '5bf61a62fd4647aa7debed7d6f2db079';
const BASE_URL = 'https://api.themoviedb.org/3/movie';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

// एक सरल fetch function (Node.js में)
function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { reject(e); }
      });
    }).on('error', reject);
  });
}

async function generateAll() {
  // movie-details.json पढ़ो
  const movies = require('./movie-details.json');
  if (!movies.length) {
    console.log('❌ movie-details.json खाली है या फॉर्मेट सही नहीं');
    return;
  }

  // movie फोल्डर बनाओ
  if (!fs.existsSync('./movie')) fs.mkdirSync('./movie');

  for (const item of movies) {
    const id = item.id;
    let title = item.title;

    // अगर title नहीं है तो TMDB से ले लो
    if (!title) {
      try {
        const data = await fetchJson(`${BASE_URL}/${id}?api_key=${API_KEY}`);
        title = data.title || 'Unknown Movie';
      } catch(e) { title = 'Unknown Movie'; }
    }

    // TMDB से पूरी जानकारी लाओ
    let movieData = null;
    try {
      movieData = await fetchJson(`${BASE_URL}/${id}?api_key=${API_KEY}&language=hi-IN`);
    } catch(e) { console.warn(`⚠️ TMDB error for ${id}`); }

    const poster = movieData?.poster_path ? IMG_URL + movieData.poster_path : '';
    const overview = movieData?.overview || 'Full movie details available.';
    const rating = movieData?.vote_average || 'N/A';
    const year = movieData?.release_date ? movieData.release_date.split('-')[0] : '';

    const dir = `./movie/${id}`;
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const html = `<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <title>${title} ${year ? '('+year+')' : ''} - Watch Full Movie Online</title>
  <meta name="description" content="${overview.substring(0, 160)}">
  <meta name="keywords" content="${title}, movie, watch online, ${year}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${overview.substring(0, 160)}">
  <meta property="og:image" content="${poster}">
  <meta property="og:type" content="video.movie">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="canonical" href="https://u-tv.pages.dev/movie/${id}/">
  <style>
    body { font-family: Arial, sans-serif; background: #0a0a0a; color: white; margin: 0; padding: 20px; }
    .container { max-width: 800px; margin: auto; background: #1a1a1a; padding: 20px; border-radius: 16px; }
    img { max-width: 100%; border-radius: 12px; }
    h1 { color: #ffcc00; }
    .info { margin-top: 20px; }
    .btn { background: #ffcc00; color: black; padding: 10px 20px; border-radius: 30px; text-decoration: none; display: inline-block; margin-top: 15px; }
    @media (max-width: 600px) { body { padding: 10px; } }
  </style>
</head>
<body>
  <div class="container">
    <h1>${title}</h1>
    ${poster ? `<img src="${poster}" alt="${title} poster">` : ''}
    <div class="info">
      <p><strong>Year:</strong> ${year}</p>
      <p><strong>Rating:</strong> ⭐ ${rating} / 10</p>
      <p><strong>Description:</strong> ${overview}</p>
      <a href="https://www.themoviedb.org/movie/${id}" target="_blank" class="btn">View on TMDB</a>
    </div>
  </div>
</body>
</html>`;
    fs.writeFileSync(dir + '/index.html', html);
    console.log(`✅ Generated: /movie/${id}/ (${title})`);
  }
  console.log(`🎉 Total ${movies.length} movie pages created!`);
}

generateAll();
