/* ============================================================
   星空模式（star.js · 全站统一）
   - 背景层 .sheng-star-bg：星云 + 深蓝紫渐变（z-index:-1，盖住各页 body 背景）
   - 星星 canvas：白/淡粉/淡紫/淡金混色，sin 相位闪烁 + 极慢漂移
   - 只在 html[data-star="on"] 时生效（各页 head 内联脚本已先设置 data-star）
   - 暴露 window.shengStar = { ensure, destroy }，供 main.js 切换按钮调用
   - 首页（index.html）的星空按钮逻辑在 main.js，本文件只管画
   ============================================================ */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var COLORS = ["#ffffff", "#ffd9e8", "#c9c2f2", "#ffd76e"];
  var state = null;

  /* 注入一次样式（背景层 + 星星画布） */
  function cssOnce() {
    if (document.getElementById("sheng-star-style")) return;
    var s = document.createElement("style");
    s.id = "sheng-star-style";
    s.textContent =
      ".sheng-star-bg{position:fixed;inset:0;z-index:-1;pointer-events:none;" +
      "background:" +
      "radial-gradient(1200px 600px at 80% -10%, rgba(122,91,191,.5) 0%, transparent 60%)," +
      "radial-gradient(900px 500px at 10% 110%, rgba(47,80,150,.55) 0%, transparent 60%)," +
      "linear-gradient(180deg,#0d1133 0%,#141a44 55%,#1d1847 100%);" +
      "transition:opacity .6s ease;}" +
      ".sheng-star-canvas{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;" +
      "z-index:180;opacity:0;transition:opacity .8s ease;}" +
      "html[data-star=\"on\"] .sheng-star-canvas{opacity:1;}";
    document.head.appendChild(s);
  }

  function ensure() {
    if (state) return;
    cssOnce();

    var bg = document.createElement("div");
    bg.className = "sheng-star-bg";
    document.body.appendChild(bg);

    var canvas = document.createElement("canvas");
    canvas.className = "sheng-star-canvas";
    document.body.appendChild(canvas);
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;
    var stars = [];

    function spawn() {
      stars = [];
      var n = Math.min(130, Math.round((W * H) / 14000));  /* 按视口面积自适应密度 */
      for (var i = 0; i < n; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 0.5 + Math.random() * 2,
          base: 0.35 + Math.random() * 0.45,
          amp: 0.15 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          freq: 0.6 + Math.random() * 1.8,
          drift: (Math.random() - 0.5) * 3,      /* 极慢横向漂移 px/s */
          color: COLORS[(Math.random() * COLORS.length) | 0]
        });
      }
    }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      spawn();
    }
    window.addEventListener("resize", resize);

    var last = performance.now();
    function frame(now) {
      var dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      ctx.clearRect(0, 0, W, H);

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

        ctx.globalAlpha = tw * 0.32;             /* 柔光晕 */
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 2.2, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();

        ctx.globalAlpha = tw;                    /* 星点本体 */
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = s.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      state.raf = requestAnimationFrame(frame);
    }

    resize();
    state = {
      bg: bg,
      canvas: canvas,
      raf: 0,
      stop: function () {
        window.removeEventListener("resize", resize);
        cancelAnimationFrame(state.raf);
        bg.remove();
        canvas.remove();
        state = null;
      }
    };
    state.raf = requestAnimationFrame(frame);
  }

  function destroy() {
    if (state) state.stop();
  }

  window.shengStar = { ensure: ensure, destroy: destroy };

  /* 加载时已开着星空（head 内联脚本设置了 data-star）→ 直接铺上 */
  if (root.getAttribute("data-star") === "on") ensure();
})();
