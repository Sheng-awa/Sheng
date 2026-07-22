/* ============================================================
   相册页（photos.html）：读 photo/photos.json 渲染拍立得瀑布流
   - 每张随机倾斜 -3°~3°、胶带三色轮换、悬停回正放大
   - 点击开 lightbox：‹ › 切换、Esc / 点背景关闭、左右方向键
   以后加照片：文件丢进 photo/，跑 tools/update-photos.py（或双击「更新相册.bat」）
   ============================================================ */
(function () {
  'use strict';

  var wall = document.getElementById('scrapWall');
  if (!wall) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var lightbox = document.getElementById('lightbox');
  var lbImg = document.getElementById('lbImg');
  var lbCap = document.getElementById('lbCap');
  var lbClose = document.getElementById('lbClose');
  var lbPrev = document.getElementById('lbPrev');
  var lbNext = document.getElementById('lbNext');

  var photos = [];
  var current = 0;

  var rand = function (min, max) { return min + Math.random() * (max - min); };

  var capText = function (p) {
    return p.caption ? p.caption + ' · ' + p.date : p.date;
  };

  /* ---------- 渲染瀑布流：JS 分列（CSS columns 会让绝对定位的胶带错位） ---------- */
  var colCount = function () {
    var w = window.innerWidth;
    if (w > 1100) return 4;
    if (w > 820) return 3;
    if (w > 460) return 2;
    return 1;
  };

  var buildCard = function (p, i) {
    var fig = document.createElement('figure');
    fig.className = 'polaroid polaroid--tape' + (i % 3);
    fig.style.setProperty('--r', reduceMotion ? '0deg' : rand(-3, 3).toFixed(2) + 'deg');
    fig.style.setProperty('--tr', rand(-4, 4).toFixed(2) + 'deg');

    var img = document.createElement('img');
    img.src = 'photo/' + p.file;
    img.alt = p.caption || '相册照片 ' + p.date;
    img.loading = 'lazy';
    if (p.w && p.h) img.style.aspectRatio = p.w + ' / ' + p.h;   // 预留空间防布局跳动

    var cap = document.createElement('figcaption');
    var capSpan = document.createElement('span');
    capSpan.className = 'polaroid__cap';
    capSpan.textContent = p.caption || '✿';
    var dateSpan = document.createElement('span');
    dateSpan.className = 'polaroid__date';
    dateSpan.textContent = p.date;
    cap.appendChild(capSpan);
    cap.appendChild(dateSpan);

    fig.appendChild(img);
    fig.appendChild(cap);
    var tape = document.createElement('i');
    tape.className = 'polaroid__tape';
    tape.setAttribute('aria-hidden', 'true');
    fig.appendChild(tape);
    fig.addEventListener('click', function () { openLightbox(i); });
    return fig;
  };

  /* 按"最矮列优先"分配卡片；照片纵横比来自 photos.json，未加载也能排匀 */
  var layout = function () {
    if (!photos.length) return;
    var n = colCount();
    wall.innerHTML = '';
    var cols = [];
    var heights = [];
    for (var i = 0; i < n; i++) {
      var col = document.createElement('div');
      col.className = 'scrap-col';
      wall.appendChild(col);
      cols.push(col);
      heights.push(0);
    }
    var cs = window.getComputedStyle(wall);
    var padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
    var gap = parseFloat(cs.columnGap) || 26;
    var colW = (wall.clientWidth - padX - (n - 1) * gap) / n;
    photos.forEach(function (p, idx) {
      var t = 0;
      for (var j = 1; j < n; j++) if (heights[j] < heights[t]) t = j;
      cols[t].appendChild(buildCard(p, idx));
      var ratio = (p.h && p.w) ? p.h / p.w : 0.75;
      heights[t] += ratio * Math.max(colW - 24, 80) + 62;   // 图高 + 底部留白区约 62px
    });
  };

  var render = function (list) {
    wall.innerHTML = '';
    if (!list.length) {
      var empty = document.createElement('p');
      empty.className = 'scrap-empty';
      empty.textContent = '还没有照片，往 photo/ 文件夹塞几张，再跑一下「更新相册.bat」吧 ✿';
      wall.appendChild(empty);
      return;
    }
    layout();
  };

  /* 列数随窗口断点变化才重排（宽度变化不影响分配比例） */
  var lastCols = 0;
  window.addEventListener('resize', function () {
    var n = colCount();
    if (n !== lastCols) { lastCols = n; layout(); }
  });

  /* ---------- Lightbox ---------- */
  var fill = function (i) {
    current = (i + photos.length) % photos.length;
    var p = photos[current];
    lbImg.src = 'photo/' + p.file;
    lbImg.alt = p.caption || '相册照片 ' + p.date;
    lbCap.textContent = capText(p);
  };

  var openLightbox = function (i) {
    if (!lightbox) return;
    fill(i);
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  var closeLightbox = function () {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  if (lightbox) {
    lbClose.addEventListener('click', closeLightbox);
    lbPrev.addEventListener('click', function () { fill(current - 1); });
    lbNext.addEventListener('click', function () { fill(current + 1); });
    /* 点背景（非图非按钮区域）关闭 */
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox__stage')) closeLightbox();
    });
    document.addEventListener('keydown', function (e) {
      if (!lightbox.classList.contains('is-open')) return;
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') fill(current - 1);
      else if (e.key === 'ArrowRight') fill(current + 1);
    });
  }

  /* ---------- 加载清单 ---------- */
  fetch('photo/photos.json', { cache: 'no-store' })
    .then(function (r) { return r.json(); })
    .then(function (list) {
      photos = Array.isArray(list) ? list.filter(function (p) { return p && p.file; }) : [];
      render(photos);
    })
    .catch(function () {
      wall.innerHTML = '<p class="scrap-empty">相册清单加载失败啦……看看 photo/photos.json 还在不在？</p>';
    });

  /* ---------- 回首页：粉白纱幕过渡（与全站一致） ---------- */
  var homeLink = document.querySelector('.scrap-home');
  if (homeLink && window.shengLeave) {
    homeLink.addEventListener('click', function (e) {
      e.preventDefault();
      window.shengLeave('index.html', 'day');
    });
  }
})();
