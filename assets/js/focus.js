/* ============================================================
   听歌 + 专注页：动态壁纸舞台 / 番茄钟 / TODO 计划
   - 舞台 3840×2160 按 cover 缩放铺满视口
   - 鼠标视差平移各层 wrapper（CSS 动画在内部 img 上，互不冲突）
   - 番茄钟：开始自动进入全屏，结束提示音 + 退出全屏
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

  /* ---------- 闪烁星星 + 流星 ---------- */
  var starsBox = document.getElementById('sceneStars');
  if (starsBox && !reduceMotion) {
    for (var i = 0; i < 26; i++) {
      var star = document.createElement('i');
      var size = 1.5 + Math.random() * 2;
      star.style.width = star.style.height = size.toFixed(1) + 'px';
      star.style.left = (Math.random() * 100).toFixed(2) + '%';
      star.style.top = (Math.random() * 55).toFixed(2) + '%'; /* 星星只在夜空上半部 */
      star.style.animationDelay = (Math.random() * 3).toFixed(2) + 's';
      star.style.animationDuration = (2.5 + Math.random() * 2).toFixed(2) + 's';
      starsBox.appendChild(star);
    }
    var meteor = document.getElementById('sceneMeteor');
    if (meteor) {
      meteor.addEventListener('animationiteration', function () {
        meteor.style.top = (6 + Math.random() * 26).toFixed(1) + '%';
        meteor.style.left = (12 + Math.random() * 45).toFixed(1) + '%';
      });
    }
  }

  /* ---------- 番茄钟 ---------- */
  var clockEl = document.getElementById('focusClock');
  var statusEl = document.getElementById('focusStatus');
  var startBtn = document.getElementById('focusStart');
  var resetBtn = document.getElementById('focusReset');
  var presetsBox = document.getElementById('focusPresets');

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

    var render = function () {
      clockEl.textContent = fmt(leftSec);
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
})();
