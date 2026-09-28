# 作品集网页 · 双部署指南（GitHub Pages + CloudBase）

> 更新于 2026-09-28。本文件描述**当前真实可用**的流程；旧版把本地路径写成工作区，已纠正。

## 0 · 两个仓库位置（别搞混）

| 角色 | 路径 | 说明 |
|---|---|---|
| **主仓库（唯一推送出口）** | `D:\315-h` | 远端 `git@github.com:315-h/315-h.git`，工作树干净、与 `origin/main` 一致。**只从这里 commit/push。** |
| 编辑现场（工作区） | `C:\Users\Lenovo\WorkBuddy\经历翻译官网页\` | 页面在这里改，改完复制进主仓库。里面的 `.git` 是一个**分叉的旧克隆**，不要在里面 commit/push，也不要 `reset --hard`。 |

行尾：主仓库 `core.autocrlf=true`，工作树 CRLF / 索引 LF。工作区文件是 LF，直接复制进主仓库**提交后差异是纯新增**（如 `+23/-0`），无需手动转换。

## 1 · 两个线上位置

| 位置 | URL | 备注 |
|---|---|---|
| GitHub Pages | `https://315-h.github.io/315-h/` | 仓库根即站点根 |
| CloudBase 静态托管 | `https://huanzexingqiu-d9gpqhjwi2bf78965-1459218742.tcloudbaseapp.com/portfolio/` | 环境 `huanzexingqiu-d9gpqhjwi2bf78965`（ap-shanghai） |

⚠️ **CloudBase 根目录是《缓择星球》网页版，作品集在 `/portfolio/` 子目录**。往根目录覆盖 `index.html` 会打掉缓择落地页。作品集页面里引用 `huanzexingqiu-web/index.html`，所以 `/portfolio/huanzexingqiu-web/` 必须一并存在。

## 2 · 工程方法页（Harness）资产

| 文件 | 归属 | 说明 |
|---|---|---|
| `harness.html` | 作品集第 5 页 | 八层框架 / 覆盖矩阵 / 三断点 / 已落地实证 / 准则 / 诚实边界 |
| `Harness-Method.pdf` | 下载件 | 2 页 A4 一页纸，与网页同口径 |
| `XiaoBan-EvalHarness.zip` | 下载件 | 评测台源码包（含两份零依赖离线自检） |

挂接位置：`portfolio.html` 的 `#harness` 横切带 + 侧栏「工程方法」下载组；`xiaoban/jingli/huanze` 三页各加 `.hxnote` 断点回链。

---

## 步骤 1 · GitHub Pages 推送

```bash
cd /d/315-h
# 从工作区复制要发布的文件（示例：本次 7 个）
git add harness.html Harness-Method.pdf XiaoBan-EvalHarness.zip \
        portfolio.html xiaoban.html jingli.html huanze.html
git commit -m "<描述性信息>"
git push origin main
```

推送后 Pages 会重建（通常 30 秒–3 分钟）。**只有 4 个页面被改、新文件还没出现时，说明还没重建完，等一下再验。**

## 步骤 2 · CloudBase 同步（mcporter）

GitHub 推送**不会**同步 CloudBase，必须单独做一次。

本机 mcporter 版本 0.9.0，已缓存在
`C:\Users\Lenovo\AppData\Local\npm-cache\_npx\bdbf2deecdd22bc5\node_modules\mcporter\dist\cli.js`。
直接用 Node 调它，**不要走 `npx`**（Git Bash 的 shim 在本机会报 `适用于 Linux 或 Windows` 之类的错），
并且**所有 mcporter 调用都要带 `dangerouslyDisableSandbox`**（沙箱会拦截子进程启动）。

配置在 `<项目根>/config/mcporter.json`，必须从项目根运行（本项目为
`C:\Users\Lenovo\WorkBuddy\2026-08-01-11-32-21`），否则报 `Unknown MCP server`。

### 🔴 最大的坑：授权挑战活不过一次对话往返

mcporter 守护进程**空闲会退出**，设备码授权挑战随进程消失。表现为：上一轮 `start_auth` 拿到码，
下一轮 `status` 直接变回 `REQUIRED`，授权白做。

**解法：把「发起授权 → 轮询等待 → 上传 → 下载回验」放进同一个常驻脚本，一次跑完**，
并在轮询中检测到 `REQUIRED` 时**自动重发新码**。可复用脚本见
`~/.workbuddy/skills/portfolio-dual-deploy/scripts/cb_hosting_sync.py`。

授权成功后凭证会持久化，之后的独立调用仍是已登录状态（`auth_status: READY`）。

### 关键工具

```jsonc
// 只读：列出 /portfolio/ 下文件
{"action":"findFiles","prefix":"portfolio/","maxKeys":200}          // → queryHosting
// 上传单个文件
{"action":"upload","localPath":"<绝对路径>","cloudPath":"/portfolio/<名>"}  // → manageHosting
// 下载单个文件（用于回验）
{"action":"downloadFile","localPath":"<本地目标>","cloudPath":"/portfolio/<名>"}
```

- 底层每次操作都走 `DescribeStaticStore`，**QPS 20/秒**；批量请间隔 ≥1 秒，遇 `frequency limit` 等 1–2 秒重试。
- `delete` / `unbindDomain` 必须显式传 `confirm=true`。

## 步骤 3 · 验证（两端都要，且必须逐字节）

- **GitHub Pages**：比对**字节数 + MD5**，另外抽查页面里的新标记（如 `harness` / `hxnote`）。
- **CloudBase**：⚠️ **响应不带 `Content-Length`**，所以不能只看状态码——必须 `downloadFile` 下载全文再比 MD5。
- CloudBase 有 CDN 缓存，HTML 加随机查询串刷新。

## 已知坑速查

| 症状 | 原因 | 解法 |
|---|---|---|
| 新文件线上 404、旧页面尺寸没变 | Pages 还在重建 | 等 30 秒–3 分钟重验 |
| `status` 从 `PENDING` 变回 `REQUIRED` | 守护进程空闲退出，挑战丢失 | 授权与后续操作放同一进程；检出 `REQUIRED` 自动重发 |
| `Unknown MCP server 'cloudbase'` | 不在项目根运行 | 从含 `config/mcporter.json` 的根目录运行 |
| npx 报 `适用于 Linux 或 Windows` | Git Bash shim 损坏 | 直接用 Node 调 `mcporter/dist/cli.js` |
| `--args` JSON 解析失败 | 传了多行 JSON / 被 PowerShell 剥引号 | Python `json.dumps(...,separators=(',',':'))` 压单行后 `subprocess` 直调 |
| 提交后 PDF/ZIP 疑似被改写 | git 当成文本做行尾转换 | 提交后 `git cat-file -p HEAD:<f>` 与源文件比 MD5；源为 LF 时 blob 与源一致 |
| 页面引用的 `shots/*.png` 打不开 | 只传了页面没传资源目录 | 确认 `/portfolio/` 下子目录齐备 |
