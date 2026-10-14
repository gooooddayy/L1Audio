# L1Audio 开发笔记（架构 / 踩坑经验 / 维护指南）

> 换电脑后从本文件即可了解全部背景，不需要翻聊天记录。

## 一、项目结构

```
L1Audio/
├── index.html              # 交付物：单文件工具箱（构建产物，双击即用）
├── tools/                  # 源码目录
│   ├── 音频分析.html        #   音频质量分析器（深色主题，完全离线）
│   ├── 音频增强.html        #   音频增强器（完全离线）
│   ├── 歌词精度转换.html    #   LRC 歌词精度转换（依赖 Tailwind/Font Awesome CDN，需联网）
│   ├── 音频编辑.html        #   音频分割编辑器（完全离线）
│   ├── template.html       #   主页骨架（工具内容处为 {{SRC:id}} 占位符）
│   └── build_single.js     #   构建脚本（Node.js，零依赖）
└── DEVELOPMENT.md          # 本文件
```

**核心架构：单文件嵌入**

四个工具页面以 base64 编码嵌入 index.html 的 `<script type="text/plain" id="src-xxx">` 标签中，切换时由 JS 解码并写入 iframe 的 `srcdoc`。每个页面在独立 iframe 中运行，CSS/JS 完全隔离，**工具页面的原始内容零修改**。

## 二、日常维护流程（改 bug / 加功能）

```bash
# 1. 改 tools/ 下的对应源页面（不要直接改 index.html，它是产物）
# 2. 重新构建
node tools/build_single.js
# 3. 打开 index.html 验证功能
# 4. 提交：tools/源页面 + index.html 一起提交
```

**铁律：永远不要手改 index.html 里的工具内容**——那是 base64，手改无法回写到源文件。要改功能就去 `tools/` 改源页面再重新构建。

## 三、踩坑经验（重要，别再踩）

### 1. iframe 页面空白（内联样式优先级）
切换页面时 JS 先用 `el.style.display = 'none'`（内联样式）隐藏所有视图，若之后只靠 CSS 类 `.active { display: block }` 恢复显示，**内联样式优先级更高，页面会一直空白**。
✅ 修复：显示时显式设置 `target.style.display = 'block'`（或 'flex'），直接覆盖内联值。

### 2. 歌词页进入卡顿（CDN 懒加载）
歌词转换页依赖 Tailwind Play CDN（~400KB JS，**运行时 JIT 编译**，开销大）+ Font Awesome CDN。若懒加载（首次点击才加载 iframe），点击瞬间要下载 + 编译 + 重渲染，明显卡顿。
✅ 修复：页面打开时 `preloadAll()` 预加载全部 iframe srcdoc，CDN 资源提前获取。

### 3. 底部/顶部固定导航栏遮挡内容
固定横栏会挤压 iframe 可视区（原本 iframe 高度要减去栏高 `calc(100vh - 60px)`）。
✅ 现方案：无横栏，仅右上角浮动毛玻璃按钮条（`.toolbar`），iframe 占满 `100vh`。

### 4. EXE 打包失败（已放弃，勿再试）
尝试过 pywebview + PyInstaller 打包桌面 EXE，因沙箱删除拦截导致 pip 源码构建（proxy_tools）反复失败。结论：**单文件 HTML 已满足需求，不再做 EXE**。

### 5. 中文文件名 + bash 工具坑
- git-bash 中 `grep`/`for` 循环处理中文文件名会静默失败（编码问题），**用 node 脚本处理中文文件最稳**
- Windows 下 git-bash 的 `/tmp` 与 node 的路径映射不一致，node 读 `/tmp/xxx` 可能读到别的文件，临时文件一律放项目目录内

## 四、已知限制 / 待办

| 项 | 说明 | 优先级 |
|---|---|---|
| 歌词页需联网 | Tailwind/Font Awesome CDN，断网时样式缺失但功能可用 | 低（如需完全离线，可把 Tailwind 编译产物内嵌进源页面） |
| 首页图标重复 | 导航条已移除，主页 hero 大图标保留，右上角按钮条无图标 | 低 |
| 单文件 349KB | 全部 base64 内嵌所致，加载无感知问题 | 无需处理 |

## 五、四个工具页面功能速览

- **音频分析**：格式/采样率/频谱/动态范围分析，假无损与过采样检测
- **音频增强**：多模式增强 + 输出格式转换
- **歌词精度转换**：LRC 时间戳 2 位 ↔ 3 位毫秒互转，实时转换与导出
- **音频编辑**：波形可视化，分割/淡入淡出/删除片段/变速/导出 WAV
