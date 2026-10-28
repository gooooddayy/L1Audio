# L1Audio

一站式本地音频处理工具箱 — 分析、增强、歌词转换、音频编辑、图片编辑，全部本地运行，无需联网<br>
【WorkBuddy旧版】index.zip https://workbuddy.link/p/2dfsuX7AsjTBRRKgnARhkx?ext2=copy_link

## 五个工具

**音频质量分析**
分析音频文件的格式、采样率、频谱、动态范围，检测假无损与过采样

**音频增强器**
提升音频音质，支持多种增强模式与输出格式转换（WAV / MP3，MP3 编码库已内联）

**歌词精度转换**
LRC 歌词时间戳在 2 位与 3 位毫秒精度间互转，支持实时转换与导出

**音频分割编辑**
可视化波形编辑 — 分割、淡入淡出、删除片段、变速播放、导出 WAV

**图片编辑**
AI 抠图 · AI 移除去水印 · 改尺寸 · 旋转 · 镜像 · 裁剪 · 马赛克 · 文字 · 格式转换


## 怎么用

1. 下载仓库（`git clone` 或 Download ZIP）
2. 双击 `index.html`

注意：`index.html` 必须和 `L1-Photo-Editor/` 文件夹放在**同一层目录**下。前四个工具已 base64 内嵌进 `index.html`，只有「图片编辑」是独立目录（含 AI 模型，无法内嵌）。缺了这个目录，点图片编辑会提示「缺少本地资源文件夹」。

## 目录结构

```
L1Audio/
├── index.html            # 构建产物，双击即用
├── tools/                # 各工具源页面 + 构建脚本
│   ├── template.html     # 主页骨架（{{SRC:id}} 占位符）
│   ├── build_single.js   # 构建脚本，零依赖
│   ├── 音频分析.html
│   ├── 音频增强.html
│   ├── 歌词精度转换.html
│   └── 音频编辑.html
└── L1-Photo-Editor/      # 图片编辑器（含模型，不参与内嵌）
    ├── index.html
    ├── probe.js
    ├── models/           # u2netp / migan 模型（.b64.js 离线用，.onnx 在线用）
    └── ort/              # onnxruntime-web 推理引擎
```

改代码请看 [DEVELOPMENT.md](DEVELOPMENT.md)，改完必须重新构建 `index.html`。

## 体积说明

仓库约 210MB，绝大部分是图片编辑器的 AI 模型：

| 文件 | 大小 | 用途 |
|---|---|---|
| `models/u2netp.b64.0~2.js` | 57MB（3 片） | 抠图模型，file:// 离线用 |
| `models/u2netp.onnx.p0/.p1` | 42MB（2 片） | 抠图模型，http 部署用 |
| `models/migan.b64.js` | 36MB | 移除模型，file:// 离线用 |
| `models/migan_pipeline_v2.onnx` | 27MB | 移除模型，http 部署用 |
| `ort/ort-wasm.b64.js` | 28MB | 推理引擎 wasm，file:// 离线用 |

超过 20MB 的模型都做了分片：GitHub 单文件上限 100MB，且 clone 时大文件更容易断。编辑器会自动按「单片 → 分片」顺序探测，两种放法都能跑。

## 隐私

所有处理都在浏览器本地完成，音频、图片不上传任何服务器。首次打开 AI 功能不下载任何东西（模型就在本地目录里）。
