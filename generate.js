import fs from 'fs';
import path from 'path';

const TMDB_KEY = process.env.TMDB_API_KEY || '';
const MOVIE_IDS = (process.env.MOVIE_IDS || '278,238,550,680,13,155,1891,603,120,240').split(',').map(s => s.trim()).filter(Boolean);
const OUT = process.env.OUT_DIR || '.';

const IMG = 'https://image.tmdb.org/t/p/w500';
const BACKDROP = 'https://image.tmdb.org/t/p/w1280';

const servers = [
  { name: 'Server 1', build: id => `https://vidsrc.to/embed/movie/${id}` },
  { name: 'Server 2', build: id => `https://www.2embed.cc/embed/${id}` },
  { name: 'Server 3', build: id => `https://multiembed.mov/?video_id=${id}&tmdb=1` },
  { name: 'Server 4', build: id => `https://player.autoembed.cc/embed/movie/${id}` },
  { name: 'Server 5', build: id => `https://embed.su/embed/movie/${id}` },
  { name: 'Server 6', build: id => `https://moviesapi.club/movie/${id}` },
  { name: 'Server 7', build: id => `https://vidlink.pro/movie/${id}` },
  { name: 'Server 8', build: id => `https://moviee.tv/embed/movie/${id}` },
  { name: 'Server 9', build: id => `https://superembed.stream/movie/${id}` },
  { name: 'Server 10', build: id => `https://vidsrc.me/embed/movie/${id}` }
];

function esc(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function tmdb(endpoint) {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}${endpoint.includes('?') ? '&' : '?'}api_key=${TMDB_KEY}&language=en-US`, {
    headers: { accept: 'application/json' }
  });
  if (!res.ok) throw new Error(`TMDb ${res.status} ${endpoint}`);
  return res.json();
}

function mkDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function write(filePath, content) {
  mkDir(filePath);
  fs.writeFileSync(filePath, content);
}

function moviePage(movie) {
  const poster = movie.poster_path ? `${IMG}${movie.poster_path}` : 'https://placehold.co/500x750?text=No+Poster';
  const backdrop = movie.backdrop_path ? `${BACKDROP}${movie.backdrop_path}` : '';
  const trailer = movie.trailer || '';
  const providers = movie.providers || [];

  const serverButtons = providers.length
    ? providers.map(p => `<a class="srv" href="${esc(p.url)}" target="_blank" rel="noopener noreferrer">${esc(p.name)}</a>`).join('')
    : movie.servers.map(s => `<a class="srv" href="${esc(s.url)}" target="_blank" rel="noopener noreferrer">${esc(s.name)}</a>`).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>${esc(movie.title)} - Watch Free on U-TV</title>
  <meta name="description" content="${esc(movie.overview || movie.title)}" />
  <link rel="canonical" href="https://u-tv.pages.dev/movie/${movie.id}/" />
  <meta property="og:title" content="${esc(movie.title)}" />
  <meta property="og:description" content="${esc(movie.overview || movie.title)}" />
  <meta property="og:image" content="${esc(poster)}" />
  <meta property="og:type" content="video.movie" />
  <style>
    body{margin:0;background:#0b0c10;color:#e5e5e5;font-family:Segoe UI,system-ui,sans-serif}
    a{text-decoration:none}
    .wrap{max-width:1100px;margin:0 auto;padding:16px}
    .hero{display:grid;grid-template-columns:220px 1fr;gap:20px;background:#121820;border:1px solid #252b33;border-radius:18px;padding:16px}
    .poster{width:100%;border-radius:12px;display:block}
    h1{margin:0 0 8px;color:#fff;font-size:clamp(24px,4vw,42px)}
    .meta{color:#c5a059;line-height:1.7}
    .btns{display:flex;flex-wrap:wrap;gap:10px;margin-top:18px}
    .srv{background:#1f2833;color:#fff;border:1px solid #2f3945;padding:10px 14px;border-radius:999px}
    .srv:hover{border-color:#c5a059}
    .player{margin-top:20px;background:#000;border-radius:18px;overflow:hidden;border:1px solid #2b2b2b}
    .ratio{position:relative;padding-top:56.25%}
    iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
    .section{margin-top:24px;background:#121820;border:1px solid #252b33;border-radius:18px;padding:16px}
    .back{display:inline-block;margin-bottom:14px;color:#c5a059}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:12px}
    .small{font-size:14px;color:#b8c0cc}
    @media (max-width:720px){.hero{grid-template-columns:1fr}.poster{max-width:260px}}
  </style>
</head>
<body>
<div class="wrap">
  <a class="back" href="/">← Back to Home</a>
  <div class="hero">
    <img class="poster" src="${esc(poster)}" alt="${esc(movie.title)} poster" />
    <div>
      <h1>${esc(movie.title)}</h1>
      <div class="meta">
        <div><strong>Movie ID:</strong> ${movie.id}</div>
        <div><strong>Release:</strong> ${esc(movie.release_date || 'N/A')}</div>
        <div><strong>Rating:</strong> ⭐ ${movie.vote_average?.toFixed?.(1) || movie.vote_average || 'N/A'}/10</div>
        <div><strong>Runtime:</strong> ${movie.runtime || 'N/A'} min</div>
      </div>
      <p class="small">${esc(movie.overview || 'No description available.')}</p>
      <div class="btns">${serverButtons}</div>
    </div>
  </div>

  <div class="section">
    <h2 style="margin-top:0;color:#fff">Storyline / Description</h2>
    <p class="small">${esc(movie.overview || 'Watch high quality streams on U-TV Auto Stream.')}</p>
  </div>

  <div class="section">
    <h2 style="margin-top:0;color:#fff">Player</h2>
    ${trailer ? `
    <div class="player">
      <div class="ratio">
        <iframe
          src="https://www.youtube.com/embed/${esc(trailer)}?autoplay=0&mute=0"
          title="${esc(movie.title)} trailer"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen></iframe>
      </div>
    </div>` : `<p class="small">Trailer not available for this title.</p>`}
  </div>

  <div class="section">
    <h2 style="margin-top:0;color:#fff">Servers</h2>
    <div class="grid">${serverButtons}</div>
  </div>
</div>
</body>
</html>`;
}

function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

async function buildMovie(id) {
  const movie = await tmdb(`/movie/${id}?append_to_response=videos`);
  const vids = movie.videos?.results || [];
  const trailer = vids.find(v => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser') && v.key)?.key || '';
  let prov = [];
  try {
    const wp = await tmdb(`/movie/${id}/watch/providers`);
    const us = wp.results?.US || wp.results?.IN || Object.values(wp.results || {})[0] || null;
    const arr = [];
    if (us?.flatrate) arr.push(...us.flatrate.map(x => ({ name: `${x.provider_name} (Stream)`, url: us.link || `https://www.themoviedb.org/movie/${id}/watch` })));
    if (us?.rent) arr.push(...us.rent.map(x => ({ name: `${x.provider_name} (Rent)`, url: us.link || `https://www.themoviedb.org/movie/${id}/watch` })));
    if (us?.buy) arr.push(...us.buy.map(x => ({ name: `${x.provider_name} (Buy)`, url: us.link || `https://www.themoviedb.org/movie/${id}/watch` })));
    prov = arr.slice(0, 10);
  } catch {}
  const serversList = servers.map(s => ({ name: s.name, url: s.build(id) }));
  return { ...movie, trailer, providers: prov, servers: serversList, slug: slugify(movie.title || String(id)) };
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const movies = [];
  for (const id of MOVIE_IDS) {
    try {
      movies.push(await buildMovie(id));
    } catch (e) {
      console.error(`skip ${id}: ${e.message}`);
    }
  }

  const cards = movies.map(m => {
    const poster = m.poster_path ? `${IMG}${m.poster_path}` : 'https://placehold.co/500x750?text=No+Poster';
    return `<a class="card" href="/movie/${m.id}/">
      <img src="${esc(poster)}" alt="${esc(m.title)}" loading="lazy">
      <div class="t">${esc(m.title)}</div>
    </a>`;
  }).join('');

  const index = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <title>U-TV - Watch Free Movies Online in HD</title>
  <meta name="description" content="Watch free movies online in HD. Latest Hindi Dubbed, Hollywood, Bollywood, Web Series. Fast streaming with multiple sources." />
  <link rel="canonical" href="https://u-tv.pages.dev/" />
  <meta property="og:title" content="U-TV - Watch Free Movies Online" />
  <meta property="og:description" content="Stream latest movies in HD." />
  <meta property="og:type" content="website" />
  <style>
    *{box-sizing:border-box} body{margin:0;font-family:Segoe UI,system-ui,sans-serif;background:#050505;color:#e5e5e5}
    .nav{position:sticky;top:0;z-index:10;background:#000c;padding:14px 18px;border-bottom:1px solid #222;display:flex;justify-content:space-between;gap:10px;align-items:center;backdrop-filter:blur(10px)}
    .logo{font-weight:900;font-size:28px;color:#fff}
    .wrap{max-width:1200px;margin:0 auto;padding:18px}
    .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px}
    .card{display:block;background:#121212;border:1px solid #222;border-radius:16px;overflow:hidden;color:#fff;text-decoration:none}
    .card img{width:100%;aspect-ratio:2/3;object-fit:cover;display:block}
    .t{padding:10px;font-size:14px;text-align:center}
    .hero{background:#121820;border:1px solid #252b33;border-radius:18px;padding:16px;margin-bottom:18px}
    .hero h1{margin:0 0 8px;color:#fff}
    .hero p{margin:0;color:#c5a059}
  </style>
</head>
<body>
  <div class="nav"><div class="logo">U-TV</div><div>TMDb + Dynamic Movies</div></div>
  <div class="wrap">
    <div class="hero">
      <h1>Watch Free Movies Online in HD</h1>
      <p>Click any poster to open a dynamic movie page with trailer/embed and server links.</p>
    </div>
    <div class="grid">${cards}</div>
  </div>
</body>
</html>`;

  write(path.join(OUT, 'index.html'), index);

  for (const m of movies) {
    write(path.join(OUT, 'movie', String(m.id), 'index.html'), moviePage(m));
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://u-tv.pages.dev/</loc></url>
  ${movies.map(m => `<url><loc>https://u-tv.pages.dev/movie/${m.id}/</loc></url>`).join('
  ')}
</urlset>`;
  write(path.join(OUT, 'sitemap.xml'), sitemap);

  const robots = `User-agent: *
Allow: /
Sitemap: https://u-tv.pages.dev/sitemap.xml
`;
  write(path.join(OUT, 'robots.txt'), robots);

  console.log(`Built ${movies.length} movies`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
