/* ============================================================
   小圣的小窝 · main.js
   轻量原生 JS：主题切换 / 滚动显现 / 花瓣飘落 / 导航状态 / 天气
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 主题切换（记忆偏好） ---------- */
  var root = document.documentElement;
  var toggle = document.getElementById("themeToggle");
  var icon = toggle ? toggle.querySelector(".theme-toggle__icon") : null;

  function applyTheme(theme) {
    root.setAttribute("data-theme", theme);
    if (icon) icon.textContent = theme === "dark" ? "☀" : "☾";
    try { localStorage.setItem("sheng-theme", theme); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem("sheng-theme"); } catch (e) {}
  var initial = saved ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initial);

  if (toggle) {
    toggle.addEventListener("click", function () {
      applyTheme(root.getAttribute("data-theme") === "dark" ? "light" : "dark");
    });
  }

  /* ---------- 滚动显现动画 ---------- */
  var revealEls = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach(function (el) { el.classList.add("reveal--in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal--in");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    revealEls.forEach(function (el) { io.observe(el); });

    // Hero 区域入场：页面加载后立即触发（避免等待 IntersectionObserver 首帧）
    requestAnimationFrame(function () {
      document.querySelectorAll(".hero .reveal").forEach(function (el) {
        el.classList.add("reveal--in");
      });
    });
  }

  /* ---------- 侧边栏：当前区块高亮（GitHub 风格） ---------- */
  var navLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav__links a[href^="#"]')
  );
  var linkMap = {};
  navLinks.forEach(function (a) {
    linkMap[a.getAttribute("href").slice(1)] = a;
  });

  if ("IntersectionObserver" in window) {
    var sectionIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) { a.classList.remove("nav__link--active"); });
        var link = linkMap[entry.target.id];
        if (link) link.classList.add("nav__link--active");
      });
    }, { rootMargin: "-40% 0px -55% 0px" });

    ["likes", "corner", "contact"].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) sectionIO.observe(el);
    });
  }

  /* ---------- 花瓣飘落（右 → 左，慢而多，舒适优先） ---------- */
  if (!reduceMotion) {
    var layer = document.getElementById("petalLayer");
    var PETAL_COUNT = 24;

    for (var i = 0; i < PETAL_COUNT; i++) {
      var petal = document.createElement("span");
      petal.className = "petal";

      var size = 8 + Math.random() * 12;               // 8–20px
      var duration = 13 + Math.random() * 13;          // 13–26s，很慢
      var delay = -Math.random() * duration;           // 负延迟：开局就分布在半空
      var sway = -(18 + Math.random() * 26).toFixed(2) + "vw"; // 从右往左飘
      var opacity = 0.35 + Math.random() * 0.3;

      petal.style.width = size + "px";
      petal.style.height = size * 0.8 + "px";
      // 起始横坐标：20vw ~ 120vw，部分从屏幕外右侧入场
      petal.style.left = 20 + Math.random() * 100 + "vw";
      petal.style.animationDuration = duration + "s";
      petal.style.animationDelay = delay + "s";
      petal.style.setProperty("--sway", sway);
      petal.style.setProperty("--petal-opacity", opacity.toFixed(2));

      layer.appendChild(petal);
    }
  }

  /* ---------- 页脚年份 ---------- */
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

/* ============================================================
   特效引擎（Canvas）：粉色鼠标轨迹 + 拟真飘雪 + 头像点击
   - 飘雪带景深：近处雪花大、快、亮；远处小、慢、淡
   - 每片雪花有独立的摇摆相位/频率，叠加全局缓变风向
   - 落地前逐渐"融化"淡出
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canvas = document.getElementById("fxCanvas");
  if (reduceMotion || !canvas) return;

  var ctx = canvas.getContext("2d");
  var dpr = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);
  resize();

  var TRAIL_COLORS = ["#f2a7c3", "#e484ac", "#f7b8d0", "#fbd0e0"];
  var trail = [];
  var snow = [];
  var snowUntil = 0;   // 雪花生成的截止时间戳
  var windTime = 0;

  /* ---------- 粉色鼠标轨迹 ---------- */
  var lastX = -1, lastY = -1;
  window.addEventListener("pointermove", function (e) {
    var x = e.clientX, y = e.clientY;
    if (lastX < 0) { lastX = x; lastY = y; }
    var dx = x - lastX, dy = y - lastY;
    var dist = Math.sqrt(dx * dx + dy * dy);
    // 按移动距离在轨迹上补点，保证快慢都均匀
    var steps = Math.min(5, Math.max(1, Math.floor(dist / 10)));
    for (var i = 0; i < steps; i++) {
      var t = steps === 1 ? 0 : i / (steps - 1);
      trail.push({
        x: lastX + dx * t + (Math.random() - 0.5) * 3,
        y: lastY + dy * t + (Math.random() - 0.5) * 3,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5 - 0.15,
        life: 1,
        decay: 0.018 + Math.random() * 0.02,
        r: 1.8 + Math.random() * 3.2,
        color: TRAIL_COLORS[(Math.random() * TRAIL_COLORS.length) | 0]
      });
    }
    lastX = x; lastY = y;
    if (trail.length > 220) trail.splice(0, trail.length - 220);
  }, { passive: true });

  /* ---------- 飘雪 ---------- */
  function startSnow(seconds) {
    snowUntil = Math.max(snowUntil, performance.now() + seconds * 1000);
  }

  function spawnFlake() {
    var depth = 0.35 + Math.random() * 0.65; // 景深 0.35（远）~ 1（近）
    snow.push({
      x: Math.random() * (W + 80) - 40,
      y: -10,
      depth: depth,
      r: 1.2 + depth * 2.8,
      vy: 24 + depth * 48 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
      freq: 0.6 + Math.random() * 1.1,
      amp: 12 + Math.random() * 24,
      alpha: 0.3 + depth * 0.55,
      melt: 1
    });
  }

  /* ---------- 主循环 ---------- */
  var lastFrame = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - lastFrame) / 1000);
    lastFrame = now;
    windTime += dt;
    ctx.clearRect(0, 0, W, H);

    // 触发期内持续从顶部生成雪花
    if (now < snowUntil && snow.length < 240) {
      var n = 2 + ((Math.random() * 3) | 0);
      for (var i = 0; i < n; i++) spawnFlake();
    }

    // 全局风：两个慢速正弦叠加，方向和强度都会缓变
    var wind = Math.sin(windTime * 0.3) * 12 + Math.sin(windTime * 0.13 + 1.7) * 8;

    // 画雪花（先远后近，近的雪片盖在上面）
    snow.sort(function (a, b) { return a.depth - b.depth; });
    for (var i = snow.length - 1; i >= 0; i--) {
      var f = snow[i];
      f.phase += f.freq * dt;
      f.x += (Math.sin(f.phase) * f.amp + wind) * f.depth * dt;
      f.y += f.vy * dt;
      if (f.y > H - 70) f.melt -= dt * 1.8; // 接近底部开始融化
      if (f.melt <= 0 || f.y > H + 12 || f.x < -60 || f.x > W + 60) {
        snow.splice(i, 1);
        continue;
      }
      var a = f.alpha * Math.max(0, f.melt);
      // 光晕层
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r * 2, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(242, 167, 195, " + (a * 0.18).toFixed(3) + ")";
      ctx.fill();
      // 雪片本体
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 252, 254, " + a.toFixed(3) + ")";
      ctx.fill();
    }

    // 画鼠标轨迹粒子
    for (var j = trail.length - 1; j >= 0; j--) {
      var p = trail[j];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= p.decay;
      if (p.life <= 0) { trail.splice(j, 1); continue; }
      ctx.globalAlpha = p.life * 0.85;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- 头像点击：均匀放大 + 从顶部飘雪 ---------- */
  var avatar = document.getElementById("avatar");
  if (avatar) {
    avatar.addEventListener("click", function () {
      avatar.classList.remove("hero__avatar--pop");
      void avatar.offsetWidth; // 强制回流，让连续点击也能重新播放
      avatar.classList.add("hero__avatar--pop");
      setTimeout(function () {
        avatar.classList.remove("hero__avatar--pop");
      }, 650);
      startSnow(7);
    });
  }
})();

/* ============================================================
   侧边栏伸缩（记忆偏好）
   ============================================================ */
(function () {
  "use strict";

  var btn = document.getElementById("navCollapse");
  if (!btn) return;

  function setCollapsed(collapsed) {
    document.body.classList.toggle("nav-collapsed", collapsed);
    try { localStorage.setItem("sheng-nav-collapsed", collapsed ? "1" : "0"); } catch (e) {}
  }

  var saved = null;
  try { saved = localStorage.getItem("sheng-nav-collapsed"); } catch (e) {}
  if (saved === "1") document.body.classList.add("nav-collapsed");

  btn.addEventListener("click", function () {
    setCollapsed(!document.body.classList.contains("nav-collapsed"));
  });
})();

/* ============================================================
   天气（Open-Meteo，免 key）：南昌当前天气
   ============================================================ */
(function () {
  "use strict";

  var el = document.getElementById("weatherText");
  if (!el) return;

  /* WMO 天气码 → [中文, 小图标] */
  var CODES = {
    0: ["晴", "☀️"], 1: ["大致晴", "🌤️"], 2: ["多云", "⛅"], 3: ["阴", "☁️"],
    45: ["雾", "🌫️"], 48: ["雾凇", "🌫️"],
    51: ["毛毛雨", "🌦️"], 53: ["毛毛雨", "🌦️"], 55: ["毛毛雨", "🌦️"],
    56: ["冻毛毛雨", "🌧️"], 57: ["冻毛毛雨", "🌧️"],
    61: ["小雨", "🌧️"], 63: ["中雨", "🌧️"], 65: ["大雨", "🌧️"],
    66: ["冻雨", "🌧️"], 67: ["冻雨", "🌧️"],
    71: ["小雪", "🌨️"], 73: ["中雪", "🌨️"], 75: ["大雪", "❄️"], 77: ["雪粒", "❄️"],
    80: ["阵雨", "🌦️"], 81: ["强阵雨", "🌧️"], 82: ["暴雨", "⛈️"],
    85: ["阵雪", "🌨️"], 86: ["强阵雪", "❄️"],
    95: ["雷阵雨", "⛈️"], 96: ["雷阵雨伴冰雹", "⛈️"], 99: ["雷阵雨伴冰雹", "⛈️"]
  };

  /* 南昌坐标：28.68°N, 115.86°E */
  fetch("https://api.open-meteo.com/v1/forecast?latitude=28.68&longitude=115.86&current=temperature_2m,weather_code&timezone=Asia%2FShanghai")
    .then(function (r) { return r.json(); })
    .then(function (d) {
      var c = d.current || {};
      var w = CODES[c.weather_code] || ["天气未知", "✿"];
      el.textContent = w[1] + " " + w[0] + " " + Math.round(c.temperature_2m) + "°C";
    })
    .catch(function () {
      el.textContent = "✿ 天气暂时开小差了";
    });
})();
