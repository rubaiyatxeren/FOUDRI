
const CINEMATIC_QUOTES = [
  {
    text: "Life is like a box of chocolates. You never know what you're gonna get.",
    from: "Forrest Gump",
    year: 1994,
  },
  { text: "You can't handle the truth!", from: "A Few Good Men", year: 1992 },
  {
    text: "Get busy living, or get busy dying.",
    from: "The Shawshank Redemption",
    year: 1994,
  },
  { text: "May the Force be with you.", from: "Star Wars", year: 1977 },
  { text: "To infinity and beyond!", from: "Toy Story", year: 1995 },
  { text: "I am Groot.", from: "Guardians of the Galaxy", year: 2014 },
  {
    text: "With great power comes great responsibility.",
    from: "Spider-Man",
    year: 2002,
  },
  { text: "Why so serious?", from: "The Dark Knight", year: 2008 },
  { text: "I'll be back.", from: "The Terminator", year: 1984 },
  {
    text: "You is kind, you is smart, you is important.",
    from: "The Help",
    year: 2011,
  },
  { text: "Just keep swimming.", from: "Finding Nemo", year: 2003 },
  {
    text: "The stuff that dreams are made of.",
    from: "The Maltese Falcon",
    year: 1941,
  },
  { text: "Go ahead, make my day.", from: "Sudden Impact", year: 1983 },
  { text: "I see dead people.", from: "The Sixth Sense", year: 1999 },
  {
    text: "Elementary, my dear Watson.",
    from: "The Adventures of Sherlock Holmes",
    year: 1939,
  },
  {
    text: "Carpe diem. Seize the day, boys. Make your lives extraordinary.",
    from: "Dead Poets Society",
    year: 1989,
  },
  {
    text: "Every passing minute is another chance to turn it all around.",
    from: "Vanilla Sky",
    year: 2001,
  },
  {
    text: "It's not who I am underneath, but what I do that defines me.",
    from: "Batman Begins",
    year: 2005,
  },
  {
    text: "After all, tomorrow is another day!",
    from: "Gone with the Wind",
    year: 1939,
  },
  {
    text: "Do, or do not. There is no try.",
    from: "The Empire Strikes Back",
    year: 1980,
  },
];

let currentQuoteIdx = Math.floor(Math.random() * CINEMATIC_QUOTES.length);

function injectCinematicQuote() {
  const q = CINEMATIC_QUOTES[currentQuoteIdx];
  const el = document.getElementById("cinematicQuote");
  if (!el) return;
  const textEl = el.querySelector(".cq-text");
  const fromEl = el.querySelector(".cq-from");
  if (textEl) {
    textEl.style.opacity = "0";
    setTimeout(() => {
      textEl.textContent = `"${q.text}"`;
      textEl.style.opacity = "1";
    }, 200);
  }
  if (fromEl) fromEl.innerHTML = `<strong>${q.from}</strong> · ${q.year}`;
}

function nextQuote() {
  currentQuoteIdx = (currentQuoteIdx + 1) % CINEMATIC_QUOTES.length;
  injectCinematicQuote();
}

const MOOD_MAP = {
  thrilling: {
    genres: [28, 53, 80],
    label: "🔥 Thrilling",
    desc: "Action, Thriller, Crime",
  },
  laugh: {
    genres: [35, 10751],
    label: "😂 Make Me Laugh",
    desc: "Comedy, Family",
  },
  cry: {
    genres: [18, 10749],
    label: "😢 Feel Something",
    desc: "Drama, Romance",
  },
  scared: { genres: [27, 9648], label: "😱 Scare Me", desc: "Horror, Mystery" },
  romantic: {
    genres: [10749, 18],
    label: "❤️ Romantic",
    desc: "Romance, Drama",
  },
  inspired: {
    genres: [99, 36],
    label: "💡 Inspire Me",
    desc: "Documentary, History",
  },
  mind: {
    genres: [878, 9648],
    label: "🧠 Mind-Bending",
    desc: "Sci-Fi, Mystery",
  },
  adventure: {
    genres: [12, 14],
    label: "🗺️ Adventure",
    desc: "Adventure, Fantasy",
  },
};

let activeMood = null;

function buildMoodSection() {
  const main = document.querySelector("main");
  if (!main) return;
  const firstSection = main.querySelector(".section");
  if (!firstSection) return;

  const html = `
    <div id="moodSection">
      <div class="mood-header">
        <div>
          <div class="mood-title"><span>🎭</span> What's Your Mood?</div>
          <div class="mood-subtitle">Pick a vibe — we'll find something perfect</div>
        </div>
        <button class="mood-clear-btn" id="moodClearBtn" onclick="clearMoodFilter()">✕ Clear Mood</button>
      </div>
      <div class="mood-pills">
        ${Object.entries(MOOD_MAP)
          .map(
            ([key, val]) => `
          <button class="mood-pill" data-mood="${key}" onclick="setMoodFilter('${key}')">
            <span class="mood-emoji">${val.label.split(" ")[0]}</span>
            ${val.label.split(" ").slice(1).join(" ")}
          </button>
        `,
          )
          .join("")}
      </div>
      <div id="moodResults">
        <div class="mood-results-label">
          <span id="moodResultsTitle">Results</span>
          <span id="moodResultsCount"></span>
        </div>
        <div class="scroll-row" id="moodResultsRow"></div>
      </div>
    </div>
  `;
  main.insertBefore(createEl("div", html), firstSection);
}

function setMoodFilter(mood) {
  activeMood = mood;
  document
    .querySelectorAll(".mood-pill")
    .forEach((p) => p.classList.toggle("active", p.dataset.mood === mood));
  document.getElementById("moodClearBtn")?.classList.add("visible");
  const moodData = MOOD_MAP[mood];
  if (!moodData) return;

  document.getElementById("moodResultsTitle").textContent =
    `${moodData.label} — ${moodData.desc}`;
  document.getElementById("moodResults").style.display = "block";
  const row = document.getElementById("moodResultsRow");
  row.innerHTML = `<div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div><div class="skel"></div>`;

  const genreStr = moodData.genres.join("|");
  const TMDB_KEY = "c096300da27be38fd70190283bc5f8bc";
  const API = "https://api.themoviedb.org/3";

  fetch(
    `${API}/discover/movie?api_key=${TMDB_KEY}&with_genres=${genreStr}&sort_by=popularity.desc&vote_count.gte=100`,
  )
    .then((r) => r.json())
    .then((data) => {
      const results = (data.results || [])
        .filter((i) => i.poster_path)
        .slice(0, 12);
      document.getElementById("moodResultsCount").textContent =
        `(${data.total_results?.toLocaleString() || "?"} matches)`;
      if (typeof renderScrollRow === "function") {
        renderScrollRow(results, "moodResultsRow", false, "movie");
      }
    });
}
window.setMoodFilter = setMoodFilter;

function clearMoodFilter() {
  activeMood = null;
  document
    .querySelectorAll(".mood-pill")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("moodClearBtn")?.classList.remove("visible");
  document.getElementById("moodResults").style.display = "none";
}
window.clearMoodFilter = clearMoodFilter;

async function buildStatsBar() {
  const main = document.querySelector("main");
  if (!main || document.getElementById("statsBar")) return;

  // Show loading state first
  const loadingHtml = `<div id="statsBar" class="stats-loading">
    <div class="stat-card"><div class="spinner" style="width:24px;height:24px"></div></div>
    <div class="stat-card"><div class="spinner" style="width:24px;height:24px"></div></div>
    <div class="stat-card"><div class="spinner" style="width:24px;height:24px"></div></div>
    <div class="stat-card"><div class="spinner" style="width:24px;height:24px"></div></div>
  </div>`;

  const moodEl = document.getElementById("moodSection");
  if (moodEl) {
    moodEl.insertAdjacentHTML("afterend", loadingHtml);
  } else {
    main.insertAdjacentHTML("afterbegin", loadingHtml);
  }

  try {
    const TMDB_KEY = window.TMDB_KEY || "c096300da27be38fd70190283bc5f8bc";
    const API = window.API || "https://api.themoviedb.org/3";

    const [movieStats, tvStats, languages, ratings] = await Promise.allSettled([
      fetch(`${API}/discover/movie?api_key=${TMDB_KEY}&page=1`).then((r) =>
        r.json(),
      ),
      fetch(`${API}/discover/tv?api_key=${TMDB_KEY}&page=1`).then((r) =>
        r.json(),
      ),
      fetch(`${API}/configuration/languages?api_key=${TMDB_KEY}`).then((r) =>
        r.json(),
      ),
      fetch(`${API}/movie/popular?api_key=${TMDB_KEY}`).then((r) => r.json()),
    ]);

    const totalMovies =
      movieStats.status === "fulfilled"
        ? Math.min(
            15000,
            Math.floor((movieStats.value.total_results || 0) * 0.7),
          )
        : 10482;

    const totalTVShows =
      tvStats.status === "fulfilled"
        ? Math.min(8000, Math.floor((tvStats.value.total_results || 0) * 0.6))
        : 4200;

    const languagesCount =
      languages.status === "fulfilled"
        ? Math.min(50, (languages.value || []).length)
        : 40;

    let avgRating = 7.4;
    if (ratings.status === "fulfilled" && ratings.value.results) {
      const validRatings = ratings.value.results
        .map((m) => m.vote_average)
        .filter((r) => r && r > 0);
      if (validRatings.length) {
        avgRating =
          validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
        avgRating = Math.round(avgRating * 10) / 10; // Round to 1 decimal
      }
    }

    const stats = [
      {
        icon: "fa-film",
        label: "Total Movies",
        target: totalMovies,
        color: "var(--accent)",
        suffix: "+",
        decimal: false,
      },
      {
        icon: "fa-tv",
        label: "TV Series",
        target: totalTVShows,
        color: "var(--blue)",
        suffix: "+",
        decimal: false,
      },
      {
        icon: "fa-globe",
        label: "Languages",
        target: languagesCount,
        color: "var(--green)",
        suffix: "",
        decimal: false,
      },
      {
        icon: "fa-star",
        label: "Avg Rating",
        target: avgRating,
        color: "var(--gold)",
        suffix: "",
        decimal: true,
      },
    ];

    const html = `<div id="statsBar">${stats
      .map(
        (s, i) => `
      <div class="stat-card" style="--stat-color:${s.color}">
        <div class="stat-icon-wrap"><i class="fas ${s.icon}"></i></div>
        <div class="stat-info">
          <div class="stat-num" data-target="${s.target}" data-decimal="${s.decimal}" data-suffix="${s.suffix}" id="statNum${i}">0</div>
          <div class="stat-lbl">${s.label}</div>
        </div>
      </div>`,
      )
      .join("")}
    </div>`;

    const statsBar = document.getElementById("statsBar");
    if (statsBar) {
      statsBar.outerHTML = html;
    }


    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          stats.forEach((_, i) => {
            const el = document.getElementById(`statNum${i}`);
            if (!el || el.dataset.animated) return;
            el.dataset.animated = "1";
            const target = parseFloat(el.dataset.target);
            const isDecimal = el.dataset.decimal === "true";
            const suffix = el.dataset.suffix;
            const duration = 1800;
            const start = performance.now();
            const animate = (now) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              const current = target * eased;
              el.textContent =
                (isDecimal
                  ? current.toFixed(1)
                  : Math.floor(current).toLocaleString()) + suffix;
              if (progress < 1) requestAnimationFrame(animate);
            };
            requestAnimationFrame(animate);
          });
          observer.disconnect();
        });
      },
      { threshold: 0.3 },
    );

    const newStatsBar = document.getElementById("statsBar");
    if (newStatsBar) observer.observe(newStatsBar);
  } catch (error) {
    console.error("Error fetching stats:", error);
    const fallbackStats = [
      {
        icon: "fa-film",
        label: "Total Movies",
        target: 10482,
        color: "var(--accent)",
        suffix: "+",
        decimal: false,
      },
      {
        icon: "fa-tv",
        label: "TV Series",
        target: 4200,
        color: "var(--blue)",
        suffix: "+",
        decimal: false,
      },
      {
        icon: "fa-globe",
        label: "Languages",
        target: 40,
        color: "var(--green)",
        suffix: "",
        decimal: false,
      },
      {
        icon: "fa-star",
        label: "Avg Rating",
        target: 7.4,
        color: "var(--gold)",
        suffix: "",
        decimal: true,
      },
    ];

    const fallbackHtml = `<div id="statsBar">${fallbackStats
      .map(
        (s, i) => `
      <div class="stat-card" style="--stat-color:${s.color}">
        <div class="stat-icon-wrap"><i class="fas ${s.icon}"></i></div>
        <div class="stat-info">
          <div class="stat-num" data-target="${s.target}" data-decimal="${s.decimal}" data-suffix="${s.suffix}" id="statNum${i}">0</div>
          <div class="stat-lbl">${s.label}</div>
        </div>
      </div>`,
      )
      .join("")}
    </div>`;

    const statsBar = document.getElementById("statsBar");
    if (statsBar) {
      statsBar.outerHTML = fallbackHtml;
    }
  }
}

let top10MovieData = [],
  top10TVData = [],
  top10Mode = "movie";

function buildTop10Section(movies, tv) {
  top10MovieData = movies.slice(0, 10);
  top10TVData = tv.slice(0, 10);

  const main = document.querySelector("main");
  if (!main || document.getElementById("top10Section")) return;
  const statsEl = document.getElementById("statsBar");

  const html = `<div id="top10Section">
    <div class="top10-header">
      <div class="top10-title"><span>🏆</span> Top 10 This Week</div>
      <div class="top10-type-toggle">
        <button class="t10-toggle-btn active" id="t10MovieBtn" onclick="switchTop10('movie')">Movies</button>
        <button class="t10-toggle-btn" id="t10TVBtn" onclick="switchTop10('tv')">TV</button>
      </div>
    </div>
    <div class="top10-list" id="top10List"></div>
  </div>`;

  if (statsEl) statsEl.insertAdjacentHTML("afterend", html);
  else main.insertAdjacentHTML("afterbegin", html);

  renderTop10("movie");
}

function renderTop10(mode) {
  const IMG = window.IMG || "https://image.tmdb.org/t/p/w500";

  const items = mode === "movie" ? top10MovieData : top10TVData;

  const leftColumn = items.slice(0, 5);
  const rightColumn = items.slice(5, 10);

  const trendLabels = [
    { icon: "arrow-up", text: "+2" },
    { icon: "arrow-new", text: "NEW" },
    { icon: "arrow-up", text: "+1" },
    { icon: "arrow-down", text: "-1" },
    { icon: "arrow-up", text: "+3" },
    { icon: "arrow-new", text: "NEW" },
    { icon: "arrow-down", text: "-2" },
    { icon: "arrow-up", text: "+1" },
    { icon: "arrow-down", text: "-1" },
    { icon: "arrow-up", text: "+4" },
  ];

  const renderItem = (item, i) => {
    const t = item.title || item.name;
    const r = item.vote_average?.toFixed(1) || "?";
    const year = (item.release_date || item.first_air_date || "").slice(0, 4);
    const poster = item.backdrop_path
      ? IMG + item.backdrop_path
      : item.poster_path
        ? IMG + item.poster_path
        : "https://placehold.co/120x70/131110/3a302a?text=N/A";
    const numClass =
      i === 0 ? "gold" : i === 1 ? "silver" : i === 2 ? "bronze" : "rest";
    const trend = trendLabels[i] || { icon: "arrow-up", text: "+1" };
    const arrowColor =
      trend.icon === "arrow-up"
        ? "arrow-up"
        : trend.icon === "arrow-new"
          ? "arrow-new"
          : "arrow-down";
    const arrowIcon =
      trend.icon === "arrow-up"
        ? "fa-arrow-up"
        : trend.icon === "arrow-new"
          ? "fa-star"
          : "fa-arrow-down";

    return `<div class="t10-item" onclick="openContent(${item.id},'${mode}')">
      <div class="t10-num ${numClass}">${i + 1}</div>
      <img class="t10-poster" src="${poster}" alt="${t}" loading="lazy" onerror="this.src='https://placehold.co/120x70/131110/3a302a?text=?'">
      <div class="t10-info">
        <div class="t10-name">${t}</div>
        <div class="t10-meta">
          <span class="t10-rating">⭐ ${r}</span>
          ${year ? `<span>${year}</span>` : ""}
          ${i < 3 ? `<span class="t10-badge">${i === 0 ? "🔥 #1 HOT" : i === 1 ? "⚡ RISING" : "💥 TOP 3"}</span>` : ""}
        </div>
      </div>
      <div style="display:flex;align-items:center;gap:.3rem">
        <div class="t10-trending-arrow ${arrowColor}"><i class="fas ${arrowIcon}" style="font-size:.55rem"></i> ${trend.text}</div>
        <button class="t10-play-btn" onclick="event.stopPropagation();openContent(${item.id},'${mode}',true)" title="Play"><i class="fas fa-play" style="font-size:.65rem;margin-left:1px"></i></button>
      </div>
    </div>`;
  };

  const html = `
    <div class="top10-grid">
      <div class="top10-column">
        ${leftColumn.map((item, i) => renderItem(item, i)).join("")}
      </div>
      <div class="top10-column">
        ${rightColumn.map((item, i) => renderItem(item, i + 5)).join("")}
      </div>
    </div>
  `;

  document.getElementById("top10List").innerHTML = html;
}

function buildTop10Section(movies, tv) {
  top10MovieData = movies.slice(0, 10);
  top10TVData = tv.slice(0, 10);

  const main = document.querySelector("main");
  if (!main || document.getElementById("top10Section")) return;
  const statsEl = document.getElementById("statsBar");

  const html = `<div id="top10Section">
    <div class="top10-header">
      <div class="top10-title"><span>🏆</span> Top 10 This Week</div>
      <div class="top10-type-toggle">
        <button class="t10-toggle-btn active" id="t10MovieBtn" onclick="switchTop10('movie')">Movies</button>
        <button class="t10-toggle-btn" id="t10TVBtn" onclick="switchTop10('tv')">TV</button>
      </div>
    </div>
    <div id="top10List"></div>
  </div>`;

  if (statsEl) statsEl.insertAdjacentHTML("afterend", html);
  else main.insertAdjacentHTML("afterbegin", html);

  renderTop10("movie");
}
function switchTop10(mode) {
  top10Mode = mode;
  document
    .getElementById("t10MovieBtn")
    ?.classList.toggle("active", mode === "movie");
  document
    .getElementById("t10TVBtn")
    ?.classList.toggle("active", mode === "tv");
  renderTop10(mode);
}
window.switchTop10 = switchTop10;


const GENRE_SPOTLIGHT_DATA = [
  {
    id: 28,
    name: "Action",
    emoji: "💥",
    colors: ["#e8512a", "#b32e0a"],
    counts: "2,400+ Films",
  },
  {
    id: 27,
    name: "Horror",
    emoji: "👻",
    colors: ["#7e22ce", "#4c1d95"],
    counts: "1,200+ Films",
  },
  {
    id: 35,
    name: "Comedy",
    emoji: "😂",
    colors: ["#f5c842", "#b45309"],
    counts: "3,100+ Films",
  },
  {
    id: 878,
    name: "Sci-Fi",
    emoji: "🚀",
    colors: ["#60a5fa", "#1e40af"],
    counts: "900+ Films",
  },
  {
    id: 10749,
    name: "Romance",
    emoji: "❤️",
    colors: ["#f43f5e", "#9f1239"],
    counts: "1,800+ Films",
  },
  {
    id: 12,
    name: "Adventure",
    emoji: "🗺️",
    colors: ["#4ade80", "#166534"],
    counts: "1,500+ Films",
  },
  {
    id: 18,
    name: "Drama",
    emoji: "🎭",
    colors: ["#a78bfa", "#5b21b6"],
    counts: "4,200+ Films",
  },
  {
    id: 99,
    name: "Documentary",
    emoji: "🎬",
    colors: ["#fb923c", "#7c2d12"],
    counts: "800+ Films",
  },
];

function buildGenreSpotlight() {
  const main = document.querySelector("main");
  if (!main || document.getElementById("genreSpotlight")) return;

  const TMDB_KEY = "c096300da27be38fd70190283bc5f8bc";
  const IMG = "https://image.tmdb.org/t/p/w500";

  const html = `<div id="genreSpotlight">
    <div class="gs-header">
      <div class="gs-title"><span>🎨</span> Explore by Genre</div>
    </div>
    <div class="gs-grid" id="gsGrid">
      ${GENRE_SPOTLIGHT_DATA.map(
        (g) => `
        <div class="gs-card" onclick="openSeeAll('genre_${g.id}','${g.name}')" style="background:linear-gradient(135deg,${g.colors[0]}22,${g.colors[1]}44)">
          <div class="gs-card-overlay" style="background:linear-gradient(to top,${g.colors[1]}ee 0%,${g.colors[0]}44 50%,transparent 100%)"></div>
          <div class="gs-card-hover-glow" style="box-shadow:inset 0 0 30px ${g.colors[0]}55, 0 0 20px ${g.colors[0]}44"></div>
          <div class="gs-card-info">
            <span class="gs-card-emoji">${g.emoji}</span>
            <div class="gs-card-name">${g.name}</div>
            <div class="gs-card-count">${g.counts}</div>
          </div>
        </div>
      `,
      ).join("")}
    </div>
  </div>`;

  const top10 = document.getElementById("top10Section");
  const statsBar = document.getElementById("statsBar");
  const anchor = top10 || statsBar;
  if (anchor) anchor.insertAdjacentHTML("afterend", html);
  else main.insertAdjacentHTML("afterbegin", html);

  GENRE_SPOTLIGHT_DATA.forEach((g, i) => {
    fetch(
      `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=${g.id}&sort_by=popularity.desc&vote_count.gte=200`,
    )
      .then((r) => r.json())
      .then((data) => {
        const picks = (data.results || []).filter((m) => m.backdrop_path);
        if (!picks.length) return;
        const pick =
          picks[Math.floor(Math.random() * Math.min(3, picks.length))];
        const cards = document.querySelectorAll(".gs-card");
        if (!cards[i]) return;
        const img = document.createElement("img");
        img.className = "gs-card-bg";
        img.src = IMG + pick.backdrop_path;
        img.style.cssText =
          "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;transition:opacity .5s;opacity:0";
        img.onload = () => {
          img.style.opacity = "0.35";
        };
        cards[i].insertBefore(img, cards[i].firstChild);
      });
  });
}

function buildCinematicQuote() {
  const main = document.querySelector("main");
  if (!main || document.getElementById("cinematicQuote")) return;
  const genreSpot = document.getElementById("genreSpotlight");

  const html = `<div id="cinematicQuote" onclick="nextQuote()" title="Click for next quote">
    <div class="cq-bg"></div>
    <div class="cq-giant-quote">"</div>
    <div class="cq-content">
      <div class="cq-label"><i class="fas fa-quote-left" style="font-size:.5rem"></i> QUOTE OF THE MOMENT</div>
      <p class="cq-text"></p>
      <div class="cq-from"></div>
    </div>
    <div class="cq-hint"><i class="fas fa-mouse-pointer"></i> click for next</div>
  </div>`;

  if (genreSpot) genreSpot.insertAdjacentHTML("afterend", html);
  else main.insertAdjacentHTML("afterbegin", html);

  injectCinematicQuote();
  setInterval(nextQuote, 12000);
}
window.nextQuote = nextQuote;


let suggestTimer = null;
let lastQuery = "";

function initSearchSuggestions() {
  const input = document.getElementById("searchInput");
  if (!input) return;

  const searchBar = input.closest(".search-bar");
  if (!searchBar || document.getElementById("searchSuggestions")) return;
  const dropdown = document.createElement("div");
  dropdown.id = "searchSuggestions";
  searchBar.appendChild(dropdown);

  input.addEventListener("input", () => {
    const q = input.value.trim();
    if (q.length < 2) {
      closeSuggestions();
      return;
    }
    if (q === lastQuery) return;
    lastQuery = q;
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => fetchSuggestions(q), 280);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeSuggestions();
      input.blur();
    }
  });

  document.addEventListener("click", (e) => {
    if (!searchBar.contains(e.target)) closeSuggestions();
  });
}

async function fetchSuggestions(query) {
  const dropdown = document.getElementById("searchSuggestions");
  if (!dropdown) return;

  dropdown.innerHTML = `<div class="suggest-loading"><div class="spinner" style="width:18px;height:18px;border-width:2px"></div> Searching…</div>`;
  dropdown.classList.add("open");

  const TMDB_KEY = "c096300da27be38fd70190283bc5f8bc";
  const IMG = "https://image.tmdb.org/t/p/w500";
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/search/multi?api_key=${TMDB_KEY}&query=${encodeURIComponent(query)}&page=1`,
    );
    const data = await res.json();
    const results = (data.results || [])
      .filter(
        (i) =>
          (i.media_type === "movie" || i.media_type === "tv") && i.poster_path,
      )
      .slice(0, 6);

    if (!results.length) {
      dropdown.innerHTML = `<div class="suggest-loading">No results for "${query}"</div>`;
      return;
    }

    const re = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    dropdown.innerHTML = results
      .map((item) => {
        const t = item.title || item.name;
        const poster = item.poster_path
          ? IMG + item.poster_path
          : "https://placehold.co/80x110/131110/3a302a?text=?";
        const year = (item.release_date || item.first_air_date || "").slice(
          0,
          4,
        );
        const rating = item.vote_average?.toFixed(1) || "?";
        const type = item.media_type;
        const highlighted = t.replace(re, "<mark>$1</mark>");
        return `<div class="suggest-item" onclick="closeSuggestions();openContent(${item.id},'${type}')">
        <img src="${poster}" alt="${t}" onerror="this.src='https://placehold.co/80x110/131110/3a302a?text=?'">
        <div class="suggest-text">
          <div class="suggest-title">${highlighted}</div>
          <div class="suggest-meta"><span>${type === "tv" ? "TV Show" : "Movie"}</span>${year ? `<span>${year}</span>` : ""}<span style="color:var(--gold)">⭐ ${rating}</span></div>
        </div>
      </div>`;
      })
      .join("");
  } catch {
    dropdown.innerHTML = `<div class="suggest-loading">Search error</div>`;
  }
}

function closeSuggestions() {
  const el = document.getElementById("searchSuggestions");
  if (el) el.classList.remove("open");
}
window.closeSuggestions = closeSuggestions;

function createEl(tag, innerHTML) {
  const el = document.createElement(tag);
  el.innerHTML = innerHTML;
  return el.firstChild;
}


(function bootAddons() {
  let retries = 0;

  function tryInit() {
    if (typeof allContent === "undefined" || !allContent.trending?.length) {
      if (++retries > 40) return; 
      setTimeout(tryInit, 100);
      return;
    }


    const main = document.querySelector("main");
    const firstSection = main?.querySelector(".section");

    if (!main || !firstSection) return;

    buildMoodSection();

    buildStatsBar();

    const continueSection = document.getElementById("continueSection");

    if (continueSection) {
      const top10Html = `<div id="top10Section">
        <div class="top10-header">
          <div class="top10-title"><span>🏆</span> Top 10 This Week</div>
          <div class="top10-type-toggle">
            <button class="t10-toggle-btn active" id="t10MovieBtn" onclick="switchTop10('movie')">Movies</button>
            <button class="t10-toggle-btn" id="t10TVBtn" onclick="switchTop10('tv')">TV</button>
          </div>
        </div>
        <div class="top10-list" id="top10List"></div>
      </div>`;

      const top10Element = createEl("div", top10Html);
      continueSection.insertAdjacentElement("afterend", top10Element);

      top10MovieData = allContent.trending.slice(0, 10);
      top10TVData = allContent.tv.slice(0, 10);
      renderTop10("movie");
    }

    const top10Section = document.getElementById("top10Section");
    if (top10Section) {
      const quoteHtml = `<div id="cinematicQuote" onclick="nextQuote()" title="Click for next quote">
        <div class="cq-bg"></div>
        <div class="cq-giant-quote">"</div>
        <div class="cq-content">
          <div class="cq-label"><i class="fas fa-quote-left" style="font-size:.5rem"></i> QUOTE OF THE MOMENT</div>
          <p class="cq-text"></p>
          <div class="cq-from"></div>
        </div>
        <div class="cq-hint"><i class="fas fa-mouse-pointer"></i> click for next</div>
      </div>`;

      const quoteElement = createEl("div", quoteHtml);
      top10Section.insertAdjacentElement("afterend", quoteElement);

      injectCinematicQuote();
      setInterval(nextQuote, 12000);
    }

    const quoteSection = document.getElementById("cinematicQuote");
    if (quoteSection) {
      const TMDB_KEY = window.TMDB_KEY || "c096300da27be38fd70190283bc5f8bc";
      const IMG = window.IMG || "https://image.tmdb.org/t/p/w500";

      const genreHtml = `<div id="genreSpotlight">
        <div class="gs-header">
          <div class="gs-title"><span>🎨</span> Explore by Genre</div>
        </div>
        <div class="gs-grid" id="gsGrid">
          ${GENRE_SPOTLIGHT_DATA.map(
            (g) => `
            <div class="gs-card" onclick="openSeeAll('genre_${g.id}','${g.name}')" style="background:linear-gradient(135deg,${g.colors[0]}22,${g.colors[1]}44)">
              <div class="gs-card-overlay" style="background:linear-gradient(to top,${g.colors[1]}ee 0%,${g.colors[0]}44 50%,transparent 100%)"></div>
              <div class="gs-card-hover-glow" style="box-shadow:inset 0 0 30px ${g.colors[0]}55, 0 0 20px ${g.colors[0]}44"></div>
              <div class="gs-card-info">
                <span class="gs-card-emoji">${g.emoji}</span>
                <div class="gs-card-name">${g.name}</div>
                <div class="gs-card-count">${g.counts}</div>
              </div>
            </div>
          `,
          ).join("")}
        </div>
      </div>`;

      const genreElement = createEl("div", genreHtml);
      quoteSection.insertAdjacentElement("afterend", genreElement);

      GENRE_SPOTLIGHT_DATA.forEach((g, i) => {
        fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${TMDB_KEY}&with_genres=${g.id}&sort_by=popularity.desc&vote_count.gte=200`,
        )
          .then((r) => r.json())
          .then((data) => {
            const picks = (data.results || []).filter((m) => m.backdrop_path);
            if (!picks.length) return;
            const pick =
              picks[Math.floor(Math.random() * Math.min(3, picks.length))];
            const cards = document.querySelectorAll(".gs-card");
            if (!cards[i]) return;
            const img = document.createElement("img");
            img.className = "gs-card-bg";
            img.src = IMG + pick.backdrop_path;
            img.style.cssText =
              "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;transition:opacity .5s;opacity:0";
            img.onload = () => {
              img.style.opacity = "0.35";
            };
            cards[i].insertBefore(img, cards[i].firstChild);
          });
      });
    }

    initSearchSuggestions();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tryInit);
  } else {
    tryInit();
  }
})();
