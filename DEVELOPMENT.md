# L1Audio 开发笔记（架构 / 踩坑经验 / 维护指南）

> 换电脑后从本文件即可了解全部背景，不需要翻聊天记录。

## 一、项目结构

```
L1Audio/
├── index.html              # 交付物：单文件工具箱（构建产物，双击即用）
├── tools/                  # 源码目录
│   ├── 音频分析.html        #   音频质量分析器（深色主题，完全离线）
│   ├── 音频增强.html        #   音频增强器（完全离线，lamejs 已内联）
│   ├── 歌词精度转换.html    #   LRC 歌词精度转换（纯 HTML/CSS/JS，完全离线）
│   ├── 音频编辑.html        #   音频分割编辑器（完全离线）
│   ├── template.html       #   主页骨架（工具内容处为 {{SRC:id}} 占位符）
│   └── build_single.js     #   构建脚本（Node.js，零依赖）
├── L1-Photo-Editor/        # 图片编辑器（独立目录，不参与内嵌）
│   ├── index.html
│   ├── probe.js            #   目录探针（父页面检测用）
│   ├── models/             #   AI 模型：.b64.js 供 file:// 离线，.onnx 供 http 部署
│   └── ort/                #   onnxruntime-web
└── DEVELOPMENT.md          # 本文件
```

**核心架构：单文件嵌入 + 一个外挂目录**

前四个工具页面以 base64 编码嵌入 index.html 的 `<script type="text/plain" id="src-xxx">` 标签中，切换时由 JS 解码并写入 iframe 的 `srcdoc`。每个页面在独立 iframe 中运行，CSS/JS 完全隔离，**工具页面的原始内容零修改**。

「图片编辑」例外：它带 200MB 级 AI 模型，无法 base64 内嵌，改为 iframe `src` 指向同目录的 `L1-Photo-Editor/index.html`。因此**仓库必须整目录分发**，不能只发 index.html。

## 二、日常维护流程（改 bug / 加功能）

```bash
# 1. 改 tools/ 下的对应源页面（不要直接改 index.html，它是产物）
# 2. 重新构建
node tools/build_single.js
# 3. 打开 index.html 验证功能
# 4. 提交：tools/源页面 + index.html 一起提交
```

**铁律：永远不要手改 index.html 里的工具内容**——那是 base64，手改无法回写到源文件。要改功能就去 `tools/` 改源页面再重新构建。

改「图片编辑」直接改 `L1-Photo-Editor/index.html`，它不经过构建。

## 三、踩坑经验（重要，别再踩）

### 1. iframe 页面空白（内联样式优先级）
切换页面时 JS 先用 `el.style.display = 'none'`（内联样式）隐藏所有视图，若之后只靠 CSS 类 `.active { display: block }` 恢复显示，**内联样式优先级更高，页面会一直空白**。
✅ 修复：显示时显式设置 `target.style.display = 'block'`（或 'flex'），直接覆盖内联值。

### 2. 歌词页进入卡顿（CDN 懒加载）
旧版歌词页依赖 Tailwind Play CDN（~400KB JS，**运行时 JIT 编译**，开销大）+ Font Awesome CDN。若懒加载（首次点击才加载 iframe），点击瞬间要下载 + 编译 + 重渲染，明显卡顿。
✅ 现状：歌词页已重写为纯 HTML/CSS/JS（12KB，零外链），此问题不复存在。`preloadAll()` 预加载仍保留，冷启动更顺。

### 3. 底部/顶部固定导航栏遮挡内容
固定横栏会挤压 iframe 可视区（原本 iframe 高度要减去栏高 `calc(100vh - 60px)`）。
✅ 现方案：无横栏，仅右上角浮动毛玻璃按钮条（`.toolbar`），iframe 占满 `100vh`。

### 4. 外链 CDN 阻塞渲染（血的教训）
音频增强页曾用 `<link>` 引 Font Awesome、`<script src>` 引 lamejs，网络差或被墙时**整页卡住等超时**，表现是「图标不显示、页面像卡死」。
✅ 修复：图标全部改内联 SVG；lamejs 1.2.1 直接内联进页面；页面零外链。

判断方法：`grep -n "https\?://" tools/*.html`，出现 `<link href>` / `<script src>` 就要警惕。

### 5. 图片编辑器的顶部让位（postMessage）
父页面右上悬浮导航会压住编辑器的工具栏。早期做法是给父层加 padding，但顶部会露出一条灰带（父页面背景），与编辑器浅绿背景对不上，视觉断层。
✅ 现方案：父层不留白（`#view-photo` padding 0，iframe 满高），由**编辑器自己的 header 撑开**：
- 父页面 `postMessage({type:'l1-nav-pad', pad})`，pad = 导航底边 − 41（编辑器 header 原高）+ 6
- 编辑器收到后写 CSS 变量 `--nav-pad`，`header{padding-top:calc(10px + var(--nav-pad))}`
- 编辑器加载完成时发 `l1-nav-ready`，父页面收到补发一次（解决时序）
- 窄屏（<760px）导航几乎占满整行，pad 改为 `navBottom - 4`，标题行也一起下移
- 单独打开编辑器时 `--nav-pad` 为 0，不影响原页面

### 6. 图片编辑器目录探针
iframe 加载失败不会触发 onerror，无法直接判断目录是否存在。
✅ 方案：目录里放 `probe.js`，父页面先 `<script src="L1-Photo-Editor/probe.js">`，onload 才设 iframe.src，onerror 显示「缺少本地资源文件夹」提示卡。

### 7. 大模型文件必须分片（GitHub API 限流）
`u2netp.b64.js`（57MB）和 `u2netp.onnx`（42MB）用 GitHub REST API 推不上去，报 `422 input was too large`（单请求体约 50MB 上限，实测 36MB 文件能过、42MB 就挂）。

✅ 方案：拆片，编辑器自动探测两种放法：
- `models/u2netp.b64.js` 或 `models/u2netp.b64.0.js / .1.js / .2.js`（每片 `window.MODEL_U2NETP_B64=(window.MODEL_U2NETP_B64||"")+"<chunk>"`，按 4 字符对齐切）
- `models/u2netp.onnx` 或 `models/u2netp.onnx.p0 / .p1`（二进制直接切半，`AI.MODELS[key].urls` 里数组项 = 分片组，依次 fetch 拼接）

本地桌面版留单片、仓库版用分片，代码两边通吃。重新拆片脚本注意：切点必须落在 4 的倍数上，否则 atob 会炸。

### 8. EXE 打包失败（已放弃，勿再试）
尝试过 pywebview + PyInstaller 打包桌面 EXE，因沙箱删除拦截导致 pip 源码构建（proxy_tools）反复失败。结论：**单文件 HTML 已满足需求，不再做 EXE**。

### 9. 中文文件名 + bash 工具坑
- git-bash 中 `grep`/`for` 循环处理中文文件名会静默失败（编码问题），**用 node 脚本处理中文文件最稳**
- Windows 下 git-bash 的 `/tmp` 与 node 的路径映射不一致，node 读 `/tmp/xxx` 可能读到别的文件，临时文件一律放项目目录内

### 10. 页面残留开发工具注入
音频增强页曾夹带 16KB 的 `trae-browser-inspect-*` 样式和 `/@vite/client` 模块脚本，导致控制台 CORS 报错。
✅ 已清除。从外部导入页面时留意这类残留。

## 四、已知限制 / 待办

| 项 | 说明 | 优先级 |
|---|---|---|
| 仓库体积 210MB | 图片编辑器模型占绝大部分，clone 慢；Git LFS 免费额度不够 | 中 |
| 必须整目录分发 | 只发 index.html 会导致图片编辑不可用（有提示但功能缺失） | — |
| 单文件 526KB | 内联 lamejs 后变大，加载仍无感知 | 无需处理 |
| 图片编辑需新浏览器 | AI 功能依赖 WASM SIMD，老设备会给出明确提示 | 低 |

## 五、五个工具页面功能速览

- **音频分析**：格式/采样率/频谱/动态范围分析，假无损与过采样检测
- **音频增强**：多模式增强 + WAV/MP3 输出
- **歌词精度转换**：LRC 时间戳 2 位 ↔ 3 位毫秒互转，实时转换与导出
- **音频编辑**：波形可视化，分割/淡入淡出/删除片段/变速/导出 WAV
- **图片编辑**：AI 抠图（u2netp）、AI 移除（MI-GAN）、裁剪、马赛克、文字、改尺寸、旋转镜像、格式转换
