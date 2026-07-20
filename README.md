# 小圣的小窝 ✿

一个软乎乎的个人介绍网站。纯静态前端，以后预留了后端位置。

## 目录结构

```
sheng/
├── index.html          # 页面本体
├── music.html          # 听歌 + 专注页（动态壁纸 / 番茄钟 / TODO；点初音头上的 ▶ 也能进）
├── assets/
│   ├── css/style.css   # 样式（主题变量、动画都在这里）
│   ├── js/main.js      # 主题切换、滚动显现、花瓣、Canvas 特效、天气
│   ├── js/pet.js       # 桌宠：像素初音未来（巡逻/被甩翻跟头/打瞌睡）
│   ├── js/music.js     # 播放器：列表/进度/音量/频谱可视化/歌词
│   ├── js/focus.js     # 专注页：动态壁纸舞台、番茄钟、TODO 计划
│   ├── music/local/    # 本地歌单（小圣自己下载的歌，ncm 转 mp3 + lrc）
│   └── img/            # 头像、favicon、桌宠精灵图（pet-miku.png）、scene/ 动态壁纸图层等
├── server/             # 🚧 后端预留目录（详见其中的 README）
└── README.md
```

## 本地预览

直接用浏览器打开 `index.html`，或者在项目根目录起个静态服务器：

```bash
npx serve .
```

## 部署

Vercel 直接把这个仓库关联进去即可，零配置（纯静态站点）。

## 自定义

- **配色 / 圆角 / 动画速度**：改 `assets/css/style.css` 顶部 `:root` 里的变量
- **头像**：替换 `assets/img/avatar.jpg` 即可（同名覆盖）
- **标签页图标**：替换 `assets/img/favicon-32.png` / `favicon-192.png` / `apple-touch-icon.png`（当前由 `好可爱.jpg` 裁剪脸部区域生成）
- **桌宠**：像素初音未来，单击她头顶会冒出 ▶ 播放按钮（点了去 `music.html`），还能拖拽甩飞、双击躲起来。逻辑在 `assets/js/pet.js`，想去掉就删 `index.html` 里的 `#pet` 容器和对应 `<script>`。素材 `pet-miku.png` 取自 Canary Yellow 的 *Hatsune Miku Shimeji*（[shimejishop](https://shimejishop.com/free/hatsune-miku-shimeji/)，同人素材，初音未来 © Crypton Future Media，本站为个人非商业用途）
- **音乐 / 专注**：`music.html` 是全屏「听歌 + 专注」页——
  - **动态壁纸**：Wallpaper Engine 场景壁纸（workshop 3448877775）的浏览器分层重建。RePKG 解包 `scene.pkg` 后按 `scene.json` 的图层坐标（3840×2160 场景空间）摆放 `assets/img/scene/` 里的 7 个图层，再加 CSS 动效（少女呼吸、窗帘/吊椅摆动、星星闪烁、流星）和鼠标视差，逻辑在 `assets/js/focus.js`；`assets/img/music-bg.jpg` 静帧留作兜底背景
  - **右下播放器**：双音源——本地歌单（`assets/music/local/`，ncm 可用 [ncmdump](https://github.com/taurusxin/ncmdump) 转 mp3）+ 网易云歌单（展开「歌单 · 网易云」粘贴链接或 ID，封面歌词自动来，经 [Meting 公共 API](https://github.com/injahow/meting-api) 解析，版权歌可能只有试听）。加歌：文件丢进 `assets/music/local/`，在 `assets/js/music.js` 顶部 `LOCAL_TRACKS` 里加一行
  - **左下专注**：番茄钟（15/25/45/60 分钟预设，开始自动进全屏，结束有提示音并退出全屏）+ TODO 计划（添加/点一下划线/删除，存 localStorage `sheng-focus-todo`，刷新不丢）
- **文字内容**：都在 `index.html` 里，直接改
