function createCard(item) {
  const title = item.title || item.name || 'Untitled';
  const poster = item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : 'https://placehold.co/342x513?text=No+Poster';
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
