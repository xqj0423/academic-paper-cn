#!/usr/bin/env node
/**
 * build_paper_pdf.js
 * 
 * academic-paper-cn 核心脚本：Markdown 转高保真学术 PDF 编译工具
 * 
 * 核心特性：
 * 1. 语法防暴雷：自动识别并转换 $^{[n]}$ / $^{[n-m]}$ 避免与数学公式 $ 粘连成 $$ 导致语法坍缩
 * 2. 预编译 LaTeX 公式：通过 KaTeX 预编译行内与块级公式，彻底摆脱外部渲染器公式丢失或乱码问题
 * 3. 离线零外部依赖渲染：自动内嵌 KaTeX 样式与 Base64 矢量数学字体，离线无网环境下 100% 正常显示
 * 4. 学术排版标准：中文科技论文规范（三线表、A4 标准边距、开源/系统字体优雅回退）
 * 5. 公式溢出检测与可选自适应缩放（--auto-shrink）
 * 6. 多平台无头 Chromium/Edge 智能探测与打印：自适应 Windows / macOS / Linux 路径
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

const rawArgs = process.argv.slice(2);
const autoShrink = rawArgs.includes('--auto-shrink');
const args = rawArgs.filter(a => a !== '--auto-shrink');

if (args.length === 0) {
  console.log("Usage: node build_paper_pdf.js <input.md> [output.pdf] [--auto-shrink]");
  console.log("Example: node build_paper_pdf.js paper.md paper.pdf");
  console.log("Options:");
  console.log("  --auto-shrink   Enable automatic scaling for overlong display formulas (default: warning only)");
  process.exit(1);
}

const inputMdPath = path.resolve(args[0]);
const outputPdfPath = args[1]
  ? path.resolve(args[1])
  : inputMdPath.replace(/\.md$/i, '.pdf');

if (!fs.existsSync(inputMdPath)) {
  console.error("Error: Input file does not exist:", inputMdPath);
  process.exit(1);
}

// 智能依赖解析模块
function resolveDependencies() {
  const possiblePaths = [
    path.join(__dirname, '../node_modules'),
    path.join(__dirname, 'node_modules'),
    path.join(process.cwd(), 'node_modules')
  ];

  let markedLib, katexLib, katexDistPath;

  for (const base of possiblePaths) {
    try {
      if (!markedLib && fs.existsSync(path.join(base, 'marked'))) {
        markedLib = require(path.join(base, 'marked')).marked;
      }
      if (!katexLib && fs.existsSync(path.join(base, 'katex'))) {
        katexLib = require(path.join(base, 'katex'));
        katexDistPath = path.join(base, 'katex/dist');
      }
    } catch (e) {
      // 继续探测
    }
  }

  // 兜底尝试全局或当前环境 require
  if (!markedLib) {
    try { markedLib = require('marked').marked; } catch (e) {}
  }
  if (!katexLib) {
    try {
      katexLib = require('katex');
      try {
        const katexMain = require.resolve('katex');
        katexDistPath = path.join(path.dirname(katexMain), 'dist');
      } catch (e) {}
    } catch (e) {}
  }

  if (!markedLib || !katexLib) {
    console.error("Error: marked or katex not found. Please run 'npm install' in the skill directory.");
    process.exit(1);
  }

  return { marked: markedLib, katex: katexLib, katexDist: katexDistPath };
}

// 智能探测浏览器无头执行程序
function findChromiumExecutable() {
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }
  if (process.env.EDGE_BIN && fs.existsSync(process.env.EDGE_BIN)) {
    return process.env.EDGE_BIN;
  }

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';
  const isLinux = process.platform === 'linux';

  if (isWindows) {
    const candidates = [
      "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
      "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
      path.join(process.env.LOCALAPPDATA || '', "Microsoft\\Edge\\Application\\msedge.exe"),
      path.join(process.env.LOCALAPPDATA || '', "Google\\Chrome\\Application\\chrome.exe")
    ];
    for (const c of candidates) {
      if (c && fs.existsSync(c)) return c;
    }
  } else if (isMac) {
    const candidates = [
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium"
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  } else if (isLinux) {
    const candidates = [
      "/usr/bin/google-chrome",
      "/usr/bin/chromium-browser",
      "/usr/bin/chromium",
      "/usr/bin/microsoft-edge-stable"
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
  }

  return null;
}

const { marked, katex, katexDist } = resolveDependencies();
const browserExe = findChromiumExecutable();

if (!browserExe) {
  console.error("Error: Could not locate Microsoft Edge or Google Chrome executable for PDF generation.");
  console.error("Please ensure Edge or Chrome is installed, or set CHROME_BIN / EDGE_BIN environment variable.");
  process.exit(1);
}

let md = fs.readFileSync(inputMdPath, 'utf8');

// 1. 语法防暴雷机制：
// 避免 $^{[1]}$、$^{[1, 2]}$、$^{[1-3]}$ 与前序公式末尾的 $ 粘连坍缩为 $$
md = md.replace(/\$\^\{(\[[^}]+\])\}\$/g, '<sup>$1</sup>');
md = md.replace(/\$\^\{([0-9,\-\s]+)\}\$/g, '<sup>[$1]</sup>');
md = md.replace(/\^\{(\[[^}]+\])\}/g, '<sup>$1</sup>');

// 2. 保护代码块，避免代码中的 $ 或反斜杠被误提取
const codeBlocks = [];
md = md.replace(/```[\s\S]*?```/g, (match) => {
  codeBlocks.push(match);
  return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
});

// 3. 提取块级公式 $$ ... $$
const displayMathList = [];
md = md.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
  displayMathList.push(math.trim());
  return `%%DISPLAYMATH_${displayMathList.length - 1}%%`;
});

// 4. 提取行内公式 $ ... $
const inlineMathList = [];
md = md.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
  inlineMathList.push(math.trim());
  return `%%INLINEMATH_${inlineMathList.length - 1}%%`;
});

// 还原代码块
md = md.replace(/%%CODEBLOCK_(\d+)%%/g, (match, idx) => {
  return codeBlocks[parseInt(idx, 10)];
});

// 前置检查块级公式长度与溢出风险告警
let longFormulaWarnings = 0;
displayMathList.forEach((math, idx) => {
  if (math.length > 130 && !math.includes('\\\\')) {
    console.warn(`[Layout Warning] Display formula #${idx + 1} is long (${math.length} chars) and may approach A4 margin boundaries.`);
    longFormulaWarnings++;
  }
});

if (longFormulaWarnings > 0 && !autoShrink) {
  console.log(`[Tip] Detected ${longFormulaWarnings} long display formula(s). Standard publishing recommends manual line-breaking. Alternatively, pass --auto-shrink to enable automatic font scaling.`);
}

// 配置 marked 解析选项
marked.setOptions({ gfm: true, breaks: true });
let html = marked.parse(md);

let katexErrorCount = 0;

// 替换块级公式（预编译为 KaTeX 矢量 HTML）
html = html.replace(/%%DISPLAYMATH_(\d+)%%/g, (match, idx) => {
  const math = displayMathList[parseInt(idx, 10)];
  try {
    return katex.renderToString(math, { displayMode: true, throwOnError: false });
  } catch (err) {
    katexErrorCount++;
    console.warn(`KaTeX display math render warning on #${idx}:`, err.message);
    return `<div class="katex-error">${math}</div>`;
  }
});

// 替换行内公式（预编译为 KaTeX 矢量 HTML）
html = html.replace(/%%INLINEMATH_(\d+)%%/g, (match, idx) => {
  const math = inlineMathList[parseInt(idx, 10)];
  try {
    return katex.renderToString(math, { displayMode: false, throwOnError: false });
  } catch (err) {
    katexErrorCount++;
    console.warn(`KaTeX inline math render warning on #${idx}:`, err.message);
    return `<span class="katex-error">${math}</span>`;
  }
});

// 提取并内联 KaTeX 样式与 Base64 矢量字体（仅内联开源数学符号字体，不内联系统专有字体）
let katexCss = "";
if (katexDist && fs.existsSync(path.join(katexDist, 'katex.min.css'))) {
  katexCss = fs.readFileSync(path.join(katexDist, 'katex.min.css'), 'utf8');
  const fontsDir = path.join(katexDist, 'fonts');
  if (fs.existsSync(fontsDir)) {
    const fontFiles = fs.readdirSync(fontsDir);
    for (const f of fontFiles) {
      if (f.endsWith('.woff2')) {
        const fPath = path.join(fontsDir, f);
        const b64 = fs.readFileSync(fPath).toString('base64');
        const dataUrl = `data:font/woff2;base64,${b64}`;
        const regex = new RegExp(`fonts/${f}|${f}`, 'g');
        katexCss = katexCss.replace(regex, dataUrl);
      }
    }
  }
} else {
  // 兜底方案：引入 CDN 外部样式
  katexCss = `@import url('https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css');`;
}

// 组装完整的科技论文标准排版 HTML
const fullHtml = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<title>Paper Preview</title>
<style>
${katexCss}

@page {
  size: A4 portrait;
  margin: 25mm 20mm 20mm 20mm;
}

@media print {
  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}

*, *:before, *:after { box-sizing: border-box; }

body {
  font-family: "Times New Roman", "Source Han Serif SC", "Noto Serif CJK SC", "SimSun", "Songti SC", "STSong", serif;
  font-size: 10.5pt;
  line-height: 1.65;
  color: #111;
  background-color: #fff;
  margin: 0;
  padding: 0;
  text-align: justify;
}

/* 标题规范 */
h1 {
  font-family: "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif;
  font-size: 18pt;
  font-weight: bold;
  text-align: center;
  margin: 12px 0 16px 0;
  line-height: 1.4;
}

h2 {
  font-family: "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif;
  font-size: 13pt;
  font-weight: bold;
  margin: 22px 0 10px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #111;
  page-break-after: avoid;
}

h3 {
  font-family: "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif;
  font-size: 11pt;
  font-weight: bold;
  margin: 16px 0 8px 0;
  page-break-after: avoid;
}

h4 {
  font-family: "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "SimHei", "Heiti SC", sans-serif;
  font-size: 10.5pt;
  font-weight: bold;
  margin: 12px 0 6px 0;
  page-break-after: avoid;
}

/* 段落与缩进 */
p {
  margin: 0 0 8px 0;
  text-indent: 2em;
}

p.no-indent, h1 + p, h2 + p, h3 + p, pre, table, .doc-author {
  text-indent: 0;
}

/* 列表规范 */
ul, ol {
  margin: 6px 0 12px 0;
  padding-left: 28px;
}
li {
  margin-bottom: 4px;
  line-height: 1.55;
}
li > p {
  text-indent: 0;
  margin-bottom: 2px;
}

hr {
  border: 0;
  border-top: 0.5pt solid #bbb;
  margin: 16px 0;
}

/* 科技论文标准三线表 (Three-Line Table) */
table {
  width: 100%;
  border-collapse: collapse;
  margin: 14px 0 18px 0;
  font-size: 9pt;
  line-height: 1.45;
  border-top: 1.5pt solid #000;
  border-bottom: 1.5pt solid #000;
  word-break: break-word;
}

thead {
  display: table-header-group;
}

tr {
  page-break-inside: avoid;
}

thead th {
  font-family: "Source Han Sans SC", "Noto Sans CJK SC", "Microsoft YaHei", "SimHei", sans-serif;
  font-weight: bold;
  border-bottom: 0.75pt solid #000;
  padding: 6px 6px;
  text-align: center;
  background-color: #fafafa;
}

tbody td {
  padding: 5px 6px;
  border-bottom: 0.5pt solid #ededed;
  text-align: left;
  vertical-align: middle;
}

tbody tr:last-child td {
  border-bottom: none;
}

/* 代码块 */
pre {
  background-color: #f8f9fa;
  border: 0.75pt solid #dcdcdc;
  border-radius: 3px;
  padding: 8px 12px;
  font-family: Consolas, "Courier New", monospace;
  font-size: 8.5pt;
  line-height: 1.4;
  overflow-x: auto;
  margin: 10px 0 14px 0;
  page-break-inside: avoid;
  white-space: pre-wrap;
}

code {
  font-family: Consolas, "Courier New", monospace;
  font-size: 9pt;
  background-color: #f1f1f1;
  padding: 1px 4px;
  border-radius: 2px;
}

pre code {
  background-color: transparent;
  padding: 0;
}

/* 数学公式 */
.katex-display {
  margin: 10px 0 !important;
  padding: 3px 0;
  page-break-inside: avoid;
  max-width: 100%;
}
.katex-display > .katex {
  max-width: 100%;
  text-align: center;
}
li .katex-display {
  margin-left: -14px;
}

.katex {
  font-size: 1.05em;
  text-indent: 0 !important;
}

/* 上标引用 */
sup {
  font-size: 75%;
  line-height: 0;
  position: relative;
  vertical-align: baseline;
  top: -0.5em;
}

/* 文首作者及摘要区域居中 */
p:nth-of-type(1), p:nth-of-type(2), p:nth-of-type(3) {
  text-align: center;
  text-indent: 0;
}
</style>
</head>
<body>
${html}
<script>
${autoShrink ? `
// 自动测量并自适应微缩溢出块级公式（由 --auto-shrink 参数显式开启）
document.querySelectorAll('.katex-display').forEach(el => {
  const containerW = el.clientWidth;
  const khtml = el.querySelector('.katex-html');
  if (khtml && containerW > 50) {
    khtml.style.display = 'inline-block';
    const trueW = khtml.offsetWidth;
    khtml.style.display = '';
    if (trueW > containerW) {
      const scale = Math.min(1, (containerW - 16) / trueW);
      el.style.fontSize = (scale * 100).toFixed(1) + '%';
    }
  }
});
` : ''}
</script>
</body>
</html>`;

const tempDir = os.tmpdir();
const tempHtmlPath = path.join(tempDir, `academic_paper_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.html`);
const tempUserDataDir = path.join(tempDir, `edge_profile_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);

fs.writeFileSync(tempHtmlPath, fullHtml, 'utf8');

const printCmd = `"${browserExe}" --headless=new --disable-gpu --user-data-dir="${tempUserDataDir}" --no-pdf-header-footer --print-to-pdf="${outputPdfPath}" "file:///${tempHtmlPath.replace(/\\/g, '/')}"`;

try {
  console.log(`Compiling academic PDF using: ${path.basename(browserExe)} ...`);
  execSync(printCmd, { stdio: 'pipe' });
  if (fs.existsSync(outputPdfPath)) {
    const stats = fs.statSync(outputPdfPath);
    console.log(`[Success] PDF generated: ${outputPdfPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    throw new Error("Output PDF was not generated by browser process.");
  }
} catch (err) {
  console.error("PDF generation failed:", err.message);
  process.exit(1);
} finally {
  try {
    if (fs.existsSync(tempHtmlPath)) fs.unlinkSync(tempHtmlPath);
    if (fs.existsSync(tempUserDataDir)) fs.rmSync(tempUserDataDir, { recursive: true, force: true });
  } catch (e) {
    // 临时文件静默清理
  }
}
