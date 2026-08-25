# 作品集 · 韩佳雪 AI 产品经理求职

> 把三段真实 AI 产品实战，做成可点开、可读懂、可下载的作品集。

这是韩佳雪（Han Jiaxue）面向 **AI 产品经理岗位** 的求职作品集。仓库即站点，GitHub Pages 直接访问。

**线上入口**：<https://315-h.github.io/315-h/>

---

## 三个产品 · 三份完整作品

| 产品 | 类型 | 详情页 | 在线体验 | PRD | 测试集 | 复盘 / 源文件 |
| --- | --- | --- | --- | --- | --- | --- |
| **经历翻译官** | 单文件 HTML · 求职诊断 | `jingli.html` | [`jingli-app.html`](jingli-app.html) | [PDF](PRD-Experience.pdf) | — | — |
| **缓择星球** | 微信小程序 + 网页版 · 决策对比工具 | `huanze.html` | [网页版](huanzexingqiu-web/index.html) | [PDF](PRD-HuanZe.pdf) | [测试集 xlsx](HuanZe-TestSet.xlsx) | [复盘 PDF](HuanZe-Review.pdf) |
| **小办 / 小半** | RAG Agent · 企业事务助手 | `xiaoban.html` | — | [PDF](PRD-XiaoBan.pdf) | [测试集 xlsx](XiaoBan-TestSet.xlsx) | [复盘 PDF](XiaoBan-Retro.pdf) · [工作流源文件 zip](XiaoBan-WorkflowSrc.zip) |

下载简历：[`Resume-HanJiaxue.pdf`](Resume-HanJiaxue.pdf)

---

## 目录结构

```
.
├── portfolio.html         # 作品集首页（用户视角入口）
├── index.html             # 根入口（= portfolio.html 副本，GitHub Pages 要求）
├── jingli.html            # ① 经历翻译官 · 详情页
├── jingli-app.html        # ① 经历翻译官 · 可交互产品前端
├── huanze.html            # ② 缓择星球 · 详情页
├── huanzexingqiu-web/     # ② 缓择星球 · 网页版（多页静态站点）
├── xiaoban.html           # ③ 小办 / 小半 · 详情页
├── Resume-HanJiaxue.pdf   # 简历
├── PRD-*.pdf              # 三个产品 PRD（一份一份）
├── *TestSet.xlsx          # 缓择 / 小办测试集
├── *Review.pdf / *Retro.pdf   # 迭代复盘
├── XiaoBan-WorkflowSrc.zip    # 小办 LangChain 工作流源文件
├── backend/               # 经历翻译官 · 本地 LangChain 后端（FastAPI，可选）
└── .nojekyll              # 关闭 GitHub Pages 的 Jekyll 处理
```

---

## 部署说明

仓库根目录即 GitHub Pages 站点根目录。

1. **Settings → Pages** → Source 选 `Deploy from a branch`，Branch 选 `main` / 根目录 `/`。
2. 等待 1~2 分钟，访问 `https://<用户名>.github.io/<仓库名>/`。
3. 根 URL `/` 自动走 `index.html`（即 `portfolio.html` 副本 → 作品集首页）。

---

## 技术栈

- **前端**：原生 HTML / CSS / JavaScript，零构建、零依赖。
- **作品集可视化**：CSS 变量双主题、滚动 reveal、卡片预览。
- **经历翻译官后端**（可选）：FastAPI + LangChain + langchain-openai（DeepSeek / 通义千问 Qwen）。详见 `backend/README.md`。
- **数据存储**：纯前端 LocalStorage，简历不落服务端。

---

## 隐私

- 所有作品页跑在浏览器静态资源，**简历与对话内容不离开本机**。
- GitHub Pages 部署的演示版仅作作品展示，不收集任何用户数据。

---

## 简历外的资料

- 体验完整产品：在详情页点「在线体验」「打开网页版」即可。
- 看每个产品的真实决策记录：点详情页底部「查看 PRD ↗」「迭代方案与复盘」。

---

© 2026 Han Jiaxue · 仅供求职辅助演示使用。
