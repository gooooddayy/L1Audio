#!/usr/bin/env node
/**
 * L1Audio 单文件构建脚本
 *
 * 用法: 在仓库根目录执行  node tools/build_single.js
 * 依赖: 仅 Node.js 内置模块 (fs/path/crypto)，零第三方依赖
 *
 * 原理:
 *   1. 读取 template.html（主页骨架，工具内容处为 {{SRC:id}} 占位符）
 *   2. 读取 tools/ 下四个源页面，UTF-8 字节转 base64
 *   3. 注入占位符，输出仓库根目录的 index.html（自包含单文件，双击即用）
 *
 * 注意:
 *   - 四个源页面通过 iframe srcdoc 隔离运行，互相不干扰
 *   - 改完源页面后重新构建，再提交 index.html
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..');
const PAGES = {
  analysis: '音频分析.html',
  enhance: '音频增强.html',
  lyrics: '歌词精度转换.html',
  editor: '音频编辑.html',
};

function main() {
  const template = fs.readFileSync(path.join(__dirname, 'template.html'), 'utf-8');

  let out = template;
  for (const [id, file] of Object.entries(PAGES)) {
    const src = fs.readFileSync(path.join(__dirname, file), 'utf-8');
    const b64 = Buffer.from(src, 'utf-8').toString('base64');
    const marker = '{{SRC:' + id + '}}';
    if (!out.includes(marker)) {
      console.error('错误: 模板中找不到占位符 ' + marker);
      process.exit(1);
    }
    out = out.replace(marker, b64);
  }

  const dest = path.join(ROOT, 'index.html');
  fs.writeFileSync(dest, out);

  const hash = crypto.createHash('sha256').update(out).digest('hex').substring(0, 16);
  console.log('构建完成 ->', dest);
  console.log('大小:', Buffer.byteLength(out), 'bytes | sha256:', hash + '...');
}

main();
