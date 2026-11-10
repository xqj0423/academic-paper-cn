# academic-paper-cn

> **面向中文工科论文的可靠 AI 辅助写作与排版核验 Agent Skill**  
> 核心宗旨：**让 AI 辅助生成的中文工科论文，在数据、公式、引用和排版形式上更加可靠。**

[![Version](https://img.shields.io/badge/version-v0.1.0%20(Initial%20Release)-orange.svg)](package.json)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org)
[![KaTeX](https://img.shields.io/badge/KaTeX-Math%20Engine-purple.svg)](https://katex.org)

---

## 💡 项目背景与定位

当前大语言模型辅助学术写作时，普遍存在两大痛点：
1. **数据与逻辑幻觉**：容易在力学推导、量纲换算、边界极限中出现隐蔽错误，无法自动识别代码输出值与理论手算值的不一致；
2. **排版格式灾难**：Markdown 中复杂的数学公式、GB/T 7714 参考文献上标在转为 PDF/Word 时频频出现字符碰撞、公式缺失、字体错乱与跨页表格变形。

`academic-paper-cn` 是一套面向中文工科论文学术写作与审查的 Agent Skill。当前首发版本（`v0.1.0 Initial Release`）重点基于**机械工程领域（螺栓连接与螺栓组受力校核）的真实算例**完成了端到端流程验证，欢迎其他工科专业（如土木、力学、电气等）贡献专业模板与验证算例。

> **重要声明与学术责任**：
> 1. 本项目定位为辅助研究与自查工具，**作者本人对论文的数据真实性、力学结论及最终表述负全部学术责任**；
> 2. 使用者须严格遵守所在高校、科研单位及目标期刊会议的 AI 工具使用政策与伦理规范；
> 3. 核验模块（`references/verification.md`）为指导 Agent 审查的工作流清单，**并非**全自动化代码计算断言器，具体计算仍须通过独立算式或人工复核。

---

## 🎯 适用与不适用场景 (Scope of Application)

为避免工具误用，请参考以下适用场景对比：

| 维度 | 适用场景 (Recommended) | 不适用场景 (Not Recommended) |
| :--- | :--- | :--- |
| **文稿类型** | 高校工科课程设计、大作业报告、毕业设计初稿、内部技术备忘录、预印本（如 ChinaXiv / arXiv）学术交流稿 | 最终必须提交 Word 格式排版的中文核心期刊定稿；强制要求提供完整 LaTeX 源工程的学术会议 |
| **排版需求** | 包含中大量数学公式、学术三线表、代码块及标准引用的单栏技术文档 | 需要复杂双栏混排、复杂跨栏浮动图表或期刊专用特殊宏包的版面 |
| **工作流定位** | 借助 AI Agent 进行提纲规划、表达润色、量纲排查及一键输出阅读级/评审级 PDF | 期望 AI “全自动代写代投”或无需作者人工复核直接定稿的场景 |

### 常见疑问：为什么不直接用 Pandoc 或 Typst？
* **对比 Pandoc**：Pandoc 默认导出 PDF 依赖庞大的 TeXLive/MacTeX 环境（体积数 GB，安装配置较重，且中文字体与行内公式断行容易冲突）。本项目基于 Node.js + KaTeX + 现代操作系统内置的无头浏览器打印，零 TeX 依赖，轻量且完全离线。
* **对比 Typst**：Typst 是一款优秀的现代排版系统，但多数工科初学者与既有技术文档基于通用 Markdown 编写。本项目直接针对通用 Markdown 语法，天然与 Antigravity、Codex、Claude Code 等 Agent 生态无缝协同，免除语法学习与迁移成本。

---

## 📂 项目目录结构

```text
academic-paper-cn/
├── SKILL.md                  # 主工作流程定义（符合 Agent Skills 规范）
├── package.json              # 项目元数据与脚本（声明 Node >=18.0.0 与 engines）
├── package-lock.json         # 依赖确定性锁定文件
├── LICENSE                   # 开源许可协议（MIT）及第三方开源项目权利声明
├── README.md                 # 项目文档与使用说明
├── scripts/
│   ├── build_paper_pdf.js    # Markdown 转 PDF 编译脚本（语法防暴雷、超宽公式检测）
│   └── test_runner.js        # 自动化测试脚本（断言 KaTeX 解析与 PDF 结构）
├── references/
│   ├── writing-rules.md      # 中文工科论文写作规范（五要素摘要、三线表、GB/T 7714、AI声明模板）
│   └── verification.md       # 数据核验清单（双轨复核方法、量纲防错、边界对抗、未核验标签）
└── examples/
    └── demo_paper.md         # 简短、规范、完全公开的工科演示论文（平面对称螺栓组防滑验算）
```

---

## 🚀 核心功能模块

### 1. 论文规划 (Paper Planning)
- **选题聚焦**：明确工程痛点与算法贡献，拒绝空洞叙述；
- **五层纵深结构**：引言 $\to$ 架构与算法设计 $\to$ 力学理论与控制方程 $\to$ 算例与双轨复核 $\to$ 讨论与局限性；
- **规划先行**：在完成参数梳理与计算链路设计前严禁盲目堆砌正文。

### 2. 论文撰写 (Paper Writing)
- **摘要五要素**：中英文对称覆盖**目的 (Objective)**、**方法 (Methods)**、**结果 (Results)**、**局限 (Limitations)** 与 **结论 (Conclusions)**；
- **符号表三要素**：正文前设立标准三线符号表，包含符号、含义推导式与法定计量单位；
- **GB/T 7714 参考文献著录**：支持专著 [M]、期刊 [J]、标准 [S]、学位论文 [D]、论文集 [C] 的标准著录，未核验原书文献显式标注；
- **学术诚信与 AI 披露**：参考 COPE 与国际主流出版机构关于 AI 工具使用的披露建议，提供规范的“作者贡献声明”与“AI 使用声明”模板。

### 3. 内容核验清单 (Content Verification Checklist)
- **双轨复核清单**：建议采用“独立公式手算推导脚本”与“程序实际运行结果”并列比对；
- **量纲一致性审计**：统一采用 $\text{N}$、$\text{mm}$、$\text{N}\cdot\text{mm}$、$\text{MPa}$（$\text{N/mm}^2$），防范米制与毫米制混用造成的 $10^3$ 量纲失真；
- **边界对抗测试**：横向剪力与转矩强制采用“平面矢量合成”，并与标量相加进行保守性对比；倾覆工况下将新模型与经典保守界（$\chi = 0$）并列呈现；
- **未核验项透明披露**：对尚未查证版权页的参考文献、旧版标准数据强制标注 `【未核对原书】`、`【未核对现行版原文】`、`【设计输入】`。

### 4. PDF 导出 (PDF Export)
- **语法防暴雷**：自动将 `$^{[1]}$` 等角标转换为安全 HTML 标签 `<sup>[1]</sup>`，避免 `$0.2\sim 0.3$$^{[1]}$` 相邻美元符号坍缩为块级公式；
- **KaTeX 矢量预编译**：无需 TeXLive 运行环境，在本地 Node.js 环境下毫秒级渲染复杂公式；
- **超宽公式检测与可选微缩**：默认检测并警告可能超出版心的长公式，建议作者手动折行；可使用 `--auto-shrink` 参数显式开启字号平滑自适应微调；
- **离线 Base64 矢量数学字体**：内联开源数学符号字体，无外网依赖；
- **标准三线表与排版 CSS**：顶线 1.5pt、栏目线 0.75pt、底线 1.5pt，表头跨页自动延续（`thead { display: table-header-group; }`）；
- **系统/开源字体回退**：字体样式优先调用系统或开源字族（Times New Roman、思源宋体/黑体、SimSun），不打包或再分发商业专有字体。

---

## 🛠️ 快速上手

### 环境准备
- **Node.js**：>= 18.0.0
- **浏览器**：系统中已安装 Microsoft Edge 或 Google Chrome（当前端到端实测基于 Windows Edge 完成；代码内置了 macOS / Linux 常见 Chromium 路径自动探测，欢迎跨平台实测与反馈）

### 1. 安装依赖
```bash
git clone https://github.com/xqj0423/academic-paper-cn.git
cd academic-paper-cn
npm install
```

### 2. 运行自动化测试与演示算例
```bash
# 运行自动化测试套件（断言公式解析 0 错误、PDF 结构完整性）
npm test

# 编译内置演示论文（examples/demo_paper.md -> examples/demo_paper.pdf）
npm run demo
```

### 3. 将您自己的 Markdown 编译为 PDF
```bash
# 基本用法（检测超宽公式并输出告警，保持原公式字号）
node scripts/build_paper_pdf.js my_paper.md my_paper.pdf

# 可选：允许对超宽公式自动微调字号防止截断
node scripts/build_paper_pdf.js my_paper.md my_paper.pdf --auto-shrink
```

---

## 🧪 真实工程论文测试验证 (Real-World Benchmark)

在开发阶段，本项目在真实的机械工程论文《基于 Python 的螺纹连接与螺栓组强度校核工具设计与实现》（`paper___2026-11-10.md`）上完成了全流程测试验证：

1. **数学公式压力测试**：
   - 全文包含 **23 个块级独立公式**（含分式、多行联立、极限与 `\tag{N}` 编号）以及 **327 个行内公式**；
   - 经 KaTeX 语法检查与无头浏览器测量：**0 处渲染错误**；
   - 在实测样例中，针对长达 163 字符的长公式，通过前置告警机制与自适应微缩选项，排查并消除了版心边缘截断隐患。
2. **三线表与版面测试**：
   - 包含子命令表、5 组基础算例手算-代码比对表、工程工况 E 参数校核表；
   - 表头层次分明，顶线/栏目线/底线遵循科技三线表规范，表格跨页无内容撕裂。
3. **角标语法与引用测试**：
   - 自动纠正了正文中多处与行内公式末尾紧挨的角标，消除了块级崩溃隐患；
   - 对缺少出版年、出版社信息的文献 [5] 如实附加了待核验批注，明确区分已核验与待补全内容。
4. **应力计算双轨核验**：
   - 松螺栓拉伸应力 $\sigma = 212.86\text{ MPa}$；
   - 组合载荷平面逐螺栓矢量合成模长 $5692.10\text{ N}$ 与标量直接相加 $6000\text{ N}$ 偏差约 5%；
   - 倾覆力矩统一分配模型（$\chi = 0.25$）与经典保守界（$\chi = 0$）的抗分离对比客观呈现。

> **说明**：上述测试验证了 Skill 工具在排版编译与审查清单流程上的可用性；论文本身的学术数据与文献仍需作者对照原始教材与最新标准进一步终审确认。公开仓库推荐使用 `examples/demo_paper.md` 进行可复现的功能测试。

---

## 🗺️ 项目演进路线 (Roadmap)

本项目采用务实演进策略：

* **v0.1.0 Initial Release（当前版本）**：
  - 中文工科论文四大核心工作流与审查清单；
  - KaTeX 公式预编译、超宽公式检测与可选微缩（`--auto-shrink`）、学术三线表与 Base64 离线数学字体；
  - 自动化测试套件（`npm test`）与公开演示算例（`npm run demo`）；
  - Windows (Edge) 环境下完成机械工程实测验证。
* **v0.1.1（排版告警强化）**：
  - 增加 PDF 构建前表格超宽或跨页异常提示；
  - 优化超宽长公式在列表中的缩进边距处理。
* **v0.2.0（自动化核验增强）**：
  - 增加 GB/T 7714 参考文献核心著录项（出版年、出版社、页码）缺项自动检测；
  - 引入基于结构化数据表（YAML）的理论期望值与代码结果比对脚本；
  - 引入 GitHub Actions 三平台（Windows / macOS / Ubuntu）CI 自动化构建矩阵。
* **v1.0.0（跨平台正式版）**：
  - 完善多平台 Chromium 无头渲染兼容性测试；
  - 拓展土木、力学、电气等多工科专业模板库与使用手册。

---

## 🤖 在 AI Agent 环境中使用

### 作为 Antigravity Skill 使用
将本目录放置于 Antigravity 的技能配置目录中：
- 全局路径：`~/.gemini/config/skills/academic-paper-cn`
- 或工作区路径：`<Workspace>/.gemini/skills/academic-paper-cn`

当需要规划工科论文、核对工程算例或生成 PDF 时，向 Agent 发送指令即可自动调度本 Skill。

### 作为 Codex / Claude Code 工具使用
直接在提示词中挂载 `SKILL.md` 与 `references/` 规范文件，或直接运行 CLI 脚本即可复用完整工作流。

---

## 📜 许可证与致谢声明 (License & Acknowledgments)

本项目采用 **[MIT 许可证](LICENSE)** 开源。

本项目区分了运行时直接调用的依赖与仅借鉴思路的设计参考：

**1. 运行时直接依赖（代码实际调用）**：
* **[KaTeX](https://github.com/KaTeX/KaTeX)** (MIT License) — 提供离线 LaTeX 数学公式预编译引擎与矢量数学字体
* **[Marked](https://github.com/markedjs/marked)** (MIT License) — 提供高性能 Markdown AST 解析支持

**2. 工作流与理念致谢（仅借鉴思路，未复制代码）**：
* **[aniketkrs/research-paper](https://github.com/aniketkrs/research-paper)** (MIT License) — 借鉴其 Plan-Before-Write 论证策划机制
* **[lishix520/academic-paper-skills](https://github.com/lishix520/academic-paper-skills)** (MIT License) — 借鉴其多阶段学术写作组织模式
* **[WenyuChiou/academic-writing-skills](https://github.com/WenyuChiou/academic-writing-skills)** (MIT License) — 借鉴其学术规范与审阅流程

**开发者声明**：本项目由机械工程专业开发者主导完成需求架构设计、工程力学逻辑梳理、测试算例构建及排版实测验证；代码与工具编写过程中合理借助了 AI 辅助工具完成部分脚本原型与语法排查。所有第三方开源项目权利均归原作者所有，完整版权声明与许可文本请参阅 [LICENSE](LICENSE)。
