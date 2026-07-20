# 小圣的小窝 ✿

一个软乎乎的个人介绍网站。纯静态前端，以后预留了后端位置。

## 目录结构

```
sheng/
├── index.html          # 页面本体
├── pet.html            # 桌宠自定义页（选皮肤、开关）
├── assets/
│   ├── css/style.css   # 样式（主题变量、动画都在这里）
│   ├── js/main.js      # 主题切换、滚动显现、花瓣、Canvas 特效、天气
│   ├── js/pet.js       # 桌宠：暹罗猫/粉色史莱姆（巡逻/跳跃/降落伞/爬墙，按皮肤分特性）
│   └── img/            # 头像、favicon、桌宠精灵图（pet-cat.png / pet-slime.png）等
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
- **桌宠**：打开 `pet.html` 就能换皮肤（暹罗猫 / 粉色史莱姆）或开关，设置存在浏览器 localStorage。逻辑在 `assets/js/pet.js`，想去掉就删两个页面里的 `#pet` 容器和对应 `<script>`。素材：`pet-cat.png` 改自 Shepardskin 的 *Cat sprites*（[OpenGameArt](https://opengameart.org/content/cat-sprites)，免署名），脚本染成暹罗配色；`pet-slime.png` 改自 rvros 的 *Pixel art animated Slime*（[OpenGameArt](https://opengameart.org/content/pixel-art-animated-slime)，CC0），脚本染粉
- **文字内容**：都在 `index.html` 里，直接改
