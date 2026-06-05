import React from 'react';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

export async function generateMetadata({ params }) {
  const { id } = await params;
  
  let movie;
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=174d0214bf933dd59b3d5ec68a0c967f&language=hi-IN`, {
      next: { revalidate: 3600 }
    });
    if (!res.ok) throw new Error('Failed to fetch');
    movie = await res.json();
  } catch (error) {
    return {
      title: 'Watch Movie – Online Free Streaming on U-TV',
      description: 'Watch movies in Full HD with multiple fast servers on U-TV. Zero cost, no registration required.',
    };
  }
  
  const title = movie.title || 'Watch Movie';
  const posterUrl = movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'https://placehold.co/342x513?text=No+Poster';
  const backdropUrl = movie.backdrop_path ? `https://image.tmdb.org/t/p/original${movie.backdrop_path}` : posterUrl;
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const overview = movie.overview || `Watch ${title} in Full HD on U-TV.`;
  
  return {
    title: `${title} – Online Free Streaming on U-TV`,
    description: `${overview} Stream in Full HD with multiple fast servers. Rating: ⭐ ${rating}. Zero cost, no registration required.`,
    keywords: [title, movie.original_title, 'movie', 'streaming', 'U-TV', 'Full HD', 'online movie'],
    openGraph: {
      title: title,
      description: overview,
      images: [backdropUrl],
      type: 'movie',
      url: `https://your-domain.com/movie/${id}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: title,
      description: overview,
      images: [posterUrl],
    },
  };
}

export async function generateStaticParams() {
  return [];
}

export default async function MoviePlayerPage({ params }) {
  const { id } = await params;
  
  let movie;
  let error = null;
  
  try {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=174d0214bf933dd59b3d5ec68a0c967f&language=hi-IN`, {
      cache: 'no-cache'
    });
    if (!res.ok) throw new Error('Failed to fetch');
    movie = await res.json();
  } catch (err) {
    error = 'Movie not found or API error';
  }

  const servers = [
    { name: 'Server 1', url: `https://vidsrc.to/embed/movie/${id}` },
    { name: 'Server 2', url: `https://vidsrc.xyz/embed/movie/${id}` },
    { name: 'Server 3', url: `https://embed.su/embed/movie/${id}` },
    { name: 'Server 4', url: `https://vidlink.pro/movie/${id}` }
  ];

  if (error || !movie) {
    return (
      <div style={{ background: '#050508', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#e50914', margin: '20px 0' }}>Error</h1>
          <p>{error || 'Movie not found'}</p>
          <a href="/" style={{ color: '#e50914', textDecoration: 'underline' }}>Back to Home</a>
        </div>
      </div>
    );
  }

  const title = movie.title || 'Untitled';
  const rating = movie.vote_average ? movie.vote_average.toFixed(1) : 'N/A';
  const year = movie.release_date ? movie.release_date.split('-')[0] : 'N/A';
  const runtime = movie.runtime ? `${movie.runtime} min` : 'N/A';
  const genres = movie.genres ? movie.genres.map(g => g.name).join(', ') : 'N/A';

  return (
    <div style={{ background: '#050508', color: '#fff', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#e50914', margin: '20px 0' }}>U-TV Player</h1>
      
      <div style={{ maxWidth: '1000px', margin: '0 auto', textAlign: 'center', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '28px', marginBottom: '10px' }}>{title}</h2>
        <div style={{ color: '#aaa', marginBottom: '10px' }}>
          ⭐ {rating} | 📅 {year} | ⏱️ {runtime} | 🎭 {genres}
        </div>
        {movie.overview && (
          <p style={{ color: '#ddd', maxWidth: '800px', margin: '15px auto', lineHeight: '1.6' }}>{movie.overview}</p>
        )}
      </div>
      
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {servers.map((srv, idx) => (
          <button 
            key={idx}
            onClick={() => document.getElementById('player').src = srv.url}
            style={{ background: '#1e1f2a', color: 'white', border: '1px solid #e50914', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontSize: '14px' }}
          >
            {srv.name}
          </button>
        ))}
      </div>

      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '1000px', margin: '0 auto', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <iframe 
          id="player"
          src={servers[0].url} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
          allowFullScreen
          allow="autoplay; fullscreen; encrypted-media"
        ></iframe>
      </div>

      <div style={{ maxWidth: '1000px', margin: '30px auto', textAlign: 'center', color: '#888', fontSize: '14px' }}>
        <p>© 2026 U-TV. All rights reserved.</p>
      </div>
    </div>
  );
}
