# 小圣的小窝 ✿

一个软乎乎的个人介绍网站。纯静态前端，以后预留了后端位置。

## 目录结构

```
sheng/
├── index.html          # 页面本体
├── assets/
│   ├── css/style.css   # 样式（主题变量、动画都在这里）
│   ├── js/main.js      # 主题切换、滚动显现、花瓣、Canvas 特效（鼠标轨迹/飘雪）
│   └── img/avatar.jpg  # 头像（直接替换同名文件即可）
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
- **文字内容**：都在 `index.html` 里，直接改
