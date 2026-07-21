/* ============================================================
   小圣的播放器 · music.js
   双音源播放器：
   - 默认歌单：小圣自己的歌（assets/music/local/）
   - 网易云歌单 / 单曲（粘贴链接或 ID，经 Meting 公共 API 解析，
     封面 / 歌词 / 播放流自动来；版权歌可能只有试听）
   功能：播放列表 / 进度点按 / 音量 / 滚动歌词 / 频谱可视化
   （跨域音频拿不到频谱数据时用呼吸灯效的模拟频谱兜底）
   注意：进页不自动播放，点 ▶ 或加载歌单后才开始；默认音量 30%
   ============================================================ */
(function () {
  'use strict';

  /* ---------- 配置 ---------- */
  var API = 'https://api.injahow.cn/meting/';   // Meting 公共 API（injahow 开源版）
  var DEFAULT_COVER = 'assets/img/好可爱.jpg';

  /* 默认歌单：小圣自己的歌（想加歌就往这里加一行，lrc 可选） */
  var LOCAL_TRACKS = [
    { title: '拼接乌托邦',                        artist: 'Ciyo / 见过夏天P / 乌托邦P', src: 'assets/music/local/pinjie-wutuobang.mp3',      lrc: 'assets/music/local/pinjie-wutuobang.lrc' },
    { title: 'Numb Little Bug',                   artist: 'Em Beihold',                 src: 'assets/music/local/numb-little-bug.mp3',        lrc: 'assets/music/local/numb-little-bug.lrc' },
    { title: 'Shut up My Moms Calling',           artist: 'Hotel Ugly',                 src: 'assets/music/local/shut-up-my-moms-calling.mp3',lrc: 'assets/music/local/shut-up-my-moms-calling.lrc' },
    { title: 'You Are Not Alone',                 artist: 'Michael Jackson',            src: 'assets/music/local/you-are-not-alone.mp3',      lrc: 'assets/music/local/you-are-not-alone.lrc' },
    { title: 'death bed (coffee for your head)',  artist: 'Powfu / beabadoobee',        src: 'assets/music/local/death-bed.mp3',              lrc: 'assets/music/local/death-bed.lrc' }
  ];

  var MAX_LIST = 100;   // 歌单太长只显示前 100 首

  /* ---------- DOM ---------- */
  var player = document.getElementById('player');
  var discEl = document.querySelector('.player__disc');
  var titleEl = document.getElementById('trackTitle');
  var artistEl = document.getElementById('trackArtist');
  var lyricEl = document.getElementById('lyricLine');
  var barEl = document.getElementById('playerBar');
  var progressEl = document.getElementById('playerProgress');
  var curEl = document.getElementById('timeCur');
  var totalEl = document.getElementById('timeTotal');
  var btnPlay = document.getElementById('btnPlay');
  var btnPrev = document.getElementById('btnPrev');
  var btnNext = document.getElementById('btnNext');
  var volumeEl = document.getElementById('volume');
  var listEl = document.getElementById('playerList');
  var listTitleEl = document.getElementById('listTitle');
  var plInput = document.getElementById('playlistInput');
  var plBtn = document.getElementById('playlistBtn');
  var plReset = document.getElementById('playlistReset');
  var viz = document.getElementById('playerViz');
  if (!player || !viz) return;

  /* ---------- 发声方案 ----------
     浏览器规矩：跨域无 CORS（含 file:// 直开本地文件）的音频一经
     createMediaElementSource 接入 Web Audio 就会被整体静音。
     所以只有同源曲目走接了频谱的 audioFx，其余走直连扬声器的 audioPlain。 */
  var audio = null;        // 当前正在用的元素（下面两个之一）
  var audioPlain = null;   // 跨域 / file:// 曲目：直连，频谱走模拟
  var audioFx = null;      // 同源曲目：接 Web Audio 频谱
  var actx = null, analyser = null, freq = null;

  function canRoute(src) {
    try {
      if (location.protocol === 'file:') return false;  // file:// 一律直连
      return new URL(src, location.href).origin === location.origin;
    } catch (e) { return false; }
  }

  function attachGraph(el) {
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      actx = new AC();
      if (actx.state === 'suspended') actx.resume();
      var src = actx.createMediaElementSource(el);
      analyser = actx.createAnalyser();
      analyser.fftSize = 128;
      analyser.smoothingTimeConstant = 0.8;
      src.connect(analyser);
      analyser.connect(actx.destination);
      freq = new Uint8Array(analyser.frequencyBinCount);
    } catch (e) { actx = null; analyser = null; }
  }

  function useAudio(el) {
    if (audio === el) return;
    if (audio) audio.pause();
    audio = el;
    audio.volume = parseFloat(volumeEl.value);
  }

  /* 按曲目来源挑选发声元素（在设置 src 之前调用） */
  function prepareElement(src) {
    if (canRoute(src)) {
      if (!audioFx) { audioFx = wireAudio(new Audio()); attachGraph(audioFx); }
      useAudio(audioFx);
    } else {
      if (!audioPlain) audioPlain = wireAudio(new Audio());
      useAudio(audioPlain);
    }
  }

  /* ---------- 状态 ---------- */
  var tracks = [];        // {title, artist, src, cover, lrc}
  var idx = 0;
  var source = 'local';   // local | netease
  var lrcMap = [];        // [{t, text}]
  var lrcIdx = -1;
  var errStreak = 0;      // 连续播放失败计数，防止无限跳歌

  /* ---------- 持久化 ---------- */
  var store = {
    get: function () {
      try { return JSON.parse(localStorage.getItem('sheng-music-src')) || null; }
      catch (e) { return null; }
    },
    set: function (v) {
      try { localStorage.setItem('sheng-music-src', JSON.stringify(v)); } catch (e) {}
    }
  };

  /* ---------- 播放列表 UI ---------- */
  function renderList() {
    listEl.innerHTML = '';
    var shown = Math.min(tracks.length, MAX_LIST);
    for (var i = 0; i < shown; i++) {
      (function (t, i) {
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
      })(tracks[i], i);
    }
    if (tracks.length > MAX_LIST) {
      var more = document.createElement('li');
      more.textContent = '…歌单太长，只显示前 ' + MAX_LIST + ' 首';
      more.style.cursor = 'default';
      more.style.color = 'var(--text-soft)';
      listEl.appendChild(more);
    }
    markActive();
  }

  function markActive() {
    Array.prototype.forEach.call(listEl.children, function (li, i) {
      li.classList.toggle('is-active', i === idx);
    });
  }

  function setListTitle(text) { listTitleEl.textContent = text; }

  /* ---------- 加载 / 播放 ---------- */
  function load(i, autoplay) {
    if (!tracks.length) return;
    idx = (i + tracks.length) % tracks.length;
    var t = tracks[idx];
    prepareElement(t.src);
    audio.src = t.src;
    titleEl.textContent = t.title;
    artistEl.textContent = t.artist;
    discEl.src = t.cover || DEFAULT_COVER;
    barEl.style.width = '0%';
    curEl.textContent = '0:00';
    totalEl.textContent = '0:00';
    setLyric([], -1);
    if (t.lrc) fetchLrc(t.lrc);
    else lyricEl.textContent = '♪';
    markActive();
    if (autoplay) play();
  }

  /* 浏览器禁自动播放时：播放键呼吸闪烁提示，点页面任意处开播 */
  var gestureHandler = null;
  function needGesture() {
    btnPlay.classList.add('needs-gesture');
    btnPlay.title = '点我播放 ♪';
    if (gestureHandler) return;
    gestureHandler = function () {
      document.removeEventListener('pointerdown', gestureHandler);
      gestureHandler = null;
      play();
    };
    document.addEventListener('pointerdown', gestureHandler);
  }

  function play() {
    if (!audio) return;
    if (actx && actx.state === 'suspended') actx.resume();
    var p = audio.play();
    if (p && p.catch) p.catch(function () { needGesture(); });
  }

  function toggle() {
    if (!audio) return;
    if (audio.paused) play();
    else audio.pause();
  }

  btnPlay.addEventListener('click', toggle);
  btnPrev.addEventListener('click', function () { load(idx - 1, true); });
  btnNext.addEventListener('click', function () { load(idx + 1, true); });

  /* 给发声元素统一接事件（同源 / 跨域两个元素共用一套逻辑） */
  function wireAudio(el) {
    el.preload = 'metadata';
    el.volume = parseFloat(volumeEl.value);

    el.addEventListener('ended', function () { load(idx + 1, true); });

    /* 播放失败（VIP 无权限 / 链接失效）：标记并自动跳下一首 */
    el.addEventListener('error', function () {
      var li = listEl.children[idx];
      if (li) li.classList.add('is-error');
      if (tracks.length > 1 && errStreak < 4) {
        errStreak++;
        load(idx + 1, true);
      }
    });
    el.addEventListener('playing', function () { errStreak = 0; });

    el.addEventListener('play', function () {
      player.classList.add('is-playing');
      btnPlay.textContent = '⏸';
      btnPlay.classList.remove('needs-gesture');
      btnPlay.title = '播放 / 暂停';
    });
    el.addEventListener('pause', function () {
      player.classList.remove('is-playing');
      btnPlay.textContent = '▶';
    });

    el.addEventListener('loadedmetadata', function () {
      totalEl.textContent = fmt(el.duration);
    });
    el.addEventListener('timeupdate', function () {
      curEl.textContent = fmt(el.currentTime);
      if (el.duration) barEl.style.width = (el.currentTime / el.duration * 100) + '%';
      syncLyric();
    });
    return el;
  }

  /* ---------- 歌词 ---------- */
  function setLyric(map, i) {
    lrcMap = map;
    lrcIdx = i;
  }

  /* 歌词解析：标准 LRC [mm:ss.xx] + 网易云 JSON 行 {"t":毫秒,"c":[{"tx":...}]} */
  function parseLrcText(text) {
    var map = [];
    text.split('\n').forEach(function (line) {
      line = line.trim();
      if (!line) return;
      if (line[0] === '{') {
        try {
          var j = JSON.parse(line);
          if (typeof j.t === 'number' && j.c) {
            var s = j.c.map(function (p) { return p.tx || ''; }).join('').trim();
            if (s && j.t >= 0) map.push({ t: j.t / 1000, text: s });
          }
        } catch (e) { /* 不是 JSON 就按标准 LRC 试 */ }
        return;
      }
      var m = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
      if (m) {
        var t = parseInt(m[1], 10) * 60 + parseFloat(m[2]);
        var s2 = m[3].trim();
        if (s2) map.push({ t: t, text: s2 });
      }
    });
    map.sort(function (a, b) { return a.t - b.t; });
    return map;
  }

  function fetchLrc(url) {
    fetch(url)
      .then(function (r) { return r.text(); })
      .then(function (text) {
        setLyric(parseLrcText(text), -1);
        lyricEl.textContent = '♪';
      })
      .catch(function () { lyricEl.textContent = '♪'; });
  }

  function syncLyric() {
    if (!lrcMap.length) return;
    var t = audio.currentTime;
    var i = lrcMap.length - 1;
    while (i > 0 && lrcMap[i].t > t) i--;
    if (i !== lrcIdx && lrcMap[i].t <= t) {
      lrcIdx = i;
      lyricEl.classList.add('fade');
      setTimeout(function () {
        lyricEl.textContent = lrcMap[i].text;
        lyricEl.classList.remove('fade');
      }, 150);
    }
  }

  /* ---------- 进度 / 音量 ---------- */
  function fmt(s) {
    if (!isFinite(s)) return '0:00';
    var m = Math.floor(s / 60);
    var ss = Math.floor(s % 60);
    return m + ':' + (ss < 10 ? '0' : '') + ss;
  }

  progressEl.addEventListener('click', function (e) {
    if (!audio || !audio.duration) return;
    var rect = progressEl.getBoundingClientRect();
    var ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    audio.currentTime = ratio * audio.duration;
  });

  volumeEl.addEventListener('input', function () {
    var v = parseFloat(volumeEl.value);
    if (audioPlain) audioPlain.volume = v;
    if (audioFx) audioFx.volume = v;
  });

  /* ---------- 网易云歌单 / 单曲 ---------- */
  function parseInput(text) {
    text = (text || '').trim();
    if (!text) return null;
    var m = text.match(/playlist\?.*id=(\d+)/) || text.match(/song\?.*id=(\d+)/);
    if (m) return { type: text.indexOf('song?') > -1 && text.indexOf('playlist') === -1 ? 'song' : 'playlist', id: m[1] };
    if (/^\d{4,}$/.test(text)) return { type: 'playlist', id: text };
    return null;
  }

  function loadNetease(type, id, autoplay) {
    setListTitle('正在加载网易云' + (type === 'song' ? '单曲' : '歌单') + '…');
    plBtn.disabled = true;
    fetch(API + '?server=netease&type=' + type + '&id=' + id)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        plBtn.disabled = false;
        if (!Array.isArray(data) || !data.length) throw new Error('empty');
        tracks = data.map(function (s) {
          return { title: s.name, artist: s.artist, src: s.url, cover: s.pic, lrc: s.lrc };
        });
        source = 'netease';
        store.set({ source: 'netease', type: type, id: id });
        plReset.hidden = false;
        setListTitle('网易云' + (type === 'song' ? '单曲' : '歌单') + ' · ' + tracks.length + ' 首（版权歌可能只有试听）');
        renderList();
        load(0, autoplay !== false);
      })
      .catch(function () {
        plBtn.disabled = false;
        setListTitle('加载失败了…检查链接/ID，或者稍后再试');
      });
  }

  /* 默认歌单：小圣自己的歌 */
  function loadLocal() {
    tracks = LOCAL_TRACKS.map(function (t) {
      return { title: t.title, artist: t.artist, src: t.src, cover: DEFAULT_COVER, lrc: t.lrc || null };
    });
    source = 'local';
    store.set({ source: 'local' });
    plReset.hidden = true;
    setListTitle('默认歌单');
    renderList();
  }

  plBtn.addEventListener('click', function () {
    var p = parseInput(plInput.value);
    if (p) loadNetease(p.type, p.id);
    else setListTitle('没看懂这个链接…粘贴歌单/歌曲链接或纯数字 ID');
  });
  plInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') plBtn.click();
  });
  plReset.addEventListener('click', function () {
    plInput.value = '';
    loadLocal();
    load(0, false);
  });

  /* ---------- 频谱可视化（actx / analyser / freq 在顶部发声方案里声明） ---------- */

  var vctx = viz.getContext('2d');
  var BAR_COUNT = 42;
  var vizT = 0;

  function drawViz(ts) {
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

    var playing = audio && !audio.paused;
    var real = false;
    if (analyser && audio === audioFx && playing) {
      analyser.getByteFrequencyData(freq);
      for (var z = 0; z < freq.length; z++) {
        if (freq[z] > 4) { real = true; break; }   // 拿不到数据就走模拟频谱
      }
    }

    var gap = 3;
    var bw = (w - gap * (BAR_COUNT - 1)) / BAR_COUNT;
    vizT = ts / 1000;
    for (var i = 0; i < BAR_COUNT; i++) {
      var v;
      if (real) {
        // 低频段能量最足，往前多取一点
        v = freq[Math.floor(i * freq.length / BAR_COUNT * 0.7)] / 255;
      } else if (playing) {
        // 模拟频谱：几组正弦叠加，跟着节奏呼吸
        v = 0.1 + 0.42 * Math.abs(Math.sin(i * 0.55 + vizT * 2.6)) *
          (0.55 + 0.45 * Math.sin(vizT * 1.4 + i * 0.3));
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

  /* ---------- 启动：URL 带 ?playlist= 优先，其次恢复上次的音源；都不自动播放 ---------- */
  var queryId = null;
  try { queryId = new URLSearchParams(location.search).get('playlist'); } catch (e) {}
  var parsed = queryId && parseInput(queryId);
  var saved = store.get();
  if (parsed) {
    plInput.value = parsed.id;
    loadNetease(parsed.type, parsed.id, false);
  } else if (saved && saved.source === 'netease' && saved.id) {
    plInput.value = saved.id;
    loadNetease(saved.type || 'playlist', saved.id, false);
  } else {
    loadLocal();
    load(0, false);   // 显示第一首信息，但不自动播放
  }
})();
