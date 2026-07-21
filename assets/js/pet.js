/* ============================================
   桌宠：像素初音未来（shimeji 同人素材）
   - 沿底边巡逻，不会爬墙，被甩飞时翻跟头
   交互：单击冒出播放按钮（去音乐页）/ 拖拽甩飞 /
         双击躲起来 8 秒 / 45 秒不互动打瞌睡
   ============================================ */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  var root = document.getElementById('pet');
  var canvas = document.getElementById('petGL');
  var zzz = document.getElementById('petZzz');
  if (!root || !canvas || !zzz) return;

  /* ---------- 偏好（localStorage 持久化） ---------- */
  var store = {
    get: function (k, d) {
      try { var v = localStorage.getItem('sheng-pet-' + k); return v === null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    set: function (k, v) {
      try { localStorage.setItem('sheng-pet-' + k, JSON.stringify(v)); } catch (e) { /* 私密模式 */ }
    }
  };

  /* ---------- 皮肤：初音未来 ---------- */
  var SKIN = {
    src: 'assets/img/pet-miku.png',
    FW: 96, FH: 96, DW: 96, DH: 96,
    canClimb: false,     // 没有爬墙帧，纯地面活动
    parachute: false,    // 翻跟头下落，不撑伞
    ANIMS: {
      idle:    { frames: [0, 1, 2],    fps: 3 },
      crawl:   { frames: [3, 4],       fps: 6 },
      wall:    { frames: [3, 4],       fps: 5 },
      stretch: { frames: [5],          fps: 1 },  // 翻跟头：飞行
      squash:  { frames: [6],          fps: 1 },  // 趴地捂脸：落地
      sleep:   { frames: [7, 8, 9],    fps: 2 }   // 侧躺眯眯眼
    }
  };
  var FW = SKIN.FW, FH = SKIN.FH, DW = SKIN.DW, DH = SKIN.DH;

  var strip = new Image();
  var stripReady = false;
  strip.onload = function () { stripReady = true; };
  strip.onerror = function () { root.style.display = 'none'; };  // 素材缺失就安静消失
  strip.src = SKIN.src;

  var ctx2d = canvas.getContext('2d');

  /* ---------- 状态 ---------- */
  var ROT = { floor: 0, right: -90, ceiling: 180, left: 90 };
  var CORNER = 70;   // 四角禁区：进去就像被"卡住"，强制转向（仅爬墙皮肤用）

  var pet = {
    surface: 'floor',     // floor | right | ceiling | left
    dir: 1,               // 沿表面行进方向
    pos: 0.5,             // 表面位置（0~1 比例，各自表面坐标系）
    mode: 'idle',         // idle | crawl | thrown | sleep
    modeT: 2,
    animT: 0,
    frame: 0,
    vx: 0, vy: 0,         // thrown 物理（视口 px/s）
    px: 0, py: 0,
    spin: 0, spinV: 0,    // thrown 旋转
    splatT: 0,            // 摔扁剩余时间
    hideT: 0,
    sleepIn: 45           // 多久不互动就犯困（秒）
  };

  var dragging = false, dragMoved = false, dragLast = { x: 0, y: 0, t: 0 };
  var dragVel = { x: 0, y: 0 };
  var lastTs = 0;
  var reduced = reduceMotion || store.get('off', false);
  var W = 96;

  /* ---------- 工具 ---------- */
  function vw() { return window.innerWidth; }
  function vh() { return window.innerHeight; }
  function rand(a, b) { return a + Math.random() * (b - a); }

  /* ---------- 播放按钮：单击宠物冒出，点了去音乐页 ---------- */
  var playBtn = document.createElement('button');
  playBtn.className = 'pet__play';
  playBtn.type = 'button';
  playBtn.setAttribute('aria-label', '去音乐播放器');
  playBtn.title = '去音乐播放器 ♪';
  playBtn.textContent = '▶';
  root.appendChild(playBtn);

  var playTimer = 0;
  function showPlay() {
    playBtn.classList.add('is-on');
    clearTimeout(playTimer);
    playTimer = setTimeout(hidePlay, 5000);
  }
  function hidePlay() {
    playBtn.classList.remove('is-on');
    clearTimeout(playTimer);
  }
  playBtn.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
  playBtn.addEventListener('click', function (e) {
    e.stopPropagation();
    if (window.shengLeave) window.shengLeave('music.html', 'night');   // 走入夜过渡
    else location.href = 'music.html';
  });

  /* 表面位置 → 视口坐标（pet 中心） */
  function toXY(surface, pos, out) {
    var w = vw(), h = vh(), m = W / 2;
    if (surface === 'floor')   { out.x = pos * (w - W) + m; out.y = h - m; }
    else if (surface === 'ceiling') { out.x = (1 - pos) * (w - W) + m; out.y = m; }
    else if (surface === 'right')   { out.x = w - m; out.y = (1 - pos) * (h - W) + m; }
    else { out.x = m; out.y = pos * (h - W) + m; }
    return out;
  }

  /* 视口坐标 → 最近表面的位置比例 */
  function toPos(surface, x, y) {
    var w = vw(), h = vh(), m = W / 2;
    if (surface === 'floor')   return clamp((x - m) / (w - W), 0, 1);
    if (surface === 'ceiling') return clamp(1 - (x - m) / (w - W), 0, 1);
    if (surface === 'right')   return clamp(1 - (y - m) / (h - W), 0, 1);
    return clamp((y - m) / (h - W), 0, 1);
  }

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* 是否靠近当前表面两端（角落禁区） */
  function nearCorner() {
    var w = vw(), h = vh();
    var len = (pet.surface === 'floor' || pet.surface === 'ceiling') ? w : h;
    var px = pet.pos * (len - W) + W / 2;
    return px < CORNER || px > len - CORNER;
  }

  /* ---------- 渲染 ---------- */
  var tmp = { x: 0, y: 0 };
  var rotEl = root.querySelector('.pet__rot');
  var flipEl = root.querySelector('.pet__flip');

  function render() {
    if (dragging || pet.mode === 'thrown') {
      root.style.left = (pet.px - W / 2) + 'px';
      root.style.top = (pet.py - W / 2) + 'px';
    } else {
      toXY(pet.surface, pet.pos, tmp);
      root.style.left = (tmp.x - W / 2) + 'px';
      root.style.top = (tmp.y - W / 2) + 'px';
    }
    // 素材原图头朝左：dir=1（向 pos 增方向走）时需要镜像
    flipEl.style.transform = 'scaleX(' + (-pet.dir) + ')';
    if (pet.mode === 'thrown') {
      rotEl.style.transform = 'rotate(' + pet.spin + 'deg)';
    }
  }

  function draw() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== W * dpr) {
      canvas.width = W * dpr;
      canvas.height = W * dpr;
    }
    ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx2d.imageSmoothingEnabled = false;
    ctx2d.clearRect(0, 0, W, W);
    if (!stripReady) return;
    ctx2d.drawImage(strip, pet.frame * FW, 0, FW, FH, 0, W - DH, DW, DH);
  }

  /* 选动画 */
  function currentAnim() {
    if (pet.mode === 'sleep') return 'sleep';
    if (pet.splatT > 0) return 'squash';
    if (pet.mode === 'thrown') return 'stretch';
    if (pet.mode === 'crawl') return pet.surface === 'floor' ? 'crawl' : 'wall';
    return 'idle';
  }

  function tickAnim(dt) {
    var a = SKIN.ANIMS[currentAnim()];
    pet.animT += dt;
    var idx = Math.floor(pet.animT * a.fps) % a.frames.length;
    pet.frame = a.frames[idx];
  }

  /* ---------- 行为 ---------- */
  function startIdle(t) {
    pet.mode = 'idle';
    pet.modeT = t || rand(1.2, 3.5);
    pet.animT = 0;
  }

  function startCrawl(t) {
    pet.mode = 'crawl';
    pet.modeT = t || rand(2, 6);
    pet.animT = 0;
  }

  function startSleep() {
    pet.mode = 'sleep';
    zzz.hidden = false;
  }

  function wake() {
    if (pet.mode !== 'sleep') return;
    pet.mode = 'idle';
    pet.modeT = 1;
    zzz.hidden = true;
    pet.sleepIn = 45;
  }

  /* 到达当前表面尽头：会爬墙的顺角落爬上去，不会的掉头 */
  function atBoundary() {
    if (!SKIN.canClimb) {
      pet.dir *= -1;
      pet.pos = clamp(pet.pos, 0, 1);
      startCrawl(rand(2, 5));
      return;
    }
    if (nearCorner()) {
      // 卡在角落里了：掉头，退回一段
      pet.dir *= -1;
      pet.pos = clamp(pet.pos + pet.dir * 0.06, 0, 1);
      startCrawl(rand(2, 4));
      return;
    }
    var order = ['floor', 'right', 'ceiling', 'left'];
    var i = order.indexOf(pet.surface);
    var next;
    if (pet.dir > 0) next = order[(i + 1) % 4];
    else next = order[(i + 3) % 4];
    setSurface(next);
  }

  function setSurface(s) {
    pet.surface = s;
    pet.pos = clamp(pet.pos, 0.04, 0.96);
    if (pet.mode === 'thrown') {
      pet.mode = 'idle';
      pet.modeT = rand(0.8, 2);
      pet.spin = 0;
      pet.spinV = 0;
      root.classList.remove('pet--free');
    }
    rotEl.style.transform = 'rotate(' + ROT[s] + 'deg)';
    render();
  }

  /* 从墙上/天花板跳回地面（仅爬墙皮肤会用到） */
  function backToFloor() {
    toXY(pet.surface, pet.pos, tmp);
    pet.px = tmp.x;
    pet.py = tmp.y;
    pet.vx = rand(-140, 140);
    pet.vy = -rand(60, 160);
    pet.spinV = rand(-300, 300);
    pet.mode = 'thrown';
    root.classList.add('pet--free');
  }

  /* 被甩飞/跳起后的物理 */
  function tickThrown(dt) {
    pet.vy += 1500 * dt;               // 重力
    pet.px += pet.vx * dt;
    pet.py += pet.vy * dt;
    pet.spin += pet.spinV * dt;

    var w = vw(), h = vh(), m = W / 2;

    // 侧墙：会爬墙的粘住，不会的弹落
    if (pet.px <= m) {
      pet.px = m;
      if (SKIN.canClimb && Math.abs(pet.vx) > 240) { stick('left'); return; }
      pet.vx = Math.abs(pet.vx) * 0.35;
    } else if (pet.px >= w - m) {
      pet.px = w - m;
      if (SKIN.canClimb && Math.abs(pet.vx) > 240) { stick('right'); return; }
      pet.vx = -Math.abs(pet.vx) * 0.35;
    }
    // 天花板
    if (pet.py <= m) {
      pet.py = m;
      if (SKIN.canClimb && Math.abs(pet.vy) > 260) { stick('ceiling'); return; }
      pet.vy = Math.abs(pet.vy) * 0.2;
    }
    // 地面
    if (pet.py >= h - m) {
      pet.py = h - m;
      var impact = Math.abs(pet.vy);
      if (impact > 480) {
        pet.vy = -impact * 0.32;       // 弹一下
        pet.vx *= 0.6;
        pet.splatT = 0.3;              // 摔扁
      } else {
        pet.pos = toPos('floor', pet.px, pet.py);
        setSurface('floor');
        startIdle(rand(0.6, 1.6));
        return;
      }
    }
    render();
  }

  function stick(surface) {
    pet.pos = toPos(surface, pet.px, pet.py);
    setSurface(surface);
    startIdle(rand(1, 2.5));
  }

  /* 点一下：跳一下、冒爱心，并弹出播放按钮（去音乐页） */
  function hop() {
    toXY(pet.surface, pet.pos, tmp);
    pet.px = tmp.x;
    pet.py = tmp.y;
    pet.vx = rand(-40, 40);
    pet.vy = -1350;                    // 很高的跳跃
    pet.spin = 0;
    pet.spinV = 0;                     // 直直地跳，不翻跟头
    pet.mode = 'thrown';
    root.classList.add('pet--free');
    hearts();
    showPlay();
  }

  /* ---------- 主循环 ---------- */
  var SPEEDS = { floor: 0.055, right: 0.04, ceiling: 0.035, left: 0.04 }; // 比例/秒

  function tick(ts) {
    if (!lastTs) lastTs = ts;
    var dt = Math.min((ts - lastTs) / 1000, 0.05);
    lastTs = ts;

    if (!dragging) {
      pet.sleepIn -= dt;
      if (pet.sleepIn <= 0 && pet.mode !== 'sleep' && pet.mode !== 'thrown') startSleep();
    }

    if (pet.splatT > 0) pet.splatT -= dt;

    if (pet.mode === 'thrown' && !dragging) {
      tickThrown(dt);
    } else if (pet.mode === 'crawl' && !dragging) {
      pet.modeT -= dt;
      var len = (pet.surface === 'floor' || pet.surface === 'ceiling') ? vw() : vh();
      pet.pos += pet.dir * SPEEDS[pet.surface] * dt * (len / Math.max(len - W, 1));
      if (pet.pos >= 1) { pet.pos = 1; atBoundary(); }
      else if (pet.pos <= 0) { pet.pos = 0; atBoundary(); }
      else if (pet.modeT <= 0) startIdle();
    } else if (pet.mode === 'idle' && !dragging) {
      pet.modeT -= dt;
      if (pet.modeT <= 0) {
        if (SKIN.canClimb && pet.surface !== 'floor' && Math.random() < 0.2) backToFloor();
        else if (Math.random() < 0.25) pet.dir *= -1;
        startCrawl();
      }
    }

    tickAnim(dt);
    draw();
    if (!dragging && pet.mode !== 'thrown') render();
    requestAnimationFrame(tick);
  }

  /* ---------- 互动 ---------- */
  function hearts() {
    for (var i = 0; i < 3; i++) {
      var h = document.createElement('span');
      h.className = 'pet__heart';
      h.textContent = '♥';
      h.style.left = rand(18, 70) + 'px';
      h.style.animationDelay = (i * 0.12) + 's';
      root.appendChild(h);
      (function (el) { setTimeout(function () { el.remove(); }, 1100); })(h);
    }
  }

  root.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.pet__bye') || e.target.closest('.pet__play')) return;
    wake();
    hidePlay();
    dragging = true;
    dragMoved = false;
    root.classList.add('is-drag');
    dragLast = { x: e.clientX, y: e.clientY, t: performance.now() };
    dragVel = { x: 0, y: 0 };
    root.setPointerCapture(e.pointerId);
    e.preventDefault();
  });

  root.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var now = performance.now();
    var dt = Math.max((now - dragLast.t) / 1000, 0.001);
    dragVel.x = (e.clientX - dragLast.x) / dt;
    dragVel.y = (e.clientY - dragLast.y) / dt;
    dragLast = { x: e.clientX, y: e.clientY, t: now };
    if (Math.abs(e.clientX - pet.px) + Math.abs(e.clientY - pet.py) > 6) dragMoved = true;
    pet.px = e.clientX;
    pet.py = e.clientY;
    pet.mode = 'thrown';               // 被抓起来就算离手状态
    pet.spin = 0;
    pet.spinV = 0;
    root.classList.add('pet--free');
    render();
  });

  root.addEventListener('pointerup', function (e) {
    if (!dragging) return;
    dragging = false;
    root.classList.remove('is-drag');
    pet.sleepIn = 45;

    if (!dragMoved) {
      hop();                           // 单击：跳一下 + 冒播放按钮
      return;
    }
    // 甩出去
    pet.vx = clamp(dragVel.x, -900, 900) * 0.9;
    pet.vy = clamp(dragVel.y, -900, 900) * 0.9;
    pet.spinV = clamp(pet.vx * 0.6, -420, 420);
  });

  root.addEventListener('dblclick', function () {
    wake();
    hidePlay();
    root.classList.add('is-bye');
    clearTimeout(pet.hideT);
    pet.hideT = setTimeout(function () {
      root.classList.remove('is-bye');
      setSurface('floor');
      startIdle(1);
      pet.sleepIn = 45;
    }, 8000);
  });

  /* 关闭按钮：本次会话不再出现 */
  var byeBtn = root.querySelector('.pet__bye');
  if (byeBtn) {
    byeBtn.addEventListener('click', function (e) {
      e.stopPropagation();
      root.style.display = 'none';
    });
  }

  /* ---------- 启动 ---------- */
  function start() {
    if (reduced || !finePointer) { root.style.display = 'none'; return; }
    W = root.offsetWidth || 96;
    root.classList.add('pet--on');
    pet.pos = rand(0.25, 0.75);
    setSurface('floor');
    startIdle(1.5);
    requestAnimationFrame(tick);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
