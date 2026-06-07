// worker.js – Full Dynamic Movie Site (for u-tv.pages.dev)
const TMDB_API_KEY = '174d0214bf933dd59b3d5ec68a0c967f';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const SITE_URL = 'https://u-tv.pages.dev';   // ← मुख्य डोमेन

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

function escapeHtml(s) { return String(s).replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' })[m]); }

async function fetchTMDB(endpoint) {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}&language=hi-IN`;
  let res = await fetch(url);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  let data = await res.json();
  if ((data.results && data.results.length === 0) || !data.title) {
    const enUrl = `https://api.themoviedb.org/3${endpoint}?api_key=${TMDB_API_KEY}&language=en-US`;
    const enRes = await fetch(enUrl);
    if (enRes.ok) data = await enRes.json();
  }
  return data;
}

async function handleHome() {
  const data = await fetchTMDB('/movie/popular?page=1');
  const movies = data.results || [];
  let cards = '';
  for (let m of movies.slice(0, 24)) {
    const poster = m.poster_path ? `${IMG_BASE}${m.poster_path}` : 'https://placehold.co/342x513?text=No+Poster';
    cards += `<div class="card" onclick="location.href='/movie/${m.id}'"><img src="${poster}" loading="lazy"><div class="title">${escapeHtml(m.title)}</div><div class="rating">⭐ ${(m.vote_average||0).toFixed(1)}</div></div>`;
  }
  return `<!DOCTYPE html>
<html lang="hi-IN">
<head><meta charset="UTF-8"><title>U-TV – Watch Free Movies</title><meta name="description" content="Stream latest movies in HD. 10+ servers."><style>
*{margin:0;padding:0;box-sizing:border-box}body{background:#050508;color:#fff;font-family:sans-serif;padding:20px}h1{text-align:center;color:#e50914;margin:20px 0}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:20px;max-width:1400px;margin:auto}.card{background:#1e1f2a;border-radius:16px;overflow:hidden;cursor:pointer;transition:0.2s}.card:hover{transform:translateY(-5px);box-shadow:0 10px 20px rgba(229,9,20,0.3)}.card img{width:100%;aspect-ratio:2/3;object-fit:cover}.title{padding:12px;font-weight:bold;text-align:center}.rating{text-align:center;padding-bottom:12px;color:#ffcc00}footer{text-align:center;color:#666;margin-top:40px}</style></head>
<body><h1>🎬 U-TV – Watch Free Movies</h1><div class="grid">${cards}</div><footer>© U-TV | 10+ servers | Auto-sync</footer></body></html>`;
}

async function handleMovie(id) {
  const movie = await fetchTMDB(`/movie/${id}?append_to_response=credits,videos`);
  const title = movie.title;
  const poster = movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : 'https://placehold.co/500x750?text=No+Poster';
  const backdrop = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : poster;
  const rating = movie.vote_average?.toFixed(1) || 'N/A';
  const year = (movie.release_date || '').split('-')[0] || 'N/A';
  const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
  const genres = (movie.genres || []).map(g => g.name).join(', ') || 'General';
  const overview = movie.overview || 'No description.';
  const tagline = movie.tagline || '';
  const voteCount = movie.vote_count || 0;
  const cast = (movie.credits?.cast || []).slice(0, 10).map(c => c.name).join(', ');
  const trailer = (movie.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');

  let serverButtons = '';
  for (let s of EMBED_SERVERS) serverButtons += `<button class="server-btn" data-url="${s.url.replace('%ID%', id)}">${s.name}</button>`;
  if (trailer) serverButtons += `<button class="server-btn" data-url="https://www.youtube.com/embed/${trailer.key}">🎬 Trailer</button>`;

  return `<!DOCTYPE html>
<html lang="hi-IN">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)} (${year}) - Watch Free HD</title><meta name="description" content="${escapeHtml(overview.substring(0,160))}"><link rel="canonical" href="${SITE_URL}/movie/${id}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:image" content="${backdrop}"><meta property="og:type" content="video.movie"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Movie","name":"${escapeHtml(title)}","description":"${escapeHtml(overview.replace(/"/g, '\\"'))}","image":"https://image.tmdb.org/t/p/original${movie.poster_path}","datePublished":"${movie.release_date}","genre":${JSON.stringify(genres.split(', '))},"duration":"PT${movie.runtime || 0}M","aggregateRating":{"@type":"AggregateRating","ratingValue":${movie.vote_average || 0},"ratingCount":${movie.vote_count || 0}}}</script><style>*{margin:0;padding:0;box-sizing:border-box}body{background:#050508;color:#fff;font-family:sans-serif;padding:20px}.container{max-width:1000px;margin:0 auto}.backdrop{width:100%;border-radius:20px;margin-bottom:20px}.info{background:#1e1f2a;border-radius:20px;padding:20px;margin-bottom:20px}h1{color:#e50914}.meta{color:#aaa;margin:10px 0;display:flex;gap:20px;flex-wrap:wrap}.server-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}.server-btn{background:#e50914;border:none;padding:8px 14px;border-radius:40px;cursor:pointer;color:#fff;font-weight:bold}.server-btn:hover{background:#b00710}.player{position:relative;padding-bottom:56.25%;height:0;margin-top:20px}.player iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none;border-radius:16px}.footer{text-align:center;margin-top:30px;color:#666}</style></head>
<body><div class="container"><img class="backdrop" src="${backdrop}" alt="${escapeHtml(title)}"><div class="info"><h1>${escapeHtml(title)} (${year})</h1>${tagline ? `<p>✨ ${escapeHtml(tagline)}</p>` : ''}<div class="meta">⭐ ${rating} (${voteCount}) | 📅 ${year} | ⏱️ ${runtime} | 🎭 ${genres}</div><p>${escapeHtml(overview)}</p><div><strong>Cast:</strong> ${escapeHtml(cast)}</div><div><strong>🎬 Servers:</strong></div><div class="server-buttons">${serverButtons}</div></div><div class="player"><iframe id="playerFrame" src="${EMBED_SERVERS[0].url.replace('%ID%', id)}" allowfullscreen></iframe></div><div class="footer"><a href="/" style="color:#e50914;">← Home</a> | © U-TV</div></div>
<script>document.querySelectorAll('.server-btn').forEach(b=>b.onclick=()=>document.getElementById('playerFrame').src=b.dataset.url);</script></body></html>`;
}

async function handleSitemap() {
  const data = await fetchTMDB('/movie/popular?page=1');
  const movies = data.results || [];
  let urls = `<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`;
  for (let m of movies.slice(0, 50)) urls += `<url><loc>${SITE_URL}/movie/${m.id}</loc><priority>0.8</priority></url>`;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, { headers: { 'Content-Type': 'application/xml' } });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const path = url.pathname;
    if (path === '/' || path === '/index.html') return new Response(await handleHome(), { headers: { 'Content-Type': 'text/html' } });
    if (path === '/sitemap.xml') return await handleSitemap();
    const match = path.match(/^\/movie\/(\d+)\/?$/);
    if (match) return new Response(await handleMovie(match[1]), { headers: { 'Content-Type': 'text/html' } });
    return new Response('Not Found', { status: 404 });
  }
};
