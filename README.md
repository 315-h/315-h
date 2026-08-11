# 经历翻译官 · AI 求职诊断工具

把一段普通履历，翻译成可投递、可面试、可诊断的求职资产。单文件 HTML 网页，零构建、零依赖，**打开即用**。

## 一句话看懂产品链路

> **前端（原生 HTML）** ＋ **AI 演示原型载体：Coze（扣子）** ＋ **底层自研框架：LangChain（RAG / 多智能体）** → **数据本地存储（浏览器 LocalStorage）**

- **前端**：单文件 `index.html`，响应式，原生 HTML/CSS/JS，无框架无打包。
- **AI 原型载体**：Coze（扣子）承载交互原型与对话 Demo 的结构设计。
- **底层底座**：本地 LangChain 服务（DeepSeek / Qwen）是报告生成与多轮咨询的引擎；**本演示网页默认离线运行，LangChain 未部署于此页**。
- **隐私**：用户简历仅保存在浏览器 LocalStorage，**不上传任何服务器**。

## 六大能力模块

1. 经历核心信息提取
2. 可迁移能力识别
3. 岗位匹配度评估
4. 简历优化文案
5. 面试问答素材（含团队协作题）
6. 能力跃迁规划（含金融 AI 专项分支）

## 两种运行模式

| 模式 | 触发 | 说明 |
| --- | --- | --- |
| **演示模式（默认）** | `USE_REAL_API = false` | 前端内置差异化模拟数据，无需任何后端，**GitHub Pages 直接可用** |
| **真实模式** | 页面内切换「真实接口」 | 调用本地 LangChain 后端（8000 端口），产出真实 AI 报告与图片 OCR |

## 部署到 GitHub Pages（作品集链接）

本仓库根目录的 `index.html` 即为站点入口，可直接作为静态站点托管：

1. 把本仓库推到 GitHub。
2. 仓库 **Settings → Pages**，Source 选 `Deploy from a branch`，Branch 选 `main` / 根目录 `/`。
3. 等待部署完成，访问 `https://<用户名>.github.io/<仓库名>/`。

> 公网部署下默认走演示模式（mock），真实 AI 生成与图片 OCR 依赖本地后端，需在本人机器运行 `backend/` 后切换真实模式。

## 本地运行（含真实 AI 后端）

```bash
# 1) 启动前端静态服务
cd <项目根目录>
python -m http.server 8080
#   浏览器打开 http://127.0.0.1:8080/index.html

# 2) 启动 LangChain 后端（需 Python 3.10+，并配置 backend/.env 的 API Key）
cd backend
python -m venv .venv && .venv\Scripts\activate      # Windows
pip install -r requirements.txt
cp .env.example .env                                # 填入 DEEPSEEK_API_KEY / QWEN_API_KEY
uvicorn main:app --host 127.0.0.1 --port 8000
```

后端详情见 [`backend/README.md`](backend/README.md)。

## 目录结构

```
.
├── index.html          # 单文件前端（站点入口）
├── backend/            # 本地 LangChain 后端（FastAPI，可选）
│   ├── main.py         # 接口：/workflow/run /chat/completions /ocr /ping /health
│   ├── prompts.py      # 报告生成 Prompt（含 5 种沟通风格）
│   ├── knowledge.py    # 岗位知识库检索（RAG）
│   └── README.md
└── .gitignore          # 已忽略 .env / .venv / __pycache__ 等
```

---

© 经历翻译官 · 仅供求职辅助演示使用。
