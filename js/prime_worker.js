const TMDB_KEY = "c096300da27be38fd70190283bc5f8bc",
  API = "https://api.themoviedb.org/3",
  IMG = "https://image.tmdb.org/t/p/w500",
  BIG = "https://image.tmdb.org/t/p/original",
  IMG_WIDE = "https://image.tmdb.org/t/p/w780";
const SERVERS = [
  {
    name: "VidStorm",
    url: (t, id, s, e) =>
      s
        ? `https://vidstorm.ru/embed/tv/${id}/${s}/${e || 1}`
        : `https://vidstorm.ru/embed/${t}/${id}`,
  },
  {
    name: "VidSrc.to",
    url: (t, id, s, e) =>
      s
        ? `https://vidsrc.to/embed/tv/${id}/${s}/${e || 1}`
        : `https://vidsrc.to/embed/${t}/${id}`,
  },
  {
    name: "2Embed",
    url: (t, id, s, e) =>
      s
        ? `https://www.2embed.skin/embedtv/${id}&s=${s}&e=${e || 1}`
        : `https://www.2embed.skin/embed/${id}`,
  },
  {
    name: "VidSrc.me",
    url: (t, id, s, e) =>
      s
        ? `https://vidsrc.me/embed/tv?tmdb=${id}&season=${s}&episode=${e || 1}`
        : `https://vidsrc.me/embed/${t}?tmdb=${id}`,
  },
  {
    name: "VidSrc.pro",
    url: (t, id, s, e) =>
      s
        ? `https://vidsrc.pro/embed/tv/${id}/${s}/${e || 1}`
        : `https://vidsrc.pro/embed/${t}/${id}`,
  },
  {
    name: "SuperEmbed",
    url: (t, id, s, e) =>
      s
        ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${s}&e=${e || 1}`
        : `https://multiembed.mov/?video_id=${id}&tmdb=1`,
  },
];

let heroMovies = [],
  heroIdx = 0,
  heroTimer = null,
  heroProgressTimer = null,
  heroProgressVal = 0;
let currentId = null,
  currentType = null,
  currentServer = 0,
  currentSeason = 1,
  currentEpisode = 1;
let watchlist = JSON.parse(localStorage.getItem("foudri_wl") || "[]");
let continueWatching = JSON.parse(localStorage.getItem("foudri_cw") || "[]");
let currentModalData = null;
let allContent = { trending: [], popular: [], tv: [], now: [] };
let langMovies = { en: [], hi: [], es: [] };

let seeAllCategory = "",
  seeAllLabel = "",
  seeAllPage = 1,
  seeAllTotalPages = 1,
  seeAllSort = "popularity",
  seeAllItems = [];

async function tmdb(ep, extra = "") {
  const j = ep.includes("?") ? "&" : "?";
  const r = await fetch(`${API}${ep}${j}api_key=${TMDB_KEY}${extra}`);
  return r.json();
}

window.addEventListener("DOMContentLoaded", async () => {
  window.addEventListener("scroll", () => {
    const s = window.scrollY > 20;
    document.getElementById("nav").classList.toggle("scrolled", s);
    document.getElementById("genreBar").classList.toggle("scrolled", s);
  });
  document
    .getElementById("searchInput")
    .addEventListener("keydown", (e) => e.key === "Enter" && doSearch());
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeModal();
      closeSeeAll();
    }
  });
  updateWlBadge();
  renderContinueWatching();

  const [trend, pop, tv, now, upcoming, en, hi, es] = await Promise.all([
    tmdb("/trending/movie/week"),
    tmdb("/movie/popular"),
    tmdb("/tv/popular"),
    tmdb("/movie/now_playing"),
    tmdb("/movie/upcoming"),
    tmdb("/discover/movie?with_original_language=en&sort_by=popularity.desc"),
    tmdb("/discover/movie?with_original_language=hi&sort_by=popularity.desc"),
    tmdb("/discover/movie?with_original_language=es&sort_by=popularity.desc"),
  ]);
  allContent = {
    trending: trend.results || [],
    popular: pop.results || [],
    tv: tv.results || [],
    now: now.results || [],
  };
  langMovies = {
    en: (en.results || []).filter((m) => m.poster_path),
    hi: (hi.results || []).filter((m) => m.poster_path),
    es: (es.results || []).filter((m) => m.poster_path),
  };

  heroMovies = (trend.results || [])
    .filter((m) => m.backdrop_path && m.overview)
    .slice(0, 6);
  if (heroMovies.length) {
    renderHero(0);
    startHeroTimer();
    renderDots();
  }

  renderFeatured(upcoming.results || []);
  renderScrollRow(trend.results, "trendingGrid", true);
  renderGrid(pop.results, "popularGrid");
  renderGrid(tv.results, "tvGrid", "tv");
  renderGrid(now.results, "nowGrid");

  renderScrollRow(langMovies.en, "englishGrid", false, "movie");
  renderScrollRow(langMovies.hi, "hindiGrid", false, "movie");
  renderScrollRow(langMovies.es, "spanishGrid", false, "movie");

  await loadAnimationContent();
});

window.setLanguageFilter = (lang, el) => {
  document
    .querySelectorAll("#langBar .lang-pill")
    .forEach((p) => p.classList.remove("active"));
  if (el) el.classList.add("active");
  showToast(
    lang ? `Showing ${el.textContent}` : "All languages",
    "fa-language",
  );
};

function renderHero(idx) {
  const m = heroMovies[idx];
  if (!m) return;
  heroIdx = idx;
  const img = document.getElementById("heroBgImg");
  img.style.opacity = 0;
  img.src = BIG + m.backdrop_path;
  img.onload = () => (img.style.opacity = 1);
  document.getElementById("heroTitle").textContent = m.title || m.name;
  const ov = m.overview || "";
  document.getElementById("heroOverview").textContent =
    ov.length > 190 ? ov.slice(0, 187) + "…" : ov;
  document.getElementById("heroRating").textContent =
    " " + (m.vote_average?.toFixed(1) || "–");
  document.getElementById("heroYear").textContent =
    (m.release_date || m.first_air_date || "").slice(0, 4) || "–";
  const gMap = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    18: "Drama",
    14: "Fantasy",
    27: "Horror",
    9648: "Mystery",
    878: "Sci-Fi",
    53: "Thriller",
    10749: "Romance",
    10751: "Family",
    99: "Documentary",
  };
  document.getElementById("heroGenre").textContent = m.genre_ids?.length
    ? gMap[m.genre_ids[0]] || "Film"
    : "Film";
  document
    .querySelectorAll(".hero-dot")
    .forEach((d, i) => d.classList.toggle("active", i === idx));
  const inList = watchlist.some((w) => w.id === m.id);
  const wlBtn = document.getElementById("heroWlBtn");
  wlBtn.innerHTML = inList
    ? '<i class="fas fa-check"></i> In List'
    : '<i class="fas fa-plus"></i> My List';
  wlBtn.classList.toggle("in-list", inList);
  heroProgressVal = 0;
  document.getElementById("heroProgress").style.width = "0%";
}
function renderDots() {
  document.getElementById("heroDots").innerHTML = heroMovies
    .map(
      (_, i) =>
        `<button class="hero-dot${i === 0 ? " active" : ""}" onclick="jumpHero(${i})"></button>`,
    )
    .join("");
}
function startHeroTimer() {
  clearInterval(heroTimer);
  clearInterval(heroProgressTimer);
  heroProgressVal = 0;
  if (heroMovies.length < 2) return;
  heroProgressTimer = setInterval(() => {
    heroProgressVal += 100 / 80;
    document.getElementById("heroProgress").style.width =
      Math.min(heroProgressVal, 100) + "%";
    if (heroProgressVal >= 100) {
      heroProgressVal = 0;
      renderHero((heroIdx + 1) % heroMovies.length);
    }
  }, 100);
}
window.jumpHero = (i) => {
  renderHero(i);
  startHeroTimer();
};
window.heroPlay = () => openContent(heroMovies[heroIdx].id, "movie", true);
window.heroInfo = () => openContent(heroMovies[heroIdx].id, "movie", false);
window.toggleHeroWatchlist = () => {
  const m = heroMovies[heroIdx];
  if (!m) return;
  toggleWatchlistItem({
    id: m.id,
    type: "movie",
    title: m.title,
    poster: m.poster_path,
    year: (m.release_date || "").slice(0, 4),
    rating: m.vote_average?.toFixed(1),
  });
  renderHero(heroIdx);
};

window.setGenreFilter = (genreId, el) => {
  document
    .querySelectorAll(".genre-pill")
    .forEach((p) => p.classList.remove("active"));
  el.classList.add("active");
  if (!genreId) {
    renderScrollRow(allContent.trending, "trendingGrid", true);
    renderGrid(allContent.popular, "popularGrid");
    renderGrid(allContent.tv, "tvGrid", "tv");
    renderGrid(allContent.now, "nowGrid");
    return;
  }
  const filter = (items) => items.filter((i) => i.genre_ids?.includes(genreId));
  renderScrollRow(filter(allContent.trending), "trendingGrid", true);
  renderGrid(filter(allContent.popular), "popularGrid");
  renderGrid(filter([...allContent.tv, ...allContent.now]), "nowGrid");
};

async function openSeeAll(category, label) {
  seeAllCategory = category;
  seeAllLabel = label;
  seeAllPage = 1;
  seeAllSort = "popularity";
  seeAllItems = [];
  document.getElementById("seeAllTitle").textContent = label;
  document.getElementById("seeAllGrid").innerHTML = "";
  document.getElementById("seeAllCount").textContent = "";
  document.getElementById("seeAllLoadMore").style.display = "none";
  document
    .querySelectorAll(".sort-btn")
    .forEach((b, i) => b.classList.toggle("active", i === 0));
  const page = document.getElementById("seeAllPage");
  page.classList.add("open");
  document.body.style.overflow = "hidden";
  await fetchSeeAll(true);
}
window.openSeeAll = openSeeAll;

function closeSeeAll() {
  document.getElementById("seeAllPage").classList.remove("open");
  document.body.style.overflow = "";
}
window.closeSeeAll = closeSeeAll;

async function setSeeAllSort(sort, el) {
  seeAllSort = sort;
  seeAllPage = 1;
  seeAllItems = [];
  document
    .querySelectorAll(".sort-btn")
    .forEach((b) => b.classList.remove("active"));
  el.classList.add("active");
  document.getElementById("seeAllGrid").innerHTML = "";
  document.getElementById("seeAllLoadMore").style.display = "none";
  await fetchSeeAll(true);
}
window.setSeeAllSort = setSeeAllSort;

async function fetchSeeAll(first = false) {
  const loading = document.getElementById("seeAllLoading");
  loading.style.display = "flex";

  let ep = "";
  const sortParam = `sort_by=${seeAllSort}.desc`;

  if (seeAllCategory === "trending")
    ep = `/trending/movie/week?page=${seeAllPage}`;
  else if (seeAllCategory === "popular_movies")
    ep = `/movie/popular?page=${seeAllPage}`;
  else if (seeAllCategory === "popular_tv")
    ep = `/tv/popular?page=${seeAllPage}`;
  else if (seeAllCategory === "now_playing")
    ep = `/movie/now_playing?page=${seeAllPage}`;
  else if (seeAllCategory === "upcoming")
    ep = `/movie/upcoming?page=${seeAllPage}`;
  else if (seeAllCategory === "lang_en")
    ep = `/discover/movie?with_original_language=en&${sortParam}&page=${seeAllPage}`;
  else if (seeAllCategory === "lang_hi")
    ep = `/discover/movie?with_original_language=hi&${sortParam}&page=${seeAllPage}`;
  else if (seeAllCategory === "lang_es")
    ep = `/discover/movie?with_original_language=es&${sortParam}&page=${seeAllPage}`;
  else if (seeAllCategory.startsWith("genre_")) {
    const gid = seeAllCategory.split("_")[1];
    ep = `/discover/movie?with_genres=${gid}&${sortParam}&page=${seeAllPage}`;
  } else ep = `/movie/popular?page=${seeAllPage}`;

  const data = await tmdb(ep);
  seeAllTotalPages = Math.min(data.total_pages || 1, 20);
  const results = data.results || [];
  seeAllItems = [...seeAllItems, ...results];

  const mediaType = seeAllCategory === "popular_tv" ? "tv" : "movie";
  const grid = document.getElementById("seeAllGrid");
  const newCards = results
    .map((item, idx) => {
      const t = item.title || item.name,
        r = item.vote_average?.toFixed(1) || "?";
      const mt = item.media_type || mediaType;
      const poster = item.poster_path
        ? IMG + item.poster_path
        : `https://placehold.co/300x450/131110/3a302a?text=${encodeURIComponent(t || "?")}`;
      const inWl = watchlist.some((w) => w.id === item.id);
      const globalIdx = (seeAllPage - 1) * 20 + idx;
      return `<div class="card" onclick="openContent(${item.id},'${mt}')">
      ${globalIdx < 3 && seeAllPage === 1 ? `<div class="card-rank">#${globalIdx + 1}</div>` : ""}
      <img src="${poster}" alt="${t}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded');this.src='https://placehold.co/300x450/131110/3a302a?text=N/A'">
      <div class="card-overlay"></div>
      <div class="card-hover-actions">
        <div class="card-play-circle"><i class="fas fa-play"></i></div>
        <button class="card-wl-btn${inWl ? " saved" : ""}" onclick="event.stopPropagation();quickWl(${item.id},'${mt}','${t.replace(/'/g, "\\'")}','${item.poster_path || ""}','${(item.release_date || item.first_air_date || "").slice(0, 4)}','${r}')">${inWl ? "✓ Saved" : "+ My List"}</button>
      </div>
      <div class="card-info">
        <div class="card-title">${t}</div>
        <div class="card-meta">
          <span class="card-rating"><i class="fas fa-star" style="font-size:.58rem"></i> ${r}</span>
          <span class="card-type">${mt === "tv" ? "TV" : "Film"}</span>
        </div>
      </div>
    </div>`;
    })
    .join("");
  grid.innerHTML += newCards;

  const total = data.total_results || seeAllItems.length;
  document.getElementById("seeAllCount").textContent =
    `Showing ${seeAllItems.length} of ${total.toLocaleString()} results`;
  loading.style.display = "none";
  document.getElementById("seeAllLoadMore").style.display =
    seeAllPage < seeAllTotalPages ? "block" : "none";
}

async function loadMoreSeeAll() {
  seeAllPage++;
  await fetchSeeAll(false);
}
window.loadMoreSeeAll = loadMoreSeeAll;

function renderFeatured(items) {
  const g = document.getElementById("featuredRow");
  const valid = items.filter((i) => i.backdrop_path).slice(0, 8);
  if (!valid.length) {
    g.innerHTML = "";
    return;
  }
  g.innerHTML = valid
    .map((item) => {
      const t = item.title || item.name,
        y = (item.release_date || "").slice(0, 4),
        r = item.vote_average?.toFixed(1) || "?";
      return `<div class="featured-card" onclick="openContent(${item.id},'movie')">
      <img src="${IMG_WIDE + item.backdrop_path}" alt="${t}" loading="lazy">
      <div class="featured-play"><i class="fas fa-play"></i></div>
      <div class="featured-info">
        <div class="featured-title">${t}</div>
        <div class="featured-meta"><span><i class="fas fa-star" style="color:var(--gold);font-size:.7rem"></i> ${r}</span><span>${y}</span></div>
      </div>
    </div>`;
    })
    .join("");
}

function renderScrollRow(items, gridId, showRank = false, type = "movie") {
  const g = document.getElementById(gridId);
  if (!items?.length) {
    g.innerHTML = '<p style="color:var(--text3)">No content</p>';
    return;
  }
  g.innerHTML = items
    .slice(0, 12)
    .map((item, idx) => {
      const t = item.title || item.name,
        r = item.vote_average?.toFixed(1) || "?";
      const mt = type === "tv" ? "tv" : item.media_type || "movie";
      const poster = item.poster_path
        ? IMG + item.poster_path
        : `https://placehold.co/300x450/131110/3a302a?text=${encodeURIComponent(t || "?")}`;
      const inWl = watchlist.some((w) => w.id === item.id);
      return `<div class="card" onclick="openContent(${item.id},'${mt}')">
      ${showRank && idx < 3 ? `<div class="card-rank">#${idx + 1}</div>` : ""}
      <img src="${poster}" alt="${t}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded');this.src='https://placehold.co/300x450/131110/3a302a?text=N/A'">
      <div class="card-overlay"></div>
      <div class="card-hover-actions">
        <div class="card-play-circle"><i class="fas fa-play"></i></div>
        <button class="card-wl-btn${inWl ? " saved" : ""}" onclick="event.stopPropagation();quickWl(${item.id},'${mt}','${t.replace(/'/g, "\\'")}','${item.poster_path || ""}','${(item.release_date || item.first_air_date || "").slice(0, 4)}','${r}')">${inWl ? "✓ Saved" : "+ My List"}</button>
      </div>
      <div class="card-info"><div class="card-title">${t}</div><div class="card-meta"><span class="card-rating"><i class="fas fa-star" style="font-size:.58rem"></i> ${r}</span><span class="card-type">${mt === "tv" ? "TV" : "Film"}</span></div></div>
    </div>`;
    })
    .join("");
}

function renderGrid(items, gridId, type = "movie") {
  const g = document.getElementById(gridId);
  if (!items?.length) {
    g.innerHTML =
      '<p style="color:var(--text3);grid-column:1/-1">No content</p>';
    return;
  }
  g.innerHTML = items
    .slice(0, 12)
    .map((item) => {
      const t = item.title || item.name,
        r = item.vote_average?.toFixed(1) || "?";
      const mt = type === "tv" ? "tv" : item.media_type || "movie";
      const poster = item.poster_path
        ? IMG + item.poster_path
        : `https://placehold.co/300x450/131110/3a302a?text=${encodeURIComponent(t || "?")}`;
      const inWl = watchlist.some((w) => w.id === item.id);
      return `<div class="card" onclick="openContent(${item.id},'${mt}')">
      <img src="${poster}" alt="${t}" loading="lazy" onload="this.classList.add('loaded')" onerror="this.classList.add('loaded');this.src='https://placehold.co/300x450/131110/3a302a?text=N/A'">
      <div class="card-overlay"></div>
      <div class="card-hover-actions">
        <div class="card-play-circle"><i class="fas fa-play"></i></div>
        <button class="card-wl-btn${inWl ? " saved" : ""}" onclick="event.stopPropagation();quickWl(${item.id},'${mt}','${t.replace(/'/g, "\\'")}','${item.poster_path || ""}','${(item.release_date || item.first_air_date || "").slice(0, 4)}','${r}')">${inWl ? "✓ Saved" : "+ My List"}</button>
      </div>
      <div class="card-info"><div class="card-title">${t}</div><div class="card-meta"><span class="card-rating"><i class="fas fa-star" style="font-size:.58rem"></i> ${r}</span><span class="card-type">${mt === "tv" ? "TV" : "Film"}</span></div></div>
    </div>`;
    })
    .join("");
}

async function loadAnimationContent() {
  try {
    const [movies, series] = await Promise.all([
      tmdb(
        "/discover/movie?with_genres=16&sort_by=popularity.desc&vote_count.gte=50",
      ),
      tmdb(
        "/discover/tv?with_genres=16&sort_by=popularity.desc&vote_count.gte=20",
      ),
    ]);

    const animatedMovies = (movies.results || [])
      .filter((m) => m.poster_path)
      .slice(0, 10);
    const animatedSeries = (series.results || [])
      .filter((s) => s.poster_path)
      .slice(0, 10);

    document.getElementById("animatedMoviesCount").textContent =
      `${animatedMovies.length}+`;
    document.getElementById("animatedSeriesCount").textContent =
      `${animatedSeries.length}+`;

    renderScrollRow(animatedMovies, "animationMoviesRow", true, "movie");
    renderScrollRow(animatedSeries, "animationSeriesRow", true, "tv");
  } catch (error) {
    console.error("Error loading animation content:", error);
  }
}

async function doSearch() {
  const q = document.getElementById("searchInput").value.trim();
  if (!q) return;
  const sr = document.getElementById("searchResults"),
    sg = document.getElementById("searchGrid");
  document.getElementById("searchLabel").textContent = `"${q}"`;
  sr.style.display = "block";
  sg.innerHTML =
    '<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>';
  sr.scrollIntoView({ behavior: "smooth", block: "start" });
  const data = await tmdb(`/search/multi?query=${encodeURIComponent(q)}`);
  const res = (data.results || []).filter(
    (i) => (i.media_type === "movie" || i.media_type === "tv") && i.poster_path,
  );
  if (res.length) renderGrid(res, "searchGrid");
  else
    sg.innerHTML =
      '<p style="color:var(--text3);grid-column:1/-1;padding:2rem 0">No results found</p>';
}
window.doSearch = doSearch;
function clearSearch() {
  document.getElementById("searchResults").style.display = "none";
  document.getElementById("searchInput").value = "";
}
window.clearSearch = clearSearch;
window.scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

function toggleWatchlistItem(item) {
  const idx = watchlist.findIndex((w) => w.id === item.id);
  if (idx > -1) {
    watchlist.splice(idx, 1);
    showToast("Removed from My List", "fa-minus-circle");
  } else {
    watchlist.unshift(item);
    showToast("Added to My List", "fa-check-circle");
  }
  localStorage.setItem("foudri_wl", JSON.stringify(watchlist));
  updateWlBadge();
  renderWatchlistPanel();
}
window.quickWl = (id, type, title, poster, year, rating) => {
  toggleWatchlistItem({ id, type, title, poster, year, rating });
  document.querySelectorAll(".card-wl-btn").forEach((b) => {
    if (b.onclick?.toString().includes(`quickWl(${id},`)) {
      const inWl = watchlist.some((w) => w.id === id);
      b.textContent = inWl ? "✓ Saved" : "+ My List";
      b.classList.toggle("saved", inWl);
    }
  });
};
function toggleWatchlist() {
  document.getElementById("watchlistPanel").classList.toggle("open");
  document.getElementById("watchlistOverlay").classList.toggle("open");
  renderWatchlistPanel();
}
window.toggleWatchlist = toggleWatchlist;
function updateWlBadge() {
  const b = document.getElementById("wlBadge");
  b.textContent = watchlist.length;
  b.style.display = watchlist.length ? "flex" : "none";
}
function renderWatchlistPanel() {
  const c = document.getElementById("watchlistContent");
  document.getElementById("wlCount").textContent = `(${watchlist.length})`;
  if (!watchlist.length) {
    c.innerHTML = `<div class="wl-empty"><i class="fas fa-bookmark"></i><p>Your list is empty</p><p style="font-size:.8rem;margin-top:.3rem">Add movies & shows to watch later</p></div>`;
    return;
  }
  c.innerHTML = watchlist
    .map(
      (item) => `
    <div class="wl-item" onclick="openContent(${item.id},'${item.type}')">
      <img src="${item.poster ? IMG + item.poster : "https://placehold.co/100x150/131110/3a302a?text=?"}" alt="${item.title}" onerror="this.src='https://placehold.co/100x150/131110/3a302a?text=?'">
      <div class="wl-item-info">
        <div class="wl-item-title">${item.title}</div>
        <div class="wl-item-meta">${item.year || ""} · ${item.type === "tv" ? "TV Show" : "Movie"} · ⭐ ${item.rating || "?"}</div>
      </div>
      <button class="wl-remove" onclick="event.stopPropagation();toggleWatchlistItem({id:${item.id}});renderHero(heroIdx);"><i class="fas fa-times"></i></button>
    </div>`,
    )
    .join("");
}

function addToContinueWatching(id, type, title, poster, season, episode) {
  const entry = {
    id,
    type,
    title,
    poster,
    season,
    episode,
    ts: Date.now(),
    progress: Math.floor(Math.random() * 70) + 10,
  };
  continueWatching = continueWatching.filter((c) => c.id !== id).slice(0, 9);
  continueWatching.unshift(entry);
  localStorage.setItem("foudri_cw", JSON.stringify(continueWatching));
  renderContinueWatching();
}
function renderContinueWatching() {
  const sec = document.getElementById("continueSection"),
    row = document.getElementById("continueRow");
  if (!continueWatching.length) {
    sec.style.display = "none";
    return;
  }
  sec.style.display = "block";
  row.innerHTML = continueWatching
    .map(
      (item) => `
    <div class="continue-card" onclick="openContent(${item.id},'${item.type}',true)">
      <div class="continue-thumb">
        <img src="${item.poster ? IMG + item.poster : "https://placehold.co/300x170/131110/3a302a?text=?"}" alt="${item.title}" style="width:100%;height:100%;object-fit:cover">
        <div class="continue-progress"><div class="continue-progress-fill" style="width:${item.progress}%"></div></div>
      </div>
      <div class="continue-info">
        <div class="continue-title">${item.title}</div>
        <div class="continue-sub">${item.type === "tv" ? `S${item.season} E${item.episode}` : ""}</div>
        <div class="continue-resume"><i class="fas fa-play" style="font-size:.65rem"></i> Resume · ${item.progress}%</div>
      </div>
    </div>`,
    )
    .join("");
}

function buildVoteDisplay(voteAverage, voteCount) {
  const score = parseFloat(voteAverage) || 0;
  const pct = (score / 10) * 100;
  const fullStars = Math.floor(score / 2);
  const hasHalf = score / 2 - fullStars >= 0.3;
  const emptyStars = 5 - fullStars - (hasHalf ? 1 : 0);
  const starsHtml =
    '<i class="fas fa-star vote-star filled"></i>'.repeat(fullStars) +
    (hasHalf ? '<i class="vote-star half fas fa-star"></i>' : "") +
    '<i class="far fa-star vote-star"></i>'.repeat(emptyStars);

  const countLabel =
    voteCount > 0
      ? voteCount >= 1000
        ? `${(voteCount / 1000).toFixed(1)}k votes`
        : `${voteCount} votes`
      : "No votes yet";

  return `
    <div class="vote-bar-wrap">
      <div class="vote-bar-label">
        <div>
          <div class="vote-bar-score">${score.toFixed(1)}<span>/10</span></div>
          <div class="vote-bar-stars">${starsHtml}</div>
          <div class="vote-count">${countLabel}</div>
        </div>
      </div>
      <div class="vote-bar-track"><div class="vote-bar-fill" style="width:0%" data-pct="${pct}"></div></div>
    </div>`;
}

async function openContent(id, type, autoplay = false) {
  clearInterval(heroProgressTimer);
  clearInterval(heroTimer);
  currentId = id;
  currentType = type;
  currentServer = 0;
  currentSeason = 1;
  currentEpisode = 1;
  const modal = document.getElementById("modal");
  modal.classList.add("open");
  document.body.style.overflow = "hidden";
  document
    .querySelectorAll(".modal-tab")
    .forEach((t) => t.classList.remove("active"));
  document.querySelector(".modal-tab").classList.add("active");
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById("tab-info").classList.add("active");
  document.getElementById("tab-info").innerHTML =
    '<div style="text-align:center;padding:3rem"><div class="spinner" style="margin:0 auto"></div></div>';
  ["tab-episodes", "tab-similar", "tab-trailers", "tab-reviews"].forEach(
    (id) => (document.getElementById(id).innerHTML = ""),
  );
  document.getElementById("epTabBtn").style.display =
    type === "tv" ? "" : "none";
  renderServers();
  if (autoplay) loadPlayer();
  else
    document.getElementById("playerWrap").innerHTML =
      `<div class="player-loader"><div style="text-align:center;padding:2.5rem"><i class="fas fa-film" style="font-size:2rem;color:var(--surface3);margin-bottom:1rem;display:block"></i><p style="color:var(--text3);margin-bottom:1rem;font-size:.88rem">Choose a server & hit play</p><button onclick="loadPlayer()" style="background:var(--accent);border:none;color:white;padding:.7rem 1.8rem;border-radius:10px;font-family:Syne,sans-serif;font-weight:700;cursor:pointer;font-size:.9rem"><i class="fas fa-play" style="margin-right:.4rem"></i>Watch Now</button></div></div>`;

  const [details, credits] = await Promise.all([
    tmdb(`/${type}/${id}`),
    tmdb(`/${type}/${id}/credits`),
  ]);
  currentModalData = { details, credits, type };
  renderInfoTab(details, credits, type);
  addToContinueWatching(
    id,
    type,
    details.title || details.name,
    details.poster_path,
    1,
    1,
  );
}
window.openContent = openContent;

function renderInfoTab(d, credits, type) {
  const title = d.title || d.name,
    year = (d.release_date || d.first_air_date || "").slice(0, 4);
  const score = parseFloat(d.vote_average) || 0;
  const voteCount = parseInt(d.vote_count) || 0;
  const genres = d.genres?.map((g) => g.name).join(", ") || "–";
  const runtime =
    type === "movie"
      ? d.runtime
        ? `${d.runtime} min`
        : "–"
      : d.number_of_seasons
        ? `${d.number_of_seasons} season${d.number_of_seasons > 1 ? "s" : ""}`
        : "–";
  const cast = (credits.cast || []).slice(0, 16),
    poster = d.poster_path ? IMG + d.poster_path : "";
  const director = credits.crew?.find((c) => c.job === "Director");
  const writer = credits.crew?.find(
    (c) => c.job === "Screenplay" || c.job === "Writer" || c.job === "Story",
  );
  const inWl = watchlist.some((w) => w.id === d.id);

  const tvExtra =
    type === "tv"
      ? `
    ${d.number_of_episodes ? `<div class="info-stat"><div class="info-stat-val">${d.number_of_episodes}</div><div class="info-stat-lbl">Episodes</div></div>` : ""}
    ${d.networks?.length ? `<div class="info-stat"><div class="info-stat-val" style="font-size:.72rem">${d.networks[0].name}</div><div class="info-stat-lbl">Network</div></div>` : ""}`
      : "";
  const movieExtra =
    type === "movie"
      ? `
    ${d.revenue > 0 ? `<div class="info-stat"><div class="info-stat-val">$${(d.revenue / 1e6).toFixed(0)}M</div><div class="info-stat-lbl">Box Office</div></div>` : ""}
    ${d.budget > 0 ? `<div class="info-stat"><div class="info-stat-val">$${(d.budget / 1e6).toFixed(0)}M</div><div class="info-stat-lbl">Budget</div></div>` : ""}`
      : "";

  document.getElementById("tab-info").innerHTML = `
    <div class="modal-details">
      ${poster ? `<div class="modal-poster"><img src="${poster}" alt="${title}" loading="lazy"></div>` : ""}
      <div>
        <h2 class="modal-title">${title}</h2>
        ${d.tagline ? `<p style="color:var(--accent2);font-size:.82rem;font-style:italic;margin-bottom:.6rem;font-weight:300">"${d.tagline}"</p>` : ""}
        <p class="modal-overview">${d.overview || ""}</p>

        ${buildVoteDisplay(score, voteCount)}

        <div class="info-stats-row">
          <div class="info-stat"><div class="info-stat-val">${year || "–"}</div><div class="info-stat-lbl">Year</div></div>
          <div class="info-stat-divider"></div>
          <div class="info-stat"><div class="info-stat-val">${runtime}</div><div class="info-stat-lbl">${type === "tv" ? "Seasons" : "Runtime"}</div></div>
          <div class="info-stat-divider"></div>
          <div class="info-stat"><div class="info-stat-val">${d.original_language?.toUpperCase() || "–"}</div><div class="info-stat-lbl">Language</div></div>
          ${movieExtra}${tvExtra}
        </div>

        <div class="info-chips">
          ${genres ? `<div class="chip accent">${genres}</div>` : ""}
          ${d.status ? `<div class="chip ${d.status === "Released" || d.status === "Ended" ? "chip-green" : d.status === "In Production" || d.status === "Returning Series" ? "chip-blue" : ""}">${d.status}</div>` : ""}
          ${d.popularity ? `<div class="chip">🔥 ${Math.round(d.popularity).toLocaleString()} pop.</div>` : ""}
        </div>

        ${
          director || writer
            ? `<div style="display:flex;gap:1.5rem;margin-bottom:1rem;flex-wrap:wrap">
          ${director ? `<div><div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.15rem">Director</div><div style="font-size:.85rem;font-weight:600;color:var(--text)">${director.name}</div></div>` : ""}
          ${writer ? `<div><div style="font-size:.7rem;color:var(--text3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:.15rem">Writer</div><div style="font-size:.85rem;font-weight:600;color:var(--text)">${writer.name}</div></div>` : ""}
        </div>`
            : ""
        }

        <div class="modal-actions">
          <button class="modal-action-btn${inWl ? " active" : ""}" id="modalWlBtn" onclick="modalToggleWl(${d.id},'${type}','${title.replace(/'/g, "\\'")}','${d.poster_path || ""}','${year}','${score.toFixed(1)}')">
            <i class="fas fa-${inWl ? "check" : "plus"}"></i> ${inWl ? "In My List" : "My List"}
          </button>
          ${type === "tv" ? `<button class="modal-action-btn" onclick="switchTab('episodes',document.querySelector('#epTabBtn'))"><i class="fas fa-list"></i> Episodes</button>` : ""}
          <button class="modal-action-btn" onclick="switchTab('similar',document.querySelectorAll('.modal-tab')[2])"><i class="fas fa-th-large"></i> More Like This</button>
          ${type === "movie" ? `<a href="https://dl.vidsrc.vip/movie/${d.id}" target="_blank" class="modal-action-btn--dl"><i class="fas fa-download"></i> Download HD</a>` : ""}
        </div>

        ${
          d.production_companies?.length
            ? `<div style="font-size:.75rem;color:var(--text3);margin-top:.6rem;display:flex;align-items:center;gap:.4rem;flex-wrap:wrap"><i class="fas fa-building"></i>${d.production_companies
                .slice(0, 4)
                .map(
                  (c) =>
                    `<span style="background:var(--surface2);border:1px solid var(--border2);padding:.15rem .55rem;border-radius:5px">${c.name}</span>`,
                )
                .join("")}</div>`
            : ""
        }
      </div>
    </div>
    ${
      cast.length
        ? `
      <div class="section-sub" style="margin-top:1.6rem">Cast <span style="color:var(--text3);font-size:.75rem;font-weight:400;text-transform:none;letter-spacing:0">${cast.length} members · drag to scroll</span></div>
      <div class="cast-wrap"><div class="cast-row" id="castRow">
        ${cast
          .map(
            (p) => `<div class="cast-card">
          <img src="${p.profile_path ? IMG + p.profile_path : "https://placehold.co/120x120/1c1917/3a302a?text=?"}" alt="${p.name}" loading="lazy" onerror="this.src='https://placehold.co/120x120/1c1917/3a302a?text=?'">
          <div class="cast-name">${p.name}</div>
          <div class="cast-char">${p.character || ""}</div>
        </div>`,
          )
          .join("")}
      </div></div>`
        : ""
    }`;

  setTimeout(() => {
    document.querySelectorAll(".vote-bar-fill").forEach((el) => {
      el.style.width = el.dataset.pct + "%";
    });
  }, 100);

  const castRow = document.getElementById("castRow");
  if (castRow) {
    let isDown = false,
      startX,
      scrollLeft;
    castRow.addEventListener("mousedown", (e) => {
      isDown = true;
      startX = e.pageX - castRow.offsetLeft;
      scrollLeft = castRow.scrollLeft;
    });
    castRow.addEventListener("mouseleave", () => (isDown = false));
    castRow.addEventListener("mouseup", () => (isDown = false));
    castRow.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      castRow.scrollLeft =
        scrollLeft - (e.pageX - castRow.offsetLeft - startX) * 1.5;
    });
  }
}

window.modalToggleWl = (id, type, title, poster, year, rating) => {
  toggleWatchlistItem({ id, type, title, poster, year, rating });
  const inWl = watchlist.some((w) => w.id === id);
  const btn = document.getElementById("modalWlBtn");
  if (btn) {
    btn.innerHTML = `<i class="fas fa-${inWl ? "check" : "plus"}"></i> ${inWl ? "In My List" : "My List"}`;
    btn.classList.toggle("active", inWl);
  }
};

window.switchTab = async (tabName, el) => {
  document
    .querySelectorAll(".modal-tab")
    .forEach((t) => t.classList.remove("active"));
  if (el) el.classList.add("active");
  document
    .querySelectorAll(".tab-content")
    .forEach((t) => t.classList.remove("active"));
  document.getElementById(`tab-${tabName}`).classList.add("active");
  if (
    tabName === "episodes" &&
    currentType === "tv" &&
    !document.getElementById("tab-episodes").innerHTML
  )
    await loadEpisodesTab();
  else if (
    tabName === "similar" &&
    !document.getElementById("tab-similar").innerHTML
  )
    await loadSimilarTab();
  else if (
    tabName === "trailers" &&
    !document.getElementById("tab-trailers").innerHTML
  )
    await loadTrailersTab();
  else if (
    tabName === "reviews" &&
    !document.getElementById("tab-reviews").innerHTML
  )
    await loadReviewsTab();
};

async function loadEpisodesTab() {
  const d = currentModalData?.details;
  if (!d) return;
  const total = Math.min(d.number_of_seasons || 1, 15);
  const tabs = Array.from({ length: total }, (_, i) => i + 1)
    .map(
      (s) =>
        `<button class="s-tab${s === 1 ? " active" : ""}" id="stab${s}" onclick="loadEpisodes(${s},${d.id})">S${s}</button>`,
    )
    .join("");
  document.getElementById("tab-episodes").innerHTML =
    `<div class="season-tabs">${tabs}</div><div id="epContainer"><p style="color:var(--text3);font-size:.85rem">Loading…</p></div>`;
  await loadEpisodes(1, d.id);
}
async function loadSimilarTab() {
  document.getElementById("tab-similar").innerHTML =
    '<div class="spinner" style="margin:2rem auto"></div>';
  const data = await tmdb(`/${currentType}/${currentId}/similar`);
  const items = (data.results || []).filter((i) => i.poster_path).slice(0, 12);
  if (!items.length) {
    document.getElementById("tab-similar").innerHTML =
      '<p style="color:var(--text3);padding:2rem 0">No similar content found</p>';
    return;
  }
  document.getElementById("tab-similar").innerHTML =
    `<div class="similar-grid">${items
      .map((item) => {
        const t = item.title || item.name,
          r = item.vote_average?.toFixed(1) || "?";
        return `<div class="sim-card" onclick="closeModal();setTimeout(()=>openContent(${item.id},'${currentType}'),200)">
      <img src="${IMG + item.poster_path}" alt="${t}" loading="lazy">
      <div class="sim-card-info"><div class="sim-card-title">${t}</div><div class="sim-card-rating"><i class="fas fa-star" style="font-size:.6rem"></i> ${r}</div></div>
    </div>`;
      })
      .join("")}</div>`;
}
async function loadTrailersTab() {
  document.getElementById("tab-trailers").innerHTML =
    '<div class="spinner" style="margin:2rem auto"></div>';
  const data = await tmdb(`/${currentType}/${currentId}/videos`);
  const vids = (data.results || [])
    .filter((v) => v.site === "YouTube")
    .slice(0, 8);
  if (!vids.length) {
    document.getElementById("tab-trailers").innerHTML =
      '<p style="color:var(--text3);padding:2rem 0">No trailers available</p>';
    return;
  }
  document.getElementById("tab-trailers").innerHTML =
    `<div class="trailer-list">${vids
      .map(
        (v) => `
    <div class="trailer-card" onclick="playTrailer('${v.key}')">
      <img src="https://img.youtube.com/vi/${v.key}/mqdefault.jpg" alt="${v.name}" loading="lazy">
      <div class="trailer-play"><i class="fas fa-play"></i></div>
      <div class="trailer-name">${v.name || "Trailer"}</div>
    </div>`,
      )
      .join("")}</div>`;
}
async function loadReviewsTab() {
  document.getElementById("tab-reviews").innerHTML =
    '<div class="spinner" style="margin:2rem auto"></div>';
  const data = await tmdb(`/${currentType}/${currentId}/reviews`);
  const revs = (data.results || []).slice(0, 5);
  if (!revs.length) {
    document.getElementById("tab-reviews").innerHTML =
      '<p style="color:var(--text3);padding:2rem 0">No reviews available</p>';
    return;
  }
  document.getElementById("tab-reviews").innerHTML =
    `<div class="review-list">${revs
      .map((r) => {
        const initials = (r.author || "?").slice(0, 2).toUpperCase(),
          rating = r.author_details?.rating;
        const short =
          (r.content || "").slice(0, 350) +
          (r.content?.length > 350 ? "…" : "");
        return `<div class="review-card">
      <div class="review-head">
        <div class="review-avatar">${initials}</div>
        <div><div class="review-author">${r.author || "Anonymous"}</div><div class="review-date">${new Date(r.created_at).toLocaleDateString()}</div></div>
        ${rating ? `<div class="review-rating"><i class="fas fa-star"></i> ${rating}/10</div>` : ""}
      </div>
      <p class="review-text">${short}</p>
    </div>`;
      })
      .join("")}`;
}
window.playTrailer = (videoId) => {
  if (!videoId) {
    showToast("No trailer available", "fa-exclamation-triangle");
    return;
  }
  videoId = videoId.split(/[?&#]/)[0].trim();
  const wrapper = document.getElementById("playerWrap");
  if (!wrapper) return;
  wrapper.style.position = "relative";
  wrapper.style.overflow = "hidden";
  wrapper.style.paddingBottom = "56.25%";
  wrapper.style.height = 0;
  wrapper.innerHTML = "";
  const youTubeURL = new URL(
    `https://www.youtube-nocookie.com/embed/${videoId}`,
  );
  youTubeURL.searchParams.set("autoplay", "1");
  youTubeURL.searchParams.set("rel", "0");
  youTubeURL.searchParams.set("modestbranding", "1");
  youTubeURL.searchParams.set("enablejsapi", "1");
  youTubeURL.searchParams.set("origin", location.origin);
  const iframe = document.createElement("iframe");
  iframe.src = youTubeURL.toString();
  iframe.allow = [
    "accelerometer",
    "autoplay",
    "encrypted-media",
    "gyroscope",
    "picture-in-picture",
    "web-share",
  ].join("; ");
  iframe.allowFullscreen = true;
  iframe.title = "YouTube trailer";
  iframe.style.position = "absolute";
  iframe.style.top = 0;
  iframe.style.left = 0;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  wrapper.appendChild(iframe);
  showToast("Playing trailer", "fa-play-circle");
};

function renderServers() {
  document.getElementById("serverRow").innerHTML = SERVERS.map(
    (s, i) =>
      `<button class="srv-btn${i === 0 ? " active" : ""}" onclick="switchServer(${i})">${s.name}</button>`,
  ).join("");
}
function loadPlayer(s, e) {
  if (s !== undefined) currentSeason = s;
  if (e !== undefined) currentEpisode = e;
  const url = SERVERS[currentServer].url(
    currentType,
    currentId,
    currentType === "tv" ? currentSeason : null,
    currentType === "tv" ? currentEpisode : null,
  );
  document.getElementById("playerWrap").innerHTML = `
    <div class="player-loader" id="playerLoader"><div class="spinner"></div><span class="spinner-text">Loading…</span></div>
    <iframe src="${url}" allowfullscreen allow="autoplay;encrypted-media;fullscreen" style="opacity:0;transition:.4s;position:absolute;inset:0;width:100%;height:100%"
      onload="this.style.opacity=1;const l=document.getElementById('playerLoader');if(l)l.style.display='none'"></iframe>`;
}
window.loadPlayer = loadPlayer;
function switchServer(idx) {
  currentServer = idx;
  document
    .querySelectorAll(".srv-btn")
    .forEach((b, i) => b.classList.toggle("active", i === idx));
  loadPlayer();
}
window.switchServer = switchServer;

async function loadEpisodes(season, showId) {
  currentSeason = season;
  document
    .querySelectorAll(".s-tab")
    .forEach((b, i) => b.classList.toggle("active", i === season - 1));

  const container = document.getElementById("epContainer");
  if (!container) return;

  // Show loading state
  container.innerHTML = `
    <div class="episodes-loading-state">
      <div class="spinner"></div>
      <span>Loading episodes...</span>
    </div>
  `;

  try {
    // Fetch season data first
    const seasonData = await tmdb(`/tv/${showId}/season/${season}`);

    if (!seasonData.episodes?.length) {
      container.innerHTML = `
        <div class="episodes-empty-state">
          <i class="fas fa-film"></i>
          <p>No episodes available for this season</p>
        </div>
      `;
      return;
    }

    // Fetch show details for additional info
    const showDetails = await tmdb(`/tv/${showId}`);

    // Calculate season stats
    const totalRuntime = seasonData.episodes.reduce(
      (acc, ep) => acc + (ep.runtime || 0),
      0,
    );
    const avgRating = (
      seasonData.episodes.reduce((acc, ep) => acc + (ep.vote_average || 0), 0) /
      seasonData.episodes.length
    ).toFixed(1);
    const airYear = seasonData.air_date
      ? new Date(seasonData.air_date).getFullYear()
      : "TBA";

    // Get season poster
    const seasonPoster = seasonData.poster_path
      ? IMG + seasonData.poster_path
      : showDetails.poster_path
        ? IMG + showDetails.poster_path
        : null;

    // Build episodes HTML without additional API calls
    let episodesHTML = "";

    for (let i = 0; i < seasonData.episodes.length; i++) {
      const ep = seasonData.episodes[i];
      const num = i + 1;
      const isNow = currentSeason === season && currentEpisode === num;

      const stillUrl = ep.still_path
        ? `https://image.tmdb.org/t/p/w500${ep.still_path}`
        : "https://placehold.co/500x280/1a1512/e8512a?text=No+Preview";

      const episodeName = ep.name || `Episode ${num}`;
      const runtime = ep.runtime || 0;
      const rating = ep.vote_average || 0;
      const airDate = ep.air_date || "";
      const overview =
        (ep.overview || "No description available.").slice(0, 120) +
        (ep.overview?.length > 120 ? "..." : "");

      episodesHTML += `
        <div class="episode-premium-card ${isNow ? "current-episode" : ""}" 
             onclick="playEpisode(${season}, ${num})">
          
          <!-- Episode Poster -->
          <div class="episode-premium-poster">
            <img src="${stillUrl}" 
                 alt="${episodeName}" 
                 loading="lazy"
                 onerror="this.src='https://placehold.co/500x280/1a1512/e8512a?text=Episode+${num}'">
            
            <div class="episode-premium-overlay">
              <div class="episode-quick-actions">
                <button class="episode-quick-play" onclick="event.stopPropagation();playEpisode(${season}, ${num})">
                  <i class="fas fa-play"></i>
                </button>
                <a href="https://dl.vidsrc.vip/tv/${showId}/${season}/${num}" 
                   target="_blank" 
                   class="episode-quick-download" 
                   onclick="event.stopPropagation()"
                   title="Download Episode">
                  <i class="fas fa-download"></i>
                </a>
              </div>
            </div>

            <div class="episode-premium-badges">
              <span class="episode-badge-number">EP: ${num}</span>
              ${runtime ? `<span class="episode-badge-runtime"><i class="fas fa-clock"></i> ${runtime}m</span>` : ""}
              ${rating > 0 ? `<span class="episode-badge-rating"><i class="fas fa-star"></i> ${rating.toFixed(1)}</span>` : ""}
            </div>

            ${
              isNow
                ? `
              <div class="episode-now-indicator">
                <i class="fas fa-volume-up"></i> Currently Playing
              </div>
            `
                : ""
            }
          </div>

          <!-- Episode Info -->
          <div class="episode-premium-info">
            <div class="episode-premium-header">
              <h4 class="episode-premium-title">${episodeName}</h4>
              ${
                airDate
                  ? `
                <span class="episode-premium-date">
                  <i class="fas fa-calendar-alt"></i> ${new Date(airDate).toLocaleDateString()}
                </span>
              `
                  : ""
              }
            </div>

            <p class="episode-premium-desc">${overview}</p>

            <!-- Action Buttons -->
            <div class="episode-action-bar">
              <button class="episode-action-play" onclick="event.stopPropagation();playEpisode(${season}, ${num})">
                <i class="fas fa-play"></i> Play Episode
              </button>
              <a href="https://dl.vidsrc.vip/tv/${showId}/${season}/${num}" 
                 target="_blank" 
                 class="episode-action-download" 
                 onclick="event.stopPropagation()">
                <i class="fas fa-download"></i> Download
              </a>
            </div>
          </div>
        </div>
      `;
    }

    // Final HTML with season header and episodes grid
    container.innerHTML = `
      <div class="episodes-master-container">
        <!-- Season Header with Stats -->
        <div class="season-stats-header" ${seasonPoster ? `style="background-image: linear-gradient(90deg, rgba(10,9,8,0.98) 20%, rgba(10,9,8,0.7)), url(${seasonPoster})"` : ""}>
          <div class="season-stats-content">
            <div class="season-badge-group">
              <span class="season-badge"><i class="fas fa-tag"></i> Season ${season}</span>
              <span class="season-badge ${seasonData.air_date ? "" : "inactive"}"><i class="fas fa-calendar"></i> ${airYear}</span>
              <span class="season-badge"><i class="fas fa-film"></i> ${seasonData.episodes.length} Episodes</span>
              ${totalRuntime > 0 ? `<span class="season-badge"><i class="fas fa-clock"></i> ${Math.floor(totalRuntime / 60)}h ${totalRuntime % 60}m</span>` : ""}
              ${avgRating !== "0.0" ? `<span class="season-badge rating"><i class="fas fa-star"></i> ${avgRating}</span>` : ""}
            </div>
            <h2 class="season-title">${seasonData.name || `Season ${season}`}</h2>
            ${seasonData.overview ? `<p class="season-overview">${seasonData.overview}</p>` : ""}
            
            <div class="season-quick-actions">
              <button class="season-play-all" onclick="playEpisode(${season}, 1)">
                <i class="fas fa-play-circle"></i> Play from Start
              </button>
              <a href="https://dl.vidsrc.vip/tv/${showId}/${season}/1" target="_blank" class="season-download-all">
                <i class="fas fa-download"></i> Download Season
              </a>
            </div>
          </div>
        </div>

        <!-- Episodes Grid -->
        <div class="episodes-premium-grid">
          ${episodesHTML}
        </div>
      </div>
    `;

    // Scroll to current episode if exists
    if (currentSeason === season) {
      setTimeout(() => {
        const currentEpisodeEl = document.querySelector(".current-episode");
        if (currentEpisodeEl) {
          currentEpisodeEl.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }
      }, 300);
    }
  } catch (error) {
    console.error("Error loading episodes:", error);
    container.innerHTML = `
      <div class="episodes-error-state">
        <i class="fas fa-exclamation-circle"></i>
        <h3>Failed to Load Episodes</h3>
        <p>There was an error loading the episodes. Please try again.</p>
        <button onclick="loadEpisodes(${season}, ${showId})" class="error-retry-btn">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
  }
}
window.loadEpisodes = loadEpisodes;

function playEpisode(s, e) {
  currentSeason = s;
  currentEpisode = e;
  loadPlayer(s, e);
  document
    .getElementById("modal")
    .querySelector(".modal-box")
    .scrollTo({ top: 0, behavior: "smooth" });
  showToast(`Playing S${s}E${e}`, "fa-play-circle");
  if (currentModalData?.details)
    addToContinueWatching(
      currentId,
      currentType,
      currentModalData.details.title || currentModalData.details.name,
      currentModalData.details.poster_path,
      s,
      e,
    );
}
window.playEpisode = playEpisode;

function closeModal() {
  document.getElementById("modal").classList.remove("open");
  document.body.style.overflow = "";
  document.getElementById("playerWrap").innerHTML = "";
  currentModalData = null;
  if (heroMovies.length > 1) startHeroTimer();
}
window.closeModal = closeModal;

let toastTimer = null;
function showToast(msg, icon = "fa-check-circle") {
  clearTimeout(toastTimer);
  document.getElementById("toastMsg").textContent = msg;
  document.querySelector("#toast i").className = `fas ${icon}`;
  const t = document.getElementById("toast");
  t.classList.add("show");
  toastTimer = setTimeout(() => t.classList.remove("show"), 2500);
}

let animationFeaturedTimer = null;
let currentAnimationFeaturedIndex = 0;
let animationFeaturedItems = { movies: [], series: [] };
let featuredRotationInterval = 60000; // 60 seconds

async function loadAnimationContent() {
  try {
    const [movies, series, moviesPage2, seriesPage2] = await Promise.all([
      tmdb(
        "/discover/movie?with_genres=16&sort_by=popularity.desc&vote_count.gte=50&page=1",
      ),
      tmdb(
        "/discover/tv?with_genres=16&sort_by=popularity.desc&vote_count.gte=20&page=1",
      ),
      tmdb(
        "/discover/movie?with_genres=16&sort_by=vote_average.desc&vote_count.gte=100&page=2",
      ),
      tmdb(
        "/discover/tv?with_genres=16&sort_by=vote_average.desc&vote_count.gte=50&page=2",
      ),
    ]);

    const allMovies = [
      ...(movies.results || []),
      ...(moviesPage2.results || []),
    ].filter(
      (m, index, self) =>
        m.poster_path && index === self.findIndex((t) => t.id === m.id),
    );

    const allSeries = [
      ...(series.results || []),
      ...(seriesPage2.results || []),
    ].filter(
      (s, index, self) =>
        s.poster_path && index === self.findIndex((t) => t.id === s.id),
    );

    animationFeaturedItems = {
      movies: allMovies,
      series: allSeries,
    };

    const animatedMovies = allMovies.slice(0, 10);
    const animatedSeries = allSeries.slice(0, 10);

    document.getElementById("animatedMoviesCount").textContent =
      `${allMovies.length}+`;
    document.getElementById("animatedSeriesCount").textContent =
      `${allSeries.length}+`;

    renderScrollRow(animatedMovies, "animationMoviesRow", true, "movie");
    renderScrollRow(animatedSeries, "animationSeriesRow", true, "tv");

    startAnimationRotation();

    updateFeaturedBanner();
  } catch (error) {
    console.error("Error loading animation content:", error);
  }
}

function startAnimationRotation() {
  if (animationFeaturedTimer) {
    clearInterval(animationFeaturedTimer);
  }

  animationFeaturedTimer = setInterval(() => {
    rotateAnimationContent();
    updateFeaturedBanner();
  }, featuredRotationInterval);
}

function rotateAnimationContent() {
  if (
    !animationFeaturedItems.movies.length ||
    !animationFeaturedItems.series.length
  )
    return;

  const movieStart = Math.floor(
    Math.random() * Math.max(1, animationFeaturedItems.movies.length - 10),
  );
  const seriesStart = Math.floor(
    Math.random() * Math.max(1, animationFeaturedItems.series.length - 10),
  );

  const newMovies = animationFeaturedItems.movies.slice(
    movieStart,
    movieStart + 10,
  );
  const newSeries = animationFeaturedItems.series.slice(
    seriesStart,
    seriesStart + 10,
  );

  const shuffledMovies = [...newMovies].sort(() => Math.random() - 0.5);
  const shuffledSeries = [...newSeries].sort(() => Math.random() - 0.5);

  animateRowTransition("animationMoviesRow", shuffledMovies, "movie");
  animateRowTransition("animationSeriesRow", shuffledSeries, "tv");
}

function animateRowTransition(rowId, newItems, type) {
  const row = document.getElementById(rowId);
  if (!row) return;

  row.style.transition = "opacity 0.3s ease";
  row.style.opacity = "0";

  setTimeout(() => {
    renderScrollRow(newItems, rowId, true, type);

    row.style.opacity = "1";

    showToast("✨ Fresh animation picks just for you!", "fa-magic");
  }, 300);
}

function updateFeaturedBanner() {
  const banner = document.querySelector(".animation-banner");
  if (!banner) return;

  const useMovie = Math.random() > 0.5;
  const items = useMovie
    ? animationFeaturedItems.movies
    : animationFeaturedItems.series;

  if (!items.length) return;

  const randomIndex = Math.floor(Math.random() * Math.min(20, items.length));
  const featured = items[randomIndex];

  if (!featured) return;

  const title = featured.title || featured.name;
  const overview = featured.overview || "Experience this amazing animation!";
  const shortOverview =
    overview.length > 60 ? overview.slice(0, 57) + "..." : overview;
  const year =
    (featured.release_date || featured.first_air_date || "").slice(0, 4) ||
    "2024";

  const bannerContent = banner.querySelector(".banner-content");
  if (bannerContent) {
    bannerContent.style.transition = "opacity 0.4s ease, transform 0.4s ease";
    bannerContent.style.opacity = "0";
    bannerContent.style.transform = "scale(0.95)";

    setTimeout(() => {
      banner.querySelector(".banner-title").textContent = title;
      banner.querySelector(".banner-desc").textContent = shortOverview;
      banner.setAttribute(
        "onclick",
        `openContent(${featured.id}, '${useMovie ? "movie" : "tv"}')`,
      );

      bannerContent.style.opacity = "1";
      bannerContent.style.transform = "scale(1)";
    }, 200);
  }
}

window.refreshAnimationContent = function () {
  rotateAnimationContent();
  updateFeaturedBanner();
  showToast("🔄 Animation picks refreshed!", "fa-sync-alt");
};

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && e.key === "A") {
    e.preventDefault();
    refreshAnimationContent();
  }
});
