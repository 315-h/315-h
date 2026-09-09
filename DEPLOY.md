# 作品集网页 · 双部署指南（GitHub Pages + CloudBase）

仓库：`github.com/315-h/315-h`（本地路径 `C:/Users/Lenovo/WorkBuddy/经历翻译官网页/`）
约定：**GitHub Pages 与 CloudBase 静态托管双同步**，提交以哈希命名，上线前必须验证两端都可访问。

## 新增资产（本次挂载）

| 文件 | 归属 | 说明 |
|---|---|---|
| `XiaoBan-EvalOnePager.pdf` | 小办 | 评测体系一页纸（118 条分层 / 双口径披露） |
| `XiaoBan-CostCache.pdf` | 小办 | 单次问答成本账与缓存策略 |
| `Prompt-Method.pdf` | 小办 + 经历翻译官 | Prompt 方法论（五段式 / 三项目案例） |
| `HuanZe-CostCloud.pdf` | 缓择星球 | 成本账与腾讯云部署 |
| `Jingli-Cost.pdf` | 经历翻译官 | 单次问答成本账 |

已挂接位置：**四页侧栏「资料下载」面板** + **三详情页卡片区（#assets）**。

---

## 步骤 1 · GitHub Pages 推送

```bash
cd "C:/Users/Lenovo/WorkBuddy/经历翻译官网页"
git add portfolio.html xiaoban.html jingli.html huanze.html \
        XiaoBan-EvalOnePager.pdf XiaoBan-CostCache.pdf Prompt-Method.pdf \
        HuanZe-CostCloud.pdf Jingli-Cost.pdf
git commit -m "deploy-<时间戳>-<短哈希>"
git push origin main
```

> 沙箱网络无法直连 github.com 时，改用步骤 3 的 `web-upload.zip` 手动上传。

## 步骤 2 · CloudBase 同步（关键新增步骤）

CloudBase 与 GitHub Pages 是**独立的两套托管**，GitHub 推送不会自动同步到 CloudBase，必须单独同步一次。

### 方式 A · 控制台手动上传（最稳，无需鉴权工具）
1. 登录 [腾讯云 CloudBase 控制台](https://console.cloud.tencent.com/tcb) → 进入本项目环境 → **静态网站托管**。
2. 将以下 9 个文件**上传 / 覆盖到托管根目录**（保持仓库根路径，不要套子目录）：
   - `portfolio.html` `xiaoban.html` `jingli.html` `huanze.html`
   - `XiaoBan-EvalOnePager.pdf` `XiaoBan-CostCache.pdf` `Prompt-Method.pdf` `HuanZe-CostCloud.pdf` `Jingli-Cost.pdf`
3. 若控制台支持「文件夹上传」，可直接用本仓库 `web-upload.zip` 解压后的根目录内容整体覆盖。

### 方式 B · CloudBase CLI（tcb）
> 适合本机有 Node 环境时批量同步。

```bash
npm i -g @cloudbase/cli
tcb login                      # 浏览器扫码授权
tcb hosting deploy . -e <envId>   # envId 在控制台「环境」页查看
```

### 方式 C · WorkBuddy CloudBase MCP（推荐长期维护）
在 WorkBuddy 连接器管理页连接 **CloudBase** MCP，连接后可用 cloudbase 部署技能直接同步，无需手动操作。

## 步骤 3 · 验证（两端都要）
- GitHub Pages：`https://315-h.github.io/315-h/` 打开，确认四页资料下载角标与卡片区均显示新文件。
- CloudBase：打开托管域名，同样确认 9 个文件可访问、新卡片区渲染正常。
- 抽查：点击 `XiaoBan-EvalOnePager.pdf` 等链接，确认 200 且内容正确。

> 提示：因 MCP 未在当前会话连接、且沙箱外网受限，本次 CloudBase 同步需你在本机按步骤 2 执行；GitHub 端已生成本地哈希提交，推送后即可生效。
