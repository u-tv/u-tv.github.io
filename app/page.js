const IMG_BASE = 'https://image.tmdb.org/t/p/w500';

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

function getQuality(vote) {
  if (vote >= 7.5) return 'EXCELLENT';
  if (vote >= 6.5) return 'GOOD';
  if (vote >= 5.5) return 'AVERAGE';
  return 'POOR';
}

function createCard(item) {
  const title = item.title || item.name || 'Untitled';
  const poster = item.poster_path ? `${IMG_BASE}${item.poster_path}` : 'https://placehold.co/342x513?text=No+Poster';
  const rating = item.vote_average?.toFixed(1) || 'N/A';
  const id = item.id;
  const quality = getQuality(parseFloat(item.vote_average));
  
  return `
    <a href="/movie/${id}" class="movie-card" style="text-decoration: none; color: inherit;">
      <div class="badge-quality">${quality}</div>
      <img src="${poster}" alt="${escapeHtml(title)}" loading="lazy">
      <div class="movie-title">${escapeHtml(title)}</div>
      <div class="rating">⭐ ${rating}</div>
    </a>
  `;
}

export default async function Home() {
  const res = await fetch('https://api.themoviedb.org/3/trending/movie/week?api_key=174d0214bf933dd59b3d5ec68a0c967f&language=hi-IN', {
    next: { revalidate: 3600 }
  });
  const data = await res.json();
  const movies = data.results || [];

  const cardsHTML = movies.map(createCard).join('
');

  return (
    <div style={{ background: '#050508', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#e50914', margin: '40px 0 30px', fontSize: '36px' }}>U-TV - Watch Movies Online</h1>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: '20px', 
        maxWidth: '1400px', 
        margin: '0 auto' 
      }}>
        {movies.map(movie => (
          <a 
            key={movie.id} 
            href={`/movie/${movie.id}`}
            style={{ textDecoration: 'none', color: 'inherit' }}
          >
            <div style={{ 
              background: '#1e1f2a', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              transition: 'transform 0.3s',
              position: 'relative'
            }}>
              <div style={{ position: 'absolute', top: '10px', right: '10px', background: movie.vote_average >= 7 ? '#4caf50' : movie.vote_average >= 5 ? '#ff9800' : '#f44336', color: '#fff', padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>
                {movie.vote_average?.toFixed(1)}
              </div>
              <img 
                src={movie.poster_path ? `${IMG_BASE}${movie.poster_path}` : 'https://placehold.co/342x513?text=No+Poster'} 
                alt={movie.title}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                loading="lazy"
              />
              <div style={{ padding: '15px' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {movie.title}
                </div>
                <div style={{ color: '#aaa', fontSize: '13px' }}>⭐ {movie.vote_average?.toFixed(1)}</div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <style>{`
        .movie-card:hover {
          transform: translateY(-5px);
        }
      `}</style>
    </div>
  );
}
