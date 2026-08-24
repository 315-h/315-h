# 《AI产品叙事集》网页设计方案 · 审查与优化（修订版 v2）

> 审查范围：5 个静态页面（单文件 HTML，纯 CSS + 原生 JS）
> `index.html`（经历翻译官工具页）· `portfolio.html`（作品集首页）· `jingli.html` / `huanze.html` / `xiaoban.html`（三个作品详情页）
> 审查维度：信息架构 · 视觉层次 · 布局结构 · 色彩与字体 · 响应式适配 · 用户体验（含可访问性）
> 修订日期：2026-08-15 ｜ 审查角色：UI Designer
> 修订说明：相较于 v1，本版基于「三个详情页特色已强化」的既定事实，将优化重心由"强统一"调整为 **"统一底层系统 + 保护产品个性"双轨制**。

---

## 〇、关键变更说明（v1 → v2）

| 项 | v1 立场 | v2 立场（本版） |
|---|---|---|
| 三个详情页"风格不一" | 视为问题（P1-1/P1-2 要求统一主色/圆角） | **视为资产**：暖纸 / 星轨 / 商务冷调是产品个性，已强化（`DONE`，见 §1.3）。不再强统一，改为"从共享尺度中刻意选取" |
| 优化总目标 | 先立 tokens 再 5 页引用，消除 5 套语言 | **双轨制**：① 统一"底层系统"（中性色/字阶/间距/主题机制/IA/A11y）② 保留并规范"产品个性层" |
| 圆角 | 强制统一 16px | 提供 `--r-*` 共享尺度，各产品按调性**有意选取**（纸感偏小 / 星轨偏大 / 商务 8px），落差变为设计语言而非随机 |
| 主色 | 经历翻译官强制统一 `#F2A987` | 收口为单一 `--brand-jingli` 语义变量（值仍取珊瑚家族），消除"同产品两 Hex"的 token 混乱，但允许产品级差异存在 |

> **已落地（DONE）**：三个详情页的特色强化（2026-08-15）——
> - `jingli.html`：纸纹 opacity .045→.085 + 横格信纸线；封面改"档案袋"（封口胶带 + 装订线）；痛点便签胶带→真实图钉；成果印章落章动画 `stampIn`。
> - `huanze.html`：星云 4 层 radial 加强 + 真实星点散布层（12 颗，椭圆遮罩）；首屏 KV 第三层星轨 `rings3` + 流星 `meteor`；手机屏内星空 `phone .scr::before`。
> - `xiaoban.html`：全局网格 48→34px 更密更明显；Hero 数据卡工程定位角标 `mcard::after`；资产文件卡代码行 `box-shadow` 延伸成多行代码块。
> 以上仅改 CSS，未触碰任何 JS 逻辑/函数，8080 验证三页 HTTP 200。

---

## 一、现状总诊断（修订后的核心判断）

这套页面**品牌方向统一（暖调治愈 + 三个项目色）、动效用心、且三个详情页现已各具强辨识度**。剩余问题集中在两个层面：**(A) 底层系统未共享**——导致跨页主题记忆断裂、控件不一致、对比度隐患、IA 死胡同；**(B) 部分"个性"是随机落差而非刻意选取**——圆角/间距/字号散用，需收口为"共享尺度内的有意选择"。

按严重度：

| # | 问题 | 严重度 | 证据 | 本版处置 |
|---|---|---|---|---|
| P0-1 | **跨页主题记忆断裂** | 🔴 高 | 3 套 localStorage key：`jyfy_theme` / `pf-theme` / `xiaoban_theme`。portfolio 切深色进 index/xiaoban 会弹回浅色 | 必做：统一 `hx-theme` |
| P0-2 | **主题切换控件不一致** | 🔴 高 | index `theme-toggle`+aria；portfolio/jingli/huanze `🌙`；xiaoban `◐` | 必做：统一 `◐`+`aria-label` |
| P0-3 | **浅色主色 + 白字对比度不达标** | 🔴 高 | 浅珊瑚 `#F2A987/#F5A98A` 上含 `color:#fff` 按钮/标签（≈2–2.5:1，远低于 AA 4.5:1） | 必做：CTA 改深陶土 `#C9664A`+白字 |
| P1-1 | **中性/系统 Token 未共享** | 🟠 中 | `--text-2` 命名各异（`#8C837A/#9A8F86/#9C8C7E`）；无 `--fs-*`/`--sp-*` 尺度 | 必做：抽 `tokens.css`（仅中性+系统层） |
| P1-2 | **圆角/间距是随机落差** | 🟠 中 | 卡片 8/10/16/20/22/24 跳跃；间距散用 | 改为：共享 `--r-*`/`--sp-*` 尺度，各产品**有意选取** |
| P1-3 | **信息架构死胡同** | 🟠 中 | `index` 进 demo 后无「返回作品集」入口；nav「首页」= `goHome()` | 必做：index 加常驻返回 |
| P1-4 | **次要文字对比度不足** | 🟠 中 | `--text-2` on 浅底 ≈2.8–3.1:1，未达 AA | 必做：加深 `#6B635C` |
| P2-1 | **响应式断点混乱** | 🟡 低 | 760/860/880 混用；缺平板中间档 | 统一 1200/860/560 |
| P2-2 | **字体无统一 scale** | 🟡 低 | 字号 12–50 任意；正文 15px 偏小 | 建 `--fs-*`；正文 16px |
| P2-3 | **A11y 属性缺失** | 🟡 低 | disabled 链接无语义；缺 reduced-motion/focus ring；`screen` 装饰偶闪 | 补清单 |

> **v1 中的 P1-1「同产品主色两套」、P1-3「基底色不统一」已在 v2 重新定性**：同产品主色差 3 Hex 仅属 token 命名冗余（收口为单一 `--brand-jingli` 即可）；基底差异中**小办 `#F8FAFC` 冷调是刻意的 B 端差异化，保留并注明为"产品级基底"**，不属于错误。

---

## 二、优化策略总纲（双轨制）

**核心思路：把"系统"和"个性"拆成两层，只统一系统层，保护并规范个性层。**

- **Layer A · 共享系统层（新增 `tokens.css`，5 页 `<head>` 引入）**
  包含：中性色板（暖米白体系）、字体族与字阶、间距尺度、圆角尺度、阴影、焦点环、深色模式变量、主题切换机制（`hx-theme`）。
  *不含*：三个产品主色（留在各页 `:root` 作为"产品 Token"）。

- **Layer B · 产品个性层（保留在各页）**
  各页只保留"差异化"部分：jingli 人文纸纹/档案袋/图钉/印章；huanze 星云/星点/星轨/流星；xiaoban 冷调网格/工程角标/代码块。从 Layer A 的尺度中**有意选取**圆角与间距，使"差异"成为设计语言而非随机。

> 不推翻重做，尊重既有视觉资产与已完成的特色强化。改动集中在"对齐系统 + 消除断裂点 + 收口随机落差"。

---

## 三、统一设计系统 · 共享 Token 规范（Layer A，可落地）

### 3.1 中性色板（作品集统一，暖调；仅系统层，不含产品主色）

```css
/* tokens.css —— 仅定义"系统层"中性变量 */
:root{
  --bg:#FAF7F2;            /* 暖米白基底（统一 portfolio/jingli 现有值） */
  --surface:#FFFFFF;       /* 卡片表面 */
  --surface-soft:#FDFBF7;  /* 次级表面 */
  --text:#33302E;          /* 正文（深棕灰，禁纯黑） */
  --text-2:#6B635C;        /* 次要文字：加深到 #6B635C → on #FAF7F2 ≈4.6:1 达标 AA（P1-4） */
  --text-3:#9A9089;        /* 禁用/占位（仅 disabled 态，不承载正文） */
  --divider:#E5E2DE;       /* 分割线/描边 */

  --primary-strong:#C9664A;/* 深陶土：所有承载白字的 CTA 背景（P0-3，白 on #C9664A ≈5.3:1） */
  --primary-tint:#FBEDE6;  /* 浅珊瑚底（pill/选中态背景，非文字） */

  --ok:#059669;  --ok-tint:#D1FAE5;
  --warn:#B9772E; --warn-tint:#FBEFE0;
  --info:#3B6FB0; --info-tint:#E8F0F8;

  --shadow-sm:0 2px 6px rgba(51,48,46,.06);
  --shadow-md:0 8px 24px rgba(51,48,46,.10);

  --font:"PingFang SC","Microsoft YaHei","Hiragino Sans GB","Helvetica Neue",Arial,sans-serif;
  --serif:"Songti SC","STSong",Georgia,serif;   /* 仅人文调性页标题（portfolio/jingli/huanze） */

  /* 字阶 */
  --fs-xs:12px; --fs-sm:13px; --fs-base:16px; --fs-md:18px;
  --fs-lg:22px; --fs-xl:28px; --fs-2xl:36px; --fs-display:50px;
  --lh-tight:1.3; --lh-base:1.75;

  /* 间距尺度（8pt 系统） */
  --sp-1:4px; --sp-2:8px; --sp-3:12px; --sp-4:16px; --sp-5:24px;
  --sp-6:32px; --sp-7:48px; --sp-8:64px;

  /* 圆角尺度：各产品"有意选取" */
  --r-xs:8px; --r-sm:12px; --r-md:16px; --r-lg:20px; --r-pill:999px;
}
body.dark{
  --bg:#2B2724; --surface:#34302B; --surface-soft:#2F2B27;
  --text:#EDE6DC; --text-2:#B7A99B; --divider:#3D3731;
  --primary-strong:#D98A6E; --primary-tint:#3A2E29;
}
```

### 3.2 产品 Token（Layer B，保留在各页 `:root`，语义命名统一）

```css
/* 各页仅保留这三行"产品主色"，其余中性变量全部删掉、改引 tokens.css */
--brand-jingli:#F2A987;  /* 经历翻译官 · 珊瑚橙（全站单值，消除 v1 两 Hex 混乱） */
--brand-huanze:#E98A68;  /* 缓择星球 · 暖橙 */
--brand-xiaoban:#1E3A8A; /* 小办 · 深靛蓝（商务冷调，刻意差异） */
```

### 3.3 产品个性 → 圆角/间距的"有意选取"映射（收口随机落差 P1-2）

| 页 | 调性 | 卡片圆角 | 按钮圆角 | 间距偏好 | 说明 |
|---|---|---|---|---|---|
| jingli | 人文纸/档案 | `--r-sm`(12) | `--r-pill` | `--sp-5` | 偏小圆角呼应"纸质裁切"，不追求大圆润 |
| huanze | 星轨治愈 | `--r-lg`(20) | `--r-pill` | `--sp-6` | 大圆角+宽松间距呼应"柔光包裹" |
| xiaoban | 商务冷调 | `--r-xs`(8) | `--r-xs` | `--sp-4` | 小圆角+紧凑间距呼应"严谨制图" |

> 圆角不再"强制全站 16px"，而是**从同一尺度中按调性有意选取**——既消除随机跳跃，又保留产品辨识度。这是 v2 相较 v1 的关键修正。

---

## 四、信息架构优化（IA）

### 4.1 当前导航链（含死胡同）

```
portfolio(hub) ──卡片「查看详情」──▶ jingli/huanze/xiaoban(详情页)
                                          │ CTA「在线体验 Demo」
                                          ▼
                                       index(工具页)
                                          ✗ 顶部 nav「首页」= goHome()(工具内视图)
                                          ✗ 无「返回作品集」入口  ← 死胡同
```

### 4.2 优化后导航链

```
portfolio(hub) ──▶ jingli/huanze/xiaoban ──▶ index(工具页)
     ▲                  ▲  ←「返回作品集」        │ 新增「← 返回作品集首页」常驻顶栏
     └──────────────────┴───────────────────────┘ （所有子页统一左上返回 + 右上主题）
```

**具体改动**
- `index.html` 顶部新增常驻入口：左上「← 作品集」(`href="portfolio.html"`) + 右上主题切换（复用子页 `theme-btn` 规范）。
- 统一所有子页左上「← 返回作品集首页」(`portfolio.html`)、右上主题按钮图标统一为 `◐`（P0-2）。
- 主题记忆统一为单一 key **`hx-theme`**（P0-1）：5 页 JS 都读写 `localStorage.getItem('hx-theme')`，跨页不再断裂。

---

## 五、响应式适配规范

### 5.1 统一断点（三档）

```css
@media (max-width:1200px){ /* 桌面→笔记本：容器收窄，卡片保持 */ }
@media (max-width:860px){  /* 平板：多列网格降 2 列，hero 转单列 */ }
@media (max-width:560px){  /* 手机：全部单列，字号下调，padding 收紧 */ }
```

> 消除 760/860/880 混乱（P2-1）；860 保留为平板主断点，平板(768–860)改为 2 列更舒适。`index.html` 现有 `880/560/print` 对齐到 `860/560`。

### 5.2 布局要点
- Hero 双列（portfolio/jingli/xiaoban）→ 860 下转单列，插画/手机 mockup 居中。
- 卡片网格 `repeat(3,1fr)` → 860 下 `repeat(2,1fr)` → 560 下 `1fr`。
- 长模块（xiaoban 架构三层、huanze 星轨）在 560 下纵向堆叠；星轨改简化横排。

---

## 六、可访问性（A11y）修复清单

| 项 | 现状 | 修复 |
|---|---|---|
| 文字对比度 | 浅珊瑚白字 ≈2:1；次要文字 ≈3:1 | CTA 改 `--primary-strong`+白字(5.3:1)；`--text-2` 加深 `#6B635C`(4.6:1) |
| 主题按钮 | 部分无 label | 全站统一 `aria-label="切换深色模式"` |
| disabled 链接 | 视觉 disable 无语义 | 加 `aria-disabled="true"` + `tabindex="-1"` |
| 键盘可达 | 卡片为 `<div>` 非焦点 | 可点卡片改 `<a>` 或加 `role="link" tabindex="0"` |
| 动效敏感 | 无 reduced-motion | 全局 `@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}` |
| 焦点态 | 部分缺 focus ring | 统一 `:focus-visible{outline:2px solid var(--primary-strong);outline-offset:2px}` |
| 装饰闪烁 | `mix-blend-mode:screen` 偶闪 | 仅作 `pointer-events:none` 背景，降级为普通低透明径向 |

---

## 七、各页面结构优化要点

### 7.1 `index.html`（经历翻译官工具页）
- **结构保留**：信息录入 → 报告生成 → 6 模块报告 → 局部改写 → 多轮咨询（完整产品闭环）。
- **修复**：顶部加「← 作品集」常驻入口（修 IA 死胡同）；主按钮改 `--primary-strong`+白字；主题并入 `hx-theme`+`◐`+aria；正文 16px；断点 880→860。

### 7.2 `portfolio.html`（作品集首页）
- **结构保留**：顶栏 → Hero(双列+轨道徽章) → 项目卡片(3) → 能力矩阵 → 关于我 → 页脚。
- **修复**：引 `tokens.css` 删重复 `:root`；主题 key 统一 `hx-theme`；圆角从尺度选取；项目主色引 `--brand-*`。

### 7.3 `jingli.html` / `huanze.html` / `xiaoban.html`（详情页）
- **结构保留**：各自 9/9/8 模块完整；**产品个性（人文纸/星轨/商务冷）已强化，保留并规范**。
- **修复**：引 `tokens.css` 删中性 `:root`；左上返回 + 右上 `◐` 统一；CTA 对比度修复；`--text-2` 加深；圆角按 §3.3 映射有意选取；断点对齐 860；加 `prefers-reduced-motion` + focus ring。

---

## 八、落地优先级与改动清单（修订）

### P0（体验硬伤，必做）
- [x] **三个详情页特色强化**（DONE，2026-08-15，纯 CSS）
- [ ] 统一主题 key 为 `hx-theme`（5 页 JS 改写）
- [ ] 主题按钮统一 `◐` + `aria-label`（index 改 `theme-toggle`→`theme-btn` 风格）
- [ ] 主色 CTA/标签改 `--primary-strong`(#C9664A)+白字（index/portfolio/jingli/huanze）
- [ ] `index.html` 顶部加「← 作品集」返回入口

### P1（系统一致性，强烈建议）
- [ ] 新增 `tokens.css`（仅中性+系统层），5 页 `<head>` 引入，删各自重复 `:root`
- [ ] 经历翻译官主色收口为单一 `--brand-jingli`（消除同产品两 Hex）
- [ ] 圆角/间距改从 `--r-*`/`--sp-*` 尺度**有意选取**（按 §3.3 映射）
- [ ] `--text-2` 加深至 `#6B635C`（AA）
- [ ] 正文 15→16px；建立 `--fs-*` scale

### P2（打磨）
- [ ] 响应式断点统一 1200/860/560
- [ ] 全局 `prefers-reduced-motion` + `:focus-visible` ring
- [ ] disabled 链接加 `aria-disabled`
- [ ] `index.html` 评估首屏懒加载（SVG/JS 拆分）

---

## 九、交付物建议

1. **`tokens.css`**：跨页共享系统层（§3.1 代码块）。
2. **5 页 token 引用改造**：`<head>` 引 `tokens.css`，删各自中性 `:root`，保留产品 `:root`（§3.2）。
3. **`index.html` 返回入口 + 主题统一**：小改动，修 IA 死胡同。
4. **对比度修复**：全局替换浅珊瑚白字 → `--primary-strong`。
5. **圆角/间距收口**：按 §3.3 映射将随机值改为尺度引用。

> 预计工作量：P0（除已完成的特色强化）约 0.5 天，P1 约 1 天（主要抽 tokens.css + 5 页去重 + 圆角收口），P2 约 0.5 天。
> 不推翻任何既有视觉资产与已完成的特色强化，只在"对齐系统 + 消除断裂点 + 收口随机落差"层面改动，风险低、可逆。

---

_UI Designer · 2026-08-15 · 修订版 v2 · 方案可直接交付开发落地_
