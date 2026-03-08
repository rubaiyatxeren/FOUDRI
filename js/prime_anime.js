
/* ============================================================
   FOUDRI — Anime Module v2  (prime_anime.js)
   KEY FIX: Modal close returns to Anime page, not home.
   NEW FEATURES: schedule bands, stats, watchlist integration,
   featured wide-cards, hero progress, random pick, season tabs
   ============================================================ */

(function () {
  "use strict";

  /* ──────────────────────────────────────────────
     CONSTANTS
  ────────────────────────────────────────────── */
  const TMDB_KEY = "c096300da27be38fd70190283bc5f8bc";
  const API = "https://api.themoviedb.org/3";
  const IMG = "https://image.tmdb.org/t/p/w500";
  const BIG = "https://image.tmdb.org/t/p/original";
  const IMG_WIDE = "https://image.tmdb.org/t/p/w780";

  const ANIME_GENRE = 16;
  const ANIME_PARAMS = `with_genres=${ANIME_GENRE}&with_original_language=ja`;

  const GENRE_PILLS = [
    { id: null, icon: "⛩️", label: "All" },
    { id: 10759, icon: "⚔️", label: "Action" },
    { id: 35, icon: "😂", label: "Comedy" },
    { id: 18, icon: "💔", label: "Drama" },
    { id: 14, icon: "🐉", label: "Fantasy" },
    { id: 878, icon: "🚀", label: "Sci-Fi" },
    { id: 9648, icon: "🔍", label: "Mystery" },
    { id: 10765, icon: "✨", label: "Magic" },
    { id: 10762, icon: "👦", label: "Kids" },
    { id: 27, icon: "👻", label: "Horror" },
    { id: 10749, icon: "💕", label: "Romance" },
  ];

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* ──────────────────────────────────────────────
     STATE
  ────────────────────────────────────────────── */
  let isAnimePageOpen = false;
  let animeHeroList = [];
  let animeHeroIdx = 0;
  let animeHeroTimer = null;
  let animeProgressTimer = null;
  let animeProgressVal = 0;
  let animeCurrentGenre = null;
  let animeCurrentSort = "popularity";
  let animeAllPage = 1;
  let animeAllTotalPages = 1;
  let animeAllItems = [];
  let animeWatchlist = []; // local copy synced with global watchlist

  /* ──────────────────────────────────────────────
     TMDB HELPER
  ────────────────────────────────────────────── */
  async function tmdb(ep, extra = "") {
    const sep = ep.includes("?") ? "&" : "?";
    try {
      const r = await fetch(`${API}${ep}${sep}api_key=${TMDB_KEY}${extra}`);
      return r.json();
    } catch (e) {
      console.warn("TMDB error:", e);
      return { results: [], total_pages: 1, total_results: 0 };
    }
  }

  /* ──────────────────────────────────────────────
     SYNC WATCHLIST with global
  ────────────────────────────────────────────── */
  function syncWatchlist() {
    try {
      animeWatchlist = JSON.parse(localStorage.getItem("foudri_wl") || "[]");
    } catch (e) {
      animeWatchlist = [];
    }
  }
  function isInWl(id) {
    return animeWatchlist.some((w) => w.id === id);
  }

  /* ──────────────────────────────────────────────
     TOAST helper (falls back gracefully)
  ────────────────────────────────────────────── */
  function toast(msg, icon = "fa-check-circle") {
    if (typeof showToast === "function") {
      showToast(msg, icon);
      return;
    }
    const t = document.getElementById("toast");
    if (!t) return;
    document.getElementById("toastMsg").textContent = msg;
    t.querySelector("i").className = `fas ${icon}`;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 2500);
  }

  /* ──────────────────────────────────────────────
     BUILD PAGE DOM (idempotent)
  ────────────────────────────────────────────── */
  function buildPage() {
    // Nav link
    const nav = document.querySelector(".nav-center");
    if (nav && !document.getElementById("animeNavLink")) {
      const a = document.createElement("a");
      a.id = "animeNavLink";
      a.href = "#";
      a.className = "anime-nav-link";
      a.innerHTML = `Anime <span class="anime-nav-badge">NEW</span>`;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openAnimePage();
      });
      nav.appendChild(a);
    }

    if (document.getElementById("animePage")) return;

    const page = document.createElement("div");
    page.id = "animePage";
    page.innerHTML = `

      <!-- ===== HEADER ===== -->
      <div class="anime-header">
        <div class="anime-header-left">
          <button class="anime-back-btn" onclick="window.__animeClose()">
            <i class="fas fa-arrow-left"></i> Back
          </button>
          <span class="anime-page-title">✦ ANIME</span>
          <div class="anime-header-stats" id="animeHeaderStats"></div>
        </div>
        <div class="anime-header-right">
          <button class="anime-random-btn" onclick="window.__animeRandom()" title="Random Pick">
            <i class="fas fa-dice"></i> <span>Random</span>
          </button>
          <div class="anime-search-bar">
            <input type="text" id="animeSearchInput" placeholder="Search anime…" />
            <button onclick="window.__animeSearch()"><i class="fas fa-search"></i></button>
          </div>
        </div>
      </div>

      <!-- ===== FILTER BAR ===== -->
      <div class="anime-filter-bar">
        <div class="anime-genre-bar" id="animeGenreBar"></div>
      </div>

      <!-- ===== HERO ===== -->
      <div class="anime-hero-section" id="animeHeroSection">
        <div class="anime-hero-bg">
          <img id="animeHeroImg" src="" alt="" />
        </div>
        <div class="anime-hero-scanlines"></div>
        <div class="anime-hero-content">
          <div class="anime-hero-badges" id="animeHeroBadges">
            <div class="anime-hero-tag"><i class="fas fa-fire"></i> Featured</div>
          </div>
          <h1 class="anime-hero-title" id="animeHeroTitle">
            Loading…
            <span class="anime-hero-title-jp" id="animeHeroTitleJP"></span>
          </h1>
          <p class="anime-hero-overview" id="animeHeroOverview"></p>
          <div class="anime-hero-genres" id="animeHeroGenres"></div>
          <div class="anime-hero-meta">
            <span class="anime-hero-rating">
              <i class="fas fa-star"></i>
              <span id="animeHeroRating">–</span>
            </span>
            <span class="anime-hero-meta-sep"></span>
            <span class="anime-hero-meta-item" id="animeHeroYear">–</span>
            <span class="anime-hero-meta-sep"></span>
            <span class="anime-hero-meta-item" id="animeHeroEps"></span>
          </div>
          <div class="anime-hero-btns">
            <button class="anime-btn-play" id="animeHeroPlayBtn">
              <i class="fas fa-play"></i> Watch Now
            </button>
            <button class="anime-btn-info" id="animeHeroInfoBtn">
              <i class="fas fa-info-circle"></i> More Info
            </button>
            <button class="anime-btn-watchlist" id="animeHeroWlBtn" onclick="">
              <i class="fas fa-plus"></i> My List
            </button>
          </div>
        </div>
        <div class="anime-hero-dots" id="animeHeroDots"></div>
        <div class="anime-hero-progress">
          <div class="anime-hero-progress-fill" id="animeHeroProgressFill"></div>
        </div>
      </div>

      <!-- ===== MAIN CONTENT ===== -->
      <div class="anime-content">

        <!-- Search Results -->
        <div id="animeSearchResults">
          <div class="anime-section-header">
            <div class="anime-section-title">
              🔍 <span id="animeSearchLabel">Results</span>
            </div>
            <button class="anime-see-all" onclick="window.__animeClearSearch()">
              <i class="fas fa-times"></i> Clear
            </button>
          </div>
          <div class="anime-grid" id="animeSearchGrid"></div>
        </div>

        <!-- Stats Band -->
        <div class="anime-stats-band" id="animeStatsBand">
          <div class="anime-stat-block">
            <div class="anime-stat-val" id="statTitles">–</div>
            <div class="anime-stat-lbl">Titles</div>
          </div>
          <div class="anime-stat-block">
            <div class="anime-stat-val" id="statMovies">–</div>
            <div class="anime-stat-lbl">Movies</div>
          </div>
          <div class="anime-stat-block">
            <div class="anime-stat-val" id="statAiring">–</div>
            <div class="anime-stat-lbl">Airing</div>
          </div>
          <div class="anime-stat-block">
            <div class="anime-stat-val" id="statGenres">${GENRE_PILLS.length - 1}</div>
            <div class="anime-stat-lbl">Genres</div>
          </div>
        </div>

        <!-- Top 10 -->
        <div class="anime-section">
          <div class="anime-section-header">
            <div class="anime-section-title">
              <span class="ani-section-dot"></span> Top 10 This Week
            </div>
          </div>
          <div class="anime-top10-scroll" id="animeTop10Row">${skels(10, "top10")}</div>
        </div>

        <!-- Airing Today -->
        <div class="anime-section">
          <div class="anime-section-header">
            <div class="anime-section-title">
              <span class="airing-badge"><span class="airing-dot"></span> LIVE</span>
              Airing Today
            </div>
          </div>
          <div class="anime-scroll-row" id="animeAiringRow">${skels(8)}</div>
        </div>

        <!-- Schedule Band -->
        <div class="anime-schedule-band">
          <div class="anime-schedule-title">
            <i class="fas fa-calendar-week"></i> Weekly Schedule
          </div>
          <div class="anime-schedule-days" id="animeScheduleDays"></div>
          <div class="anime-scroll-row" style="margin-top:1rem" id="animeScheduleRow">${skels(6)}</div>
        </div>

        <!-- Trending -->
        <div class="anime-section">
          <div class="anime-section-header">
            <div class="anime-section-title">
              <span class="ani-section-dot"></span> Trending Now
            </div>
          </div>
          <div class="anime-scroll-row" id="animeTrendingRow">${skels(8)}</div>
        </div>

        <!-- New Episodes (on-the-air) -->
        <div class="anime-section">
          <div class="anime-section-header">
            <div class="anime-section-title">
              <span class="ani-section-dot"></span> New Episodes
            </div>
          </div>
          <div class="anime-featured-row" id="animeNewEpsRow">${skels(6, "wide")}</div>
        </div>

        <!-- Anime Movies -->
        <div class="anime-section">
          <div class="anime-section-header">
            <div class="anime-section-title">
              <span class="ani-section-dot"></span> 🎬 Anime Movies
            </div>
          </div>
          <div class="anime-scroll-row" id="animeMoviesRow">${skels(8)}</div>
        </div>

        <!-- Highly Rated -->
        <div class="anime-section">
          <div class="anime-section-header">
            <div class="anime-section-title">
              <span class="ani-section-dot"></span> ⭐ Highest Rated
            </div>
          </div>
          <div class="anime-scroll-row" id="animeRatedRow">${skels(8)}</div>
        </div>

        <!-- All Anime Grid -->
        <div class="anime-section" id="animeAllSection">
          <div class="anime-section-header">
            <div class="anime-section-title">
              <span class="ani-section-dot"></span> All Anime
            </div>
            <div class="anime-sort-bar">
              <span class="anime-sort-label">Sort:</span>
              <button class="anime-sort-btn active" onclick="window.__animeSort('popularity',this)">Popular</button>
              <button class="anime-sort-btn" onclick="window.__animeSort('vote_average',this)">Top Rated</button>
              <button class="anime-sort-btn" onclick="window.__animeSort('first_air_date',this)">Newest</button>
              <button class="anime-sort-btn" onclick="window.__animeSort('vote_count',this)">Most Voted</button>
            </div>
          </div>
          <div class="anime-grid" id="animeAllGrid">${skels(12, "grid")}</div>
          <div class="anime-load-more-wrap" id="animeLoadMoreWrap">
            <button class="anime-load-more-btn" onclick="window.__animeLoadMore()">
              <i class="fas fa-plus"></i> Load More
            </button>
          </div>
          <div class="anime-spinner-wrap" id="animeAllSpinner">
            <div class="spinner"></div>
            <span>Loading anime…</span>
          </div>
        </div>

      </div><!-- /anime-content -->
    `;

    document.body.appendChild(page);
    buildGenreBar();
    buildScheduleDays();

    const inp = document.getElementById("animeSearchInput");
    if (inp)
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") window.__animeSearch();
      });
  }

  /* ──────────────────────────────────────────────
     SKELETON HELPERS
  ────────────────────────────────────────────── */
  function skels(n, mode = "row") {
    if (mode === "top10")
      return Array.from(
        { length: n },
        (_, i) => `
        <div class="anime-top10-card">
          <div class="anime-top10-num">${i + 1}</div>
          <div class="skel" style="aspect-ratio:2/3;border-radius:14px;width:152px"></div>
        </div>`,
      ).join("");
    if (mode === "wide")
      return Array.from(
        { length: n },
        () => `
        <div class="skel" style="aspect-ratio:16/9;border-radius:16px;flex:0 0 280px;width:280px"></div>`,
      ).join("");
    if (mode === "grid")
      return Array.from(
        { length: n },
        () => `
        <div class="skel" style="aspect-ratio:2/3;border-radius:14px"></div>`,
      ).join("");
    return Array.from(
      { length: n },
      () => `
      <div class="skel" style="aspect-ratio:2/3;border-radius:14px;flex:0 0 152px;width:152px"></div>`,
    ).join("");
  }

  /* ──────────────────────────────────────────────
     GENRE BAR
  ────────────────────────────────────────────── */
  function buildGenreBar() {
    const bar = document.getElementById("animeGenreBar");
    if (!bar) return;
    bar.innerHTML = GENRE_PILLS.map(
      ({ id, icon, label }) =>
        `<button class="anime-genre-pill${id === null ? " active" : ""}"
        onclick="window.__animeGenre(${JSON.stringify(id)}, this)">
        <span class="genre-pill-icon">${icon}</span>${label}
      </button>`,
    ).join("");
  }

  /* ──────────────────────────────────────────────
     SCHEDULE DAYS BAR
  ────────────────────────────────────────────── */
  function buildScheduleDays() {
    const wrap = document.getElementById("animeScheduleDays");
    if (!wrap) return;
    const today = new Date().getDay();
    wrap.innerHTML = DAYS.map(
      (d, i) =>
        `<button class="anime-day-btn${i === today ? " active" : ""}" onclick="window.__animeDay(${i},this)">${d}</button>`,
    ).join("");
  }

  /* ──────────────────────────────────────────────
     OPEN / CLOSE
  ────────────────────────────────────────────── */
  async function openAnimePage() {
    buildPage();
    syncWatchlist();
    const page = document.getElementById("animePage");
    page.classList.add("open");
    document.body.style.overflow = "hidden";
    isAnimePageOpen = true;

    // *** CRITICAL FIX: Patch the global closeModal so closing the
    //     TMDB modal re-opens the anime page instead of going home ***
    patchCloseModal();

    await loadAnimeData();
  }

  // Expose so mobile nav (separate IIFE) can call it
  window.__openAnimePage = openAnimePage;

  window.__animeClose = function () {
    const page = document.getElementById("animePage");
    if (page) page.classList.remove("open");
    document.body.style.overflow = "";
    isAnimePageOpen = false;
    stopHeroTimers();
    restoreCloseModal();
    // Reset bottom bar to Home tab
    const homeBtn = document.getElementById("mbtHome");
    if (homeBtn) {
      document
        .querySelectorAll(".mobile-tab-btn")
        .forEach((b) => b.classList.remove("active"));
      homeBtn.classList.add("active");
    }
  };

  /* ──────────────────────────────────────────────
     MODAL PATCH — THE KEY FIX
     When the anime page is open and user plays a title,
     closing the modal should reopen the anime page.
  ────────────────────────────────────────────── */
  let _originalCloseModal = null;

  function patchCloseModal() {
    // Store original
    if (typeof window.closeModal === "function" && !_originalCloseModal) {
      _originalCloseModal = window.closeModal;
    }

    // Override closeModal
    window.closeModal = function () {
      // Call original close logic (clears player, hides modal)
      const modal = document.getElementById("modal");
      if (modal) modal.classList.remove("open");
      document.getElementById("playerWrap").innerHTML = "";
      // Re-open anime page
      const page = document.getElementById("animePage");
      if (page) {
        page.classList.add("open");
        document.body.style.overflow = "hidden";
        isAnimePageOpen = true;
      }
      // Restart hero timer
      if (animeHeroList.length > 1) startHeroTimers();
    };
  }

  function restoreCloseModal() {
    if (_originalCloseModal) {
      window.closeModal = _originalCloseModal;
      _originalCloseModal = null;
    }
  }

  /* ──────────────────────────────────────────────
     LOAD DATA
  ────────────────────────────────────────────── */
  async function loadAnimeData() {
    try {
      const [trendRes, airingRes, moviesRes, ratedRes, onAirRes] =
        await Promise.all([
          tmdb(`/discover/tv?${ANIME_PARAMS}&sort_by=popularity.desc&page=1`),
          tmdb(`/tv/airing_today?page=1`),
          tmdb(
            `/discover/movie?with_genres=${ANIME_GENRE}&with_original_language=ja&sort_by=popularity.desc`,
          ),
          tmdb(
            `/discover/tv?${ANIME_PARAMS}&sort_by=vote_average.desc&vote_count.gte=200&page=1`,
          ),
          tmdb(`/tv/on_the_air?page=1`),
        ]);

      const trending = filter(trendRes.results);
      const airing = filter(airingRes.results).filter((i) =>
        i.genre_ids?.includes(ANIME_GENRE),
      );
      const movies = filter(moviesRes.results);
      const rated = filter(ratedRes.results);
      const onAir = filter(onAirRes.results).filter((i) =>
        i.genre_ids?.includes(ANIME_GENRE),
      );

      // Stats
      setStats(trendRes.total_results, moviesRes.total_results, airing.length);

      // Hero
      animeHeroList = trending.filter((i) => i.backdrop_path).slice(0, 7);
      if (animeHeroList.length) {
        buildHeroDots();
        renderHero(0);
        startHeroTimers();
      }

      // Top 10
      renderTop10(trending.slice(0, 10));

      // Airing
      renderRow(
        airing.length ? airing.slice(0, 12) : trending.slice(0, 12),
        "animeAiringRow",
      );

      // Schedule default today
      window.__animeDay(
        new Date().getDay(),
        document.querySelector(".anime-day-btn.active"),
      );

      // Trending
      renderRow(trending.slice(0, 12), "animeTrendingRow");

      // New Eps (wide cards)
      renderWideRow(onAir.slice(0, 8), "animeNewEpsRow");

      // Movies
      renderRow(movies.slice(0, 12), "animeMoviesRow", "movie");

      // Rated
      renderRow(rated.slice(0, 12), "animeRatedRow");

      // All grid
      animeAllItems = trending;
      animeAllTotalPages = Math.min(trendRes.total_pages || 1, 20);
      renderGrid(trending, "animeAllGrid");
      document.getElementById("animeLoadMoreWrap").style.display =
        animeAllTotalPages > 1 ? "block" : "none";

      // Header stats chip
      const chip = document.getElementById("animeHeaderStats");
      if (chip)
        chip.innerHTML = `<span class="anime-stat-chip"><span>${trending.length * 10}+</span> titles</span>`;
    } catch (err) {
      console.error("Anime data error:", err);
    }
  }

  function filter(arr) {
    return (arr || []).filter((i) => i.poster_path);
  }

  function setStats(titles, movies, airing) {
    const s = (n) =>
      n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n || "–");
    setText("statTitles", s(titles));
    setText("statMovies", s(movies));
    setText("statAiring", s(airing));
  }
  function setText(id, v) {
    const e = document.getElementById(id);
    if (e) e.textContent = v;
  }

  /* ──────────────────────────────────────────────
     HERO
  ────────────────────────────────────────────── */
  function buildHeroDots() {
    const wrap = document.getElementById("animeHeroDots");
    if (!wrap) return;
    wrap.innerHTML = animeHeroList
      .map(
        (_, i) =>
          `<button class="anime-hero-dot${i === 0 ? " active" : ""}" onclick="jumpHeroAnime(${i})"></button>`,
      )
      .join("");
  }

  function renderHero(idx) {
    const item = animeHeroList[idx];
    if (!item) return;
    animeHeroIdx = idx;
    syncWatchlist();

    // BG
    const img = document.getElementById("animeHeroImg");
    if (img) {
      img.style.opacity = 0;
      img.classList.remove("loaded");
      if (item.backdrop_path) {
        img.src = BIG + item.backdrop_path;
        img.onload = () => {
          img.style.opacity = 1;
          img.classList.add("loaded");
        };
      }
    }

    setText("animeHeroTitle", item.name || item.title || "–");
    setText("animeHeroTitleJP", item.original_name || "");
    setText(
      "animeHeroOverview",
      (item.overview || "").slice(0, 220) +
        ((item.overview || "").length > 220 ? "…" : ""),
    );
    setText("animeHeroRating", item.vote_average?.toFixed(1) || "–");
    setText(
      "animeHeroYear",
      (item.first_air_date || item.release_date || "").slice(0, 4) || "–",
    );
    setText(
      "animeHeroEps",
      item.number_of_episodes
        ? `${item.number_of_episodes} Episodes`
        : "Series",
    );

    // Genre tags
    const genreMap = {
      16: "Animation",
      10759: "Action",
      35: "Comedy",
      18: "Drama",
      14: "Fantasy",
      878: "Sci-Fi",
      9648: "Mystery",
      10765: "Magic",
      10762: "Kids",
      27: "Horror",
      10749: "Romance",
    };
    const genresEl = document.getElementById("animeHeroGenres");
    if (genresEl && item.genre_ids?.length) {
      genresEl.innerHTML = item.genre_ids
        .slice(0, 3)
        .map(
          (g) =>
            `<span class="anime-hero-genre-tag">${genreMap[g] || "Anime"}</span>`,
        )
        .join("");
    }

    // Badges — airing or returning
    const badgesEl = document.getElementById("animeHeroBadges");
    if (badgesEl) {
      let extra = "";
      if (item.status === "Returning Series")
        extra = `<div class="ani-live-badge"><span class="ani-live-dot"></span> Airing</div>`;
      badgesEl.innerHTML = `<div class="anime-hero-tag"><i class="fas fa-fire"></i> Featured Anime</div>${extra}`;
    }

    // Dots
    document
      .querySelectorAll(".anime-hero-dot")
      .forEach((d, i) => d.classList.toggle("active", i === idx));

    // Buttons
    const playBtn = document.getElementById("animeHeroPlayBtn");
    const infoBtn = document.getElementById("animeHeroInfoBtn");
    const wlBtn = document.getElementById("animeHeroWlBtn");
    if (playBtn) playBtn.onclick = () => animePlay(item.id, "tv");
    if (infoBtn) infoBtn.onclick = () => animeInfo(item.id, "tv");
    if (wlBtn) {
      const inWl = isInWl(item.id);
      wlBtn.innerHTML = inWl
        ? '<i class="fas fa-check"></i> In List'
        : '<i class="fas fa-plus"></i> My List';
      wlBtn.classList.toggle("saved", inWl);
      wlBtn.onclick = () => animeToggleWl(item);
    }

    // Progress reset
    animeProgressVal = 0;
    const fill = document.getElementById("animeHeroProgressFill");
    if (fill) fill.style.width = "0%";
  }

  window.jumpHeroAnime = function (i) {
    renderHero(i);
    startHeroTimers();
  };

  function startHeroTimers() {
    stopHeroTimers();
    if (animeHeroList.length < 2) return;
    animeProgressTimer = setInterval(() => {
      animeProgressVal += 100 / 80;
      const fill = document.getElementById("animeHeroProgressFill");
      if (fill) fill.style.width = Math.min(animeProgressVal, 100) + "%";
      if (animeProgressVal >= 100) {
        animeProgressVal = 0;
        renderHero((animeHeroIdx + 1) % animeHeroList.length);
      }
    }, 100);
  }
  function stopHeroTimers() {
    clearInterval(animeHeroTimer);
    clearInterval(animeProgressTimer);
    animeHeroTimer = null;
    animeProgressTimer = null;
  }

  /* ──────────────────────────────────────────────
     CARD BUILDER
  ────────────────────────────────────────────── */
  function makeCard(item, type = "tv") {
    const t = item.title || item.name || "–";
    const r = item.vote_average?.toFixed(1) || "?";
    const poster = item.poster_path
      ? IMG + item.poster_path
      : `https://placehold.co/300x450/0c0a14/c084fc?text=${encodeURIComponent(t)}`;
    const ep = item.number_of_episodes
      ? `<span class="anime-ep-badge">${item.number_of_episodes} eps</span>`
      : "";
    const inWl = isInWl(item.id);
    const safe = t.replace(/'/g, "\\'");
    return `
      <div class="anime-card" onclick="animePlay(${item.id},'${type}')">
        ${ep}
        <img src="${poster}" alt="${safe}" loading="lazy"
             onload="this.classList.add('loaded')"
             onerror="this.classList.add('loaded');this.src='https://placehold.co/300x450/0c0a14/c084fc?text=N/A'">
        <div class="anime-card-overlay"></div>
        <div class="anime-card-hover">
          <button class="anime-card-play-btn" onclick="event.stopPropagation();animePlay(${item.id},'${type}')">
            <i class="fas fa-play"></i>
          </button>
          <button class="anime-card-wl-btn${inWl ? " saved" : ""}"
            onclick="event.stopPropagation();animeQuickWl(${item.id},'${type}','${safe}','${item.poster_path || ""}','${(item.release_date || item.first_air_date || "").slice(0, 4)}','${r}',this)">
            ${inWl ? "✓ Saved" : "+ My List"}
          </button>
        </div>
        <div class="anime-card-info">
          <div class="anime-card-title">${t}</div>
          <div class="anime-card-meta">
            <span class="anime-card-rating"><i class="fas fa-star" style="font-size:.5rem"></i> ${r}</span>
            <span class="anime-card-type ${type === "movie" ? "film-type" : ""}">${type === "tv" ? "ANIME" : "FILM"}</span>
          </div>
        </div>
      </div>`;
  }

  function makeWideCard(item, type = "tv") {
    const t = item.title || item.name || "–";
    const r = item.vote_average?.toFixed(1) || "?";
    const bg = item.backdrop_path
      ? IMG_WIDE + item.backdrop_path
      : item.poster_path
        ? IMG + item.poster_path
        : `https://placehold.co/500x280/0c0a14/c084fc?text=${encodeURIComponent(t)}`;
    const eps = item.number_of_episodes || "";
    return `
      <div class="anime-featured-card" onclick="animePlay(${item.id},'${type}')">
        <img src="${bg}" alt="${t}" loading="lazy" onerror="this.src='https://placehold.co/500x280/0c0a14/c084fc?text=N/A'">
        <div class="anime-featured-play"><i class="fas fa-play"></i></div>
        <div class="anime-featured-info">
          <div class="anime-featured-title">${t}</div>
          <div class="anime-featured-meta">
            <span><i class="fas fa-star" style="color:#fbbf24;font-size:.65rem"></i> ${r}</span>
            ${eps ? `<span>${eps} eps</span>` : ""}
          </div>
        </div>
      </div>`;
  }

  /* ──────────────────────────────────────────────
     RENDERERS
  ────────────────────────────────────────────── */
  function renderRow(items, rowId, type = "tv") {
    const el = document.getElementById(rowId);
    if (!el) return;
    el.innerHTML = items.length
      ? items.map((i) => makeCard(i, type)).join("")
      : `<p style="color:rgba(255,255,255,0.3)">No content available</p>`;
  }

  function renderWideRow(items, rowId, type = "tv") {
    const el = document.getElementById(rowId);
    if (!el) return;
    el.innerHTML = items.length
      ? items.map((i) => makeWideCard(i, type)).join("")
      : `<p style="color:rgba(255,255,255,0.3)">No content available</p>`;
  }

  function renderTop10(items) {
    const el = document.getElementById("animeTop10Row");
    if (!el) return;
    el.innerHTML = items
      .map(
        (item, idx) => `
      <div class="anime-top10-card">
        <div class="anime-top10-num">${idx + 1}</div>
        ${makeCard(item, "tv")}
      </div>`,
      )
      .join("");
  }

  function renderGrid(items, gridId, append = false) {
    const el = document.getElementById(gridId);
    if (!el) return;
    const html = items.map((i) => makeCard(i, "tv")).join("");
    el.innerHTML = append ? el.innerHTML + html : html;
  }

  /* ──────────────────────────────────────────────
     GENRE FILTER
  ────────────────────────────────────────────── */
  window.__animeGenre = async function (genreId, btn) {
    animeCurrentGenre = genreId;
    animeAllPage = 1;
    animeAllItems = [];
    document
      .querySelectorAll(".anime-genre-pill")
      .forEach((p) => p.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const grid = document.getElementById("animeAllGrid");
    grid.innerHTML = skels(12, "grid");

    const gParam = genreId
      ? `&with_genres=${ANIME_GENRE},${genreId}`
      : `&with_genres=${ANIME_GENRE}`;
    const data = await tmdb(
      `/discover/tv?with_original_language=ja&sort_by=${animeCurrentSort}.desc${gParam}&vote_count.gte=10&page=1`,
    );
    const items = filter(data.results);
    animeAllItems = items;
    animeAllTotalPages = Math.min(data.total_pages || 1, 20);
    renderGrid(items, "animeAllGrid");
    document.getElementById("animeLoadMoreWrap").style.display =
      animeAllTotalPages > 1 ? "block" : "none";
    const lbl = GENRE_PILLS.find((g) => g.id === genreId)?.label || "All";
    toast(`Showing ${lbl} anime`, "fa-filter");
  };

  /* ──────────────────────────────────────────────
     SORT
  ────────────────────────────────────────────── */
  window.__animeSort = async function (sort, btn) {
    animeCurrentSort = sort;
    animeAllPage = 1;
    animeAllItems = [];
    document
      .querySelectorAll(".anime-sort-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const grid = document.getElementById("animeAllGrid");
    grid.innerHTML = skels(12, "grid");

    const gParam = animeCurrentGenre
      ? `&with_genres=${ANIME_GENRE},${animeCurrentGenre}`
      : `&with_genres=${ANIME_GENRE}`;
    const voteMin =
      sort === "vote_average" ? "&vote_count.gte=200" : "&vote_count.gte=10";
    const data = await tmdb(
      `/discover/tv?with_original_language=ja&sort_by=${sort}.desc${gParam}${voteMin}&page=1`,
    );
    const items = filter(data.results);
    animeAllItems = items;
    animeAllTotalPages = Math.min(data.total_pages || 1, 20);
    renderGrid(items, "animeAllGrid");
    document.getElementById("animeLoadMoreWrap").style.display =
      animeAllTotalPages > 1 ? "block" : "none";
  };

  /* ──────────────────────────────────────────────
     SCHEDULE
  ────────────────────────────────────────────── */
  window.__animeDay = async function (dayIdx, btn) {
    document
      .querySelectorAll(".anime-day-btn")
      .forEach((b) => b.classList.remove("active"));
    if (btn) btn.classList.add("active");

    const row = document.getElementById("animeScheduleRow");
    if (!row) return;
    row.innerHTML = skels(6);

    // Use airing today for today, otherwise on-the-air for other days
    const ep =
      dayIdx === new Date().getDay() ? `/tv/airing_today` : `/tv/on_the_air`;
    const data = await tmdb(`${ep}?page=1`);
    const items = filter(data.results)
      .filter((i) => i.genre_ids?.includes(ANIME_GENRE))
      .slice(0, 10);
    renderRow(
      items.length ? items : filter(data.results).slice(0, 10),
      "animeScheduleRow",
    );
  };

  /* ──────────────────────────────────────────────
     LOAD MORE
  ────────────────────────────────────────────── */
  window.__animeLoadMore = async function () {
    if (animeAllPage >= animeAllTotalPages) return;
    animeAllPage++;
    const spinner = document.getElementById("animeAllSpinner");
    if (spinner) spinner.style.display = "block";
    document.getElementById("animeLoadMoreWrap").style.display = "none";

    const gParam = animeCurrentGenre
      ? `&with_genres=${ANIME_GENRE},${animeCurrentGenre}`
      : `&with_genres=${ANIME_GENRE}`;
    const voteMin =
      animeCurrentSort === "vote_average"
        ? "&vote_count.gte=200"
        : "&vote_count.gte=5";
    const data = await tmdb(
      `/discover/tv?with_original_language=ja&sort_by=${animeCurrentSort}.desc${gParam}${voteMin}&page=${animeAllPage}`,
    );
    const items = filter(data.results);
    animeAllItems = [...animeAllItems, ...items];
    renderGrid(items, "animeAllGrid", true);

    if (spinner) spinner.style.display = "none";
    document.getElementById("animeLoadMoreWrap").style.display =
      animeAllPage < animeAllTotalPages ? "block" : "none";
  };

  /* ──────────────────────────────────────────────
     SEARCH
  ────────────────────────────────────────────── */
  window.__animeSearch = async function () {
    const q = (document.getElementById("animeSearchInput")?.value || "").trim();
    if (!q) return;

    const sr = document.getElementById("animeSearchResults");
    const sg = document.getElementById("animeSearchGrid");
    const lbl = document.getElementById("animeSearchLabel");
    if (!sr || !sg || !lbl) return;

    lbl.textContent = `"${q}"`;
    sr.style.display = "block";
    sg.innerHTML = skels(6, "grid");
    sr.scrollIntoView({ behavior: "smooth", block: "start" });

    const [tvRes, mvRes] = await Promise.all([
      tmdb(`/search/tv?query=${encodeURIComponent(q)}`),
      tmdb(`/search/movie?query=${encodeURIComponent(q)}`),
    ]);

    const tv = filter(tvRes.results);
    const mv = filter(mvRes.results).filter((i) =>
      i.genre_ids?.includes(ANIME_GENRE),
    );
    const all = [...tv, ...mv].slice(0, 24);

    sg.innerHTML = all.length
      ? all.map((i) => makeCard(i, i.media_type || "tv")).join("")
      : `<div class="anime-empty-state"><i class="fas fa-search"></i><p>No anime found for "${q}"</p></div>`;
  };

  window.__animeClearSearch = function () {
    const sr = document.getElementById("animeSearchResults");
    const inp = document.getElementById("animeSearchInput");
    if (sr) sr.style.display = "none";
    if (inp) inp.value = "";
  };

  /* ──────────────────────────────────────────────
     RANDOM PICK
  ────────────────────────────────────────────── */
  window.__animeRandom = async function () {
    toast("🎲 Finding random anime…", "fa-dice");
    const randomPage = Math.floor(Math.random() * 10) + 1;
    const data = await tmdb(
      `/discover/tv?${ANIME_PARAMS}&sort_by=popularity.desc&page=${randomPage}`,
    );
    const items = filter(data.results);
    if (!items.length) {
      toast("Try again!", "fa-times");
      return;
    }
    const pick = items[Math.floor(Math.random() * items.length)];
    animePlay(pick.id, "tv");
  };

  /* ──────────────────────────────────────────────
     PLAY / INFO — with modal patch active
  ────────────────────────────────────────────── */
  window.animePlay = function (id, type) {
    // Make sure patch is active so closing modal returns to anime page
    patchCloseModal();

    if (typeof openContent === "function") {
      openContent(id, type, true);
      // After modal opens, switch to AutoEmbed server
      setTimeout(() => {
        if (typeof switchServer === "function") {
          const btns = document.querySelectorAll(".srv-btn");
          btns.forEach((b, i) => {
            if (b.textContent.toLowerCase().includes("autoembed"))
              switchServer(i);
          });
        }
      }, 900);
    }
  };

  window.animeInfo = function (id, type) {
    patchCloseModal();
    if (typeof openContent === "function") openContent(id, type, false);
  };

  /* ──────────────────────────────────────────────
     WATCHLIST
  ────────────────────────────────────────────── */
  window.animeToggleWl = function (item) {
    if (typeof toggleWatchlistItem === "function") {
      toggleWatchlistItem({
        id: item.id,
        type: "tv",
        title: item.name || item.title,
        poster: item.poster_path,
        year: (item.first_air_date || "").slice(0, 4),
        rating: item.vote_average?.toFixed(1),
      });
    }
    syncWatchlist();
    renderHero(animeHeroIdx); // refresh hero wl button
  };

  window.animeQuickWl = function (id, type, title, poster, year, rating, btn) {
    if (typeof toggleWatchlistItem === "function") {
      toggleWatchlistItem({ id, type, title, poster, year, rating });
    }
    syncWatchlist();
    const inWl = isInWl(id);
    if (btn) {
      btn.textContent = inWl ? "✓ Saved" : "+ My List";
      btn.classList.toggle("saved", inWl);
    }
  };

  /* ──────────────────────────────────────────────
     KEYBOARD SHORTCUT
  ────────────────────────────────────────────── */
  document.addEventListener("keydown", (e) => {
    if (!isAnimePageOpen) return;
    if (e.key === "Escape") window.__animeClose();
    if (e.key === "r" || e.key === "R") window.__animeRandom();
  });

  /* ──────────────────────────────────────────────
     INIT
  ────────────────────────────────────────────── */
  function init() {
    buildPage();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================================
   MOBILE NAV — injected by prime_anime.js
   ============================================================ */
(function () {
  "use strict";

  function buildMobileNav() {
    if (document.getElementById("animeMenuToggle")) return;

    /* ── Hamburger button: insert RIGHT BEFORE the watchlist icon ── */
    const toggle = document.createElement("button");
    toggle.id = "animeMenuToggle";
    toggle.setAttribute("aria-label", "Open menu");
    toggle.innerHTML = `
      <div class="hamburger-lines">
        <span></span><span></span><span></span>
      </div>
      <span class="anime-indicator"></span>`;
    toggle.addEventListener("click", openDrawer);

    // Insert before the watchlist .nav-icon-btn (bookmark)
    const wlBtn = document.querySelector(".nav-icon-btn");
    const navRight = document.querySelector(".nav-right");
    if (navRight) {
      if (wlBtn) {
        navRight.insertBefore(toggle, wlBtn);
      } else {
        navRight.appendChild(toggle);
      }
    }

    /* ── Side drawer ── */
    const drawer = document.createElement("div");
    drawer.id = "mobileNavDrawer";
    drawer.innerHTML = `
      <div class="mobile-drawer-backdrop" id="mobileDrawerBg"></div>
      <div class="mobile-drawer-panel">
        <div class="mobile-drawer-header">
          <div class="mobile-drawer-logo">FOUDRI<em>.</em></div>
          <button class="mobile-drawer-close" id="mobileDrawerClose">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <nav class="mobile-drawer-links">
          <div class="mobile-drawer-section-label">Browse</div>
          <a class="mobile-drawer-link active" id="mdlHome" href="#">
            <span class="mobile-drawer-link-icon"><i class="fas fa-home"></i></span>
            Home
          </a>
          <a class="mobile-drawer-link" id="mdlMovies" href="#">
            <span class="mobile-drawer-link-icon"><i class="fas fa-film"></i></span>
            Movies
          </a>
          <a class="mobile-drawer-link" id="mdlTV" href="#">
            <span class="mobile-drawer-link-icon"><i class="fas fa-tv"></i></span>
            TV Shows
          </a>
          <div class="mobile-drawer-divider"></div>
          <div class="mobile-drawer-section-label">Genres</div>
          <a class="mobile-drawer-link" id="mdlAction" href="#">
            <span class="mobile-drawer-link-icon"><i class="fas fa-bolt"></i></span>
            Action
          </a>
          <a class="mobile-drawer-link" id="mdlDrama" href="#">
            <span class="mobile-drawer-link-icon"><i class="fas fa-theater-masks"></i></span>
            Drama
          </a>
          <div class="mobile-drawer-divider"></div>
          <a class="mobile-drawer-link anime-drawer-link" id="mdlAnime" href="#">
            <span class="mobile-drawer-link-icon"><i class="fas fa-dragon"></i></span>
            Anime
            <span class="mobile-anime-badge">NEW</span>
          </a>
          <div class="mobile-drawer-divider"></div>
          <div class="mobile-drawer-section-label">Account</div>
          <a class="mobile-drawer-link" id="mdlList" href="#">
            <span class="mobile-drawer-link-icon"><i class="fas fa-bookmark"></i></span>
            My List
          </a>
        </nav>
        <div class="mobile-drawer-footer">
          <div class="mobile-drawer-footer-logo">FOUDRI<em>.</em> — cinematic streaming</div>
        </div>
      </div>`;
    document.body.appendChild(drawer);

    /* Wire up drawer links using addEventListener (no inline onclick) */
    document
      .getElementById("mobileDrawerBg")
      .addEventListener("click", closeDrawer);
    document
      .getElementById("mobileDrawerClose")
      .addEventListener("click", closeDrawer);

    document.getElementById("mdlHome").addEventListener("click", function (e) {
      e.preventDefault();
      closeDrawer();
      if (typeof scrollToTop === "function") scrollToTop();
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document
      .getElementById("mdlMovies")
      .addEventListener("click", function (e) {
        e.preventDefault();
        closeDrawer();
        if (typeof openSeeAll === "function")
          openSeeAll("popular_movies", "Popular Movies");
      });
    document.getElementById("mdlTV").addEventListener("click", function (e) {
      e.preventDefault();
      closeDrawer();
      if (typeof openSeeAll === "function")
        openSeeAll("popular_tv", "TV Shows");
    });
    document
      .getElementById("mdlAction")
      .addEventListener("click", function (e) {
        e.preventDefault();
        closeDrawer();
        if (typeof openSeeAll === "function") openSeeAll("genre_28", "Action");
      });
    document.getElementById("mdlDrama").addEventListener("click", function (e) {
      e.preventDefault();
      closeDrawer();
      if (typeof openSeeAll === "function") openSeeAll("genre_18", "Drama");
    });
    document.getElementById("mdlAnime").addEventListener("click", function (e) {
      e.preventDefault();
      closeDrawer();
      goAnime();
    });
    document.getElementById("mdlList").addEventListener("click", function (e) {
      e.preventDefault();
      closeDrawer();
      if (typeof toggleWatchlist === "function") toggleWatchlist();
    });

    /* ── Bottom tab bar ── */
    const bar = document.createElement("div");
    bar.id = "mobileBottomBar";
    bar.innerHTML = `
      <div class="mobile-bottom-tabs">
        <button class="mobile-tab-btn active" id="mbtHome">
          <i class="fas fa-home"></i>Home
        </button>
        <button class="mobile-tab-btn" id="mbtMovies">
          <i class="fas fa-film"></i>Movies
        </button>
        <button class="mobile-tab-btn" id="mbtTV">
          <i class="fas fa-tv"></i>TV Shows
        </button>
        <button class="mobile-tab-btn anime-tab" id="mbtAnime">
          <span class="mobile-tab-anime-dot"></span>
          <i class="fas fa-dragon"></i>Anime
        </button>
        <button class="mobile-tab-btn" id="mbtList">
          <i class="fas fa-bookmark"></i>My List
        </button>
      </div>`;
    document.body.appendChild(bar);

    /* Wire bottom bar with addEventListener */
    document.getElementById("mbtHome").addEventListener("click", function () {
      setActiveTab(this);
      if (typeof scrollToTop === "function") scrollToTop();
      else window.scrollTo({ top: 0, behavior: "smooth" });
    });
    document.getElementById("mbtMovies").addEventListener("click", function () {
      setActiveTab(this);
      if (typeof openSeeAll === "function")
        openSeeAll("popular_movies", "Popular Movies");
    });
    document.getElementById("mbtTV").addEventListener("click", function () {
      setActiveTab(this);
      if (typeof openSeeAll === "function")
        openSeeAll("popular_tv", "TV Shows");
    });
    document.getElementById("mbtAnime").addEventListener("click", function () {
      setActiveTab(this);
      goAnime();
    });
    document.getElementById("mbtList").addEventListener("click", function () {
      setActiveTab(this);
      if (typeof toggleWatchlist === "function") toggleWatchlist();
    });
  }

  /* Open the anime page — waits until window.__openAnimePage is ready */
  function goAnime() {
    if (typeof window.__openAnimePage === "function") {
      window.__openAnimePage();
    } else {
      // fallback: retry after scripts fully loaded
      setTimeout(function () {
        if (typeof window.__openAnimePage === "function")
          window.__openAnimePage();
      }, 300);
    }
  }

  function setActiveTab(btn) {
    document
      .querySelectorAll(".mobile-tab-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }

  function openDrawer() {
    const toggle = document.getElementById("animeMenuToggle");
    const drawer = document.getElementById("mobileNavDrawer");
    if (toggle) toggle.classList.add("open");
    if (drawer) drawer.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeDrawer() {
    const toggle = document.getElementById("animeMenuToggle");
    const drawer = document.getElementById("mobileNavDrawer");
    if (toggle) toggle.classList.remove("open");
    if (drawer) drawer.classList.remove("open");
    document.body.style.overflow = "";
  }

  // Expose close for any legacy callers
  window.__closeMobileDrawer = closeDrawer;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", buildMobileNav);
  } else {
    buildMobileNav();
  }
})();
