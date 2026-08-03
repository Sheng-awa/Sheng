# 小圣的小窝 ✿

一个软乎乎的个人介绍网站。纯静态前端，以后预留了后端位置。

## 目录结构

```
sheng/
├── index.html          # 页面本体
├── music.html          # 听歌 + 专注页（动态壁纸 / 番茄钟 / TODO；点初音头上的 ▶ 也能进）
├── photos.html         # 相册页（摊开的手帐书，单文件实现：HTML+CSS+JS 全内联）
├── notes.html          # 碎碎念（单文件实现：手帐风便签列表，数据在 script 顶部 NOTES 数组）
├── games.html          # 对弈（单文件实现：左侧导航就地切换 + 中国象棋人机对战：规则引擎 + alpha-beta AI + Canvas 棋盘）
├── photo/              # 📷 照片源文件夹（原图直接塞这里）
│   └── web/            #   压缩后的网页版——手帐书女装章正在用（p001~p004）
├── assets/
│   ├── css/style.css   # 样式（主题变量、动画都在这里）
│   ├── js/main.js      # 主题切换、滚动显现、花瓣、Canvas 特效、天气、名言气泡
│   ├── js/pet.js       # 桌宠：像素初音未来（巡逻/被甩翻跟头/打瞌睡）
│   ├── js/music.js     # 播放器：列表/进度/音量/频谱可视化/歌词
│   ├── js/focus.js     # 专注页：动态壁纸舞台、雨丝萤火、底部 Dock、番茄钟、TODO 计划
│   ├── music/local/    # 默认歌单（小圣自己下载的歌，ncm 转 mp3 + lrc）
│   └── img/            # 头像、favicon、桌宠精灵图（pet-miku.png）、scene/ 壁纸底图等
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
- **名人名言**：首页 hero 头像右侧的气泡，点击随机换一句（淡出淡入切换）。气泡固定 300×118（不随句子长度变形、不挤头像），长句自动缩字号（0.98→0.66rem 下限）保证不溢出。句子来自[一言 API](https://hitokoto.cn)（免费免 key，文学/诗词/哲学分类，限长 45 字），`assets/js/main.js` 末尾还内置了 63 条本地语录兜底——离线、接口失败或一言限流返回同一句时自动回退本地，保证点击必换。想加本地句子就往 `QUOTES` 数组加一行 `{ t: "句子", a: "作者" }`
- **相册**：首页「小角落」的相册卡进 `photos.html`——一本摊开的手帐书（**单文件实现**，HTML+CSS+JS 全内联，不依赖 style.css / main.js）：奶油色封面圆角、右侧+底部"书页堆叠"厚度（repeating-gradient 细边）、正中央书脊凹陷阴影，粉色方格纸背景。结构 = 目录页 + 女装 2 页 + 爱好 2 页 + 恋爱 1 页（虚线空相框"待拍摄"留白），**每个跨页都是单独手写的排版**（左拍立得右手写、双照片斜叠+箭头涂鸦、波浪"小河流"横跨两页、虚线备忘清单……），加页就仿照现有 `<section class="spread">` 手写一页。照片是拍立得样式（白边、caption/日期、随机倾斜、和纸胶带），点击开 lightbox（点空白/×/Esc 关闭）。**照片数据集中在 photos.html 里 script 顶部的 `PHOTOS` 数组**（id/章节/src/caption/date，现在是 picsum 占位图，换成自己的图片路径即可），HTML 里用 `<figure class="polaroid" data-photo="id">` 占位。翻页：书下方「← 上一页 / 下一页 →」圆角按钮（首末页置灰）+ 键盘左右方向键，**桌面端是真·翻书页**（绕书脊 3D 旋转 0.85s：翻动瞬间克隆出"静止左右半页 + 一张纸"，纸张正面贴旧右页、背面贴新左页，带书脊侧阴影，转完换回真页；移动端/减少动态偏好退化为滑动切换），右下角页码"第 N / 6 页"；目录贴纸可直达章节；`?p=页码` 可直接打开某页。**<768px 降级**：书本外壳/书脊/翻页按钮隐藏，所有页按顺序竖排平铺 + 手绘虚线分隔。字体是站酷快乐体（Google Fonts CDN）。手写字随时可改——每页的文字都是写死在 HTML 里的
- **标签页图标**：替换 `assets/img/favicon-32.png` / `favicon-192.png` / `apple-touch-icon.png`（当前由 `好可爱.jpg` 裁剪脸部区域生成）
- **桌宠**：像素初音未来，单击她头顶会冒出 ▶ 播放按钮（点了去 `music.html`），还能拖拽甩飞、双击躲起来。逻辑在 `assets/js/pet.js`，想去掉就删 `index.html` 里的 `#pet` 容器和对应 `<script>`。素材 `pet-miku.png` 取自 Canary Yellow 的 *Hatsune Miku Shimeji*（[shimejishop](https://shimejishop.com/free/hatsune-miku-shimeji/)，同人素材，初音未来 © Crypton Future Media，本站为个人非商业用途）
- **音乐 / 专注**：`music.html` 是全屏「听歌 + 专注」页——
  - **动态壁纸**：Wallpaper Engine 场景壁纸（workshop 2370927443，Lo-Fi 咖啡店）的浏览器重建。RePKG 解包 `scene.pkg` 取底图（Neon cafe，3840×2160）压缩为 `assets/img/scene/cafe.jpg`，再加霓虹灯光晕闪烁、暖色萤火、Canvas 雨丝和鼠标视差，逻辑在 `assets/js/focus.js`
  - **底部 Dock**：macOS 风功能栏（`.dock`），鼠标靠近图标会按距离平滑放大（magnification，`focus.js` 驱动）。4 个图标各弹一个面板（`.dock-panel`，dock 上方居中弹出，互斥开关、点外 / Esc 关闭）：🍅 专注、✏️ 计划、🎵 音乐、🖼️ 壁纸。左上角只剩回首页的头像
  - **播放器**：默认歌单（`assets/music/local/` 小圣自己下载的 5 首，进页显示第一首但不自动播放）+ 网易云歌单（展开「歌单 · 网易云」粘贴链接或 ID，封面歌词自动来，经 [Meting 公共 API](https://github.com/injahow/meting-api) 解析，版权歌可能只有试听）。默认音量 30%；加歌：文件丢进 `assets/music/local/`，在 `assets/js/music.js` 顶部 `LOCAL_TRACKS` 里加一行。发声走双音源：同源曲目接 Web Audio 频谱，跨域（网易云）和 `file://` 直开时自动切直连播放——浏览器会把跨域无 CORS 的 Web Audio 整体静音，直连才能出声，此时频谱退化为模拟呼吸条
  - **专注**：番茄钟（15/25/45/60 分钟预设，开始自动进全屏，结束有提示音并退出全屏）。**开始专注后大时钟浮在屏幕顶部约 1/3 处**（`.focus-bigclock`，暂停保持显示，重置 / 完成收起）
  - **Todo 计划**：添加 / 点一下划线（未完成蓝点、完成绿勾 + 删除线）/ 悬停出 × 删除，存 localStorage `sheng-focus-todo`，刷新不丢
  - **更换壁纸**：Dock 的 🖼️ 弹层，当前界面切换不跳转；预设 4 张：Lo-Fi 咖啡店（雨丝+霓虹光晕）、日式房间昼/夜（Wallpaper Engine「Bunk」workshop 2134765860，RePKG 解包后 PIL 拼合背景与抽屉柜层）、水族馆画室（workshop 3038138638，RePKG 解包后按 `scene.json` 的 origin/scale 用 PIL 分层拼合——画板区域在原背景里是 alpha=0 透明镂空，要图层垫底、背景最后盖）。以后加壁纸：图丢进 `assets/img/scene/`，在 `assets/js/focus.js` 的 `WALLPAPERS` 数组加一项——每项可配 `glow`（霓虹光晕，位置按咖啡店调的）/ `rain`（雨丝）；选择存 localStorage `sheng-wallpaper`。注意配件显隐要用 `style.display` 而非 `hidden` 属性——全局 reset 的 `img{display:block}` 会盖掉 UA 的 `[hidden]` 样式
- **页面过渡**：首页 ⇄ 音乐页有纱幕过渡——去音乐页盖深紫蓝「入夜」渐变、回首页盖粉白「天亮」渐变，进入页面时纱幕自动淡出（CSS `page-veil-out` 动画，不依赖 JS）。样式在 `.page-veil*`；离开拦截在 `main.js` 的 `leaveTo()`（暴露为 `window.shengLeave`，导航音乐链接和 pet.js 的 ▶ 按钮都走它）和 `focus.js`（头像回首页）；`prefers-reduced-motion` 时直接跳转无动画
- **碎碎念**：首页「小角落」的碎碎念卡进 `notes.html`——**便利贴墙**（单文件实现，方格纸粉底）：纯色便利贴小方块（黄/粉/蓝/绿/紫五色循环）、顶部胶条、随机微倾，桌面双列错落 / 移动单列，每条带心情 emoji + 日期，按数组顺序倒序排。**发新的一条 = 打开 notes.html，在 script 顶部 `NOTES` 数组【最上面】加一行 `{ d: '2026.07.28', m: '🎉', t: '正文（换行用 \n）' }`，push 上线**（m 可省略）。页面右下角还有**弹幕发射器（+ 号）**：访客留言会以弹幕形式飞过屏幕（随机弹道/速度/透明度 50%~90%，每 2.4s 一条循环放送），**可取色器自定义弹幕颜色**（选择存 `sheng-notes-dmk-color`，暖场弹幕是淡蓝色），**留言存在访客自己浏览器的 localStorage**（`sheng-notes-danmaku`，最多 60 条）——纯静态站没有后端，想全站共享留言需接 LeanCloud 等 BaaS（替换 script 里的 `dmStore` 即可）
- **对弈**：首页「小角落」的对弈卡进 `games.html`——**左侧导航单页**（和小窝同款侧边栏，点象棋/五子棋/围棋就地切换不跳转，移动端变顶栏）。**中国象棋**：完整规则引擎（蹩马腿/塞象眼/炮架/白脸将/将军判定，perft 深度 1~3 = 44/1920/79666 全对，引擎在 `/*ENGINE-START*/` 块内可直接提取到 node 验证）、AI「小圣」= alpha-beta 剪枝 + 子力/位置评估（固定困难 d4）、可选执子红先黑后（执黑棋盘翻转）、悔棋（连撤两步带回滑动画，被吃的子从托盘飞回）/认输/**求和**（小圣评估自己不占优就接受，占优拒绝）/**💡小灯泡**（一局一次，给出最佳着法并在棋盘上画金色箭头）。**右下角战利品托盘**（canvas 加高一条）：被吃的棋子飞进托盘按棋子样子停放，**重开 = 全场棋子各自飞回初始位**（首次加载也是全体从托盘飞出各就各位）。**五子棋**：15×15 棋盘 + 左右两只木碗棋盒（黑左白右）、落子从棋盒飞入、悔棋/重开时棋子飞回棋盒（渐隐落碗）、五连高亮圈、执子选择，AI「小圣」= 单步启发式（攻/防模式分：活四 1e6/冲四 1e5/活三 5e4…候选点取近 2 格，攻×1.05+防）。全部动画 rAF 驱动 + setTimeout 兜底，减动效直跳；象棋 120 回合无吃子判和。围棋是在建占位，加新棋 = 导航加项 + stage 加段
- **文字内容**：都在 `index.html` 里，直接改
