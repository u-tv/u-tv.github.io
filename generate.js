// generate.js
const fs = require('fs');
const path = require('path');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '';
const IMG = 'https://image.tmdb.org/t/p/w500';
const BACKDROP = 'https://image.tmdb.org/t/p/w1280';

const movieIds = [
  278, 238, 550, 680, 13, 155, 1891, 603, 120, 240
];

const servers = [
  { name: 'Server 1', url: (id) => `https://vidsrc.to/embed/movie/${id}` },
  { name: 'Server 2', url: (id) => `https://www.2embed.cc/embed/${id}` },
  { name: 'Server 3', url: (id) => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  { name: 'Server 4', url: (id) => `https://player.autoembed.cc/embed/movie/${id}` },
  { name: 'Server 5', url: (id) => `https://embed.su/embed/movie/${id}` },
  { name: 'Server 6', url: (id) => `https://moviesapi.club/movie/${id}` },
  { name: 'Server 7', url: (id) => `https://vidlink.pro/movie/${id}` },
  { name: 'Server 8', url: (id) => `https://moviee.tv/embed/movie/${id}` },
  { name: 'Server 9', url: (id) => `https://superembed.stream/movie/${id}` },
  { name: 'Server 10', url: (id) => `https://vidsrc.me/embed/movie/${id}` }
];

function esc(text = '') {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function fetchTmdb(url) {
  const res = await fetch(url, {
    headers: {
      accept: 'application/json',
      Authorization: `Bearer ${TMDB_API_KEY}`
    }
  });
  if (!res.ok) throw new Error(`TMDb ${res.status}`);
  return res.json();
}

async function getMovie(id) {
  const movie = await fetchTmdb(`https://api.themoviedb.org/3/movie/${id}?language=en-US`);
  let videos = { results: [] };
  try {
    videos = await fetchTmdb(`https://api.themoviedb.org/3/movie/${id}/videos?language=en-US`);
  } catch {}

  const trailer = videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');

  return {
    id: movie.id,
    title: movie.title || movie.original_title || '',
    overview: movie.overview || '',
    release_date: movie.release_date || '',
    vote_average: movie.vote_average || 0,
    poster: movie.poster_path ? `${IMG}${movie.poster_path}` : '',
    backdrop: movie.backdrop_path ? `${BACKDROP}${movie.backdrop_path}` : '',
    embed: trailer ? `https://www.youtube.com/embed/${trailer.key}` : '',
    servers: servers.map(s => ({ name: s.name, url: s.url(movie.id) }))
  };
}

function moviePage(movie) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(movie.title)} - Watch Free on U-TV</title>
  <meta name="description" content="${esc(movie.overview)}" />
  <link rel="canonical" href="https://u-tv.pages.dev/movie/${movie.id}/" />
  <style>
    body{background:#0b0c10;color:#c5a059;font-family:Segoe UI,Tahoma,sans-serif;margin:0;padding:20px;display:flex;justify-content:center}
    .container{max-width:1000px;width:100%;background:#1f2833;padding:20px;border-radius:10px}
    h1{color:#fff;margin-top:0}
    .movie-box{display:flex;gap:20px;margin-bottom:20px}
    .poster{width:200px;border-radius:8px}
    .details{font-size:16px;line-height:1.6}
    .player-wrapper{position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:8px;background:#000}
    .player-wrapper iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}
    .servers{display:flex;flex-wrap:wrap;gap:10px;margin-top:20px}
    .srv{background:#0b0c10;color:#fff;padding:10px 14px;border-radius:999px;text-decoration:none;border:1px solid #333}
    .back{display:inline-block;margin-bottom:15px;color:#c5a059;text-decoration:none}
    @media(max-width:700px){.movie-box{flex-direction:column}.poster{width:100%;max-width:260px}}
  </style>
</head>
<body>
<div class="container">
  <a class="back" href="/">← Back to Home</a>
  <div class="movie-box">
    <img class="poster" src="${esc(movie.poster)}" alt="${esc(movie.title)} Poster">
    <div class="details">
      <h1>${esc(movie.title)}</h1>
      <p><strong>Release Date:</strong> ${esc(movie.release_date || 'N/A')}</p>
      <p><strong>Rating:</strong> ⭐ ${movie.vote_average}/10</p>
      <p><strong>Overview:</strong> ${esc(movie.overview || 'No description available.')}</p>
    </div>
  </div>

  <div class="player-wrapper">
    ${movie.embed ? `<iframe src="${esc(movie.embed)}" allowfullscreen loading="lazy" referrerpolicy="strict-origin-when-cross-origin"></iframe>` : `<div style="padding:20px;color:#fff">Trailer not available</div>`}
  </div>

  <div class="servers">
    ${movie.servers.map(s => `<a class="srv" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>`).join('')}
  </div>
</div>
</body>
</html>`;
}

function indexPage(movies) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>U-TV - Watch Free Movies Online in HD</title>
  <meta name="description" content="Watch free movies online in HD." />
  <link rel="canonical" href="https://u-tv.pages.dev/" />
  <style>
    body{margin:0;font-family:Segoe UI,system-ui,sans-serif;background:#050505;color:#e5e5e5}
    .wrap{max-width:1200px;margin:0 auto;padding:20px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px}
    .card{display:block;background:#121212;border:1px solid #222;border-radius:16px;overflow:hidden;color:#fff;text-decoration:none}
    .card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}
    .t{padding:10px;font-size:14px;text-align:center}
    h1{margin:0 0 20px}
  </style>
</head>
<body>
  <div class="wrap">
    <h1>U-TV</h1>
    <div class="grid">
      ${movies.map(m => `
        <a class="card" href="/movie/${m.id}/">
          <img src="${esc(m.poster)}" alt="${esc(m.title)}">
          <div class="t">${esc(m.title)}</div>
        </a>
      `).join('')}
    </div>
  </div>
</body>
</html>`;
}

async function main() {
  const movies = [];
  for (const id of movieIds) {
    try {
      movies.push(await getMovie(id));
    } catch (e) {
      console.error(`Skip ${id}:`, e.message);
    }
  }

  fs.writeFileSync('index.html', indexPage(movies));

  for (const movie of movies) {
    const dir = path.join('movie', String(movie.id));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'index.html'), moviePage(movie));
  }

  console.log('Generated:', movies.length);
}

main().catch(console.error);
