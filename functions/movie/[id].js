// functions/movie/[id].js – पूरा मूवी पेज (10 सर्वर + SEO)
const TMDB_API_KEY = '174d0214bf933dd59b3d5ec68a0c967f';
const IMG_BASE = 'https://image.tmdb.org/t/p/w500';
const SITE_URL = 'https://u-tv.pages.dev';

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

function escapeHtml(str) {
  return String(str).replace(/[&<>]/g, m => ({ '&':'&amp;','<':'&lt;','>':'&gt;' })[m]);
}

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

export async function onRequest(context) {
  const { id } = context.params;
  if (!/^\d+$/.test(id)) return new Response('Invalid movie ID', { status: 400 });

  try {
    const movie = await fetchTMDB(`/movie/${id}?append_to_response=credits,videos`);
    const title = movie.title || 'Untitled';
    const poster = movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : '';
    const backdrop = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : poster;
    const rating = movie.vote_average?.toFixed(1) || 'N/A';
    const year = (movie.release_date || '').split('-')[0] || 'N/A';
    const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
    const genres = (movie.genres || []).map(g => g.name).join(', ') || 'General';
    const overview = movie.overview || 'No description available.';
    const tagline = movie.tagline || '';
    const voteCount = movie.vote_count || 0;
    const cast = (movie.credits?.cast || []).slice(0, 10).map(c => c.name).join(', ');
    const trailer = (movie.videos?.results || []).find(v => v.type === 'Trailer' && v.site === 'YouTube');

    let serverButtons = '';
    for (const s of EMBED_SERVERS) {
      const url = s.url.replace('%ID%', id);
      serverButtons += `<button class="server-btn" data-url="${url}">${s.name}</button>`;
    }
    if (trailer) {
      serverButtons += `<button class="server-btn" data-url="https://www.youtube.com/embed/${trailer.key}">🎬 Trailer (YouTube)</button>`;
    }

    const html = `<!DOCTYPE html>
<html lang="hi-IN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} (${year}) - Watch Free HD | U-TV</title>
  <meta name="description" content="${escapeHtml(overview.substring(0, 160))}">
  <link rel="canonical" href="${SITE_URL}/movie/${id}">
  <meta property="og:title" content="${escapeHtml(title)} (${year})">
  <meta property="og:image" content="${backdrop}">
  <meta property="og:type" content="video.movie">
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#050508;color:#fff;font-family:sans-serif;padding:20px}
    .container{max-width:1000px;margin:0 auto}
    .backdrop{width:100%;border-radius:20px;margin-bottom:20px}
    .info{background:#1e1f2a;border-radius:20px;padding:20px;margin-bottom:20px}
    h1{color:#e50914;margin-bottom:10px}
    .meta{color:#aaa;margin:10px 0;display:flex;gap:20px;flex-wrap:wrap}
    .server-buttons{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0}
    .server-btn{background:#e50914;border:none;padding:10px 16px;border-radius:40px;cursor:pointer;color:#fff;font-weight:bold;font-size:0.8rem}
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
    <div><strong>🎭 Cast:</strong> ${escapeHtml(cast) || 'Information not available'}</div>
    <div><strong>🎬 Streaming Servers:</strong></div>
    <div class="server-buttons">${serverButtons}</div>
  </div>
  <div class="player">
    <iframe id="playerFrame" src="${EMBED_SERVERS[0].url.replace('%ID%', id)}" allowfullscreen></iframe>
  </div>
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
    return new Response(html, { headers: { 'Content-Type': 'text/html' } });
  } catch (err) {
    console.error(err);
    return new Response(`Error: ${err.message}`, { status: 500 });
  }
}
