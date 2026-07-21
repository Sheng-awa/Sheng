/* ============================================================
   小圣的小窝 · main.js
   轻量原生 JS：主题切换 / 滚动显现 / 花瓣飘落 / 导航状态 / 天气
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- 页面过渡：盖上对应色调的纱幕再跳转 ----------
     去音乐页 = night（入夜），回首页 = day（天亮）；暴露给 pet.js 的 ▶ 按钮复用 */
  function leaveTo(url, mood) {
    var veil = document.querySelector(".page-veil");
    if (!veil || reduceMotion) { location.href = url; return; }
    veil.classList.remove("page-veil--enter", "page-veil--night", "page-veil--day");
    veil.classList.add("page-veil--" + mood);
    void veil.offsetWidth;   // 强制重排，让 transition 从 0 起步
    veil.style.opacity = "1";
    setTimeout(function () { location.href = url; }, 400);
  }
  window.shengLeave = leaveTo;

  // 导航「音乐」等指向 music.html 的链接统一走入夜过渡
  Array.prototype.forEach.call(document.querySelectorAll('a[href="music.html"]'), function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      leaveTo("music.html", "night");
    });
  });

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


/* ============================================================
   名人名言（hero 头像右侧气泡，点击随机换一句）
   ============================================================ */
(function () {
  "use strict";

  var btn = document.getElementById("quoteBtn");
  var textEl = document.getElementById("quoteText");
  var authorEl = document.getElementById("quoteAuthor");
  if (!btn || !textEl || !authorEl) return;

  var QUOTES = [
    { t: "慢慢来，谁还没有一个努力的过程。", a: "佚名" },
    { t: "苔花如米小，也学牡丹开。", a: "袁枚" },
    { t: "不乱于心，不困于情，不畏将来，不念过往。", a: "丰子恺" },
    { t: "生活在阴沟里，依然有仰望星空的权利。", a: "王尔德" },
    { t: "星星发亮，是为了让每一个人有一天都能找到属于自己的星星。", a: "圣埃克苏佩里《小王子》" },
    { t: "使沙漠美丽的，是它在某处藏着一口井。", a: "圣埃克苏佩里《小王子》" },
    { t: "且视他人之疑目如盏盏鬼火，大胆地去走你的夜路。", a: "史铁生" },
    { t: "每一个不曾起舞的日子，都是对生命的辜负。", a: "尼采" },
    { t: "世上只有一种英雄主义，就是在认清生活真相之后依然热爱生活。", a: "罗曼·罗兰" },
    { t: "总之岁月漫长，然而值得等待。", a: "村上春树" },
    { t: "如果你因失去了太阳而流泪，那么你也将失去群星了。", a: "泰戈尔" },
    { t: "黑夜无论怎样悠长，白昼总会到来。", a: "莎士比亚" },
    { t: "但愿你的道路漫长，充满奇迹，充满发现。", a: "卡瓦菲斯" },
    { t: "一个人可以被毁灭，但不能被打败。", a: "海明威" },
    { t: "心有猛虎，细嗅蔷薇。", a: "萨松" },
    { t: "人生如逆旅，我亦是行人。", a: "苏轼" },
    { t: "做你自己，因为别人都有人做了。", a: "王尔德" },
    { t: "你生而有翼，为何竟愿一生匍匐前进，形如虫蚁？", a: "鲁米" },
    { t: "路漫漫其修远兮，吾将上下而求索。", a: "屈原" },
    { t: "山重水复疑无路，柳暗花明又一村。", a: "陆游" },
    { t: "长风破浪会有时，直挂云帆济沧海。", a: "李白" },
    { t: "天生我材必有用，千金散尽还复来。", a: "李白" },
    { t: "千磨万击还坚劲，任尔东西南北风。", a: "郑燮" },
    { t: "纸上得来终觉浅，绝知此事要躬行。", a: "陆游" },
    { t: "问渠那得清如许，为有源头活水来。", a: "朱熹" },
    { t: "不畏浮云遮望眼，自缘身在最高层。", a: "王安石" },
    { t: "会当凌绝顶，一览众山小。", a: "杜甫" },
    { t: "欲穷千里目，更上一层楼。", a: "王之涣" },
    { t: "海内存知己，天涯若比邻。", a: "王勃" },
    { t: "落霞与孤鹜齐飞，秋水共长天一色。", a: "王勃" },
    { t: "及时当勉励，岁月不待人。", a: "陶渊明" },
    { t: "盛年不重来，一日难再晨。", a: "陶渊明" },
    { t: "生活总是让我们遍体鳞伤，但到后来，那些受伤的地方一定会变成我们最强壮的地方。", a: "海明威" },
    { t: "优于别人，并不高贵，真正的高贵应该是优于过去的自己。", a: "海明威" },
    { t: "我走得很慢，但我从不后退。", a: "林肯" },
    { t: "凡不能杀死我的，使我更强大。", a: "尼采" },
    { t: "对待生命不妨大胆一点，因为终要失去它。", a: "尼采" },
    { t: "万物皆有裂痕，那是光照进来的地方。", a: "莱昂纳德·科恩" },
    { t: "明天又是新的一天。", a: "玛格丽特·米切尔《飘》" },
    { t: "希望是美好的，也许是人间至善，而美好的事物永不消逝。", a: "《肖申克的救赎》" },
    { t: "有些鸟是注定不会被关在笼子里的，它们的每一片羽毛都闪耀着自由的光辉。", a: "《肖申克的救赎》" },
    { t: "人生就像一盒巧克力，你永远不知道下一颗是什么味道。", a: "《阿甘正传》" },
    { t: "如果你有梦想的话，就要努力去实现它。", a: "《当幸福来敲门》" },
    { t: "保持热爱，奔赴山海。", a: "佚名" },
    { t: "愿你眼中总有光芒，活成你想要的模样。", a: "佚名" },
    { t: "知足且坚定，温柔且上进。", a: "佚名" },
    { t: "你现在的努力，藏着十年后的样子。", a: "佚名" },
    { t: "别慌，月亮也正在大海某处迷茫。", a: "佚名" },
    { t: "总有人间一两风，填我十万八千梦。", a: "佚名" },
    { t: "怕什么真理无穷，进一寸有一寸的欢喜。", a: "胡适" },
    { t: "功成不必在我，功力必不唐捐。", a: "胡适" },
    { t: "猛兽总是独行，牛羊才成群结队。", a: "鲁迅" },
    { t: "从来如此，便对么？", a: "鲁迅" },
    { t: "愿中国青年都摆脱冷气，只是向上走。", a: "鲁迅" },
    { t: "不积跬步，无以至千里；不积小流，无以成江海。", a: "荀子" },
    { t: "锲而舍之，朽木不折；锲而不舍，金石可镂。", a: "荀子" },
    { t: "天行健，君子以自强不息。", a: "《周易》" },
    { t: "世界以痛吻我，要我报之以歌。", a: "泰戈尔" },
    { t: "生如夏花之绚烂，死如秋叶之静美。", a: "泰戈尔" },
    { t: "天空没有留下翅膀的痕迹，但我已经飞过。", a: "泰戈尔" }
  ];

  var current = -1;

  function pickLocal() {
    if (QUOTES.length === 1) return QUOTES[0];
    var i;
    do { i = Math.floor(Math.random() * QUOTES.length); } while (i === current);
    current = i;
    return QUOTES[i];
  }

  /* 气泡固定尺寸：长句自动缩字号（0.98rem → 0.66rem 下限），保证不溢出 */
  var BASE_SIZE = 0.98;
  var MIN_SIZE = 0.66;

  function fitQuote() {
    var size = BASE_SIZE;
    textEl.style.fontSize = "";
    while (textEl.scrollHeight > textEl.clientHeight && size > MIN_SIZE) {
      size -= 0.04;
      textEl.style.fontSize = size.toFixed(2) + "rem";
    }
  }

  function showText(t, a) {
    textEl.textContent = t;
    authorEl.textContent = "—— " + a;
    fitQuote();
  }

  /* 一言 API（hitokoto.cn，免费免 key）：文学 / 诗词 / 哲学分类，限长 45 字 */
  var HITOKOTO = "https://v1.hitokoto.cn/?c=d&c=i&c=k&max_length=45";

  function fetchQuote() {
    return fetch(HITOKOTO, { cache: "no-store" })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d && d.hitokoto) return { t: d.hitokoto, a: d.from_who || d.from || "佚名" };
        throw new Error("bad response");
      });
  }

  /* 优先在线拉一言；失败 / 超时（4s）回退本地语录 */
  var fetching = false;

  function refresh(animate) {
    if (fetching) return;
    fetching = true;
    if (animate) btn.classList.add("is-switching");
    var done = false;
    var finish = function (q) {
      if (done) return;
      done = true;
      fetching = false;
      showText(q.t, q.a);
      if (animate) btn.classList.remove("is-switching");
    };
    /* 一言对同 IP 高频请求会返回缓存的同一句——与当前相同就回退本地，保证点击必换 */
    fetchQuote().then(function (q) {
      if (q.t === textEl.textContent) { finish(pickLocal()); } else { finish(q); }
    }, function () { finish(pickLocal()); });
    setTimeout(function () { finish(pickLocal()); }, 4000);
  }

  /* 进页先上一条本地的（秒开），再异步换成一言 */
  showText(pickLocal().t, QUOTES[current].a);
  refresh(false);

  btn.addEventListener("click", function () { refresh(true); });
})();
