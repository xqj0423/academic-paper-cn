#!/usr/bin/env node
/**
 * test_runner.js
 * 
 * academic-paper-cn 自动化测试套件
 * 检验项：
 * 1. KaTeX 公式解析 0 错误
 * 2. build_paper_pdf.js 进程执行退出码 0
 * 3. 产物 PDF 存在性与文件结构完整性（%PDF 头部、页面标记、有效体积）
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log("=== Running academic-paper-cn automated test suite ===");

const rootDir = path.resolve(__dirname, '..');
const demoMd = path.join(rootDir, 'examples/demo_paper.md');
const outputPdf = path.join(rootDir, 'examples/demo_paper.pdf');
const buildScript = path.join(rootDir, 'scripts/build_paper_pdf.js');

if (!fs.existsSync(demoMd)) {
  console.error("FAIL: demo_paper.md not found at", demoMd);
  process.exit(1);
}

// 1. 公式语法前置断言
const { marked } = require(path.join(rootDir, 'node_modules/marked'));
const katex = require(path.join(rootDir, 'node_modules/katex'));

let md = fs.readFileSync(demoMd, 'utf8');
md = md.replace(/\$\^\{(\[[^}]+\])\}\$/g, '<sup>$1</sup>');
md = md.replace(/\$\^\{([0-9,\-\s]+)\}\$/g, '<sup>[$1]</sup>');
md = md.replace(/\^\{(\[[^}]+\])\}/g, '<sup>$1</sup>');

// 保护代码块
const codeBlocks = [];
md = md.replace(/```[\s\S]*?```/g, (match) => {
  codeBlocks.push(match);
  return `%%CODEBLOCK_${codeBlocks.length - 1}%%`;
});

// 提取块级公式
const displayMath = [];
md = md.replace(/\$\$([\s\S]*?)\$\$/g, (m, f) => {
  displayMath.push(f.trim());
  return `%%DISPLAYMATH_${displayMath.length - 1}%%`;
});

// 提取行内公式
const inlineMath = [];
md = md.replace(/\$([^\$\n]+?)\$/g, (m, f) => {
  inlineMath.push(f.trim());
  return `%%INLINEMATH_${inlineMath.length - 1}%%`;
});

let formulaErrors = 0;
displayMath.forEach((f, i) => {
  try {
    katex.renderToString(f, { displayMode: true, throwOnError: true });
  } catch(e) {
    formulaErrors++;
    console.error(`KaTeX Display Error on #${i}:`, e.message);
  }
});

inlineMath.forEach((f, i) => {
  try {
    katex.renderToString(f, { displayMode: false, throwOnError: true });
  } catch(e) {
    formulaErrors++;
    console.error(`KaTeX Inline Error on #${i}:`, e.message);
  }
});

if (formulaErrors > 0) {
  console.error(`FAIL: KaTeX formula audit found ${formulaErrors} error(s).`);
  process.exit(1);
}
console.log(`[PASS] KaTeX syntax check passed (${displayMath.length} display, ${inlineMath.length} inline, 0 errors).`);

// 2. 运行构建脚本生成 PDF
if (fs.existsSync(outputPdf)) {
  try { fs.unlinkSync(outputPdf); } catch(e) {}
}

try {
  execSync(`node "${buildScript}" "${demoMd}" "${outputPdf}"`, { stdio: 'inherit' });
} catch(err) {
  console.error("FAIL: PDF generation exited with error:", err.message);
  process.exit(1);
}

// 3. 产物完整性断言
if (!fs.existsSync(outputPdf)) {
  console.error("FAIL: Expected output PDF was not created:", outputPdf);
  process.exit(1);
}

const stats = fs.statSync(outputPdf);
if (stats.size < 20 * 1024) {
  console.error(`FAIL: Output PDF size unexpectedly small: ${stats.size} bytes`);
  process.exit(1);
}

const pdfBuf = fs.readFileSync(outputPdf);
const pdfHeader = pdfBuf.slice(0, 5).toString('ascii');
if (pdfHeader !== '%PDF-') {
  console.error("FAIL: Generated file is not a valid PDF header:", pdfHeader);
  process.exit(1);
}

let pageCount = 0;
const pdfStr = pdfBuf.toString('latin1');
let pos = 0;
while ((pos = pdfStr.indexOf('/Type /Page', pos)) !== -1) {
  pageCount++;
  pos += 11;
}

console.log(`[PASS] PDF integrity verified: ${(stats.size / 1024).toFixed(1)} KB, valid %PDF- header, approx ${pageCount} pages.`);
console.log("\n>>> ALL TESTS PASSED SUCCESSFULLY! <<<\n");
process.exit(0);
