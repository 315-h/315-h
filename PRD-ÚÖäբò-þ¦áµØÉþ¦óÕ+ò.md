# PRD 附录 · 项目素材索引

> **文档目的**：把当前仓库里可直接并入 PRD 的素材（需求说明、设计规范、数据契约、知识库、流程代码、测试用例、可交互原型）一次性梳理清楚，便于 AI 产品经理按章节选择性挂载到 PRD 附录或正文。
> **适用范围**：本仓库 (`C:/Users/Lenovo/WorkBuddy/经历翻译官网页/`) 内 **两个产品** ——「经历翻译官（AI 求职诊断工具）」与「缓择星球（方案对比工具 / 利弊梳理清单）」，以及其共用的「AI 产品经理求职作品集」。
> **生成时间**：2026-08-21 ｜ 扫描方式：项目根目录及一级子目录递归扫描，排除 `.git / .venv / __pycache__ / .workbuddy`。
> **使用建议**：本附录为"目录级索引"，不复制原文内容；把对应文件直接链接或复制粘贴到 PRD 附录即可。

---

## 〇、素材全景一览（按 PRD 章节归类）

| PRD 章节 | 可用素材数量 | 主要文件类型 |
|---|---|---|
| A. 需求说明 / 产品概述 | 1 份 Markdown | `README.md` |
| B. 产品设计 / 视觉规范 | 3 份 Markdown + 5 份 HTML 原型 + 1 份 CSS | `optimization-plan.md`、`ui-audit-经历翻译官.md`、`缓择星球网页版-设计优化方案.md`、`index.html`、`portfolio.html`、`jingli.html`、`huanze.html`、`xiaoban.html`、`huanzexingqiu-web/theme.css` |
| C. 接口契约 / 数据字典 | 1 份 Pydantic schema | `backend/schemas.py` |
| D. 算法与知识库 | 11 份岗位知识库 + 3 份规则库 + 1 份检索引擎 | `backend/knowledge/*.txt`、`backend/knowledge.py`、`backend/prompts.py`、`backend/templates.py`、`backend/workflows.py` |
| E. 技术实现 / 部署 | 1 份 README + 1 份 Dockerfile + 1 份 requirements | `backend/README.md`、`backend/main.py`、`backend/config.py`、`backend/Dockerfile`、`backend/requirements.txt` |
| F. 可交互原型 / Figma | 1 份 Figma 专用 HTML | `index.figma.html` |
| G. 测试用例 | 1 份 JS 单元测试 | `huanzexingqiu-web/tests/test_store.js` |

---

## A · 需求说明 / 产品概述

| # | 文件名 | 相对路径 | 大小 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| A1 | `README.md` | `./README.md` | 3.2KB | 经历翻译官的产品总览：单文件 HTML、AI 链路、6 大能力模块、2 种运行模式（演示 / 真实模式）、GitHub Pages 部署流程 | PRD 第 1 章「产品概述」+ 第 8 章「部署说明」直接引用 |

---

## B · 产品设计 / 视觉规范

### B-1 设计审查与规范文档

| # | 文件名 | 相对路径 | 大小 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| B1-1 | `optimization-plan.md` | `./optimization-plan.md` | 15KB | 5 页静态网页（index + portfolio + 三详情页）的设计审查 v2 修订版，**双轨制思路**（统一底层系统 + 保护产品个性），含 P0/P1/P2 优先级矩阵与已落地变更说明 | PRD 第 3 章「信息架构与设计原则」 |
| B1-2 | `ui-audit-经历翻译官.md` | `./ui-audit-经历翻译官.md` | 10KB | `index.html` 单文件主程序的 UI 审计报告，7 维度诊断（布局 / 配色 / 字体 / 间距 / 交互 / 可访问性 / 响应式），所有结论附行号 | PRD 第 3.4 节「主程序 UI 规范」+ 第 4 章「可访问性需求」 |
| B1-3 | `缓择星球网页版-设计优化方案.md` | `./huanzexingqiu-web/缓择星球网页版-设计优化方案.md` | 17KB | 缓择星球 8 页 + theme.css 1811 行的设计审查与可落地优化方案，含色彩 / 字体 / 间距 / 圆角 / 阴影 / 断点全面诊断 | PRD 第 3.5 节「缓择星球 UI 规范」 |

### B-2 可交互 HTML 原型

| # | 文件名 | 相对路径 | 行数 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| B2-1 | `index.html` | `./index.html` | 1833 | 经历翻译官主程序，完整可运行 + 内置差异化 mock + LocalStorage 持久化 | PRD 附录 B「可交互原型」—— 直接交付给评审 |
| B2-2 | `portfolio.html` | `./portfolio.html` | ≈480 | 作品集首页，承载 3 个作品的卡片网格 | PRD 附录 B |
| B2-3 | `jingli.html` | `./jingli.html` | ≈780 | 「经历翻译官」作品详情页（暖纸感） | PRD 附录 B |
| B2-4 | `huanze.html` | `./huanze.html` | ≈860 | 「缓择星球」作品详情页（星空感） | PRD 附录 B |
| B2-5 | `xiaoban.html` | `./xiaoban.html` | ≈900 | 「小半」作品详情页（商务冷调 / 蓝图） | PRD 附录 B |
| B2-6 | `huanzexingqiu-web/index.html` | `./huanzexingqiu-web/index.html` | 215 | 缓择星球产品主页 | PRD 附录 B |
| B2-7 | `huanzexingqiu-web/workspace.html` | `./huanzexingqiu-web/workspace.html` | 250 | 缓择星球核心：决策工作台 | PRD 附录 B |
| B2-8 | `huanzexingqiu-web/templates.html` | `./huanzexingqiu-web/templates.html` | 65 | 模板库页面 | PRD 附录 B |
| B2-9 | `huanzexingqiu-web/history.html` | `./huanzexingqiu-web/history.html` | 95 | 历史星轨页面（已存档决策回放） | PRD 附录 B |
| B2-10 | `huanzexingqiu-web/bottomline.html` | `./huanzexingqiu-web/bottomline.html` | 60 | 我的底线页面 | PRD 附录 B |
| B2-11 | `huanzexingqiu-web/settings.html` | `./huanzexingqiu-web/settings.html` | 100 | 设置与关于页面 | PRD 附录 B |
| B2-12 | `huanzexingqiu-web/cleanup.html` | `./huanzexingqiu-web/cleanup.html` | 100 | 数据清理页面 | PRD 附录 B |
| B2-13 | `huanzexingqiu-web/theme.css` | `./huanzexingqiu-web/assets/css/theme.css` | 1811 | 缓择星球完整设计系统（色彩 / 字体 / 间距 / 圆角 / 阴影 / 组件 / 响应式） | PRD 第 3.5 节「设计令牌清单」 |

---

## C · 接口契约 / 数据字典

| # | 文件名 | 相对路径 | 行数 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| C1 | `backend/schemas.py` | `./backend/schemas.py` | 41 | Pydantic 数据契约 —— `Block` / `Report` / `RewriteResult`，**与前端 `normalizeReport / renderReport / extractBlockContent / callCozeBot` 解析逻辑严格对齐**；`Report.to_dict()` 直接产出前端期望的 `{tabs:{key:[{id,title,content}]}}` 结构 | PRD 第 5 章「接口契约」+ 附录 D「数据字典」—— **核心文件，强烈建议原文收录** |

---

## D · 算法与知识库（AI 模型上下文）

### D-1 真实还原的扣子工作流 Prompt（21KB）

| # | 文件名 | 相对路径 | 大小 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| D1-1 | `backend/prompts.py` | `./backend/prompts.py` | 21KB | 真实还原扣子 `JING_LI_v1_5_SHENDU_workflow` 主工作流 9 节点 + `resume_extract` 子流程 + `local_rewrite` 子流程的 **真实节点 Prompt**（非反推），含 5 种沟通风格的 System Prompt（通用平衡 / 逻辑严谨 / 共情叙事 / 务实落地 / 灵活探索） | PRD 第 6 章「AI 算法说明」+ 附录 E「Prompt 模板清单」 |
| D1-2 | `backend/templates.py` | `./backend/templates.py` | 14KB | 离线兜底模板（无 API 密钥时使用），同步支持 5 种沟通风格 | PRD 附录 E |
| D1-3 | `backend/workflows.py` | `./backend/workflows.py` | 5.3KB | 工作流调度逻辑（报告生成 + 局部改写） | PRD 第 6.2 节「工作流设计」 |
| D1-4 | `backend/knowledge.py` | `./backend/knowledge.py` | 5.1KB | 岗位知识库检索引擎（关键词匹配 + 上下文注入） | PRD 第 6.3 节「知识库检索」 |

### D-2 11 份岗位知识库（`backend/knowledge/`）

> **统一说明**：每份 TXT 都是「该岗位的能力模型 + 评估维度 + 关键词词典」，作为 AI 报告生成的 RAG 检索上下文；按简历岗位关键词匹配注入到 Prompt。

| # | 文件名 | 相对路径 | 用途（能力模型 / 评估维度） | 建议放置位置 |
|---|---|---|---|---|
| D2-1 | `产品经理_B端C端AI.txt` | `./backend/knowledge/产品经理_B端C端AI.txt` | 产品经理岗位的能力模型（B 端 / C 端 / AI 三大分支） | PRD 附录 F「岗位能力字典」 |
| D2-2 | `产品运营_用户内容活动.txt` | `./backend/knowledge/产品运营_用户内容活动.txt` | 运营岗位能力模型（用户 / 内容 / 活动三大方向） | PRD 附录 F |
| D2-3 | `人力资源_招聘HRBP培训.txt` | `./backend/knowledge/人力资源_招聘HRBP培训.txt` | HR 岗位能力模型（招聘 / HRBP / 培训三大方向） | PRD 附录 F |
| D2-4 | `市场营销_品牌增长投放.txt` | `./backend/knowledge/市场营销_品牌增长投放.txt` | 市场岗位能力模型（品牌 / 增长 / 投放三大方向） | PRD 附录 F |
| D2-5 | `数据分析_商分数分BI.txt` | `./backend/knowledge/数据分析_商分数分BI.txt` | 数据分析岗位能力模型（商业 / 数据 / BI 三大方向） | PRD 附录 F |
| D2-6 | `用户研究员.txt` | `./backend/knowledge/用户研究员.txt` | 用户研究岗位能力模型 | PRD 附录 F |
| D2-7 | `应届生能力基线.txt` | `./backend/knowledge/应届生能力基线.txt` | 应届生通用能力基线（兜底用，任意岗位都能匹配） | PRD 附录 F |
| D2-8 | `简历量化STAR改写规则库.txt` | `./backend/knowledge/简历量化STAR改写规则库.txt` | STAR 改写规则（**这是规则库，非能力模型**，定义简历优化的量化、动词、结果描述等改写约束） | PRD 第 6.4 节「简历改写规则」 |
| D2-9 | `求职避坑规则库.txt` | `./backend/knowledge/求职避坑规则库.txt` | 风险提示规则库（**规则库**，定义"自吹自擂 / 流水账 / 缺乏量化"等扣分项） | PRD 第 6.4 节 |
| D2-10 | `能力缺口与成长路径.txt` | `./backend/knowledge/能力缺口与成长路径.txt` | 成长建议规则库（**规则库**，根据匹配度差距推荐学习路径） | PRD 第 6.4 节 |

---

## E · 技术实现 / 部署

| # | 文件名 | 相对路径 | 大小 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| E1 | `backend/README.md` | `./backend/README.md` | 9.1KB | **后端可行性评估与落地指南**——含 ① 扣子 → LangChain 迁移评估 ② 工作流节点映射 ③ 还原度证据 ④ 落地步骤 | PRD 第 7 章「技术架构」+ 第 8 章「部署指南」 |
| E2 | `backend/main.py` | `./backend/main.py` | 6.8KB | FastAPI 入口（路由 `/workflow/run` / `/chat/completions`） | PRD 第 7.2 节「后端接口」 |
| E3 | `backend/config.py` | `./backend/config.py` | 2.8KB | 配置（API 密钥读取、模型选择、温度、风格开关） | PRD 附录 G「配置项清单」 |
| E4 | `backend/.env.example` | `./backend/.env.example` | 548B | 环境变量模板（DEEPSEEK_API_KEY / QWEN_API_KEY / LANGCHAIN_TRACING） | PRD 附录 G |
| E5 | `backend/requirements.txt` | `./backend/requirements.txt` | 228B | Python 依赖清单（FastAPI / LangChain / OpenAI SDK / Pydantic） | PRD 附录 G |
| E6 | `backend/Dockerfile` | `./backend/Dockerfile` | 212B | Docker 镜像构建文件 | PRD 第 8 章「Docker 部署」 |

---

## F · 可交互原型 / Figma 专用

| # | 文件名 | 相对路径 | 大小 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| F1 | `index.figma.html` | `./index.figma.html` | 125KB（1930 行） | **Figma 专用原型版**——自包含、强制 mock 模式、加载即预渲染一份完整 6 模块示例报告（产品经理 / 通用平衡 / 中级），专门给 `html.to.design` 插件拖入 Figma 作高保真原型 | PRD 附录 H「高保真原型」—— 用 html.to.design 导入即可生成 Figma 图层 |

---

## G · 测试用例

| # | 文件名 | 相对路径 | 大小 | 用途 | 建议放置位置 |
|---|---|---|---|---|---|
| G1 | `huanzexingqiu-web/tests/test_store.js` | `./huanzexingqiu-web/tests/test_store.js` | 2.8KB | 缓择星球 `MMXStore` 数据层单元测试（决策增删改查 / 历史星轨 / 底线命中） | PRD 附录 I「测试用例」—— **目前仅 1 份，建议 PRD 同步规划补全** 经历翻译官前端、接口端、缓择其他模块的测试 |

---

## 〇·一 · 不建议放入 PRD 的文件（已排除）

扫描时一并识别出以下文件**与 PRD 无关**，不应被错误挂载：

| 文件 / 目录 | 原因 |
|---|---|
| `.git/` | Git 历史 |
| `.venv/` | Python 虚拟环境（已加 .gitignore） |
| `.workbuddy/` | WorkBuddy Agent 内部状态（memory / 临时 JS 校验） |
| `backend/__pycache__/` | Python 编译缓存 |
| `backend/.env` | 真实环境变量（含密钥，**严禁**复制到 PRD） |
| `web-upload.zip` | 部署打包产物（173KB，仅上传 GitHub 用） |
| `huanzexingqiu-web/_seed_demo.html` | 本地调试种子页（不入库） |

---

## 〇·二 · 使用建议（给 AI 产品经理）

1. **优先收录顺序**：A1（README 总览）→ B1-2 + B1-3（设计规范）→ C1（数据契约）→ D1-1（Prompt 模板）→ D2 系列（知识库）→ F1（Figma 原型）—— 这 6 类是评审最关注的内容。
2. **数据字典章节**：直接复制 `backend/schemas.py` 到附录 D，比手写更准确（含 `Report.to_dict()` 与前端契约的对齐说明）。
3. **AI 能力章节**：从 `backend/prompts.py` 抽取 5 种沟通风格的 System Prompt 到附录 E，体现产品的核心差异化（用户可切换风格）。
4. **设计规范章节**：B1-1 的「双轨制」是本项目设计哲学的核心论点，建议在 PRD 第 3 章开头引用，作为设计原则的决策依据。
5. **测试用例**：当前仅有 1 份（缓择 MMXStore），**PRD 应同步规划补全**：经历翻译官前端的 6 大模块渲染测试、后端两个 API 的契约测试、缓择工作台流程测试。
6. **保护敏感信息**：附录中**严禁**包含 `backend/.env`、`backend/knowledge/*.txt` 中的内嵌 API key（扫描确认当前 TXT 内无密钥，但仍需人工复核）。