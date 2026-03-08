
(function () {
  "use strict";

  const TMDB_KEY = window.TMDB_KEY || "c096300da27be38fd70190283bc5f8bc";
  const API = window.API || "https://api.themoviedb.org/3";
  const IMG = window.IMG || "https://image.tmdb.org/t/p/w500";
  const IMG_ORI = "https://image.tmdb.org/t/p/original";

  /* ── helpers ──────────────────────────────────────────── */
  function tmdb(path, params = {}) {
    const q = new URLSearchParams({ api_key: TMDB_KEY, ...params });
    return fetch(`${API}${path}?${q}`).then((r) => r.json());
  }

  const COUNTRIES = [
    { code: "all", flag: "🌍", name: "All", searchKey: null },
    { code: "us", flag: "🇺🇸", name: "USA", searchKey: "United States" },
    { code: "gb", flag: "🇬🇧", name: "UK", searchKey: "United Kingdom" },
    { code: "in", flag: "🇮🇳", name: "India", searchKey: "India" },
    { code: "bd", flag: "🇧🇩", name: "Bangladesh", searchKey: "Bangladesh" },
    { code: "pk", flag: "🇵🇰", name: "Pakistan", searchKey: "Pakistan" },
    { code: "es", flag: "🇪🇸", name: "Spain", searchKey: "Spain" },
    { code: "fr", flag: "🇫🇷", name: "France", searchKey: "France" },
    { code: "kr", flag: "🇰🇷", name: "Korea", searchKey: "South Korea" },
    { code: "jp", flag: "🇯🇵", name: "Japan", searchKey: "Japan" },
    { code: "it", flag: "🇮🇹", name: "Italy", searchKey: "Italy" },
    { code: "au", flag: "🇦🇺", name: "Australia", searchKey: "Australia" },
    { code: "ca", flag: "🇨🇦", name: "Canada", searchKey: "Canada" },
    { code: "br", flag: "🇧🇷", name: "Brazil", searchKey: "Brazil" },
    { code: "mx", flag: "🇲🇽", name: "Mexico", searchKey: "Mexico" },
    { code: "cn", flag: "🇨🇳", name: "China", searchKey: "China" },
    { code: "tr", flag: "🇹🇷", name: "Turkey", searchKey: "Turkey" },
    { code: "ng", flag: "🇳🇬", name: "Nigeria", searchKey: "Nigeria" },
    { code: "za", flag: "🇿🇦", name: "S. Africa", searchKey: "South Africa" },
    { code: "de", flag: "🇩🇪", name: "Germany", searchKey: "Germany" },
  ];

  /* country code → flag map for card badges */
  const FLAG_MAP = {};
  COUNTRIES.forEach((c) => {
    if (c.searchKey) FLAG_MAP[c.name] = c.flag;
  });

  /* ══════════════════════════════════════════════════════════
     STATE
  ══════════════════════════════════════════════════════════ */
  let currentGender = 2; // 2 = male/actor, 1 = female/actress
  let currentCountry = "all";
  let cachedPeople = {}; // keyed by "gender_country"

  /* ══════════════════════════════════════════════════════════
     BUILD SECTION
  ══════════════════════════════════════════════════════════ */
  function buildActorSpotlight() {
    if (document.getElementById("actorSpotlight")) return;

    const anchor =
      document.getElementById("genreSpotlight") ||
      document.getElementById("statsBar");
    if (!anchor) return;

    const countryPills = COUNTRIES.map(
      (c) => `
      <button class="star-country-pill${c.code === "all" ? " active" : ""}"
        data-country="${c.code}"
        onclick="window._setActorCountry('${c.code}')">
        <span class="pill-flag">${c.flag}</span>
        <span class="pill-name">${c.name}</span>
      </button>`,
    ).join("");

    anchor.insertAdjacentHTML(
      "afterend",
      `
      <div id="actorSpotlight">
        <div class="star-header">
          <div>
            <div class="star-section-title"><span>🎭</span> Star Spotlight</div>
            <div class="star-section-subtitle">Explore popular actors & actresses by country</div>
          </div>
        </div>

        <div class="star-filter-bar">
          <!-- Gender row -->
          <div class="star-filter-row">
            <span class="star-filter-label">Type</span>
            <div class="star-gender-toggle">
              <button class="star-gender-btn active" id="starGenderActor"
                onclick="window._setActorGender(2)">
                <i class="fas fa-male"></i> Actors
              </button>
              <button class="star-gender-btn" id="starGenderActress"
                onclick="window._setActorGender(1)">
                <i class="fas fa-female"></i> Actresses
              </button>
            </div>
          </div>
          <!-- Country row -->
          <div class="star-filter-row">
            <span class="star-filter-label">Country</span>
            <div class="star-country-scroll" id="starCountryScroll">
              ${countryPills}
            </div>
          </div>
        </div>

        <div class="star-scroll-row" id="starScrollRow">
          ${_skeletons(10)}
        </div>
      </div>`,
    );

    _loadStars();
  }

  function _skeletons(n) {
    return Array(n)
      .fill(
        `
      <div class="skel" style="width:128px;height:168px;border-radius:14px;flex-shrink:0"></div>
    `,
      )
      .join("");
  }

  /* ── public switchers ────────────────────────────────── */
  window._setActorGender = function (g) {
    currentGender = g;
    document
      .getElementById("starGenderActor")
      ?.classList.toggle("active", g === 2);
    document
      .getElementById("starGenderActress")
      ?.classList.toggle("active", g === 1);
    _loadStars();
  };

  window._setActorCountry = function (code) {
    currentCountry = code;
    document.querySelectorAll(".star-country-pill").forEach((el) => {
      el.classList.toggle("active", el.dataset.country === code);
    });
    _loadStars();
  };

  /* ── fetch + render ──────────────────────────────────── */
  async function _loadStars() {
    const row = document.getElementById("starScrollRow");
    if (!row) return;

    row.innerHTML = _skeletons(10);

    const cacheKey = `${currentGender}_${currentCountry}`;
    if (cachedPeople[cacheKey]) {
      _renderStars(cachedPeople[cacheKey]);
      return;
    }

    try {
      const countryConf = COUNTRIES.find((c) => c.code === currentCountry);
      let people = [];

      if (currentCountry === "all") {
        /* Page 1 popular people filtered by gender */
        const pages = [1, 2];
        const results = await Promise.all(
          pages.map((p) => tmdb("/person/popular", { page: p })),
        );
        const combined = results.flatMap((r) => r.results || []);
        people = combined.filter(
          (p) => p.gender === currentGender && p.profile_path,
        );
      } else {
        /* Search multiple pages and filter by place_of_birth */
        const searchKey = countryConf?.searchKey || "";
        const pages = [1, 2, 3];
        const results = await Promise.all(
          pages.map((p) => tmdb("/person/popular", { page: p })),
        );
        const combined = results.flatMap((r) => r.results || []);

        /* First pass: use available place_of_birth if present */
        let filtered = combined.filter(
          (p) =>
            p.gender === currentGender &&
            p.profile_path &&
            p.place_of_birth &&
            p.place_of_birth.toLowerCase().includes(searchKey.toLowerCase()),
        );

        /* If too few, fetch details for top people to check birthplace */
        if (filtered.length < 6) {
          const candidates = combined
            .filter((p) => p.gender === currentGender && p.profile_path)
            .slice(0, 40);

          const details = await Promise.allSettled(
            candidates.map((p) => tmdb(`/person/${p.id}`)),
          );

          filtered = details
            .filter((r) => r.status === "fulfilled")
            .map((r) => r.value)
            .filter(
              (p) =>
                p.gender === currentGender &&
                p.profile_path &&
                p.place_of_birth &&
                p.place_of_birth
                  .toLowerCase()
                  .includes(searchKey.toLowerCase()),
            );
        }

        people = filtered;
      }

      people = people.slice(0, 20);
      cachedPeople[cacheKey] = people;
      _renderStars(people);
    } catch (e) {
      console.error("Star load error:", e);
      const row = document.getElementById("starScrollRow");
      if (row)
        row.innerHTML = `
        <div class="star-empty">
          <i class="fas fa-user-slash"></i>
          <span>Could not load stars. Try another filter.</span>
        </div>`;
    }
  }

  function _renderStars(people) {
    const row = document.getElementById("starScrollRow");
    if (!row) return;

    if (!people.length) {
      row.innerHTML = `
        <div class="star-empty">
          <i class="fas fa-search"></i>
          <span>No stars found for this combination.<br>Try a different country or type.</span>
        </div>`;
      return;
    }

    const countryConf = COUNTRIES.find((c) => c.code === currentCountry);

    row.innerHTML = people
      .map((p, i) => {
        const rankClass =
          i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "normal";
        const knownTitle =
          (p.known_for || [])
            .map((k) => k.title || k.name)
            .filter(Boolean)[0] || "";
        const dept = p.known_for_department || "Acting";

        /* Country flag for "all" view — try to match place_of_birth */
        let flagBadge = "";
        if (currentCountry === "all" && p.place_of_birth) {
          const pob = p.place_of_birth;
          for (const [name, flag] of Object.entries(FLAG_MAP)) {
            if (pob.toLowerCase().includes(name.toLowerCase())) {
              flagBadge = `<span class="star-flag-badge" title="${p.place_of_birth}">${flag}</span>`;
              break;
            }
          }
        } else if (countryConf && currentCountry !== "all") {
          flagBadge = `<span class="star-flag-badge">${countryConf.flag}</span>`;
        }

        return `
        <div class="star-card" onclick="window.openActorProfile(${p.id})" title="${p.name}">
          <div class="star-avatar-wrap">
            <img class="star-avatar-img"
              src="${IMG + p.profile_path}"
              alt="${p.name}"
              loading="lazy"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
            <div class="star-no-photo" style="display:none">
              <i class="fas fa-user"></i>
              <span>No Photo</span>
            </div>
            <div class="star-avatar-overlay"></div>
            <div class="star-rank-badge ${rankClass}">${i + 1}</div>
            ${flagBadge}
            <div class="star-view-cta">VIEW PROFILE</div>
          </div>
          <div class="star-card-name">${p.name}</div>
          ${knownTitle ? `<div class="star-card-known">${knownTitle}</div>` : ""}
          <div class="star-card-dept">${dept}</div>
        </div>`;
      })
      .join("");
  }

  /* ══════════════════════════════════════════════════════════
     ACTOR PROFILE MODAL
  ══════════════════════════════════════════════════════════ */

  function _buildActorModal() {
    if (document.getElementById("actorModal")) return;
    document.body.insertAdjacentHTML(
      "beforeend",
      `
      <div id="actorModal">
        <div class="actor-modal-backdrop" onclick="window.closeActorModal()"></div>
        <div class="actor-modal-box">
          <!-- HERO -->
          <div class="actor-modal-hero">
            <div class="actor-hero-bg-blur" id="actorHeroBgBlur"></div>
            <!-- Poster column -->
            <div class="actor-hero-poster-col">
              <img class="actor-hero-poster" id="actorHeroPoster" src="" alt=""
                onerror="this.style.objectFit='contain';this.style.padding='1rem'">
            </div>
            <!-- Info column -->
            <div class="actor-hero-info-col">
              <div class="actor-hero-dept-tag" id="actorDeptTag">
                <i class="fas fa-star"></i> ACTING
              </div>
              <div class="actor-hero-name" id="actorHeroName">—</div>
              <div class="actor-hero-origin" id="actorHeroOrigin"></div>
              <div class="actor-quick-stats" id="actorQuickStats"></div>
            </div>
            <button class="actor-modal-close" onclick="window.closeActorModal()">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <!-- BODY -->
          <div class="actor-modal-body">
            <div class="actor-info-chips" id="actorInfoChips"></div>

            <div class="actor-bio-section">
              <div class="actor-bio-section-label">Biography</div>
              <div class="actor-bio-text" id="actorBioText">
                <div class="actor-bio-fade-el"></div>
              </div>
              <button class="actor-bio-more-btn" id="actorBioBtn"
                onclick="window._toggleActorBio()" style="display:none">
                Read more <i class="fas fa-chevron-down"></i>
              </button>
            </div>

            <div class="actor-filmography-section">
              <div class="actor-filmography-header">
                <span class="actor-filmography-label">Filmography</span>
                <div class="actor-filmography-divider"></div>
              </div>
              <div class="actor-film-tabs">
                <button class="actor-film-tab active" id="afTabMovie"
                  onclick="window._switchFilmTab('movie')">
                  <i class="fas fa-film" style="font-size:.6rem"></i> Movies
                  <span class="tab-count" id="afMovieCount">—</span>
                </button>
                <button class="actor-film-tab" id="afTabTV"
                  onclick="window._switchFilmTab('tv')">
                  <i class="fas fa-tv" style="font-size:.6rem"></i> TV Shows
                  <span class="tab-count" id="afTVCount">—</span>
                </button>
              </div>
              <div class="actor-filmography-grid" id="actorFilmGrid">
                <div class="actor-film-loading">
                  <div class="spinner" style="width:20px;height:20px;border-width:2px"></div>
                  Loading filmography…
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>`,
    );
  }

  let _filmCache = {};
  let _currentPid = null;
  let _currentFTab = "movie";

  window.openActorProfile = async function (personId) {
    _buildActorModal();
    const modal = document.getElementById("actorModal");
    modal.classList.add("open");
    document.body.style.overflow = "hidden";

    /* Reset UI */
    document.getElementById("actorHeroName").textContent = "Loading…";
    document.getElementById("actorHeroOrigin").innerHTML = "";
    document.getElementById("actorDeptTag").innerHTML =
      '<i class="fas fa-star"></i> ACTING';
    document.getElementById("actorQuickStats").innerHTML = "";
    document.getElementById("actorInfoChips").innerHTML = "";
    document.getElementById("actorBioText").innerHTML =
      '<div class="actor-bio-fade-el"></div>';
    document.getElementById("actorBioBtn").style.display = "none";
    document.getElementById("actorHeroBgBlur").style.backgroundImage = "";
    document.getElementById("actorHeroPoster").src = "";
    document.getElementById("actorFilmGrid").innerHTML = `
      <div class="actor-film-loading">
        <div class="spinner" style="width:20px;height:20px;border-width:2px"></div>
        Loading…
      </div>`;
    document.getElementById("afMovieCount").textContent = "—";
    document.getElementById("afTVCount").textContent = "—";
    document.getElementById("afTabMovie")?.classList.add("active");
    document.getElementById("afTabTV")?.classList.remove("active");

    _currentPid = personId;
    _currentFTab = "movie";

    try {
      const [person, credits] = await Promise.all([
        tmdb(`/person/${personId}`),
        tmdb(`/person/${personId}/combined_credits`),
      ]);
      _filmCache[personId] = credits;

      /* Poster */
      const posterSrc = person.profile_path
        ? IMG + person.profile_path
        : "https://placehold.co/150x200/131110/3a302a?text=No+Photo";
      document.getElementById("actorHeroPoster").src = posterSrc;

      /* Blurred hero background — use most popular credit backdrop */
      const allCast = credits.cast || [];
      const heroBgItem = allCast
        .filter((c) => c.backdrop_path)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))[0];
      if (heroBgItem) {
        document.getElementById("actorHeroBgBlur").style.backgroundImage =
          `url(${IMG_ORI + heroBgItem.backdrop_path})`;
      } else {
        document.getElementById("actorHeroBgBlur").style.backgroundImage =
          `url(${posterSrc})`;
      }

      /* Name */
      document.getElementById("actorHeroName").textContent = person.name;

      /* Dept tag */
      const dept = person.known_for_department || "Acting";
      document.getElementById("actorDeptTag").innerHTML =
        `<i class="fas fa-star"></i> ${dept.toUpperCase()}`;

      /* Origin */
      const pob = person.place_of_birth || "";
      if (pob) {
        let flag = "";
        for (const [name, f] of Object.entries(FLAG_MAP)) {
          if (pob.toLowerCase().includes(name.toLowerCase())) {
            flag = f;
            break;
          }
        }
        document.getElementById("actorHeroOrigin").innerHTML =
          `${flag ? `<span class="oflag">${flag}</span>` : ""}${pob}`;
      }

      /* Quick stats */
      const movieCount = allCast.filter((c) => c.media_type === "movie").length;
      const tvCount = allCast.filter((c) => c.media_type === "tv").length;
      const pop = Math.round(person.popularity || 0);
      document.getElementById("actorQuickStats").innerHTML = [
        { num: movieCount, lbl: "Movies" },
        { num: tvCount, lbl: "TV Shows" },
        { num: pop, lbl: "Popularity" },
      ]
        .map(
          (s) => `
        <div class="actor-qstat">
          <div class="actor-qstat-num">${s.num}</div>
          <div class="actor-qstat-lbl">${s.lbl}</div>
        </div>`,
        )
        .join("");

      /* Tab counts */
      document.getElementById("afMovieCount").textContent = movieCount;
      document.getElementById("afTVCount").textContent = tvCount;

      /* Info chips */
      const chips = [];
      if (person.birthday)
        chips.push(
          `<div class="actor-info-chip"><i class="fas fa-birthday-cake"></i>${person.birthday}</div>`,
        );
      if (pob)
        chips.push(
          `<div class="actor-info-chip"><i class="fas fa-map-marker-alt"></i>${pob}</div>`,
        );
      if (person.deathday)
        chips.push(
          `<div class="actor-info-chip"><i class="fas fa-cross"></i>${person.deathday}</div>`,
        );
      const aliases = (person.also_known_as || []).slice(0, 2);
      aliases.forEach((a) =>
        chips.push(
          `<div class="actor-info-chip"><i class="fas fa-tag"></i>${a}</div>`,
        ),
      );
      document.getElementById("actorInfoChips").innerHTML = chips.join("");

      /* Bio */
      if (person.biography) {
        const bioEl = document.getElementById("actorBioText");
        bioEl.innerHTML = `${person.biography}<div class="actor-bio-fade-el"></div>`;
        bioEl.classList.remove("expanded");
        const btn = document.getElementById("actorBioBtn");
        btn.style.display = "inline-flex";
        btn.innerHTML = `Read more <i class="fas fa-chevron-down"></i>`;
      }

      /* Filmography */
      _renderFilmography(personId, "movie");
    } catch (e) {
      console.error("Actor profile error:", e);
      document.getElementById("actorHeroName").textContent = "Failed to load";
    }
  };

  window._toggleActorBio = function () {
    const bio = document.getElementById("actorBioText");
    const btn = document.getElementById("actorBioBtn");
    bio.classList.toggle("expanded");
    btn.innerHTML = bio.classList.contains("expanded")
      ? `Show less <i class="fas fa-chevron-up"></i>`
      : `Read more <i class="fas fa-chevron-down"></i>`;
  };

  window._switchFilmTab = function (tab) {
    _currentFTab = tab;
    document
      .getElementById("afTabMovie")
      ?.classList.toggle("active", tab === "movie");
    document
      .getElementById("afTabTV")
      ?.classList.toggle("active", tab === "tv");
    if (_currentPid) _renderFilmography(_currentPid, tab);
  };

  function _renderFilmography(pid, type) {
    const grid = document.getElementById("actorFilmGrid");
    if (!grid) return;

    const credits = _filmCache[pid];
    if (!credits) {
      grid.innerHTML = `<div class="actor-film-loading">No data available</div>`;
      return;
    }

    const items = (credits.cast || [])
      .filter((c) => c.media_type === type && c.poster_path)
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 40);

    if (!items.length) {
      grid.innerHTML = `
        <div class="actor-film-loading" style="color:rgba(255,255,255,0.2)">
          No ${type === "movie" ? "movies" : "TV shows"} found
        </div>`;
      return;
    }

    grid.innerHTML = items
      .map((item) => {
        const title = item.title || item.name;
        const year = (item.release_date || item.first_air_date || "").slice(
          0,
          4,
        );
        const rating = item.vote_average ? item.vote_average.toFixed(1) : "";
        return `
        <div class="actor-film-card"
          onclick="window.closeActorModal();setTimeout(()=>window.openContent(${item.id},'${type}'),220)">
          <span class="actor-film-type-tag">${type === "movie" ? "FILM" : "TV"}</span>
          ${rating ? `<div class="actor-film-rating-tag">⭐ ${rating}</div>` : ""}
          <img class="actor-film-poster"
            src="${IMG + item.poster_path}"
            alt="${title}"
            loading="lazy"
            onerror="this.src='https://placehold.co/100x150/131110/2a2018?text=?'">
          <div class="actor-film-card-info">
            <div class="actor-film-card-title">${title}</div>
            <div class="actor-film-card-year">${year || "—"}</div>
          </div>
        </div>`;
      })
      .join("");
  }

  window.closeActorModal = function () {
    document.getElementById("actorModal")?.classList.remove("open");
    document.body.style.overflow = "";
  };

  /* Escape key closes modal */
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") window.closeActorModal();
  });

  /* ══════════════════════════════════════════════════════════
     WHAT'S HOT TODAY
  ══════════════════════════════════════════════════════════ */
  async function _buildWhatsHot() {
    if (document.getElementById("whatsHotSection")) return;
    const anchor =
      document.getElementById("actorSpotlight") ||
      document.getElementById("genreSpotlight");
    if (!anchor) return;

    anchor.insertAdjacentHTML(
      "afterend",
      `
      <div id="whatsHotSection">
        <div class="hot-header">
          <div class="hot-title">
            <span>🔥</span> What's Hot Today
            <span class="hot-live-badge">LIVE</span>
          </div>
        </div>
        <div class="hot-cards-row" id="hotCardsRow">
          ${Array(7)
            .fill(
              `
            <div class="skel" style="width:162px;height:140px;border-radius:14px;flex-shrink:0"></div>
          `,
            )
            .join("")}
        </div>
      </div>`,
    );

    try {
      const data = await tmdb("/trending/all/day");
      const items = (data.results || [])
        .filter((i) => i.backdrop_path)
        .slice(0, 10);
      const fires = [
        "🔥",
        "⚡",
        "💥",
        "🌶️",
        "🚀",
        "✨",
        "💫",
        "⚡",
        "🔥",
        "💥",
      ];
      document.getElementById("hotCardsRow").innerHTML = items
        .map((item, i) => {
          const title = item.title || item.name;
          const year = (item.release_date || item.first_air_date || "").slice(
            0,
            4,
          );
          const type = item.media_type;
          const views = `${(Math.random() * 850 + 80).toFixed(0)}K`;
          return `
          <div class="hot-card" onclick="window.openContent(${item.id},'${type}')">
            <div class="hot-card-rank">${i + 1}</div>
            <span class="hot-card-fire">${fires[i] || "🔥"}</span>
            <img class="hot-card-thumb" src="${IMG + item.backdrop_path}" alt="${title}"
              loading="lazy"
              onerror="this.src='https://placehold.co/162x92/131110/2a2018?text=?'">
            <div class="hot-card-body">
              <div class="hot-card-title">${title}</div>
              <div class="hot-card-meta">
                <span>${year} · ${type === "movie" ? "Film" : "TV"}</span>
                <span class="views"><i class="fas fa-eye"></i> ${views}</span>
              </div>
            </div>
          </div>`;
        })
        .join("");
    } catch (e) {
      document.getElementById("hotCardsRow").innerHTML =
        `<div style="color:var(--text3);padding:1rem;font-size:0.76rem">Failed to load</div>`;
    }
  }

  /* ══════════════════════════════════════════════════════════
     BOOT
  ══════════════════════════════════════════════════════════ */
  let _retries = 0;
  function _boot() {
    if (typeof allContent === "undefined" || !allContent.trending?.length) {
      if (++_retries > 60) return;
      setTimeout(_boot, 150);
      return;
    }
    setTimeout(buildActorSpotlight, 200);
    setTimeout(_buildWhatsHot, 450);
    setTimeout(_buildFab, 80);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", _boot);
  } else {
    _boot();
  }
})();
