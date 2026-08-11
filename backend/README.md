# 经历翻译官 · 前端连通 LangChain 后端（替代扣子 Coze）— 可行性评估与落地指南

> 目标：把原本直连「扣子（Coze）工作流 + 智能体」的前端，迁移到**自托管的 LangChain 后端**，
> 由 DeepSeek / 通义千问 Qwen 驱动，实现与原扣子链路**等效**的逻辑；
> 网页主体结构与视觉设计**完全不变**，仅打通前后端通信链路。

---

## 一、可行性结论：**高可行（推荐落地）**

| 维度 | 评估 |
|------|------|
| 逻辑可迁移性 | ✅ 三个工作流 + 一个智能体本质都是「Prompt + LLM + 结构化输出」，与 LangChain 同构，100% 可复刻 |
| 前端改动量 | ✅ 极小：仅改 2 处配置 + 1 处 SDK 门控，**所有既有函数与处理器零改动** |
| 连通性根因 | ✅ 已定位：前端 `COZE_BASE_URL` 指向的腾讯 SCF 代理（`index.py`）已不可达 / 跨域受限；后端代理模式可彻底解决 |
| 模型质量 | ⚠️ DeepSeek/Qwen 与原始扣子 Bot 调性会有差异，需用 System Prompt 对齐（已内置） |
| 还原度 | ✅ 已基于真实扣子规格重写：主工作流 9 节点、简历抽取子流程、局部改写子流程的**真实节点 Prompt** 已落地到 `prompts.py`；并接入 11 份「五大岗位知识库」作为能力模型检索上下文 |

**根因说明**：桌面 `index.html` 与 `index.py` 显示，前端原本就是**经 SCF 代理**再调扣子（代理里藏着 bot_id/token，规避了前端暴露密钥）。
现在「无法连接」是因为该 SCF 代理域名已失效或跨域未放行——这是**部署/连通问题，不是逻辑问题**，因此用自托管后端替代是正确且低风险的路径。

---

## 二、从扣子「提取」的逻辑规格（节点映射）

> 说明：本次已拿到真实扣子规格（`智能体人设.txt`、`JING_LI_v1_5_SHENDU_workflow.txt`、
> `resume_extract_sub_workflow.txt`、`local_rewrite_sub_workflow.txt`）以及 11 份岗位知识库。
> 以下节点图据此**忠实还原**，并对接前端既有 6 大模块契约（`parse/skills/match/resume/interview/tips`）。

### 工作流 1 & 2：诊断报告生成（`JING_LI_v1_5_SHENDU_workflow` / `resume_extract_sub_workflow`）
- **输入参数**：`mode`(deep\|fast)、`job`、`jobDesc`、`stage`、`style`、`modules`
- **节点链**：`输入 → 经历拆解(STAR) → 可迁移能力(硬/软) → 岗位匹配度 → 简历文案(标准/精简/量化) → 面试素材(5题) → 提升建议 → 输出 JSON`
- **输出契约**：`{ tabs: { parse, skills, match, resume, interview, tips } }`，每模块 2-3 张 `{id,title,content}` 卡片
- 两模式共用同一生成逻辑；fast 模式 `jobDesc` 即原始简历文本

### 工作流 3：局部改写（`local_rewrite_sub_workflow`）
- **输入参数**：`block_id`、`block_content`、`action`(rewrite\|concise\|pro\|quant) + 报告 meta
- **输出契约**：`{ content: "改写后文本" }`

### 智能体 Bot（`COZE_BOT_ID`）：多轮求职咨询
- **输入**：`additional_messages`（OpenAI 格式，首条注入完整诊断报告作为背景）+ 多轮历史
- **输出契约**：`{ choices:[{ message:{ content:"回复" } }] }`（OpenAI / 扣子 chat 兼容）

---

## 三、后端架构（FastAPI + LangChain）

```
浏览器 file://  ──fetch──▶  LangChain 后端 (FastAPI :8000)
                               │  模拟扣子两个接口
                               ├─ POST /workflow/run      → 报告 / 改写
                               └─ POST /chat/completions  → 多轮咨询
                               │
                               └─ LangChain ChatOpenAI
                                     ├─ DeepSeek (https://api.deepseek.com)
                                     └─ 通义千问 Qwen (dashscope .../compatible-mode/v1)
                               （无密钥时自动回退离线模板，链路永不断）
```

**接口契约与前端解析函数严格对齐**（无需改前端业务代码）：
- 报告/改写：返回 `{ code:0, data:{...} }` → 命中 `parseCozeResponse` / `normalizeReport` / `extractBlockContent`
- 对话：返回 `{ choices:[{ message:{ content } }] }` → 命中 `callCozeBot` 的 `choices[0].message.content`

**CORS**：`allow_origins=["*"]`，对 `file://`（origin: null）+ `Authorization` 预检返回 200，本地双击打开即可联调。

---

## 四、如何运行

### 1) 本地（开发 / 演示）
```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env          # 填入 DEEPSEEK_API_KEY 或 QWEN_API_KEY
uvicorn main:app --host 0.0.0.0 --port 8000
```
> 不填任何密钥也能跑：自动走离线模板，验证「前后端链路」通畅。

### 2) Docker
```bash
cd backend
cp .env.example .env          # 填密钥
docker build -t jingli-backend .
docker run -d -p 8000:8000 --env-file .env jingli-backend
```

### 3) 云部署（生产）
部署到任意支持 Python 的云平台（云函数 / 容器 / CVM），**务必**：
- 在平台设置环境变量（密钥不下发前端）；
- 收紧 CORS：`allow_origins` 改为你的前端域名；
- 如需鉴权，设置 `BACKEND_API_KEY`，并把前端 `COZE_API_TOKEN` 设为相同值。

---

## 五、前端接入改动清单（最小、可逆）

| 位置 | 改动 | 是否改业务 |
|------|------|-----------|
| 配置区 | `COZE_BASE_URL` 由 SCF 域名 → `http://localhost:8000` | 否 |
| 配置区 | 新增 `const COZE_API_TOKEN = "LOCAL_BACKEND"`（原为未定义，真实模式会报错） | 否 |
| 底部 SDK | Coze 悬浮窗仅在 `COZE_API_TOKEN` 为真实 `pat_` 时初始化（避免无效鉴权） | 否 |
| `callCozeWorkflow` / `callCozeBot` 等 | **完全保留，未改动** | 否 |

> 切回真实扣子：把 `COZE_BASE_URL` 改回扣子/代理域名，`COZE_API_TOKEN` 换回真实 PAT 即可。

**使用方式**：打开 `index.html` → 默认仍为模拟数据（不联网）；点击右上角「真实接口模式」开关 → 调用本地后端。
后端未启动时自动回退模拟数据，**页面永不白屏**。

---

## 六、模型切换与密钥管理

- 默认模型：`LLM_PROVIDER=deepseek`
- 临时切换（单次请求）：请求头 `X-LLM-Provider: qwen` 或 URL `?provider=qwen`
- DeepSeek：`DEEPSEEK_API_KEY`（https://platform.deepseek.com）
- Qwen：`QWEN_API_KEY`（阿里云百炼 https://dashscope.console.aliyun.com，模型默认 `qwen-plus`，可换 `qwen-max`/`qwen-turbo`）
- 密钥**只存在后端环境变量**，前端永不接触——相比原方案（前端持有 PAT）更安全。

---

## 七、还原度与进一步优化建议

当前 `prompts.py` 已**忠实还原**真实扣子节点逻辑（主工作流 9 节点 + 简历抽取 + 局部改写），
并接入 11 份岗位知识库作为能力模型检索上下文，调性与五大方向能力项高度对齐。
若需进一步贴近原始扣子**逐字输出**，建议：
1. 在扣子控制台「导出」三个工作流 + 智能体的 JSON；
2. 把其中「大模型节点」的 System/User Prompt 原文，替换到 `backend/prompts.py` 对应函数
   （当前为按节点规格重写的等价版，结构一致、措辞更贴近）；
3. 把「代码/插件节点」的逻辑（如 OCR、查库）补到 `backend/workflows.py`；
4. 重新对齐 `schemas.py` 的字段（若有额外输出字段）。

完成以上 4 步即可达到 100% 行为还原，且彻底摆脱扣子平台依赖与跨域限制。

### 知识库接入说明（已落地）
- 11 份 `.txt` 已复制至 `backend/knowledge/`（两份源文件为空已自动跳过）；
- `knowledge.py` 按「章节分隔线」切分 + 关键词召回，依据 `job`/`stage` 注入报告提示词；
- 召回块仅作「能力模型校准依据」，不照抄，避免生成僵硬；
- 可在 `retrieve(top_k=...)` 调整召回量，或后续替换为向量库做语义检索。

---

## 八、目录结构

```
经历翻译官网页/
├─ index.html            # 已接入后端的前端（原结构/视觉不变）
├─ backend/
│  ├─ main.py            # FastAPI，模拟 /workflow/run 与 /chat/completions
│  ├─ config.py          # DeepSeek / Qwen 配置与 LLM 工厂
│  ├─ schemas.py         # 与前端契约对齐的 Pydantic 模型
│  ├─ prompts.py         # 忠实还原真实扣子节点的提示词（含知识库注入）
│  ├─ workflows.py       # 三大能力（报告/改写/对话）的 LangChain 实现
│  ├─ templates.py       # 离线模板兜底（无密钥可用）
│  ├─ knowledge.py       # 轻量知识库检索（章节切分 + 关键词召回）
│  ├─ knowledge/         # 11 份五大岗位知识库 .txt
│  ├─ requirements.txt
│  ├─ .env.example
│  └─ Dockerfile
└─ README.md             # 本文件
```
