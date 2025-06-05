const API_KEY = '2e0b38cfb2936cec8ab1ce48e4335ac3';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/w500';
const VIX = 'https://vixsrc.to';
const VIX_PARAMS = 'autoplay=true&lang=it&primaryColor=E50914';

const GENRES = {
  movie: {
    Azione: 28,
    Commedia: 35,
    Horror: 27,
    Romantici: 10749
  },
  tv: {
    Crime: 80,
    Fantasy: 10765,
    Dramma: 18
  }
};

const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('search-results');
const navbar = document.getElementById('navbar');

const fadeObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.1 });

document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

function navigateTo(viewId) {
  const sections = ['top10', 'genres', 'searchView', 'detailView'];
  sections.forEach(id => document.getElementById(id).classList.add('hidden'));
  if (viewId !== 'home') document.getElementById(viewId).classList.remove('hidden');
  if (viewId === 'home') window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.addEventListener('scroll', () => {
  if (window.scrollY > 30) {
    navbar.classList.add('navbar-small');
  } else {
    navbar.classList.remove('navbar-small');
  }
});

searchInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') triggerSearch();
});

async function triggerSearch() {
  const q = searchInput.value.trim();
  if (!q) return;
  const res = await fetch(`${BASE}/search/multi?api_key=${API_KEY}&language=it-IT&query=${encodeURIComponent(q)}`);
  const data = await res.json();
  const results = data.results.filter(i => i.media_type === 'movie' || i.media_type === 'tv');
  searchResults.innerHTML = results.map(i => renderCard(i, i.media_type)).join('');
  document.getElementById('searchTitle').textContent = `Risultati per: "${q}"`;
  navigateTo('searchView');
}

function renderCard(item, type, rank = null) {
  const title = item.title || item.name;
  const img = item.poster_path ? IMG + item.poster_path : 'https://placehold.co/300x450';
  return `
    <div onclick="openDetail(${item.id}, '${type}')" class="relative card group">
      ${rank ? `<div class="top-number">${rank}</div>` : ''}
      <img src="${img}" alt="${title}" />
    </div>
  `;
}

async function loadHero() {
  const trending = await fetchList('trending/all/week');
  const item = trending[0];
  const bg = item.backdrop_path ? IMG + item.backdrop_path : '';
  document.getElementById('hero').style.backgroundImage = `url(${bg})`;
  document.getElementById('heroTitle').textContent = item.title || item.name;
  document.getElementById('heroOverview').textContent = item.overview || 'Nessuna descrizione disponibile.';
  document.getElementById('heroYear').textContent = (item.release_date || item.first_air_date || '').split('-')[0];
  document.getElementById('heroMatch').textContent = `${Math.floor(Math.random() * 21) + 80}% Match`;
  document.getElementById('heroRating').textContent = `★ ${item.vote_average?.toFixed(1) || 'N/A'}`;
  document.getElementById('heroPlay').onclick = () => playVix(item.media_type, item.id);
}

async function loadTop10() {
  const top = await fetchList('trending/all/week');
  const container = document.getElementById('top10-container');
  container.innerHTML = top.slice(0, 10).map((m, i) => renderCard(m, m.media_type, i + 1)).join('');
}

async function loadCategories() {
  const wrap = document.getElementById('categories-wrapper');
  let html = '';
  for (const [type, genres] of Object.entries(GENRES)) {
    for (const [label, id] of Object.entries(genres)) {
      const items = await fetchCategory(type, id);
      html += `
        <div class="fade-in">
          <h3 class="text-xl font-semibold mb-2">${label} (${type})</h3>
          <div class="flex gap-4 overflow-x-auto pb-3 scrollbar-hide">
            ${items.slice(0, 10).map(m => renderCard(m, type)).join('')}
          </div>
        </div>
      `;
    }
  }
  wrap.innerHTML = html;
  wrap.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));
}

async function fetchList(endpoint) {
  const res = await fetch(`${BASE}/${endpoint}?api_key=${API_KEY}&language=it-IT`);
  const data = await res.json();
  return data.results || [];
}

async function fetchCategory(type, genreId) {
  const res = await fetch(`${BASE}/discover/${type}?api_key=${API_KEY}&language=it-IT&with_genres=${genreId}`);
  const data = await res.json();
  return data.results || [];
}

async function fetchDetails(id, type = 'movie') {
  const res = await fetch(`${BASE}/${type}/${id}?api_key=${API_KEY}&language=it-IT&append_to_response=credits,videos,seasons`);
  return await res.json();
}

async function openDetail(id, type) {
  const view = document.getElementById('detailView');
  navigateTo('detailView');
  const data = await fetchDetails(id, type);

  document.getElementById('detailTitle').textContent = data.title || data.name;
  document.getElementById('detailOverview').textContent = data.overview || 'Nessuna descrizione disponibile.';
  document.getElementById('detailPoster').src = data.poster_path ? IMG + data.poster_path : 'https://placehold.co/300x450';
  document.getElementById('detailMeta').textContent = `${(data.release_date || data.first_air_date || '').split('-')[0]} • ${data.genres.map(g => g.name).join(', ')} • ${data.runtime || data.episode_run_time?.[0] || 'N/A'} min`;

  const cast = data.credits?.cast?.slice(0, 6).map(c => c.name).join(', ') || 'N/D';
  document.getElementById('detailCast').innerHTML = `👥 <strong>Cast:</strong> ${cast}`;

  const watchBtn = document.getElementById('watchNowBtn');
  const trailerBtn = document.getElementById('trailerBtn');

  watchBtn.onclick = () => {
    if (type === 'movie') playVix('movie', id);
    else {
      const s = data.seasons.find(s => s.season_number > 0);
      playVix('tv', id, s?.season_number || 1, 1);
    }
  };

  const trailer = data.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  trailerBtn.onclick = () => {
    if (trailer) {
      openModal(`<iframe src="https://www.youtube.com/embed/${trailer.key}?autoplay=1" allowfullscreen allow="autoplay" class="w-full aspect-video rounded"></iframe>`);
    } else {
      alert('Trailer non disponibile 😢');
    }
  };

  const episodeSection = document.getElementById('episodeSection');
  if (type === 'tv') {
    const select = document.getElementById('seasonSelect');
    const list = document.getElementById('episodeList');
    episodeSection.classList.remove('hidden');
    select.innerHTML = data.seasons.filter(s => s.season_number > 0).map(s =>
      `<option value="${s.season_number}">${s.name}</option>`
    ).join('');
    select.onchange = () => loadEpisodes(id, select.value, list);
    loadEpisodes(id, select.value, list);
  } else {
    episodeSection.classList.add('hidden');
  }
}

async function loadEpisodes(tvId, seasonNumber, container) {
  const res = await fetch(`${BASE}/tv/${tvId}/season/${seasonNumber}?api_key=${API_KEY}&language=it-IT`);
  const data = await res.json();
  container.innerHTML = data.episodes.map(e => `
    <div class="bg-zinc-800 px-4 py-2 rounded flex justify-between items-center">
      <span>${e.episode_number}. ${e.name}</span>
      <button onclick="playVix('tv', ${tvId}, ${seasonNumber}, ${e.episode_number})" class="bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs rounded">▶</button>
    </div>
  `).join('');
}

function playVix(type, id, season = 1, episode = 1) {
  const url = type === 'movie'
    ? `${VIX}/movie/${id}?${VIX_PARAMS}`
    : `${VIX}/tv/${id}/${season}/${episode}?${VIX_PARAMS}`;
  openModal(`<iframe src="${url}" allowfullscreen allow="autoplay" class="w-full aspect-video rounded"></iframe>`);
}

function openModal(html) {
  document.getElementById('modalContent').innerHTML = html;
  document.getElementById('modal').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal').classList.add('hidden');
  document.getElementById('modalContent').innerHTML = '';
  document.body.style.overflow = '';
}

// INIT
loadHero();
loadTop10();
loadCategories();
