/* ============================================================
   小圣的播放器 · music.js
   内置本地曲目的简易播放器：播放列表 / 进度拖拽 /
   音量 / Web Audio 频谱可视化。曲目均为 Kevin MacLeod
   的 CC BY 音乐（见页面底部署名）。
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 曲目表：想加歌就往这里加一行 ---------- */
  var TRACKS = [
    { title: 'Fluffing a Duck',            artist: 'Kevin MacLeod', src: 'assets/music/fluffing-a-duck.mp3' },
    { title: 'Pixel Peeker Polka - faster', artist: 'Kevin MacLeod', src: 'assets/music/pixel-peeker-polka.mp3' },
    { title: 'Monkeys Spinning Monkeys',   artist: 'Kevin MacLeod', src: 'assets/music/monkeys-spinning-monkeys.mp3' }
  ];

  var player = document.getElementById('player');
  var titleEl = document.getElementById('trackTitle');
  var artistEl = document.getElementById('trackArtist');
  var barEl = document.getElementById('playerBar');
  var progressEl = document.getElementById('playerProgress');
  var curEl = document.getElementById('timeCur');
  var totalEl = document.getElementById('timeTotal');
  var btnPlay = document.getElementById('btnPlay');
  var btnPrev = document.getElementById('btnPrev');
  var btnNext = document.getElementById('btnNext');
  var volumeEl = document.getElementById('volume');
  var listEl = document.getElementById('playerList');
  var viz = document.getElementById('playerViz');
  if (!player || !viz) return;

  var audio = new Audio();
  audio.preload = 'metadata';
  audio.volume = parseFloat(volumeEl.value);

  var idx = 0;

  /* ---------- 播放列表 UI ---------- */
  TRACKS.forEach(function (t, i) {
    var li = document.createElement('li');
    var no = document.createElement('span');
    no.className = 'no';
    no.textContent = i + 1;
    var name = document.createElement('span');
    name.textContent = t.title;
    var artist = document.createElement('span');
    artist.className = 'artist';
    artist.textContent = t.artist;
    li.appendChild(no);
    li.appendChild(name);
    li.appendChild(artist);
    li.addEventListener('click', function () { load(i, true); });
    listEl.appendChild(li);
  });
  var items = Array.prototype.slice.call(listEl.children);

  /* ---------- 加载 / 播放 ---------- */
  function load(i, autoplay) {
    idx = (i + TRACKS.length) % TRACKS.length;
    audio.src = TRACKS[idx].src;
    titleEl.textContent = TRACKS[idx].title;
    artistEl.textContent = TRACKS[idx].artist;
    items.forEach(function (li, j) { li.classList.toggle('is-active', j === idx); });
    barEl.style.width = '0%';
    curEl.textContent = '0:00';
    totalEl.textContent = '0:00';
    if (autoplay) play();
  }

  function play() {
    ensureCtx();
    var p = audio.play();
    if (p && p.catch) p.catch(function () { /* 浏览器拦了自动播放，等用户亲手点 */ });
  }

  function toggle() {
    if (audio.paused) play();
    else audio.pause();
  }

  btnPlay.addEventListener('click', toggle);
  btnPrev.addEventListener('click', function () { load(idx - 1, true); });
  btnNext.addEventListener('click', function () { load(idx + 1, true); });
  audio.addEventListener('ended', function () { load(idx + 1, true); });

  audio.addEventListener('play', function () {
    player.classList.add('is-playing');
    btnPlay.textContent = '⏸';
  });
  audio.addEventListener('pause', function () {
    player.classList.remove('is-playing');
    btnPlay.textContent = '▶';
  });

  /* ---------- 进度 / 音量 ---------- */
  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var ss = Math.floor(s % 60);
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  audio.addEventListener('loadedmetadata', function () {
    totalEl.textContent = fmt(audio.duration);
  });
  audio.addEventListener('timeupdate', function () {
    curEl.textContent = fmt(audio.currentTime);
    if (audio.duration) barEl.style.width = (audio.currentTime / audio.duration * 100) + '%';
  });

  progressEl.addEventListener('click', function (e) {
    if (!audio.duration) return;
    var rect = progressEl.getBoundingClientRect();
    var ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
  });

  volumeEl.addEventListener('input', function () {
    audio.volume = parseFloat(volumeEl.value);
  });

  /* ---------- 频谱可视化 ---------- */
  var actx = null, analyser = null, freq = null;

  function ensureCtx() {
    if (actx) {
      if (actx.state === 'suspended') actx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    actx = new AC();
    var src = actx.createMediaElementSource(audio);
    analyser = actx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    src.connect(analyser);
    analyser.connect(actx.destination);
    freq = new Uint8Array(analyser.frequencyBinCount);
  }

  var vctx = viz.getContext('2d');
  var BAR_COUNT = 42;

  function drawViz() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = viz.clientWidth, h = viz.clientHeight;
    if (viz.width !== w * dpr) {
      viz.width = w * dpr;
      viz.height = h * dpr;
    }
    vctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    vctx.clearRect(0, 0, w, h);

    var styles = getComputedStyle(document.documentElement);
    var c1 = styles.getPropertyValue('--accent-deep').trim() || '#e484ac';
    var c2 = styles.getPropertyValue('--lavender').trim() || '#b9a7e6';
    var grad = vctx.createLinearGradient(0, h, 0, 0);
    grad.addColorStop(0, c1);
    grad.addColorStop(1, c2);

    if (analyser) analyser.getByteFrequencyData(freq);

    var gap = 3;
    var bw = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
    for (var i = 0; i < BAR_COUNT; i++) {
      var v;
      if (analyser && !audio.paused) {
        // 低频段能量最足，往前多取一点
        v = freq[Math.floor(i * freq.length / BAR_COUNT * 0.7)] / 255;
      } else {
        v = 0.04;   // 没播放时的安静底座
      }
      var bh = Math.max(2, v * (h - 4));
      var x = i * (bw + gap);
      vctx.fillStyle = grad;
      vctx.beginPath();
      if (vctx.roundRect) vctx.roundRect(x, h - bh, bw, bh, bw / 2);
      else vctx.rect(x, h - bh, bw, bh);
      vctx.fill();
    }
    requestAnimationFrame(drawViz);
  }
  requestAnimationFrame(drawViz);

  /* ---------- 启动：尽量自动播第一首（被浏览器拦就等用户点） ---------- */
  load(0, false);
  play();
})();
