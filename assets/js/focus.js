/* ============================================================
   听歌 + 专注页：动态壁纸舞台 / 番茄钟 / TODO 计划
   - 舞台 3840×2160 按 cover 缩放铺满视口（Lo-Fi 咖啡店底图）
   - 鼠标视差平移各层 wrapper（CSS 动画在内部 img 上，互不冲突）
   - 暖色萤火 + Canvas 雨丝；番茄钟：开始自动进入全屏，结束提示音
   - TODO 存 localStorage，刷新不丢
   ============================================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 舞台缩放（cover） ---------- */
  var stage = document.getElementById('sceneStage');
  if (stage) {
    var fitStage = function () {
      var s = Math.max(window.innerWidth / 3840, window.innerHeight / 2160);
      stage.style.transform = 'translate(-50%, -50%) scale(' + s + ')';
    };
    fitStage();
    window.addEventListener('resize', fitStage);

    /* ---------- 鼠标视差（仅精确指针 + 非减少动态） ---------- */
    if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
      var layers = Array.prototype.slice.call(stage.querySelectorAll('.scene__layer[data-depth]'));
      var tx = 0, ty = 0, cx = 0, cy = 0;
      window.addEventListener('mousemove', function (e) {
        tx = e.clientX / window.innerWidth - 0.5;
        ty = e.clientY / window.innerHeight - 0.5;
      });
      (function parallaxLoop() {
        cx += (tx - cx) * 0.06;
        cy += (ty - cy) * 0.06;
        for (var i = 0; i < layers.length; i++) {
          var d = parseFloat(layers[i].getAttribute('data-depth')) || 0;
          layers[i].style.transform = 'translate3d(' + (-cx * d).toFixed(2) + 'px,' + (-cy * d).toFixed(2) + 'px,0)';
        }
        requestAnimationFrame(parallaxLoop);
      })();
    }
  }

  /* ---------- 暖色萤火 / 尘光（全高度漂浮闪烁） ---------- */
  var starsBox = document.getElementById('sceneStars');
  if (starsBox && !reduceMotion) {
    for (var i = 0; i < 20; i++) {
      var star = document.createElement('i');
      var size = 1.5 + Math.random() * 2.5;
      star.style.width = star.style.height = size.toFixed(1) + 'px';
      star.style.left = (Math.random() * 100).toFixed(2) + '%';
      star.style.top = (Math.random() * 100).toFixed(2) + '%';
      star.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
      star.style.animationDuration = (2.5 + Math.random() * 2.5).toFixed(2) + 's';
      starsBox.appendChild(star);
    }
  }

  /* ---------- 雨丝（Canvas：斜向细雨，近深远淡） ---------- */
  var rainCanvas = document.getElementById('sceneRain');
  if (rainCanvas && !reduceMotion) {
    var rctx = rainCanvas.getContext('2d');
    var rW = 0, rH = 0;
    var drops = [];
    var RAIN_COUNT = 130;

    var fitRain = function () {
      rW = rainCanvas.width = window.innerWidth;
      rH = rainCanvas.height = window.innerHeight;
    };
    fitRain();
    window.addEventListener('resize', fitRain);

    var spawn = function (d, anywhere) {
      d.depth = 0.35 + Math.random() * 0.65;            // 景深：近处更长更快更亮
      d.x = Math.random() * (rW + 200) - 100;
      d.y = anywhere ? Math.random() * rH : -30 - Math.random() * 80;
      d.len = 10 + d.depth * 16;
      d.speed = 9 + d.depth * 9;
      d.wind = 1.6 + d.depth * 1.2;                     // 固定斜向，像有微风
      d.alpha = 0.08 + d.depth * 0.16;
    };
    for (var ri = 0; ri < RAIN_COUNT; ri++) {
      var d0 = {};
      spawn(d0, true);
      drops.push(d0);
    }

    (function rainLoop() {
      rctx.clearRect(0, 0, rW, rH);
      rctx.lineWidth = 1;
      rctx.lineCap = 'round';
      for (var i = 0; i < drops.length; i++) {
        var d = drops[i];
        d.y += d.speed;
        d.x += d.wind;
        if (d.y - d.len > rH) spawn(d, false);
        rctx.strokeStyle = 'rgba(190, 212, 238,' + d.alpha.toFixed(3) + ')';
        rctx.beginPath();
        rctx.moveTo(d.x, d.y);
        rctx.lineTo(d.x - d.wind * (d.len / d.speed), d.y - d.len);
        rctx.stroke();
      }
      requestAnimationFrame(rainLoop);
    })();
  }

  /* ---------- 番茄钟 ---------- */
  var clockEl = document.getElementById('focusClock');
  var statusEl = document.getElementById('focusStatus');
  var startBtn = document.getElementById('focusStart');
  var resetBtn = document.getElementById('focusReset');
  var presetsBox = document.getElementById('focusPresets');
  var bigClock = document.getElementById('focusBigClock');
  var bigTime = document.getElementById('bigClockTime');
  var bigStatus = document.getElementById('bigClockStatus');

  if (clockEl && startBtn && resetBtn && presetsBox) {
    var totalSec = 25 * 60;
    try {
      var savedMin = parseInt(localStorage.getItem('sheng-focus-min'), 10);
      if ([15, 25, 45, 60].indexOf(savedMin) !== -1) totalSec = savedMin * 60;
    } catch (e) {}
    var leftSec = totalSec;
    var endAt = 0;
    var timer = null;

    var fmt = function (s) {
      var m = Math.floor(s / 60);
      var ss = s % 60;
      return m + ':' + (ss < 10 ? '0' : '') + ss;
    };

    /* 大时钟：计时进行中或暂停中显示在顶部 1/3 处，重置/完成后收起 */
    var syncBigClock = function () {
      if (!bigClock) return;
      var active = !!timer || leftSec < totalSec;
      bigClock.classList.toggle('is-on', active);
      if (active) {
        if (bigTime) bigTime.textContent = fmt(leftSec);
        if (bigStatus) bigStatus.textContent = timer ? '专 注 中' : '已 暂 停';
      }
    };

    var render = function () {
      clockEl.textContent = fmt(leftSec);
      syncBigClock();
      document.title = (timer ? fmt(leftSec) + ' · ' : '') + '听歌 · 专注 ♪ 小圣的小窝';
    };

    var setStatus = function (t) { if (statusEl) statusEl.textContent = t; };

    var syncPresets = function () {
      var btns = presetsBox.querySelectorAll('button');
      Array.prototype.forEach.call(btns, function (b) {
        b.classList.toggle('is-on', parseInt(b.getAttribute('data-min'), 10) * 60 === totalSec);
      });
    };

    var stopTimer = function () {
      if (timer) { clearInterval(timer); timer = null; }
      startBtn.textContent = '开始专注';
      render();
    };

    var chime = function () {
      try {
        var AC = window.AudioContext || window.webkitAudioContext;
        var ac = new AC();
        [523.25, 659.25, 783.99].forEach(function (f, idx) {
          var o = ac.createOscillator();
          var g = ac.createGain();
          o.type = 'sine';
          o.frequency.value = f;
          var t = ac.currentTime + idx * 0.18;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.15, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
          o.connect(g);
          g.connect(ac.destination);
          o.start(t);
          o.stop(t + 1);
        });
      } catch (e) {}
    };

    var tick = function () {
      leftSec = Math.max(0, Math.round((endAt - Date.now()) / 1000));
      render();
      if (leftSec <= 0) {
        stopTimer();
        leftSec = totalSec;
        render();
        setStatus('完成啦，休息一下 ✿');
        clockEl.classList.add('is-done');
        setTimeout(function () { clockEl.classList.remove('is-done'); }, 2600);
        chime();
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(function () {});
        }
      }
    };

    startBtn.addEventListener('click', function () {
      if (timer) { /* 暂停 */
        leftSec = Math.max(0, Math.round((endAt - Date.now()) / 1000));
        stopTimer();
        setStatus('已暂停');
        return;
      }
      if (leftSec <= 0) leftSec = totalSec;
      endAt = Date.now() + leftSec * 1000;
      timer = setInterval(tick, 500);
      startBtn.textContent = '暂停';
      setStatus('专注中…');
      render();
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(function () {});
      }
    });

    resetBtn.addEventListener('click', function () {
      stopTimer();
      leftSec = totalSec;
      setStatus('');
      render();
    });

    presetsBox.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-min]');
      if (!btn) return;
      stopTimer();
      totalSec = parseInt(btn.getAttribute('data-min'), 10) * 60;
      leftSec = totalSec;
      setStatus('');
      syncPresets();
      render();
      try { localStorage.setItem('sheng-focus-min', String(totalSec / 60)); } catch (err) {}
    });

    syncPresets();
    render();
  }

  /* ---------- TODO 计划 ---------- */
  var todoList = document.getElementById('todoList');
  var todoForm = document.getElementById('todoForm');
  var todoInput = document.getElementById('todoInput');

  if (todoList && todoForm && todoInput) {
    var KEY = 'sheng-focus-todo';
    var todos = [];
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(raw)) {
        todos = raw.filter(function (t) { return t && typeof t.text === 'string'; });
      }
    } catch (e) {}

    var save = function () {
      try { localStorage.setItem(KEY, JSON.stringify(todos)); } catch (e) {}
    };

    var renderTodos = function () {
      todoList.innerHTML = '';
      if (!todos.length) {
        var empty = document.createElement('li');
        empty.className = 'todo-empty';
        empty.textContent = '还没有计划，加一个吧～';
        todoList.appendChild(empty);
        return;
      }
      todos.forEach(function (t, idx) {
        var li = document.createElement('li');
        if (t.done) li.className = 'is-done';

        var text = document.createElement('span');
        text.className = 'todo-text';
        text.textContent = t.text;

        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'todo-del';
        del.setAttribute('aria-label', '删除这条计划');
        del.textContent = '×';
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          todos.splice(idx, 1);
          save();
          renderTodos();
        });

        li.appendChild(text);
        li.appendChild(del);
        li.addEventListener('click', function () {
          t.done = !t.done;
          save();
          renderTodos();
        });
        todoList.appendChild(li);
      });
    };

    todoForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var text = todoInput.value.trim();
      if (!text) return;
      todos.push({ text: text, done: false });
      todoInput.value = '';
      save();
      renderTodos();
    });

    renderTodos();
  }

  /* ---------- 歌单 details 展开/收起过渡（量高度做动画，不生硬） ---------- */
  var moreEl = document.querySelector('.player__more');
  if (moreEl) {
    var moreBody = moreEl.querySelector('.player__more-body');
    var moreSummary = moreEl.querySelector('summary');
    moreSummary.addEventListener('click', function (e) {
      e.preventDefault();
      if (reduceMotion) { moreEl.open = !moreEl.open; return; }
      if (!moreEl.open) {
        moreEl.open = true;
        var h = moreBody.scrollHeight;
        moreBody.style.height = '0px';
        void moreBody.offsetHeight;
        moreBody.style.height = h + 'px';
        moreBody.addEventListener('transitionend', function te() {
          moreBody.removeEventListener('transitionend', te);
          if (moreEl.open) moreBody.style.height = 'auto';
        });
      } else {
        moreBody.style.height = moreBody.scrollHeight + 'px';
        void moreBody.offsetHeight;
        moreBody.style.height = '0px';
        moreBody.addEventListener('transitionend', function te() {
          moreBody.removeEventListener('transitionend', te);
          if (moreBody.style.height === '0px') moreEl.open = false;
        });
      }
    });
  }

  /* ---------- 底部 Dock：面板互斥开关 + macOS 风 hover 放大 ---------- */
  var dock = document.getElementById('dock');
  if (dock) {
    var dockItems = Array.prototype.slice.call(dock.querySelectorAll('.dock__item'));
    var dockPanels = {};
    dockItems.forEach(function (item) {
      var p = document.getElementById(item.getAttribute('data-panel'));
      if (p) dockPanels[item.getAttribute('data-panel')] = p;
    });

    var closeAllPanels = function () {
      for (var k in dockPanels) dockPanels[k].classList.remove('is-open');
      dockItems.forEach(function (it) {
        it.classList.remove('is-active');
        it.setAttribute('aria-pressed', 'false');
      });
    };

    dockItems.forEach(function (item) {
      item.addEventListener('click', function (e) {
        e.stopPropagation();
        var panel = dockPanels[item.getAttribute('data-panel')];
        if (!panel) return;
        var wasOpen = panel.classList.contains('is-open');
        closeAllPanels();
        if (!wasOpen) {
          panel.classList.add('is-open');
          item.classList.add('is-active');
          item.setAttribute('aria-pressed', 'true');
        }
      });
    });
    /* 面板内部点击不冒泡（避免被外部点击关闭）；点面板外 / Esc 全关 */
    for (var pk in dockPanels) {
      dockPanels[pk].addEventListener('click', function (e) { e.stopPropagation(); });
    }
    document.addEventListener('click', closeAllPanels);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeAllPanels(); });

    /* macOS 风 magnification：按鼠标到图标的距离平滑放大 */
    if (!reduceMotion && window.matchMedia('(pointer: fine)').matches) {
      dock.addEventListener('mousemove', function (e) {
        dockItems.forEach(function (it) {
          var r = it.getBoundingClientRect();
          var d = Math.abs(e.clientX - (r.left + r.width / 2));
          var s = Math.max(0, 1 - d / 130);
          it.style.transform = 'translateY(' + (-9 * s).toFixed(1) + 'px) scale(' + (1 + 0.32 * s).toFixed(3) + ')';
        });
      });
      dock.addEventListener('mouseleave', function () {
        dockItems.forEach(function (it) { it.style.transform = ''; });
      });
    }
  }

  /* ---------- 更换壁纸（预设列表，当前界面切换，记忆选择） ----------
     以后加壁纸：图丢进 assets/img/scene/，下面数组加一项即可。
     glow = 两处霓虹光晕（按咖啡店底图调的位置，新图一般关掉）；
     rain = Canvas 雨丝；fan = Bunk 的台扇（位置按 Bunk 图调的）。 */
  var WALLPAPERS = [
    { id: 'cafe', name: 'Lo-Fi 咖啡店', src: 'assets/img/scene/cafe.jpg', glow: true, rain: true, fan: false },
    { id: 'bunk-night', name: '日式房间 · 夜', src: 'assets/img/scene/bunk-night.jpg', glow: false, rain: false, fan: 'assets/img/scene/bunk-fan-night.png' },
    { id: 'bunk-day', name: '日式房间 · 昼', src: 'assets/img/scene/bunk-day.jpg', glow: false, rain: false, fan: 'assets/img/scene/bunk-fan.png' },
    { id: 'aqua', name: '水族馆画室', src: 'assets/img/scene/aqua.jpg', glow: false, rain: true, fan: false }
  ];
  var wpPanel = document.getElementById('wpPanel');
  var wpGrid = document.getElementById('wpGrid');
  var sceneImg = document.querySelector('.scene__layer--cafe img');
  if (wpPanel && wpGrid && sceneImg) {
    var applyWp = function (wp, animate) {
      try { localStorage.setItem('sheng-wallpaper', wp.id); } catch (e) {}
      Array.prototype.forEach.call(wpGrid.children, function (item) {
        item.classList.toggle('is-active', item.getAttribute('data-wp') === wp.id);
      });
      /* 场景配件随壁纸切换：光晕 / 雨丝 / 风扇 */
      var glows = document.querySelectorAll('.scene__glow');
      for (var g = 0; g < glows.length; g++) glows[g].style.display = wp.glow ? '' : 'none';
      var fanEl = document.getElementById('sceneFan');
      if (fanEl) {
        /* 不能用 hidden 属性：全局 reset 的 img{display:block} 会盖掉 UA 的 [hidden] 样式 */
        fanEl.style.display = wp.fan ? '' : 'none';
        if (wp.fan && fanEl.getAttribute('src') !== wp.fan) fanEl.src = wp.fan;
      }
      var rainC = document.getElementById('sceneRain');
      if (rainC) rainC.style.display = (wp.rain === false) ? 'none' : '';
      if (sceneImg.getAttribute('src') === wp.src) return;
      var swap = function () {
        sceneImg.src = wp.src;
        if (animate) sceneImg.style.opacity = '1';
      };
      if (animate) {
        sceneImg.style.transition = 'opacity 0.4s ease';
        sceneImg.style.opacity = '0';
        setTimeout(swap, 400);
      } else {
        swap();
      }
    };

    WALLPAPERS.forEach(function (wp) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'wp-item';
      item.setAttribute('data-wp', wp.id);
      var img = document.createElement('img');
      img.src = wp.src;
      img.alt = wp.name;
      var label = document.createElement('span');
      label.textContent = wp.name;
      item.appendChild(img);
      item.appendChild(label);
      item.addEventListener('click', function () { applyWp(wp, true); });
      wpGrid.appendChild(item);
    });

    /* 弹层开关由底部 Dock 统一管理（互斥、点外关闭、Esc 关闭） */

    // 恢复上次选择（没找到对应项就用列表第一张），并高亮当前壁纸
    var savedWp = null;
    try { savedWp = localStorage.getItem('sheng-wallpaper'); } catch (e) {}
    var startWp = WALLPAPERS[0];
    for (var wi = 0; wi < WALLPAPERS.length; wi++) {
      if (WALLPAPERS[wi].id === savedWp) startWp = WALLPAPERS[wi];
    }
    if (startWp) applyWp(startWp, false);
  }

  /* ---------- 页面过渡：回首页盖粉白纱幕（与首页的入夜过渡呼应） ---------- */
  var homeLink = document.querySelector('a.focus-avatar[href="index.html"]');
  var veil = document.querySelector('.page-veil');
  if (homeLink && veil) {
    homeLink.addEventListener('click', function (e) {
      e.preventDefault();
      if (reduceMotion) { location.href = 'index.html'; return; }
      veil.classList.remove('page-veil--enter', 'page-veil--night', 'page-veil--day');
      veil.classList.add('page-veil--day');
      void veil.offsetWidth;
      veil.style.opacity = '1';
      setTimeout(function () { location.href = 'index.html'; }, 400);
    });
  }
})();
