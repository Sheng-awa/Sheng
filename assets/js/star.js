/* ============================================================
   星空模式（star.js · 全站统一）
   - 背景层 .sheng-star-bg：星云 + 深蓝紫渐变（z-index:-1）
   - 星星 canvas：白/淡粉/淡紫/淡金混色，sin 相位闪烁 + 极慢漂移
   - 天气小剧场（星空下上演）：按当天南昌天气 + 月相——
     月相月亮（右上角）/ 云朵 / 雾纱 / 闪电（背景层 CSS）
     雨丝 / 雪花（前景 canvas 粒子，和星星一起动）
   - 只在 html[data-star="on"] 时生效（各页 head 内联脚本已设置 data-star）
   - 暴露 window.shengStar = { ensure, destroy }，供 main.js 切换按钮调用
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLORS = ["#ffffff", "#ffd9e8", "#c9c2f2", "#ffd76e"];
  var state = null;
  var weather = null;   /* null | 'clear' | 'cloudy' | 'overcast' | 'fog' | 'rain' | 'storm' | 'snow' */

  /* WMO 天气码 → 剧场类型 */
  function weatherKind(code) {
    if (code === 0 || code === 1) return "clear";
    if (code === 2) return "cloudy";
    if (code === 3) return "overcast";
    if (code >= 45 && code <= 48) return "fog";
    if (code >= 95) return "storm";
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
    if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) return "snow";
    return "clear";
  }

  /* ---------- 月相 ---------- */
  function moonPhase(date) {
    /* 朔望月 29.53058867 天，基准 = 2000-01-06 18:14 UTC 新月 */
    var epoch = Date.UTC(2000, 0, 6, 18, 14);
    var synodic = 29.53058867 * 86400000;
    var p = ((date.getTime() - epoch) % synodic + synodic) % synodic / synodic;
    return p;   /* 0=新月 0.5=满月 */
  }

  /* 月相月亮：亮圆 + destination-out 挖阴影（盈月右亮、亏月左亮） */
  function drawMoon(canvas, phase) {
    var S = 110, r = 42, cx = S / 2, cy = S / 2;
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    var bright = phase <= 0.5 ? phase * 2 : (1 - phase) * 2;   /* 0..1 */
    if (bright < 0.06) {
      /* 新月：只有一圈淡淡的轮廓 */
      ctx.strokeStyle = "rgba(255, 236, 200, .28)";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
      return;
    }
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#ffe9b8";
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    if (bright < 0.995) {
      var off = (1 - bright) * r * 2;
      var dir = phase <= 0.5 ? -1 : 1;
      ctx.globalCompositeOperation = "destination-out";
      ctx.beginPath();
      ctx.arc(cx + dir * off, cy, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = "rgba(255, 233, 184, .35)";
    ctx.beginPath();
    ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ---------- 注入一次样式（背景层 + 天气剧场 + 星星画布） ---------- */
  function cssOnce() {
    if (document.getElementById("sheng-star-style")) return;
    var s = document.createElement("style");
    s.id = "sheng-star-style";
    s.textContent =
      ".sheng-star-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:0;overflow:hidden;" +
      "background:" +
      "radial-gradient(1200px 600px at 80% -10%, rgba(122,91,191,.5) 0%, transparent 60%)," +
      "radial-gradient(900px 500px at 10% 110%, rgba(47,80,150,.55) 0%, transparent 60%)," +
      "linear-gradient(180deg,#0d1133 0%,#141a44 55%,#1d1847 100%);" +
      "transition:opacity .6s ease;}" +
      ".sheng-star-bg.is-on{opacity:1;}" +
      /* 月相月亮 */
      ".sheng-star-moon{position:absolute;top:6vh;right:6vw;width:110px;height:110px;" +
      "filter:drop-shadow(0 0 26px rgba(255,233,184,.4));}" +
      /* 云朵：圆角拼接半透明，慢慢飘 */
      ".sheng-star-cloud{position:absolute;border-radius:999px;" +
      "background:rgba(255,255,255,.16);}" +
      ".sheng-star-cloud::before,.sheng-star-cloud::after{content:'';position:absolute;" +
      "border-radius:999px;background:inherit;}" +
      ".sheng-star-cloud::before{width:52%;height:68%;left:14%;top:-34%;}" +
      ".sheng-star-cloud::after{width:42%;height:56%;right:10%;top:-18%;}" +
      ".sheng-star-cloud.is-dark{background:rgba(40,48,90,.4);}" +
      ".sheng-star-cloud.is-drift{animation:sheng-cloud-drift linear infinite;}" +
      "@keyframes sheng-cloud-drift{from{transform:translateX(-18vw)}to{transform:translateX(112vw)}}" +
      /* 雾纱 */
      ".sheng-star-fog{position:absolute;left:-6%;right:-6%;bottom:0;height:44%;" +
      "background:linear-gradient(180deg,transparent,rgba(235,240,255,.16) 45%,rgba(235,240,255,.12));" +
      "filter:blur(16px);animation:sheng-fog-drift 24s ease-in-out infinite alternate;}" +
      "@keyframes sheng-fog-drift{from{transform:translateX(-4%)}to{transform:translateX(4%)}}" +
      /* 阴天压暗层 */
      ".sheng-star-overlay{position:absolute;inset:0;background:rgba(24,30,66,.28);}" +
      /* 闪电 */
      ".sheng-star-flash{position:absolute;inset:0;background:rgba(255,255,255,.9);opacity:0;" +
      "animation:sheng-flash 7.5s infinite;}" +
      "@keyframes sheng-flash{" +
      "0%,84%,86%,88%,96%,100%{opacity:0}" +
      "85%{opacity:.85}87%{opacity:.25}89%{opacity:.6}}" +
      ".sheng-star-canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;" +
      "z-index:180;opacity:0;transition:opacity .8s ease;}" +
      ".sheng-star-canvas.is-on{opacity:1;}" +
      "@media (prefers-reduced-motion: reduce){" +
      ".sheng-star-bg,.sheng-star-canvas{transition:none;}" +
      ".sheng-star-cloud.is-drift,.sheng-star-fog,.sheng-star-flash{animation:none;}}";
    document.head.appendChild(s);
  }

  /* ---------- 天气剧场（背景层元素） ---------- */
  function buildWeather(bg) {
    var old = bg.querySelector(".sheng-star-moon, .sheng-star-cloud, .sheng-star-fog, .sheng-star-overlay, .sheng-star-flash");
    while (old) {
      old.remove();
      old = bg.querySelector(".sheng-star-moon, .sheng-star-cloud, .sheng-star-fog, .sheng-star-overlay, .sheng-star-flash");
    }
    /* 月相月亮（永远有） */
    var moon = document.createElement("canvas");
    moon.className = "sheng-star-moon";
    moon.width = 110;
    moon.height = 110;
    bg.appendChild(moon);
    drawMoon(moon, moonPhase(new Date()));

    var kind = weather || "clear";
    var makeCloud = function (w, h, top, delay, dur, dark) {
      var c = document.createElement("div");
      c.className = "sheng-star-cloud is-drift" + (dark ? " is-dark" : "");
      c.style.width = w + "px";
      c.style.height = h + "px";
      c.style.top = top;
      c.style.animationDuration = dur + "s";
      c.style.animationDelay = "-" + delay + "s";
      bg.appendChild(c);
    };

    if (kind === "cloudy") {
      makeCloud(150, 42, "12%", 8, 58, false);
      makeCloud(110, 32, "30%", 30, 46, false);
      makeCloud(130, 38, "56%", 52, 66, false);
    } else if (kind === "overcast") {
      makeCloud(170, 46, "10%", 5, 70, true);
      makeCloud(140, 40, "26%", 26, 60, true);
      makeCloud(160, 44, "48%", 48, 74, true);
      var ov = document.createElement("div");
      ov.className = "sheng-star-overlay";
      bg.appendChild(ov);
    } else if (kind === "fog") {
      var fog = document.createElement("div");
      fog.className = "sheng-star-fog";
      bg.appendChild(fog);
    } else if (kind === "rain" || kind === "storm") {
      makeCloud(180, 50, "6%", 6, 80, true);
      makeCloud(150, 44, "24%", 34, 72, true);
      makeCloud(170, 48, "52%", 60, 84, true);
      if (kind === "storm") {
        var fl = document.createElement("div");
        fl.className = "sheng-star-flash";
        bg.appendChild(fl);
      }
    } else if (kind === "clear") {
      makeCloud(100, 30, "18%", 20, 64, false);
    }
  }

  /* ---------- 天气粒子（前景 canvas：雨丝 / 雪花） ---------- */
  var parts = [];

  function spawnParts() {
    parts = [];
    if (reduceMotion || !weather) return;
    var W = window.innerWidth, H = window.innerHeight;
    var n = weather === "snow" ? 70 : weather === "rain" || weather === "storm" ? 110 : 0;
    for (var i = 0; i < n; i++) {
      if (weather === "snow") {
        parts.push({
          t: "snow", x: Math.random() * W, y: Math.random() * H,
          r: 1.4 + Math.random() * 2.2,
          vy: 55 + Math.random() * 75,
          phase: Math.random() * Math.PI * 2,
          amp: 8 + Math.random() * 16,
          freq: 0.6 + Math.random() * 0.8,
          alpha: 0.5 + Math.random() * 0.4
        });
      } else {
        parts.push({
          t: "rain", x: Math.random() * (W + 60) - 30, y: Math.random() * H,
          len: 10 + Math.random() * 10,
          vy: 420 + Math.random() * 260,
          vx: -40 - Math.random() * 40,
          alpha: 0.3 + Math.random() * 0.35
        });
      }
    }
  }

  function drawParts(now) {
    var dt = 0.016;
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      if (p.t === "snow") {
        p.y += p.vy * dt;
        p.x += Math.sin(now / 1000 * p.freq + p.phase) * p.amp * dt;
        if (p.y > window.innerHeight + 8) { p.y = -8; p.x = Math.random() * window.innerWidth; }
        ctx2.globalAlpha = p.alpha;
        ctx2.beginPath();
        ctx2.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx2.fillStyle = "#f4f6ff";
        ctx2.fill();
      } else {
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        if (p.y > window.innerHeight + 16) {
          p.y = -12;
          p.x = Math.random() * (window.innerWidth + 60) - 30;
        }
        ctx2.globalAlpha = p.alpha;
        ctx2.strokeStyle = "#c9d6ff";
        ctx2.lineWidth = 1.3;
        ctx2.beginPath();
        ctx2.moveTo(p.x, p.y);
        ctx2.lineTo(p.x + p.vx * 0.035, p.y + p.len);
        ctx2.stroke();
      }
    }
    ctx2.globalAlpha = 1;
  }

  /* ---------- 星星引擎 ---------- */
  var ctx2 = null;
  function ensure() {
    if (state) return;
    cssOnce();

    var bg = document.createElement("div");
    bg.className = "sheng-star-bg";
    document.body.appendChild(bg);

    var canvas = document.createElement("canvas");
    canvas.className = "sheng-star-canvas";
    document.body.appendChild(canvas);
    ctx2 = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var stars = [];

    function spawn() {
      stars = [];
      var n = Math.min(130, Math.round((W * H) / 14000));
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.5 + Math.random() * 2,
          base: 0.35 + Math.random() * 0.45,
          amp: 0.15 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          freq: 0.6 + Math.random() * 1.8,
          drift: (Math.random() - 0.5) * 3,
          color: COLORS[(Math.random() * COLORS.length) | 0]
        });
      }
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx2.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
      spawnParts();
    }
    window.addEventListener("resize", resize);

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx2.clearRect(0, 0, W, H);

      if (root.getAttribute("data-star") !== "on") {
        state.raf = requestAnimationFrame(frame);
        return;
      }

      var secs = now / 1000;
      for (var i = 0; i < stars.length; i++) {
        var s = stars[i];
        s.x += s.drift * dt;
        if (s.x < -4) s.x = W + 4;
        if (s.x > W + 4) s.x = -4;
        var tw = reduceMotion ? 1
          : Math.max(0.05, Math.min(1, s.base + Math.sin(secs * s.freq + s.phase) * s.amp));
        ctx2.globalAlpha = tw * 0.32;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
        ctx2.fillStyle = s.color;
        ctx2.fill();
        ctx2.globalAlpha = tw;
        ctx2.beginPath();
        ctx2.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx2.fillStyle = s.color;
        ctx2.fill();
      }
      ctx2.globalAlpha = 1;
      drawParts(now);
      state.raf = requestAnimationFrame(frame);
    }

    /* 天气：异步拉取（失败则只有月相月亮） */
    function fetchWeather() {
      fetch("https://api.open-meteo.com/v1/forecast?latitude=28.68&longitude=115.86&current=weather_code&timezone=Asia%2FShanghai")
        .then(function (r) { return r.json(); })
        .then(function (d) {
          weather = weatherKind(d.current && d.current.weather_code);
          if (state) {
            buildWeather(bg);
            spawnParts();
          }
        })
        .catch(function () {});
    }

    buildWeather(bg);
    fetchWeather();

    resize();
    state = {
      bg: bg,
      canvas: canvas,
      raf: 0,
      stop: function () {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(state.raf);
        state = null;
        bg.classList.remove("is-on");
        canvas.classList.remove("is-on");
        setTimeout(function () { bg.remove(); canvas.remove(); }, 900);
      }
    };
    /* 先渲染一帧 opacity:0，再加 .is-on → transition 淡入 */
    void bg.offsetWidth;
    bg.classList.add("is-on");
    canvas.classList.add("is-on");
    state.raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (state) state.stop();
  }

  window.shengStar = { ensure: ensure, destroy: destroy };

  /* 加载时已开着星空（head 内联脚本设置了 data-star）→ 直接铺上 */
  if (root.getAttribute("data-star") === "on") ensure();
})();
