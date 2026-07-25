// ============================================================
// _worker.js — Auto‑sync sitemap.xml for U-TV HUB
// Uses TMDB API to fetch trending movies and TV shows
// ============================================================

const TMDB_KEYS = [
  '174d0214bf933dd59b3d5ec68a0c967f',
  '5bf61a62fd4647aa7debed7d6f2db079'
];
let keyIndex = 0;
const BASE_URL = 'https://u-tv.pages.dev';
const TMDB_API = 'https://api.themoviedb.org/3';

// ============================================================
// Helper: Fetch from TMDB with auto key rotation
// ============================================================
async function tmdbFetch(endpoint) {
  for (let i = 0; i < TMDB_KEYS.length; i++) {
    try {
      const url = `${TMDB_API}${endpoint}?api_key=${TMDB_KEYS[keyIndex]}&language=en-US&page=1`;
      const res = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });
      if (res.status === 401) {
        keyIndex = (keyIndex + 1) % TMDB_KEYS.length;
        continue;
      }
      if (!res.ok) throw new Error('TMDB error');
      return await res.json();
    } catch (e) {
      keyIndex = (keyIndex + 1) % TMDB_KEYS.length;
    }
  }
  throw new Error('All TMDB keys failed');
}

// ============================================================
// Get trending movies & TV shows (up to 50 combined)
// ============================================================
async function getTrendingItems() {
  try {
    const data = await tmdbFetch('/trending/all/week');
    return (data.results || [])
      .filter(item => item.poster_path)
      .slice(0, 50);
  } catch {
    return [];
  }
}

// ============================================================
// Generate sitemap XML
// ============================================================
function generateSitemap(items) {
  const staticPages = [
    { path: '/', priority: 1.0, changefreq: 'weekly' },
    { path: '/about/', priority: 0.8, changefreq: 'monthly' },
    { path: '/dmca/', priority: 0.8, changefreq: 'monthly' },
    { path: '/disclaimer/', priority: 0.8, changefreq: 'monthly' },
    { path: '/contact/', priority: 0.8, changefreq: 'monthly' },
    { path: '/privacy/', priority: 0.8, changefreq: 'monthly' },
    { path: '/terms/', priority: 0.8, changefreq: 'monthly' }
  ];

  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

  // Static pages
  staticPages.forEach(page => {
    xml += `
  <url>
    <loc>${BASE_URL}${page.path}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`;
  });

  // Dynamic pages (movies & TV)
  const today = new Date().toISOString().split('T')[0];
  items.forEach(item => {
    const type = item.media_type || 'movie';
    const id = item.id;
    xml += `
  <url>
    <loc>${BASE_URL}/${type}/${id}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  });

  xml += `
</urlset>`;
  return xml;
}

// ============================================================
// Main Worker
// ============================================================
export default {
  async fetch(request) {
    const url = new URL(request.url);

    // Only handle /sitemap.xml
    if (url.pathname === '/sitemap.xml') {
      try {
        const items = await getTrendingItems();
        const sitemap = generateSitemap(items);
        return new Response(sitemap, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600' // cache 1 hour
          }
        });
      } catch (error) {
        // Fallback: return a minimal sitemap with only static pages
        const fallbackSitemap = generateSitemap([]);
        return new Response(fallbackSitemap, {
          headers: {
            'Content-Type': 'application/xml',
            'Cache-Control': 'public, max-age=3600'
          }
        });
      }
    }

    // For all other requests, let Cloudflare Pages serve static files
    return new Response('Not Found', { status: 404 });
  }
};
