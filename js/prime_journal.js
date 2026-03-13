
/**
 * prime_journal.js — FOUDRI Watch Journal
 * Features:
 *   1. Tonight's Pick — smart daily recommendation based on time & history
 *   2. Watch Journal — personal watch log with star ratings & status
 *   3. Journal Share Card — beautiful shareable image card
 *   4. Rate-After-Watch popup — prompt user to rate after opening content
 */

// ==================== STORAGE ====================
const JOURNAL_KEY = "foudri_journal"; // [{id, type, title, poster, year, rating, status, ts, genres}]
const PICK_KEY = "foudri_pick"; // {id, type, ts, skipped:[...ids]}

function getJournal() {
  try {
    return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveJournal(data) {
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(data));
}
function getPick() {
  try {
    return JSON.parse(localStorage.getItem(PICK_KEY) || "null");
  } catch {
    return null;
  }
}
function savePick(data) {
  localStorage.setItem(PICK_KEY, JSON.stringify(data));
}

// ==================== TONIGHT'S PICK ====================
const PICK_REASONS = {
  morning: [
    "Perfect morning watch — light and energising",
    "Great way to start your day",
    "Easy-going tone for early hours",
  ],
  afternoon: [
    "Ideal afternoon pick — engaging without being overwhelming",
    "A solid afternoon thriller to keep you hooked",
    "Great midday escape",
  ],
  evening: [
    "Perfect evening watch with the lights low",
    "Great tension builder for tonight",
    "Tonight's premier pick — cinematic and gripping",
  ],
  night: [
    "A haunting late-night watch for the brave",
    "Deep, atmospheric — built for 2AM viewing",
    "Late-night gold — you won't sleep anyway",
  ],
};

const TIME_GENRE_BIAS = {
  morning: [35, 16, 10751, 12], // Comedy, Animation, Family, Adventure
  afternoon: [28, 53, 878, 9648], // Action, Thriller, Sci-Fi, Mystery
  evening: [18, 80, 9648, 53], // Drama, Crime, Mystery, Thriller
  night: [27, 878, 9648, 80], // Horror, Sci-Fi, Mystery, Crime
};

function getTimeSlot() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
}

function getVibeName(slot) {
  const map = {
    morning: "Morning Vibe",
    afternoon: "Afternoon Mode",
    evening: "Evening Pick",
    night: "Late Night",
  };
  return map[slot];
}

async function loadTonightsPick(forceRefresh = false) {
  const section = document.getElementById("tonightsPick");
  if (!section) return;

  // Show loading
  section.innerHTML = `
    <div class="pick-loading">
      <div class="spinner"></div>
      <span class="pick-loading-text">Finding your perfect watch for tonight…</span>
    </div>`;

  const slot = getTimeSlot();
  const today = new Date().toDateString();
  const pickData = getPick();
  const journal = getJournal();
  const watchedIds = journal.map((j) => j.id);
  const skipped = pickData?.skipped || [];

  // Use cached pick if same day and not force refresh
  if (
    !forceRefresh &&
    pickData?.ts === today &&
    pickData?.id &&
    !skipped.includes(pickData.id)
  ) {
    renderPickFromCache(pickData, slot);
    return;
  }

  try {
    // Determine preferred genres: 1st from journal history, fallback to time-based
    let preferredGenres = TIME_GENRE_BIAS[slot];
    if (journal.length > 0) {
      const genreCounts = {};
      journal.forEach((entry) => {
        (entry.genres || []).forEach((g) => {
          genreCounts[g] = (genreCounts[g] || 0) + 1;
        });
      });
      const sorted = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([g]) => +g);
      if (sorted.length)
        preferredGenres = [...sorted, ...TIME_GENRE_BIAS[slot]].slice(0, 4);
    }

    const genreParam = preferredGenres.slice(0, 2).join(",");
    const randomPage = Math.floor(Math.random() * 5) + 1;
    const data = await tmdb(
      `/discover/movie?with_genres=${genreParam}&sort_by=vote_average.desc&vote_count.gte=500&page=${randomPage}`,
    );

    const candidates = (data.results || [])
      .filter((m) => m.backdrop_path && m.poster_path && m.overview)
      .filter((m) => !watchedIds.includes(m.id) && !skipped.includes(m.id));

    if (!candidates.length) {
      section.innerHTML = `<div class="pick-loading"><span class="pick-loading-text" style="color:var(--text3)">No picks available right now. Try again later.</span></div>`;
      return;
    }

    const pick =
      candidates[Math.floor(Math.random() * Math.min(candidates.length, 8))];

    // Fetch genres for storage
    const details = await tmdb(`/movie/${pick.id}`);
    const genreIds = (details.genres || []).map((g) => g.id);

    const newPick = {
      id: pick.id,
      type: "movie",
      ts: today,
      title: pick.title,
      poster: pick.poster_path,
      backdrop: pick.backdrop_path,
      rating: pick.vote_average?.toFixed(1),
      year: (pick.release_date || "").slice(0, 4),
      overview: pick.overview,
      genres: genreIds,
      skipped: skipped,
      runtime: details.runtime,
    };
    savePick(newPick);
    renderPick(newPick, slot);
  } catch (e) {
    console.error("Tonight pick error:", e);
    section.innerHTML = `<div class="pick-loading"><span class="pick-loading-text" style="color:var(--text3)">Could not load pick. Check your connection.</span></div>`;
  }
}

function renderPickFromCache(pickData, slot) {
  renderPick(pickData, slot);
}

function renderPick(pick, slot) {
  const section = document.getElementById("tonightsPick");
  if (!section) return;

  const GENRE_MAP = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    18: "Drama",
    14: "Fantasy",
    27: "Horror",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    53: "Thriller",
    10751: "Family",
    99: "Documentary",
  };
  const genreNames =
    (pick.genres || [])
      .slice(0, 2)
      .map((g) => GENRE_MAP[g])
      .filter(Boolean)
      .join(" · ") || "Film";

  const reasons = PICK_REASONS[slot];
  const reason = reasons[Math.floor(Math.random() * reasons.length)];
  const timeLabel = getVibeName(slot);
  const runtimeTxt = pick.runtime ? `${pick.runtime} min` : "";

  section.innerHTML = `
    <div class="pick-backdrop">
      <img src="https://image.tmdb.org/t/p/original${pick.backdrop}" alt="${pick.title}" loading="lazy">
    </div>
    <div class="pick-content">
      <div class="pick-poster-mini">
        <img src="https://image.tmdb.org/t/p/w342${pick.poster}" alt="${pick.title}" loading="lazy">
      </div>
      <div class="pick-info">
        <div class="pick-label-group">
          <div class="pick-eyebrow">
            <span class="pick-eyebrow-icon"><i class="fas fa-moon"></i></span>
            Tonight's Pick
          </div>
          <span class="pick-vibe-tag">${timeLabel}</span>
        </div>
        <h2 class="pick-title">${pick.title}</h2>
        <div class="pick-meta-row">
          <span class="pick-rating"><i class="fas fa-star"></i> ${pick.rating}</span>
          <span><i class="fas fa-calendar"></i> ${pick.year}</span>
          ${runtimeTxt ? `<span><i class="fas fa-clock"></i> ${runtimeTxt}</span>` : ""}
          <span>${genreNames}</span>
        </div>
        <div class="pick-why"><strong>${reason}.</strong> ${(pick.overview || "").slice(0, 120)}${pick.overview?.length > 120 ? "…" : ""}</div>
      </div>
      <div class="pick-actions">
        <button class="pick-play-btn" onclick="event.stopPropagation(); openContent(${pick.id},'movie',true)">
          <i class="fas fa-play"></i> Watch Now
        </button>
        <button class="pick-skip-btn" onclick="event.stopPropagation(); skipTonightsPick(${pick.id})">
          <i class="fas fa-redo"></i> Different Pick
        </button>
      </div>
    </div>`;

  // Whole card clickable
  section.onclick = (e) => {
    if (e.target.closest("button")) return;
    openContent(pick.id, "movie", false);
  };
}

window.skipTonightsPick = function (id) {
  const pickData = getPick() || {};
  pickData.skipped = [...(pickData.skipped || []), id];
  savePick(pickData);
  loadTonightsPick(true);
  showToast("Finding a new pick for you…", "fa-sync-alt");
};

// ==================== WATCH JOURNAL ====================
let journalCurrentTab = "all";

function initJournal() {
  renderJournalSection();
}

function renderJournalSection() {
  const container = document.getElementById("journalContainer");
  if (!container) return;

  const journal = getJournal();
  updateJournalStats(journal);
  renderJournalTab(journalCurrentTab);
}

function updateJournalStats(journal) {
  const watched = journal.filter((j) => j.status === "watched" || !j.status);
  const hours = watched.reduce((acc, j) => acc + (j.runtime || 100), 0);
  const rated = journal.filter((j) => j.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1)
    : "–";

  const totalEl = document.getElementById("journalStatTotal");
  const hoursEl = document.getElementById("journalStatHours");
  const ratingEl = document.getElementById("journalStatRating");
  if (totalEl) totalEl.textContent = watched.length;
  if (hoursEl) hoursEl.textContent = Math.round(hours / 60);
  if (ratingEl) ratingEl.textContent = avgRating;
}

window.switchJournalTab = function (tab, el) {
  journalCurrentTab = tab;
  document
    .querySelectorAll(".journal-tab")
    .forEach((t) => t.classList.remove("active"));
  if (el) el.classList.add("active");
  renderJournalTab(tab);
};

function renderJournalTab(tab) {
  const logEl = document.getElementById("journalLog");
  if (!logEl) return;

  const journal = getJournal();
  let items;

  if (tab === "all") items = journal;
  else if (tab === "stats") {
    renderJournalStats();
    return;
  } else
    items = journal.filter(
      (j) => j.status === tab || (!j.status && tab === "watched"),
    );

  if (!items.length) {
    logEl.innerHTML = `
      <div class="journal-empty">
        <span class="journal-empty-icon">📽️</span>
        <h4>Nothing here yet</h4>
        <p>Start watching movies and they'll appear in your journal automatically.</p>
      </div>`;
    return;
  }

  logEl.innerHTML = items
    .slice(0, 30)
    .map((entry) => buildJournalEntry(entry))
    .join("");

  // Animate bars if shown
  setTimeout(() => {
    logEl.querySelectorAll(".genre-bar-fill").forEach((el) => {
      el.style.width = el.dataset.pct + "%";
    });
  }, 100);
}

function buildJournalEntry(entry) {
  const poster = entry.poster
    ? `https://image.tmdb.org/t/p/w185${entry.poster}`
    : `https://placehold.co/185x278/131110/3a302a?text=${encodeURIComponent((entry.title || "?").slice(0, 3))}`;

  const statusMap = {
    watched: ["watched", "Watched"],
    dropped: ["dropped", "Dropped"],
    rewatching: ["rewatching", "Rewatching"],
    want: ["want", "Want to Watch"],
  };
  const [badgeClass, badgeLabel] =
    statusMap[entry.status || "watched"] || statusMap.watched;

  const rating = parseFloat(entry.rating) || 0;
  const starsHtml = [1, 2, 3, 4, 5]
    .map(
      (s) => `
    <i class="fas fa-star${s <= rating ? "" : "-o"}" 
       style="font-size:.72rem;color:${s <= rating ? "var(--gold)" : "var(--surface3)"};cursor:pointer"
       onclick="event.stopPropagation();rateJournalEntry('${entry.id}','${entry.type}',${s})"></i>
  `,
    )
    .join("");

  const when = relativeTime(entry.ts);

  return `
    <div class="journal-entry" onclick="openContent(${entry.id},'${entry.type}')">
      <div class="journal-entry-poster">
        <img src="${poster}" alt="${entry.title}" loading="lazy" onerror="this.src='https://placehold.co/185x278/131110/3a302a?text=?'">
      </div>
      <div class="journal-entry-info">
        <div class="journal-entry-title">${entry.title}</div>
        <div class="journal-entry-meta">
          <span><i class="fas fa-calendar-alt"></i> ${entry.year || "–"}</span>
          <span><i class="fas fa-${entry.type === "tv" ? "tv" : "film"}"></i> ${entry.type === "tv" ? "TV" : "Movie"}</span>
        </div>
        <div class="journal-entry-date">${when}</div>
      </div>
      <div class="journal-entry-right">
        <div class="journal-stars">${starsHtml}</div>
        <span class="journal-entry-badge badge-${badgeClass}">${badgeLabel}</span>
        <button class="journal-entry-remove" onclick="event.stopPropagation();removeJournalEntry(${entry.id})" title="Remove">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>`;
}

function renderJournalStats() {
  const logEl = document.getElementById("journalLog");
  if (!logEl) return;

  const journal = getJournal();
  if (!journal.length) {
    logEl.innerHTML = `<div class="journal-empty"><span class="journal-empty-icon">📊</span><h4>No stats yet</h4><p>Watch some movies to see your taste stats.</p></div>`;
    return;
  }

  const GENRE_MAP = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    18: "Drama",
    14: "Fantasy",
    27: "Horror",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    53: "Thriller",
    10751: "Family",
    99: "Documentary",
  };

  const genreCount = {};
  journal.forEach((entry) => {
    (entry.genres || []).forEach((g) => {
      genreCount[g] = (genreCount[g] || 0) + 1;
    });
  });

  const sorted = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);
  const max = sorted[0]?.[1] || 1;

  const monthCounts = {};
  journal.forEach((entry) => {
    const m = new Date(entry.ts).toLocaleString("en", {
      month: "short",
      year: "numeric",
    });
    monthCounts[m] = (monthCounts[m] || 0) + 1;
  });

  const ratedEntries = journal.filter((j) => j.rating > 0);
  const avgRating = ratedEntries.length
    ? (
        ratedEntries.reduce((a, j) => a + j.rating, 0) / ratedEntries.length
      ).toFixed(1)
    : "–";

  logEl.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:1.4rem">
      <div>
        <div class="section-sub" style="margin-top:0">Genre Breakdown</div>
        <div class="genre-chart-wrap">
          ${sorted
            .map(
              ([gid, count]) => `
            <div class="genre-bar-row">
              <span class="genre-bar-label">${GENRE_MAP[gid] || "Other"}</span>
              <div class="genre-bar-track">
                <div class="genre-bar-fill" data-pct="${((count / max) * 100).toFixed(0)}" style="width:0%"></div>
              </div>
              <span class="genre-bar-count">${count}</span>
            </div>`,
            )
            .join("")}
        </div>
      </div>
      <div>
        <div class="section-sub">Quick Stats</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.7rem">
          ${[
            [
              "fas fa-film",
              "Total Watched",
              journal.filter((j) => j.status !== "want").length,
            ],
            ["fas fa-star", "Avg Your Rating", avgRating],
            [
              "fas fa-heart",
              "Top Genre",
              sorted[0] ? GENRE_MAP[sorted[0][0]] || "–" : "–",
            ],
            [
              "fas fa-calendar",
              "This Month",
              Object.values(monthCounts)[0] || 0,
            ],
          ]
            .map(
              ([icon, lbl, val]) => `
            <div style="background:var(--surface);border:1px solid var(--border2);border-radius:12px;padding:.8rem">
              <div style="font-size:.65rem;color:var(--text3);display:flex;align-items:center;gap:.3rem;margin-bottom:.3rem">
                <i class="${icon}" style="color:var(--accent);font-size:.6rem"></i> ${lbl}
              </div>
              <div style="font-family:Syne,sans-serif;font-weight:800;font-size:1.4rem;color:var(--text);letter-spacing:-0.5px">${val}</div>
            </div>`,
            )
            .join("")}
        </div>
      </div>
    </div>`;

  // Animate bars
  setTimeout(() => {
    logEl.querySelectorAll(".genre-bar-fill").forEach((el) => {
      el.style.width = el.dataset.pct + "%";
    });
  }, 100);
}

// ── Journal entry management ──────────────────────────────
window.addToJournal = function (
  id,
  type,
  title,
  poster,
  year,
  genres,
  runtime,
  status = "watched",
) {
  const journal = getJournal();
  const existing = journal.find((j) => j.id === id);
  if (existing) {
    existing.ts = Date.now();
    existing.status = status;
  } else {
    journal.unshift({
      id,
      type,
      title,
      poster,
      year,
      genres: genres || [],
      runtime: runtime || 0,
      status,
      rating: 0,
      ts: Date.now(),
    });
  }
  saveJournal(journal);
  renderJournalSection();
};

window.rateJournalEntry = function (id, type, stars) {
  const journal = getJournal();
  const entry = journal.find((j) => j.id == id);
  if (entry) {
    entry.rating = stars;
    saveJournal(journal);
    renderJournalSection();
    showToast(`Rated ${stars} star${stars > 1 ? "s" : ""}`, "fa-star");
  }
};

window.removeJournalEntry = function (id) {
  const journal = getJournal().filter((j) => j.id != id);
  saveJournal(journal);
  renderJournalSection();
  showToast("Removed from journal", "fa-minus-circle");
};

// ── Relative time ──────────────────────────────────────────
function relativeTime(ts) {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(ts).toLocaleDateString("en", {
    month: "short",
    day: "numeric",
  });
}

// ==================== RATE-AFTER-WATCH POPUP ====================
let ratePopupTimer = null;
let pendingRateItem = null;

// Called when user opens content — schedule a rate prompt
window.triggerRatePopup = function (
  id,
  type,
  title,
  poster,
  year,
  genres,
  runtime,
) {
  clearTimeout(ratePopupTimer);
  pendingRateItem = { id, type, title, poster, year, genres, runtime };
  // Show rate popup after 8s (simulating user has started watching)
  ratePopupTimer = setTimeout(() => showRatePopup(pendingRateItem), 8000);
};

function showRatePopup(item) {
  // Don't show if already rated
  const journal = getJournal();
  const existing = journal.find((j) => j.id === item.id);
  if (existing && existing.rating > 0) return;

  const popup = document.getElementById("ratePopup");
  if (!popup) return;

  const poster = item.poster
    ? `https://image.tmdb.org/t/p/w185${item.poster}`
    : `https://placehold.co/185x278/131110/3a302a?text=?`;

  popup.innerHTML = `
    <div class="rate-popup-head">
      <div class="rate-popup-thumb"><img src="${poster}" alt="${item.title}" loading="lazy"></div>
      <div class="rate-popup-text">
        <strong>${item.title}</strong>
        <span>How would you rate this?</span>
      </div>
      <button class="rate-popup-close" onclick="closeRatePopup()"><i class="fas fa-times"></i></button>
    </div>
    <div class="rate-popup-stars" id="rateStars">
      ${["😴", "😐", "😊", "😍", "🔥"]
        .map(
          (emoji, i) => `
        <button onclick="selectPopupRating(${i + 1})" onmouseover="hoverPopupStars(${i + 1})" onmouseleave="unhoverPopupStars()" title="${i + 1} star">
          ${emoji}
        </button>`,
        )
        .join("")}
    </div>
    <div class="rate-popup-actions">
      <button class="rate-popup-save" onclick="savePopupRating(${item.id},'${item.type}')">Save Rating</button>
      <button class="rate-popup-skip" onclick="closeRatePopup()">Skip</button>
    </div>`;

  popup.classList.add("show");
  popup._item = item;
  popup._selectedRating = 0;
}

window.hoverPopupStars = function (n) {
  document.querySelectorAll("#rateStars button").forEach((btn, i) => {
    btn.classList.toggle("hovered", i < n);
  });
};

window.unhoverPopupStars = function () {
  const popup = document.getElementById("ratePopup");
  const sel = popup?._selectedRating || 0;
  document.querySelectorAll("#rateStars button").forEach((btn, i) => {
    btn.classList.toggle("active", i < sel);
    btn.classList.remove("hovered");
  });
};

window.selectPopupRating = function (n) {
  const popup = document.getElementById("ratePopup");
  if (!popup) return;
  popup._selectedRating = n;
  document.querySelectorAll("#rateStars button").forEach((btn, i) => {
    btn.classList.toggle("active", i < n);
  });
};

window.savePopupRating = function (id, type) {
  const popup = document.getElementById("ratePopup");
  const rating = popup?._selectedRating || 0;
  const item = popup?._item;
  if (!item) {
    closeRatePopup();
    return;
  }

  addToJournal(
    id,
    type,
    item.title,
    item.poster,
    item.year,
    item.genres,
    item.runtime,
    "watched",
  );
  if (rating > 0) rateJournalEntry(id, type, rating);

  closeRatePopup();
  showToast(
    rating > 0 ? `Saved to Journal — ${rating}★` : "Added to Journal",
    "fa-book-open",
  );
};

window.closeRatePopup = function () {
  document.getElementById("ratePopup")?.classList.remove("show");
  clearTimeout(ratePopupTimer);
};

// ==================== SHARE JOURNAL CARD ====================
window.openJournalCard = function () {
  const journal = getJournal();
  const overlay = document.getElementById("journalCardOverlay");
  if (!overlay) return;

  const watched = journal.filter((j) => j.status !== "want");
  const rated = journal.filter((j) => j.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1)
    : "–";
  const hours = Math.round(
    watched.reduce((acc, j) => acc + (j.runtime || 100), 0) / 60,
  );
  const droppedCnt = journal.filter((j) => j.status === "dropped").length;
  const rewatchCnt = journal.filter((j) => j.status === "rewatching").length;
  const wantCnt = journal.filter((j) => j.status === "want").length;

  const GENRE_MAP = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    18: "Drama",
    14: "Fantasy",
    27: "Horror",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    53: "Thriller",
    10751: "Family",
    99: "Documentary",
  };
  const genreCount = {};
  journal.forEach((e) =>
    (e.genres || []).forEach((g) => {
      genreCount[g] = (genreCount[g] || 0) + 1;
    }),
  );
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([g]) => GENRE_MAP[g])
    .filter(Boolean);
  const topGenre = topGenres[0] || "–";
  const topRated = [...rated].sort((a, b) => b.rating - a.rating)[0];
  const bannerPosters = watched.filter((j) => j.poster).slice(0, 6);
  const now = new Date().toLocaleString("en", {
    month: "long",
    year: "numeric",
  });

  const card = document.getElementById("shareableCard");
  card.innerHTML = `
    <div class="sc-banner">
      ${bannerPosters
        .map(
          (j) => `
        <div class="sc-banner-slot">
          <img src="https://image.tmdb.org/t/p/w185${j.poster}" alt="${j.title}" loading="lazy" onerror="this.closest('.sc-banner-slot').style.display='none'">
          <div class="sc-banner-vignette"></div>
        </div>`,
        )
        .join("")}
      ${bannerPosters.length === 0 ? '<div class="sc-banner-empty"><i class="fas fa-film"></i></div>' : ""}
      <div class="sc-banner-overlay"></div>
    </div>

    <div class="sc-body">
      <div class="sc-head">
        <div class="sc-brand">FOUDRI<em>.</em></div>
        <div class="sc-period-badge">${now}</div>
      </div>

      <div class="sc-hero-stats">
        <div class="sc-hero-stat sc-hero-stat--accent">
          <div class="sc-hero-num">${watched.length}</div>
          <div class="sc-hero-lbl"><i class="fas fa-film"></i> Watched</div>
        </div>
        <div class="sc-hero-stat">
          <div class="sc-hero-num">${hours}</div>
          <div class="sc-hero-lbl"><i class="fas fa-clock"></i> Hours</div>
        </div>
        <div class="sc-hero-stat">
          <div class="sc-hero-num">${avgRating}<span class="sc-hero-unit"> ★</span></div>
          <div class="sc-hero-lbl"><i class="fas fa-star"></i> Avg Rating</div>
        </div>
        <div class="sc-hero-stat">
          <div class="sc-hero-num">${journal.length}</div>
          <div class="sc-hero-lbl"><i class="fas fa-book-open"></i> Total</div>
        </div>
      </div>

      <div class="sc-divider"></div>

      <div class="sc-detail-grid">
        <div class="sc-detail-block">
          <div class="sc-detail-label">Top Genre</div>
          <div class="sc-detail-value">${topGenre}</div>
        </div>
        <div class="sc-detail-block">
          <div class="sc-detail-label">Want to Watch</div>
          <div class="sc-detail-value">${wantCnt}</div>
        </div>
        <div class="sc-detail-block">
          <div class="sc-detail-label">Dropped</div>
          <div class="sc-detail-value">${droppedCnt}</div>
        </div>
        <div class="sc-detail-block">
          <div class="sc-detail-label">Rewatching</div>
          <div class="sc-detail-value">${rewatchCnt}</div>
        </div>
      </div>

      ${
        topGenres.length
          ? `
      <div class="sc-genres">
        ${topGenres.map((g, i) => `<span class="sc-genre-chip${i === 0 ? " sc-genre-chip--top" : ""}">${g}</span>`).join("")}
      </div>`
          : ""
      }

      ${
        topRated
          ? `
      <div class="sc-top-rated">
        ${topRated.poster ? `<div class="sc-top-rated-poster"><img src="https://image.tmdb.org/t/p/w92${topRated.poster}" alt="${topRated.title}" onerror="this.closest('.sc-top-rated-poster').style.display='none'"></div>` : ""}
        <div class="sc-top-rated-info">
          <div class="sc-top-rated-label">⭐ Top Rated by You</div>
          <div class="sc-top-rated-title">${topRated.title}</div>
          <div class="sc-top-rated-stars">${"★".repeat(topRated.rating)}${"☆".repeat(5 - topRated.rating)}</div>
        </div>
      </div>`
          : ""
      }

      <div class="sc-footer">
        <span class="sc-footer-brand"><i class="fas fa-ghost"></i> foudri.app</span>
        <span class="sc-footer-date">${new Date().toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}</span>
      </div>
    </div>`;

  overlay.classList.add("open");
};

window.closeJournalCard = function () {
  document.getElementById("journalCardOverlay")?.classList.remove("open");
};
window.copyJournalStats = function () {
  const journal = getJournal();
  const watched = journal.filter((j) => j.status !== "want");
  const rated = journal.filter((j) => j.rating > 0);
  const avg = rated.length
    ? (rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1)
    : "–";
  const hours = Math.round(
    watched.reduce((a, j) => a + (j.runtime || 100), 0) / 60,
  );
  const text = `🎬 My FOUDRI Watch Journal\n📽 ${watched.length} movies watched\n⏱ ${hours}h of cinema\n⭐ Avg rating: ${avg}\n📖 ${journal.length} total in journal\nfoudri.app`;
  navigator.clipboard
    ?.writeText(text)
    .then(() => showToast("Stats copied to clipboard!", "fa-copy"))
    .catch(() => showToast("Could not copy", "fa-times"));
};

window.downloadJournalCard = async function () {
  // Animate the button
  const btn = document.querySelector(".journal-card-download-btn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<span class="sc-btn-spinner"></span> Rendering card…`;
    btn.classList.add("sc-btn-loading");
  }

  const journal = getJournal();
  const watched = journal.filter((j) => j.status !== "want");
  const rated = journal.filter((j) => j.rating > 0);
  const avgRating = rated.length
    ? (rated.reduce((a, j) => a + j.rating, 0) / rated.length).toFixed(1)
    : "–";
  const hours = Math.round(
    watched.reduce((a, j) => a + (j.runtime || 100), 0) / 60,
  );

  const GENRE_MAP = {
    28: "Action",
    12: "Adventure",
    16: "Animation",
    35: "Comedy",
    80: "Crime",
    18: "Drama",
    14: "Fantasy",
    27: "Horror",
    9648: "Mystery",
    10749: "Romance",
    878: "Sci-Fi",
    53: "Thriller",
    10751: "Family",
    99: "Documentary",
  };
  const genreCount = {};
  journal.forEach((e) =>
    (e.genres || []).forEach((g) => {
      genreCount[g] = (genreCount[g] || 0) + 1;
    }),
  );
  const topGenres = Object.entries(genreCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([g]) => GENRE_MAP[g])
    .filter(Boolean);

  const W = 840,
    H = 480;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0d0b09");
  bgGrad.addColorStop(1, "#1c1410");
  ctx.fillStyle = bgGrad;
  ctx.beginPath();
  ctx.roundRect(0, 0, W, H, 24);
  ctx.fill();

  // Top accent line
  const lineGrad = ctx.createLinearGradient(0, 0, W, 0);
  lineGrad.addColorStop(0, "transparent");
  lineGrad.addColorStop(0.3, "#e8512a");
  lineGrad.addColorStop(0.7, "#f0824a");
  lineGrad.addColorStop(1, "transparent");
  ctx.fillStyle = lineGrad;
  ctx.fillRect(0, 0, W, 3);

  // Subtle grain
  for (let i = 0; i < 500; i++) {
    ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.016})`;
    ctx.fillRect(Math.random() * W, Math.random() * H, 1, 1);
  }

  // Brand name
  ctx.font = "800 52px Syne, sans-serif";
  ctx.fillStyle = "#f5f0eb";
  ctx.fillText("FOUDRI", 48, 78);
  const brandW = ctx.measureText("FOUDRI").width;
  ctx.fillStyle = "#e8512a";
  ctx.fillText(".", 48 + brandW, 78);

  // Month label
  const now = new Date().toLocaleString("en", {
    month: "long",
    year: "numeric",
  });
  ctx.font = "500 15px DM Sans, sans-serif";
  ctx.fillStyle = "#6a5e58";
  ctx.fillText(now, 48, 104);

  // Divider
  ctx.strokeStyle = "#2a2420";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(48, 120);
  ctx.lineTo(W - 48, 120);
  ctx.stroke();

  // Stat boxes
  const stats = [
    { num: String(watched.length), lbl: "WATCHED" },
    { num: String(hours), lbl: "HOURS" },
    { num: avgRating, lbl: "AVG RATING" },
    { num: String(journal.length), lbl: "IN JOURNAL" },
  ];
  const bxW = 158,
    bxH = 88,
    bxY = 140,
    bxGap = 18;
  let bx = 48;
  stats.forEach(({ num, lbl }) => {
    ctx.fillStyle = "rgba(255,255,255,0.03)";
    ctx.strokeStyle = "rgba(255,255,255,0.07)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(bx, bxY, bxW, bxH, 12);
    ctx.fill();
    ctx.stroke();
    ctx.font = "800 36px Syne, sans-serif";
    ctx.fillStyle = "#f0824a";
    ctx.textAlign = "center";
    ctx.fillText(num, bx + bxW / 2, bxY + 50);
    ctx.font = "600 11px DM Sans, sans-serif";
    ctx.fillStyle = "#6a5e58";
    ctx.fillText(lbl, bx + bxW / 2, bxY + 70);
    ctx.textAlign = "left";
    bx += bxW + bxGap;
  });

  // Genre chips
  if (topGenres.length) {
    ctx.font = "600 12px DM Sans, sans-serif";
    let gx = 48,
      gy = 252;
    topGenres.forEach((genre) => {
      const tw = ctx.measureText(genre).width;
      const pw = tw + 24,
        ph = 26;
      ctx.fillStyle = "rgba(232,81,42,0.12)";
      ctx.strokeStyle = "rgba(232,81,42,0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(gx, gy, pw, ph, 13);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#f0824a";
      ctx.fillText(genre, gx + 12, gy + 17);
      gx += pw + 8;
    });
  }

  // ── Load posters via fetch→blob to avoid CORS canvas taint ──────────────────
  // TMDB rejects crossOrigin=anonymous on <img>, so we fetch as blob instead,
  // create an ObjectURL, and draw via createImageBitmap — fully CORS-safe.
  // ── Blazing-fast poster fetch — race all sources in parallel ─────────────
  // All fetches fire at the same time; first success wins, 4s hard timeout.
  async function fetchPosterBitmap(path) {
    const tmdbUrl = `https://image.tmdb.org/t/p/w185${path}`;
    const ac = new AbortController();
    const killTimer = setTimeout(() => ac.abort(), 4000);

    function blobToImg(blob) {
      return new Promise((res, rej) => {
        const u = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          URL.revokeObjectURL(u);
          res(img);
        };
        img.onerror = () => {
          URL.revokeObjectURL(u);
          rej();
        };
        img.src = u;
      });
    }

    const result = await Promise.any([
      // 1. wsrv.nl — fast image CDN proxy, sets CORS headers automatically
      fetch(`https://wsrv.nl/?url=${encodeURIComponent(tmdbUrl)}&w=185`, {
        signal: ac.signal,
      })
        .then((r) => {
          if (!r.ok) throw 0;
          return r.blob();
        })
        .then(blobToImg),
      // 2. corsproxy.io
      fetch(`https://corsproxy.io/?${encodeURIComponent(tmdbUrl)}`, {
        signal: ac.signal,
      })
        .then((r) => {
          if (!r.ok) throw 0;
          return r.blob();
        })
        .then(blobToImg),
      // 3. Direct crossOrigin (Firefox, cached Chrome)
      new Promise((res, rej) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => res(img);
        img.onerror = () => rej();
        img.src = tmdbUrl;
      }),
    ])
      .catch(() => null)
      .finally(() => clearTimeout(killTimer));

    return result;
  }

  const posters = watched.filter((j) => j.poster).slice(0, 5);
  const pW = 80,
    pH = 120,
    pY = 300,
    pGap = 12;
  let px = 48;
  const posterMeta = posters.map((j) => {
    const x = px;
    px += pW + pGap;
    return { j, x };
  });
  // All 5 posters fire simultaneously — no sequential waiting
  const posterJobs = posterMeta.map(({ j, x }) =>
    fetchPosterBitmap(j.poster).then((bmp) => (bmp ? { bmp, x } : null)),
  );
  const posterResults = await Promise.all(posterJobs);

  posterResults.forEach((r) => {
    if (!r) return;
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(r.x, pY, pW, pH, 8);
    ctx.clip();
    ctx.drawImage(r.bmp, r.x, pY, pW, pH);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(r.x, pY, pW, pH, 8);
    ctx.stroke();
    // Subtle gradient overlay on each poster
    const pg = ctx.createLinearGradient(r.x, pY, r.x, pY + pH);
    pg.addColorStop(0, "rgba(0,0,0,0)");
    pg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.roundRect(r.x, pY, pW, pH, 8);
    ctx.fill();
  });

  // Draw placeholder boxes for any that failed
  posterMeta.forEach(({ x }, i) => {
    if (posterResults[i]) return; // already drawn
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, pY, pW, pH, 8);
    ctx.fill();
    ctx.stroke();
    ctx.font = "600 18px DM Sans, sans-serif";
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.textAlign = "center";
    ctx.fillText("🎬", x + pW / 2, pY + pH / 2 + 6);
    ctx.textAlign = "left";
  });

  // Footer
  ctx.font = "500 13px DM Sans, sans-serif";
  ctx.fillStyle = "#3a302a";
  ctx.fillText("foudri.app  ·  crafted by GHOST", 48, H - 24);
  const stamp = new Date().toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  ctx.textAlign = "right";
  ctx.fillText(stamp, W - 48, H - 24);
  ctx.textAlign = "left";

  // Trigger download
  try {
    const link = document.createElement("a");
    link.download = `foudri-journal-${Date.now()}.png`;
    link.href = canvas.toDataURL("image/png");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast("Journal card saved! 🎉", "fa-check-circle");
    if (btn) {
      btn.innerHTML = '<i class="fas fa-check"></i> Saved!';
      btn.classList.remove("sc-btn-loading");
      btn.classList.add("sc-btn-done");
      setTimeout(() => {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-download"></i> Save as Image';
        btn.classList.remove("sc-btn-done");
      }, 2500);
    }
  } catch {
    // CORS blocked — open in new tab so user can save manually
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(
        `<body style="margin:0;background:#000"><img src="${canvas.toDataURL("image/png")}" style="max-width:100%;display:block"></body>`,
      );
      showToast(
        "Opened in new tab — right-click to save",
        "fa-external-link-alt",
      );
      if (btn) {
        btn.disabled = false;
        btn.innerHTML =
          '<i class="fas fa-external-link-alt"></i> Opened in Tab';
        btn.classList.remove("sc-btn-loading");
        setTimeout(() => {
          btn.innerHTML = '<i class="fas fa-download"></i> Save as Image';
        }, 2500);
      }
    }
  }
};

// ==================== INTERCEPT openContent ====================
// Wrap the existing openContent to auto-add to journal + trigger rate popup
const _origOpenContent = window.openContent;

window.openContent = async function (id, type, autoplay = false) {
  await _origOpenContent(id, type, autoplay);

  // After modal opens, fetch details for journal
  setTimeout(async () => {
    try {
      const data = await tmdb(`/${type}/${id}`);
      const title = data.title || data.name;
      const poster = data.poster_path;
      const year = (data.release_date || data.first_air_date || "").slice(0, 4);
      const genres = (data.genres || []).map((g) => g.id);
      const runtime = data.runtime || 0;

      // Auto-add to journal as 'watched'
      addToJournal(id, type, title, poster, year, genres, runtime, "watched");

      // Schedule rate popup
      if (autoplay) {
        triggerRatePopup(id, type, title, poster, year, genres, runtime);
      }
    } catch (e) {
      /* silent */
    }
  }, 1500);
};

// Cancel rate popup when modal closes
const _origCloseModal = window.closeModal;
window.closeModal = function () {
  clearTimeout(ratePopupTimer);
  closeRatePopup();
  _origCloseModal();
};

// ==================== INJECT HTML INTO PAGE ====================
function injectJournalHTML() {
  const main = document.querySelector("main");
  if (!main) return;

  // Tonight's Pick — inject before first section
  const firstSection = main.querySelector(".section");
  if (firstSection) {
    const pickDiv = document.createElement("div");
    pickDiv.className = "section";
    pickDiv.innerHTML = `
      <div class="section-header">
        <div class="section-title">
          <span>🌙</span>
          <span>Tonight's Pick</span>
        </div>
        <button class="see-all" onclick="loadTonightsPick(true)" title="Refresh pick">
          <i class="fas fa-sync-alt"></i> Refresh
        </button>
      </div>
      <div class="tonights-pick-section" id="tonightsPick">
        <div class="pick-loading">
          <div class="spinner"></div>
          <span class="pick-loading-text">Finding your perfect watch…</span>
        </div>
      </div>`;
    main.insertBefore(pickDiv, firstSection);
  }

  // Watch Journal — inject near end of main, before last 2 sections
  const sections = main.querySelectorAll(".section");
  const insertBefore = sections[Math.max(0, sections.length - 2)];

  const journalDiv = document.createElement("div");
  journalDiv.className = "section";
  journalDiv.innerHTML = `
    <div class="journal-section">
      <div class="journal-header">
        <div class="journal-title-group">
          <div class="journal-icon-wrap">📖</div>
          <div class="journal-title-text">
            <h3>Watch Journal</h3>
            <p>Your personal cinema archive</p>
          </div>
        </div>
        <div class="journal-stats-strip">
          <div class="journal-stat-pill">
            <i class="fas fa-film"></i>
            <strong id="journalStatTotal">0</strong> watched
          </div>
          <div class="journal-stat-pill">
            <i class="fas fa-clock"></i>
            <strong id="journalStatHours">0</strong>h
          </div>
          <div class="journal-stat-pill">
            <i class="fas fa-star"></i>
            Avg <strong id="journalStatRating">–</strong>
          </div>
        </div>
      </div>

      <div class="journal-tabs">
        <button class="journal-tab active" onclick="switchJournalTab('all', this)">
          <i class="fas fa-list"></i> All
        </button>
        <button class="journal-tab" onclick="switchJournalTab('watched', this)">
          <i class="fas fa-check"></i> Watched
        </button>
        <button class="journal-tab" onclick="switchJournalTab('want', this)">
          <i class="fas fa-bookmark"></i> Want
        </button>
        <button class="journal-tab" onclick="switchJournalTab('stats', this)">
          <i class="fas fa-chart-bar"></i> Stats
        </button>
      </div>

      <div id="journalLog">
        <div class="journal-empty">
          <span class="journal-empty-icon">📽️</span>
          <h4>Your journal is empty</h4>
          <p>Every movie you open gets tracked here automatically. Start watching!</p>
        </div>
      </div>

      <div class="journal-share-strip">
        <div class="journal-share-info">
          Share your <strong>cinematic taste</strong> with the world
        </div>
        <div class="journal-share-btns">
          <button class="journal-share-btn primary" onclick="openJournalCard()">
            <i class="fas fa-share-alt"></i> Share Card
          </button>
        </div>
      </div>
    </div>`;

  if (insertBefore) {
    main.insertBefore(journalDiv, insertBefore);
  } else {
    main.appendChild(journalDiv);
  }

  // Rate popup
  const ratePopupEl = document.createElement("div");
  ratePopupEl.id = "ratePopup";
  document.body.appendChild(ratePopupEl);

  // Journal share card overlay
  const cardOverlay = document.createElement("div");
  cardOverlay.id = "journalCardOverlay";
  cardOverlay.innerHTML = `
    <div class="journal-card-modal">
      <button class="journal-card-close" onclick="closeJournalCard()">
        <i class="fas fa-times"></i>
      </button>
      <div id="shareableCard"></div>
      <div class="sc-modal-actions">
        <button class="journal-card-download-btn" onclick="downloadJournalCard()">
          <i class="fas fa-download"></i> Save as Image
        </button>
        <button class="sc-copy-btn" onclick="copyJournalStats()" title="Copy stats text">
          <i class="fas fa-copy"></i>
        </button>
      </div>
    </div>`;
  document.body.appendChild(cardOverlay);
}

// ==================== BOOT ====================
document.addEventListener("DOMContentLoaded", () => {
  injectJournalHTML();
  // Small delay to let main scripts finish loading
  setTimeout(() => {
    loadTonightsPick();
    initJournal();
  }, 1200);
});
