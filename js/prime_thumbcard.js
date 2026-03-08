
(function () {
  "use strict";

  // ── Inject CSS ─────────────────────────────────────────────────────────────
  const STYLE = document.createElement("style");
  STYLE.textContent = `
    .foudri-dl-card-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      background: linear-gradient(135deg,#1a1410,#2a1f17);
      border: 1px solid rgba(232,81,42,0.55);
      color: #f5f0eb;
      padding: 0.5rem 1.1rem;
      border-radius: 9px;
      font-family: 'Syne', sans-serif;
      font-weight: 700;
      font-size: 0.78rem;
      cursor: pointer;
      transition: all .22s ease;
      position: relative;
      overflow: hidden;
      white-space: nowrap;
    }
    .foudri-dl-card-btn .shimmer {
      position: absolute;
      top: 0; left: -70%;
      width: 40%; height: 100%;
      background: linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);
      transform: skewX(-18deg);
      animation: fcShimmer 3s ease-in-out infinite;
    }
    @keyframes fcShimmer { 0%,100%{left:-70%} 50%{left:130%} }
    .foudri-dl-card-btn i { color:#e8512a; font-size:.82rem; }
    .foudri-dl-card-btn:hover {
      border-color:#e8512a;
      transform:translateY(-2px);
      box-shadow:0 8px 22px -8px rgba(232,81,42,.55);
      color:#fff;
    }
    .foudri-dl-card-btn:active { transform:scale(.97); }

    #fcOverlay {
      position:fixed; inset:0; z-index:9999;
      background:rgba(5,4,4,.93);
      backdrop-filter:blur(18px);
      display:flex; align-items:center; justify-content:center;
      padding:1.2rem;
      animation:fcOvIn .22s ease;
    }
    @keyframes fcOvIn { from{opacity:0} to{opacity:1} }

    #fcBox {
      position:relative;
      background:#131110;
      border:1px solid rgba(232,81,42,.35);
      border-radius:20px;
      padding:1.6rem;
      max-width:540px; width:100%;
      animation:fcBoxIn .27s cubic-bezier(.175,.885,.32,1.275);
      overflow:hidden;
    }
    @keyframes fcBoxIn {
      from{opacity:0;transform:scale(.91) translateY(18px)}
      to{opacity:1;transform:none}
    }
    #fcBox::before {
      content:'';
      position:absolute; top:0; left:0; right:0; height:2px;
      background:linear-gradient(90deg,transparent,#e8512a,#ff9966,#e8512a,transparent);
      animation:fcTopGlow 3s ease-in-out infinite;
    }
    @keyframes fcTopGlow { 0%,100%{opacity:.6} 50%{opacity:1;filter:blur(1px)} }

    .fc-head {
      display:flex; align-items:center; justify-content:space-between;
      margin-bottom:1rem;
    }
    .fc-head-title {
      font-family:'Syne',sans-serif; font-weight:800; font-size:.98rem;
      color:#f5f0eb; display:flex; align-items:center; gap:.45rem;
    }
    .fc-head-title em { color:#e8512a; font-style:normal; }
    .fc-x {
      width:30px; height:30px; border-radius:50%;
      background:#1c1917; border:1px solid #3a302a;
      color:#a09890; cursor:pointer;
      display:flex; align-items:center; justify-content:center;
      font-size:.82rem; transition:all .15s;
    }
    .fc-x:hover { background:#e8512a; color:#fff; border-color:#e8512a; }

    .fc-pills {
      display:flex; gap:.45rem; margin-bottom:.9rem; flex-wrap:wrap;
    }
    .fc-pill {
      background:#1c1917; border:1px solid #3a302a;
      color:#a09890; padding:.25rem .85rem; border-radius:30px;
      font-family:'Syne',sans-serif; font-weight:600; font-size:.7rem;
      cursor:pointer; transition:all .18s;
    }
    .fc-pill:hover { border-color:#e8512a; color:#f5f0eb; }
    .fc-pill.active { background:#e8512a; border-color:#e8512a; color:#fff; }

    .fc-canvas-wrap {
      border-radius:12px; overflow:hidden;
      border:1px solid #2a2420; background:#0a0908;
      margin-bottom:.9rem; position:relative;
      min-height:120px;
    }
    #fcCanvas { display:block; width:100%; height:auto; border-radius:11px; }
    .fc-loading {
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      flex-direction:column; gap:.55rem;
      background:rgba(10,9,8,.88); border-radius:11px;
      color:#6a5e58; font-size:.78rem; font-family:'DM Sans',sans-serif;
    }
    .fc-spin {
      width:28px; height:28px;
      border:2px solid #2a2420; border-top-color:#e8512a;
      border-radius:50%; animation:fcSpin .65s linear infinite;
    }
    @keyframes fcSpin { to{transform:rotate(360deg)} }

    .fc-actions { display:flex; gap:.55rem; }
    .fc-btn-dl {
      flex:1; display:flex; align-items:center; justify-content:center;
      gap:.5rem;
      background:linear-gradient(135deg,#e8512a,#ff9966);
      border:none; color:#fff; padding:.7rem;
      border-radius:11px;
      font-family:'Syne',sans-serif; font-weight:700; font-size:.83rem;
      cursor:pointer; transition:all .2s;
    }
    .fc-btn-dl:hover { transform:translateY(-2px); box-shadow:0 10px 24px -8px rgba(232,81,42,.6); }
    .fc-btn-copy {
      display:flex; align-items:center; justify-content:center;
      gap:.4rem;
      background:#1c1917; border:1px solid #3a302a;
      color:#a09890; padding:.7rem 1.1rem; border-radius:11px;
      font-family:'Syne',sans-serif; font-weight:600; font-size:.78rem;
      cursor:pointer; transition:all .2s;
    }
    .fc-btn-copy:hover { border-color:#e8512a; color:#f5f0eb; }
    .fc-btn-copy.ok { border-color:#4ade80; color:#4ade80; background:rgba(74,222,128,.1); }

    @media(max-width:600px){
      #fcBox { padding:1rem; border-radius:14px; }
      .fc-btn-dl,.fc-btn-copy { font-size:.72rem; padding:.6rem; }
    }
  `;
  document.head.appendChild(STYLE);

  // ── Card style presets ─────────────────────────────────────────────────────
  const STYLES = [
    {
      id: "cinematic",
      label: "🎬 Cinematic",
      bg0: "#0a0908",
      bg1: "#1c1410",
      acc: "#e8512a",
      acc2: "#ff9966",
      txt: "#f5f0eb",
      sub: "#a09890",
      ov: 0.82,
      badgeBg: "rgba(232,81,42,.9)",
      badgeFg: "#fff",
      pat: "film",
    },
    {
      id: "noir",
      label: "🖤 Noir",
      bg0: "#080808",
      bg1: "#141414",
      acc: "#c8b888",
      acc2: "#e8d9b0",
      txt: "#efe8d8",
      sub: "#706050",
      ov: 0.88,
      badgeBg: "rgba(200,180,140,.9)",
      badgeFg: "#080808",
      pat: "grain",
    },
    {
      id: "neon",
      label: "⚡ Neon",
      bg0: "#050915",
      bg1: "#0d1a2e",
      acc: "#00d4ff",
      acc2: "#8b5cf6",
      txt: "#e0f0ff",
      sub: "#6090b0",
      ov: 0.78,
      badgeBg: "rgba(0,212,255,.9)",
      badgeFg: "#050915",
      pat: "grid",
    },
    {
      id: "prestige",
      label: "✨ Prestige",
      bg0: "#0d0a04",
      bg1: "#1a1508",
      acc: "#f5c842",
      acc2: "#ffb347",
      txt: "#fdf5e0",
      sub: "#9a8060",
      ov: 0.85,
      badgeBg: "rgba(245,200,66,.9)",
      badgeFg: "#0d0a04",
      pat: "diamond",
    },
  ];

  let styleIdx = 0;
  let cardData = null;
  let canvas = null;

  // ── Helpers ────────────────────────────────────────────────────────────────
  function loadImg(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.crossOrigin = "anonymous";
      i.onload = () => res(i);
      i.onerror = () => rej();
      i.src = src;
    });
  }

  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function wrapText(ctx, text, x, y, maxW, lh, maxLines) {
    maxLines = maxLines || 2;
    const words = text.split(" ");
    let line = "",
      lines = [];
    for (let n = 0; n < words.length; n++) {
      const test = line + words[n] + " ";
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line.trim());
        line = words[n] + " ";
        if (lines.length >= maxLines) break;
      } else {
        line = test;
      }
    }
    if (lines.length < maxLines) lines.push(line.trim());
    lines.forEach(function (l) {
      ctx.fillText(l, x, y);
      y += lh;
    });
    return y;
  }

  function drawPattern(ctx, W, H, pat) {
    ctx.save();
    if (pat === "film") {
      ctx.fillStyle = "rgba(255,255,255,.04)";
      for (var y = 40; y < H - 30; y += 38) {
        rr(ctx, 14, y, 13, 22, 4);
        ctx.fill();
        rr(ctx, W - 27, y, 13, 22, 4);
        ctx.fill();
      }
    } else if (pat === "grain") {
      for (var i = 0; i < 900; i++) {
        ctx.fillStyle = "rgba(255,255,255," + Math.random() * 0.06 + ")";
        ctx.fillRect(
          Math.random() * W,
          Math.random() * H,
          Math.random() * 2,
          Math.random() * 2,
        );
      }
    } else if (pat === "grid") {
      ctx.strokeStyle = "rgba(0,212,255,.05)";
      ctx.lineWidth = 1;
      for (var gx = 0; gx < W; gx += 42) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx, H);
        ctx.stroke();
      }
      for (var gy = 0; gy < H; gy += 42) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(W, gy);
        ctx.stroke();
      }
    } else if (pat === "diamond") {
      ctx.strokeStyle = "rgba(245,200,66,.05)";
      ctx.lineWidth = 1;
      for (var d = -H; d < W + H; d += 32) {
        ctx.beginPath();
        ctx.moveTo(d, 0);
        ctx.lineTo(d + H, H);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ── Main render ────────────────────────────────────────────────────────────
  async function renderCard(cv, d, s) {
    var W = 900,
      H = 500;
    cv.width = W;
    cv.height = H;
    var ctx = cv.getContext("2d");

    // BG gradient
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, s.bg0);
    bg.addColorStop(1, s.bg1);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Backdrop image
    if (d.backdropPath) {
      try {
        var bi = await loadImg(
          "https://image.tmdb.org/t/p/w780" + d.backdropPath,
        );
        var ar = bi.width / bi.height,
          ca = W / H;
        var dw = W,
          dh = H;
        if (ar > ca) {
          dh = H;
          dw = H * ar;
        } else {
          dw = W;
          dh = W / ar;
        }
        ctx.globalAlpha = 1 - s.ov + 0.28;
        ctx.drawImage(bi, (W - dw) / 2, (H - dh) / 2, dw, dh);
        ctx.globalAlpha = 1;
      } catch (e) {}
    }

    // Overlay gradients
    var ov1 = ctx.createLinearGradient(0, 0, W, 0);
    ov1.addColorStop(0, "rgba(10,9,8," + s.ov + ")");
    ov1.addColorStop(0.48, "rgba(10,9,8," + s.ov * 0.7 + ")");
    ov1.addColorStop(1, "rgba(10,9,8," + s.ov * 0.35 + ")");
    ctx.fillStyle = ov1;
    ctx.fillRect(0, 0, W, H);

    var ov2 = ctx.createLinearGradient(0, H * 0.45, 0, H);
    ov2.addColorStop(0, "transparent");
    ov2.addColorStop(1, "rgba(10,9,8,.98)");
    ctx.fillStyle = ov2;
    ctx.fillRect(0, 0, W, H);

    // Pattern
    drawPattern(ctx, W, H, s.pat);

    // Poster image (right side)
    var pH = H - 60,
      pW = Math.round(pH * (2 / 3)),
      px = W - pW - 52,
      py = 30;
    if (d.posterPath) {
      try {
        var pi = await loadImg(
          "https://image.tmdb.org/t/p/w500" + d.posterPath,
        );
        // Shadow
        ctx.save();
        ctx.shadowColor = "rgba(0,0,0,.75)";
        ctx.shadowBlur = 40;
        ctx.shadowOffsetX = -8;
        ctx.shadowOffsetY = 10;
        rr(ctx, px, py, pW, pH, 10);
        ctx.fillStyle = "#111";
        ctx.fill();
        ctx.restore();
        // Image
        ctx.save();
        rr(ctx, px, py, pW, pH, 10);
        ctx.clip();
        ctx.drawImage(pi, px, py, pW, pH);
        ctx.restore();
        // Border
        ctx.save();
        rr(ctx, px, py, pW, pH, 10);
        ctx.strokeStyle = "rgba(255,255,255,.13)";
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
        // Accent glow around poster
        ctx.save();
        ctx.shadowColor = s.acc;
        ctx.shadowBlur = 25;
        rr(ctx, px, py, pW, pH, 10);
        ctx.strokeStyle = "rgba(255,255,255,0)";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      } catch (e) {}
    }

    // Left accent bar
    var lg = ctx.createLinearGradient(0, 80, 0, H - 80);
    lg.addColorStop(0, "transparent");
    lg.addColorStop(0.3, s.acc);
    lg.addColorStop(0.7, s.acc2);
    lg.addColorStop(1, "transparent");
    ctx.fillStyle = lg;
    ctx.fillRect(38, 80, 3, H - 160);

    // FOUDRI badge top-left
    ctx.save();
    rr(ctx, 46, 28, 108, 28, 6);
    ctx.fillStyle = s.badgeBg;
    ctx.fill();
    ctx.font = "800 15px 'Syne',sans-serif";
    ctx.fillStyle = s.badgeFg;
    ctx.fillText("FOUDRI.", 54, 47);
    ctx.restore();

    // Type chip
    var typeLabel = d.type === "tv" ? "TV SERIES" : "MOVIE";
    ctx.save();
    ctx.font = "700 9px 'Syne',sans-serif";
    var tw2 = ctx.measureText(typeLabel).width;
    rr(ctx, 48, 62, tw2 + 22, 18, 4);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fill();
    ctx.fillStyle = s.acc;
    ctx.fillText(typeLabel, 59, 75);
    ctx.restore();

    // Title
    var textX = 52;
    var titleSize = d.title.length > 22 ? 36 : d.title.length > 15 ? 43 : 50;
    var titleY = H * 0.36;
    ctx.save();
    ctx.font = "800 " + titleSize + "px 'Syne',sans-serif";
    ctx.fillStyle = s.txt;
    ctx.shadowColor = "rgba(0,0,0,.85)";
    ctx.shadowBlur = 14;
    wrapText(ctx, d.title, textX, titleY, px - textX - 24, titleSize * 1.15, 2);
    ctx.restore();

    // Tagline / overview snippet
    var snip = d.tagline || (d.overview ? d.overview.slice(0, 72) + "…" : "");
    if (snip) {
      ctx.save();
      ctx.font = "300 12.5px 'DM Sans',sans-serif";
      ctx.fillStyle = s.sub;
      ctx.shadowColor = "rgba(0,0,0,.6)";
      ctx.shadowBlur = 8;
      var short = snip.slice(0, 68) + (snip.length > 68 ? "…" : "");
      ctx.fillText(short, textX, titleY + titleSize * 1.42);
      ctx.restore();
    }

    // Meta pills
    var pillY = H - 82;
    var pills = [];
    if (d.year) pills.push(d.year);
    if (d.runtime) pills.push("⏱ " + d.runtime);
    if (d.rating) pills.push("★ " + d.rating);
    if (d.language) pills.push(d.language.toUpperCase());
    if (d.genre) pills.push(d.genre);

    // Divider line
    var divGrad = ctx.createLinearGradient(textX, 0, textX + 300, 0);
    divGrad.addColorStop(0, s.acc);
    divGrad.addColorStop(1, "transparent");
    ctx.fillStyle = divGrad;
    ctx.fillRect(textX, pillY - 28, 300, 1.5);

    var px2 = textX;
    ctx.save();
    ctx.font = "600 11.5px 'Syne',sans-serif";
    pills.forEach(function (p) {
      var m = ctx.measureText(p).width;
      var bw = m + 20,
        bh = 24,
        br = 5;
      rr(ctx, px2, pillY - bh + 6, bw, bh, br);
      ctx.fillStyle = "rgba(255,255,255,.09)";
      ctx.fill();
      ctx.strokeStyle = "rgba(255,255,255,.1)";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = s.txt;
      ctx.fillText(p, px2 + 10, pillY + 2);
      px2 += bw + 7;
    });
    ctx.restore();

    // Bottom watermark bar
    ctx.save();
    var bBar = ctx.createLinearGradient(0, H - 40, 0, H);
    bBar.addColorStop(0, "transparent");
    bBar.addColorStop(1, "rgba(0,0,0,.88)");
    ctx.fillStyle = bBar;
    ctx.fillRect(0, H - 40, W, 40);

    // "Watch on FOUDRI." centred
    ctx.font = "600 11px 'DM Sans',sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.38)";
    var watchW = ctx.measureText("Watch on ").width;
    var startX = W / 2 - (watchW + ctx.measureText("FOUDRI.").width) / 2;
    ctx.fillText("Watch on ", startX, H - 9);
    ctx.font = "800 11px 'Syne',sans-serif";
    ctx.fillStyle = s.acc;
    ctx.fillText("FOUDRI.", startX + watchW, H - 9);

    ctx.font = "600 10px 'DM Sans',sans-serif";
    ctx.fillStyle = "rgba(255,255,255,.18)";
    ctx.fillText("foudri.vercel.app", W - 108, H - 9);
    ctx.restore();

    // Scanlines
    for (var sy = 0; sy < H; sy += 4) {
      ctx.fillStyle = "rgba(0,0,0,.03)";
      ctx.fillRect(0, sy, W, 2);
    }

    // Vignette
    var vig = ctx.createRadialGradient(
      W / 2,
      H / 2,
      H * 0.28,
      W / 2,
      H / 2,
      H * 0.72,
    );
    vig.addColorStop(0, "transparent");
    vig.addColorStop(1, "rgba(0,0,0,.42)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, W, H);
  }

  // ── Show preview overlay ───────────────────────────────────────────────────
  async function showPreview(data) {
    cardData = data;
    var old = document.getElementById("fcOverlay");
    if (old) old.remove();

    var ov = document.createElement("div");
    ov.id = "fcOverlay";
    ov.innerHTML = [
      '<div id="fcBox">',
      '<div class="fc-head">',
      '<div class="fc-head-title">',
      '<i class="fas fa-image" style="color:#e8512a"></i>',
      "FOUDRI<em>.</em> Card Generator",
      "</div>",
      '<button class="fc-x" id="fcX"><i class="fas fa-times"></i></button>',
      "</div>",
      '<div class="fc-pills" id="fcPills">',
      STYLES.map(function (s, i) {
        return (
          '<button class="fc-pill' +
          (i === styleIdx ? " active" : "") +
          '" data-i="' +
          i +
          '">' +
          s.label +
          "</button>"
        );
      }).join(""),
      "</div>",
      '<div class="fc-canvas-wrap">',
      '<canvas id="fcCanvas"></canvas>',
      '<div class="fc-loading" id="fcLoad">',
      '<div class="fc-spin"></div>',
      "<span>Rendering card…</span>",
      "</div>",
      "</div>",
      '<div class="fc-actions">',
      '<button class="fc-btn-dl" id="fcDl"><i class="fas fa-download"></i> Download PNG</button>',
      '<button class="fc-btn-copy" id="fcCopy"><i class="fas fa-copy"></i> Copy</button>',
      "</div>",
      "</div>",
    ].join("");
    document.body.appendChild(ov);
    canvas = document.getElementById("fcCanvas");

    // Close handlers
    document.getElementById("fcX").onclick = function () {
      ov.remove();
    };
    ov.onclick = function (e) {
      if (e.target === ov) ov.remove();
    };

    // Style switcher
    document.getElementById("fcPills").onclick = async function (e) {
      var pill = e.target.closest(".fc-pill");
      if (!pill) return;
      styleIdx = parseInt(pill.dataset.i);
      document.querySelectorAll(".fc-pill").forEach(function (p, i) {
        p.classList.toggle("active", i === styleIdx);
      });
      await gen();
    };

    // Download
    document.getElementById("fcDl").onclick = function () {
      if (!canvas) return;
      var a = document.createElement("a");
      var slug = (cardData.title || "foudri")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .slice(0, 32);
      a.download = "foudri-" + slug + ".png";
      a.href = canvas.toDataURL("image/png", 1.0);
      a.click();
    };

    // Copy to clipboard
    document.getElementById("fcCopy").onclick = function () {
      if (!canvas) return;
      canvas.toBlob(async function (blob) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ "image/png": blob }),
          ]);
          var btn = document.getElementById("fcCopy");
          if (btn) {
            btn.classList.add("ok");
            btn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            setTimeout(function () {
              btn.classList.remove("ok");
              btn.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2200);
          }
        } catch (err) {
          var btn2 = document.getElementById("fcCopy");
          if (btn2)
            btn2.innerHTML = '<i class="fas fa-times"></i> Not supported';
        }
      }, "image/png");
    };

    await gen();
  }

  async function gen() {
    var ld = document.getElementById("fcLoad");
    if (ld) ld.style.display = "flex";
    try {
      await renderCard(canvas, cardData, STYLES[styleIdx]);
    } catch (e) {
      console.error("FOUDRI card render error:", e);
    }
    if (ld) ld.style.display = "none";
  }

  // ── Patch renderInfoTab ────────────────────────────────────────────────────
  function buildAndInjectBtn(details, type) {
    // Called right after the original renderInfoTab has written the DOM
    setTimeout(function () {
      var actions = document.querySelector("#tab-info .modal-actions");
      if (!actions) return;
      if (actions.querySelector(".foudri-dl-card-btn")) return; // already injected

      var btn = document.createElement("button");
      btn.className = "foudri-dl-card-btn";
      btn.title = "Generate a shareable FOUDRI poster card";
      btn.innerHTML =
        '<div class="shimmer"></div><i class="fas fa-image"></i> Save Card';

      btn.addEventListener("click", function () {
        var d = details;
        var runtime = "";
        if (type === "movie" && d.runtime) {
          var h = Math.floor(d.runtime / 60),
            m = d.runtime % 60;
          runtime = h ? h + "h " + m + "m" : m + "m";
        } else if (type === "tv" && d.number_of_seasons) {
          runtime =
            d.number_of_seasons +
            " Season" +
            (d.number_of_seasons > 1 ? "s" : "");
        }
        var genre = "";
        if (d.genres && d.genres.length) {
          genre = d.genres
            .slice(0, 2)
            .map(function (g) {
              return g.name;
            })
            .join(" · ");
        }
        showPreview({
          title: d.title || d.name || "Untitled",
          tagline: d.tagline || "",
          overview: d.overview || "",
          posterPath: d.poster_path || "",
          backdropPath: d.backdrop_path || "",
          year: (d.release_date || d.first_air_date || "").slice(0, 4),
          runtime: runtime,
          rating: d.vote_average ? d.vote_average.toFixed(1) : "",
          language: d.original_language || "",
          genre: genre,
          type: type,
        });
      });

      actions.appendChild(btn);
    }, 0);
  }

  function patchRenderInfoTab() {
    if (typeof window.renderInfoTab !== "function") return false;
    if (window.__fcPatched) return true;
    window.__fcPatched = true;

    var _orig = window.renderInfoTab;
    window.renderInfoTab = function (details, credits, type) {
      _orig(details, credits, type);
      buildAndInjectBtn(details, type);
    };
    return true;
  }

  if (!patchRenderInfoTab()) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        if (!patchRenderInfoTab()) setTimeout(patchRenderInfoTab, 800);
      });
    } else {
      setTimeout(patchRenderInfoTab, 200);
    }
  }
})();
