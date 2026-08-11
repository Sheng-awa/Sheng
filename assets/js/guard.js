/* ============================================================
   源码守卫（guard.js · 心理安慰层）
   右键 / Ctrl+U 弹软萌提示：源代码本来就是公开的，欢迎参观。
   注意：纯静态站拦不住真正的查看（F12/curl 均可），这只是
   给访客一个软乎乎的交代，不是真防御。
   ============================================================ */
(function () {
  "use strict";

  var REPO = "https://github.com/Sheng-awa/Sheng";

  var style = document.createElement("style");
  style.textContent =
    ".sheng-guard{position:fixed;top:18px;left:50%;transform:translate(-50%,-14px) scale(.9);" +
    "max-width:min(420px,86vw);padding:11px 18px;border-radius:16px;" +
    "background:#fff;color:#6f5560;font-size:.9rem;line-height:1.6;text-align:center;" +
    "box-shadow:0 10px 26px rgba(217,79,130,.22);" +
    "opacity:0;pointer-events:none;transition:opacity .3s ease,transform .35s cubic-bezier(.34,1.56,.64,1);" +
    "z-index:99999;font-family:inherit;}" +
    ".sheng-guard.is-on{opacity:1;transform:translate(-50%,0) scale(1);pointer-events:auto;}" +
    ".sheng-guard a{color:#d94f82;font-weight:800;text-decoration:none;border-bottom:2px dashed rgba(217,79,130,.4);}" +
    "html[data-theme=\"dark\"] .sheng-guard{background:#2f2633;color:#e8d9e3;}" +
    "html[data-theme=\"dark\"] .sheng-guard a{color:#ff9ec6;border-color:rgba(255,158,198,.4);}";
  document.head.appendChild(style);

  var toast = document.createElement("div");
  toast.className = "sheng-guard";
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);

  var timer = null;
  function show(msg, withLink) {
    toast.innerHTML = msg +
      (withLink ? ' <a href="' + REPO + '" target="_blank" rel="noopener">去 GitHub 参观 ✿</a>' : "");
    toast.classList.add("is-on");
    clearTimeout(timer);
    timer = setTimeout(function () { toast.classList.remove("is-on"); }, 3000);
  }

  /* 输入框里允许正常右键（粘贴等），其余地方弹提示 */
  document.addEventListener("contextmenu", function (e) {
    if (e.target.closest && e.target.closest("input, textarea, [contenteditable]")) return;
    e.preventDefault();
    show("🔍 被你看穿啦——不过源代码本来就公开着");
  });

  /* Ctrl+U（mac 是 Cmd+U）：同样只是软软地拦一下 */
  document.addEventListener("keydown", function (e) {
    if ((e.ctrlKey || e.metaKey) && String(e.key).toLowerCase() === "u") {
      e.preventDefault();
      show("🔍 被你看穿啦——不过源代码本来就公开着", true);
    }
  });
})();
