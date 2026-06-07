// functions/sitemap.xml.js
const TMDB_API_KEY = '174d0214bf933dd59b3d5ec68a0c967f';
const SITE_URL = 'https://u-tv.pages.dev';

async function fetchMovies(page) {
  const url = `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&language=en-US&page=${page}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.results || [];
}

export async function onRequest() {
  let allMovies = [];
  for (let page = 1; page <= 10; page++) {
    const movies = await fetchMovies(page);
    allMovies.push(...movies);
    if (movies.length < 20) break;
  }
  let urls = `<url><loc>${SITE_URL}/</loc><priority>1.0</priority></url>`;
  for (let m of allMovies.slice(0, 200)) {
    urls += `<url><loc>${SITE_URL}/movie/${m.id}</loc><priority>0.8</priority></url>`;
  }
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  return new Response(sitemap, { headers: { 'Content-Type': 'application/xml' } });
}
