# 小圣的小窝 ✿

一个软乎乎的个人介绍网站。纯静态前端，以后预留了后端位置。

## 目录结构

```
sheng/
├── index.html          # 页面本体
├── music.html          # 音乐播放器页（点初音头上的 ▶ 也能进）
├── assets/
│   ├── css/style.css   # 样式（主题变量、动画都在这里）
│   ├── js/main.js      # 主题切换、滚动显现、花瓣、Canvas 特效、天气
│   ├── js/pet.js       # 桌宠：像素初音未来（巡逻/被甩翻跟头/打瞌睡）
│   ├── js/music.js     # 播放器：列表/进度/音量/频谱可视化
│   ├── music/          # 内置音乐（Kevin MacLeod，CC BY 4.0）
│   └── img/            # 头像、favicon、桌宠精灵图（pet-miku.png）等
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
- **音乐**：`music.html` 是内置曲目的播放器。想加歌：mp3 放进 `assets/music/`，在 `assets/js/music.js` 顶部 `TRACKS` 里加一行。现有三首为 Kevin MacLeod（[incompetech.com](https://incompetech.com)）的 CC BY 4.0 音乐
- **文字内容**：都在 `index.html` 里，直接改
