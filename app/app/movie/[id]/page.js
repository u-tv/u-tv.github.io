import React from 'react';

// यह फंक्शन गूगल के लिए डायनेमिक SEO (Title, Tags, Poster) जनरेट करेगा
export async function generateMetadata({ params }) {
  const { id } = params;
  const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=174d0214bf933dd59b3d5ec68a0c967f&language=hi-IN`);
  const movie = await res.json();
  
  return {
    title: `${movie.title || 'Watch Movie'} – Online Free Streaming on U-TV`,
    description: `Watch ${movie.title}. Stream in Full HD with multiple fast servers on U-TV. Zero cost, no registration required.`,
    openGraph: {
      images: [`https://image.tmdb.org/t/p/original${movie.backdrop_path}`],
    },
  };
}

export default function MoviePlayerPage({ params }) {
  const { id } = params;

  // प्लेयर के सर्वर्स की लिस्ट
  const servers = [
    { name: 'Server 1', url: `https://vidsrc.to/embed/movie/${id}` },
    { name: 'Server 2', url: `https://vidsrc.xyz/embed/movie/${id}` },
    { name: 'Server 3', url: `https://embed.su/embed/movie/${id}` },
    { name: 'Server 4', url: `https://vidlink.pro/movie/${id}` }
  ];

  return (
    <div style={{ background: '#050508', color: '#white', minHeight: '100vh', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center', color: '#e50914', margin: '20px 0' }}>U-TV Player</h1>
      
      {/* सर्वर्स के बटन्स */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {servers.map((srv, idx) => (
          <button 
            key={idx}
            onClick={() => document.getElementById('player').src = srv.url}
            style={{ background: '#1e1f2a', color: 'white', border: '1px solid #e50914', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer' }}
          >
            {srv.name}
          </button>
        ))}
      </div>

      {/* वीडियो प्लेयर का डिब्बा */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '1000px', margin: '0 auto', borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
        <iframe 
          id="player"
          src={servers[0].url} 
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} 
          allowFullScreen
        ></iframe>
      </div>
    </div>
  );
}
