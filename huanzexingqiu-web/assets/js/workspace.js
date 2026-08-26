/**
 * 缓择星球 · 决策工作台控制器（P2）
 * 状态机：scene_select → mining(card|talk) → retrieval → tradeoff → rehearse → await_accept → done
 * 渲染后端 SSE 10 事件：stage/message/form_card/options/tradeoff/rehearsal/mitigation/escalate/done/error
 * 表单提交走 form_data（对齐 WS form_submit 契约）；存档写入 MMXStore（mmx_decisions）。
 */
(function () {
  'use strict';

  var SCENES = [
    { key: 'shopping',  emoji: '🛍️', name: '购物消费',  desc: '数码、服饰、家居、美妆…' },
    { key: 'renting',   emoji: '🏠', name: '租房搬家',  desc: '地段、通勤、租金、风险' },
    { key: 'career',    emoji: '💼', name: '职业选择',  desc: 'offer、跳槽、方向、稳定性' },
    { key: 'travel',    emoji: '🧳', name: '出行旅游',  desc: '目的地、路线、预算、体力' },
    { key: 'health',    emoji: '🌿', name: '健康生活',  desc: '运动、作息、习惯养成' },
    { key: 'move',      emoji: '📦', name: '生活变动',  desc: '搬家、换城市、大额决策' },
    { key: 'study',     emoji: '📚', name: '学习成长',  desc: '课程、考证、技能投入' },
  ];

  // 四 Agent 进度条节点（需求挖掘→方案检索→中立权衡→代价预演→完成）
  var PROGRESS = [
    { id: 'mining',    label: '需求挖掘' },
    { id: 'retrieval', label: '方案检索' },
    { id: 'tradeoff',  label: '中立权衡' },
    { id: 'rehearse',  label: '代价预演' },
    { id: 'done',      label: '完成' },
  ];

  // 模块三：7 场景快速模板（字段 key 与后端 form_card schema 对齐）
  // 仅填充当前表单存在的字段 key；模板中的 supplementary / bottomline 映射到「星球内核」补充诉求。
  var QUICK_TEMPLATES = {
    shopping: [
      { id: 'shop_digital_value', title: '数码性价比', values: { budget: '3000', usage: '日常通勤与办公听歌、影音娱乐', user_group: '自用', priority: ['性价比', '性能功能', '售后保障'], urgency: '正常选购' }, supplementary: '希望用得久一点，不想一年一换' },
      { id: 'shop_commute_light', title: '通勤轻量化', values: { budget: '1500', usage: '地铁公交长时间通勤佩戴', user_group: '自用', priority: ['轻便便携', '颜值质感', '舒适度'], urgency: '正常选购' } },
      { id: 'shop_wear_texture', title: '穿搭质感党', values: { budget: '2000', usage: '日常通勤与约会穿搭', user_group: '自用', priority: ['颜值质感', '舒适度', '耐用保值'] } },
      { id: 'shop_wear_summer', title: '夏日清凉穿搭', values: { budget: '800', usage: '夏季日常通勤与轻运动', user_group: '自用', priority: ['舒适度', '性价比', '轻便便携'] }, supplementary: '希望透气不闷、款式清爽，避免重磅面料' },
      { id: 'shop_home_practical', title: '居家实用党', values: { budget: '4000', usage: '改善居家生活品质', user_group: '家人使用', priority: ['性价比', '耐用保值', '舒适度'] } },
      { id: 'shop_lowcost_consumable', title: '低价刚需消耗', values: { budget: '300', usage: '日常高频消耗补给', user_group: '家人使用', priority: ['性价比', '耐用保值'] } },
      { id: 'shop_big_durable', title: '大件保值耐用', values: { budget: '8000', usage: '长期居家大件添置', user_group: '家人使用', priority: ['耐用保值', '性价比', '售后保障'] } },
    ],
    renting: [
      { id: 'rent_commute', title: '极致通勤党', values: { budget: '3000', room_type: '合租', lease: '长租', priority: ['通勤距离', '性价比'], urgency: '急需入住' }, supplementary: '距离公司单程通勤不超 40 分钟' },
      { id: 'rent_quiet', title: '独居安静党', values: { budget: '4500', room_type: '整租', lease: '长租', priority: ['安静隔音', '小区环境'] }, supplementary: '拒绝临街嘈杂、隔音差的房子' },
      { id: 'rent_costshare', title: '性价比合租', values: { budget: '2500', room_type: '合租', lease: '可短可长', priority: ['性价比', '配套便利'] } },
      { id: 'rent_quality', title: '品质整租', values: { budget: '6000', room_type: '整租', lease: '长租', priority: ['房屋采光', '小区环境', '安静隔音'] } },
      { id: 'rent_short', title: '短租过渡', values: { budget: '3500', room_type: '整租', lease: '短租', urgency: '急需入住', priority: ['配套便利', '性价比'] } },
      { id: 'rent_lowbudget', title: '低预算兜底', values: { budget: '1800', room_type: '合租', lease: '可短可长', priority: ['性价比'] }, supplementary: '严格控制在最低预算内' },
    ],
    career: [
      { id: 'career_grad_stable', title: '应届生求稳', values: { stage: '应届毕业', salary: '8000', value_pref: '稳定优先', intensity: '适中', priority: ['岗位稳定', '薪资待遇'] } },
      { id: 'career_highpay', title: '高薪冲刺跳槽', values: { stage: '在职跳槽', salary: '25000', value_pref: '薪资优先', intensity: '高强度', priority: ['薪资待遇', '晋升空间'] } },
      { id: 'career_balance', title: '工作生活平衡', values: { stage: '在职跳槽', salary: '15000', value_pref: '平衡兼顾', intensity: '轻松', priority: ['工作氛围', '通勤距离'] } },
      { id: 'career_easy', title: '低压力养老岗', values: { stage: '待业观望', salary: '10000', value_pref: '稳定优先', intensity: '轻松', priority: ['岗位稳定', '工作氛围'] } },
      { id: 'career_switch', title: '转行试错', values: { stage: '转行转型', salary: '12000', value_pref: '成长优先', intensity: '适中', priority: ['行业前景', '晋升空间'] } },
      { id: 'career_relocate', title: '异地发展', values: { stage: '在职跳槽', salary: '18000', value_pref: '成长优先', intensity: '适中', priority: ['行业前景', '晋升空间'] } },
    ],
    travel: [
      { id: 'travel_city_food', title: '城市逛吃短途', values: { duration: '3', budget: '2000', companion: '朋友', style: '美食逛吃', priority: ['美食体验', '性价比'] } },
      { id: 'travel_mountain', title: '山野放松治愈', values: { duration: '2', budget: '1500', companion: '情侣', style: '自然治愈', priority: ['风景体验', '轻松不累'] } },
      { id: 'travel_lazy', title: '懒人躺平度假', values: { duration: '5', budget: '5000', companion: '情侣', style: '休闲躺平', priority: ['舒适度', '轻松不累'] } },
      { id: 'travel_family', title: '亲子轻松出行', values: { duration: '4', budget: '6000', companion: '家庭亲子', style: '休闲躺平', priority: ['轻松不累', '舒适度'] } },
      { id: 'travel_budget', title: '穷游性价比', values: { duration: '7', budget: '3000', companion: '朋友', style: '景点打卡', priority: ['性价比', '人流少'] } },
      { id: 'travel_intense', title: '高强度打卡', values: { duration: '3', budget: '4000', companion: '朋友', style: '景点打卡', priority: ['风景体验', '人流少'] }, supplementary: '时间紧但想多打卡，不能太累垮' },
    ],
    health: [
      { id: 'health_lazy_fat', title: '懒人减脂塑形', values: { goal: '减脂塑形', time_budget: '20', intensity: '佛系轻松', priority: ['容易坚持', '时间成本低'] } },
      { id: 'health_sleep', title: '作息规律调整', values: { goal: '作息调整', time_budget: '30', intensity: '适度坚持', priority: ['容易坚持', '不伤身体'] } },
      { id: 'health_home', title: '居家轻运动', values: { goal: '体能提升', time_budget: '30', intensity: '适度坚持', priority: ['容易坚持', '低成本'] } },
      { id: 'health_posture', title: '体态改善', values: { goal: '体态改善', time_budget: '20', intensity: '适度坚持', priority: ['效果明显', '不伤身体'] } },
      { id: 'health_diet', title: '饮食调理', values: { goal: '饮食调理', time_budget: '15', intensity: '佛系轻松', priority: ['容易坚持', '低成本'] } },
      { id: 'health_lowcost', title: '低成本养生', values: { goal: '日常养生', time_budget: '15', intensity: '佛系轻松', priority: ['低成本', '容易坚持'] } },
    ],
    move: [
      { id: 'move_commute', title: '同城通勤优化', values: { distance: '同城', motive: '工作通勤', budget: '2000', bulky: '少', priority: ['距离更近', '省钱省心'] } },
      { id: 'move_upgrade', title: '居住品质升级', values: { distance: '同城', motive: '居住升级', budget: '5000', bulky: '多', priority: ['居住更好', '环境安静'] } },
      { id: 'move_minimal', title: '低成本极简搬家', values: { distance: '同城', motive: '省钱减负', budget: '800', bulky: '少', priority: ['省钱省心', '配套完善'] } },
      { id: 'move_relocate', title: '跨城求职发展', values: { distance: '跨城', motive: '城市发展', budget: '4000', bulky: '少', priority: ['距离更近', '居住更好'] } },
      { id: 'move_short', title: '短期过渡搬家', values: { distance: '跨城', motive: '居住升级', budget: '2500', bulky: '无', priority: ['省钱省心', '配套完善'] } },
    ],
    study: [
      { id: 'study_exam', title: '备考冲刺', values: { goal: '升学备考', time: '4', budget: '1000', priority: ['通过率', '见效快'] } },
      { id: 'study_skill', title: '技能提升', values: { goal: '职场技能', time: '2', budget: '2000', priority: ['实用性', '口碑质量'] } },
      { id: 'study_lowcost', title: '低成本自学', values: { goal: '兴趣提升', time: '1', budget: '0', priority: ['性价比', '时间灵活'] } },
      { id: 'study_class', title: '系统报班深耕', values: { goal: '职场技能', time: '3', budget: '5000', priority: ['口碑质量', '通过率'] } },
      { id: 'study_relax', title: '兴趣松弛学习', values: { goal: '兴趣提升', time: '1', budget: '300', priority: ['时间灵活', '实用性'] } },
      { id: 'study_side', title: '副业变现学习', values: { goal: '副业变现', time: '2', budget: '1500', priority: ['实用性', '见效快'] } },
    ],
  };

  var els = {};
  var client = null;
  var sessionId = null;
  var currentScene = null;
  var lastFormCard = null;        // 缓存最近一张采集卡（模式切换时本地重渲染）
  var formValues = {};
  var supplementary = '';
  var collectMode = 'card';       // card | talk
  var sceneConfirmed = false;     // 是否已确认场景（直接发起过首轮）
  var finalChoiceName = '';
  var lastOptions = [];           // 最近一次候选方案（存档时写入记录）
  var lastPicked = null;          // P5.1 选中方案（导出卡用）
  var lastRehearsal = null;       // P5.1 预演三件套（导出卡用）
  var busy = false;
  var currentDecisionId = null;    // 模块四：当前会话对应的历史星轨记录 id（幂等更新，避免重复存档）
  var doneModalShown = false;      // 模块五：完成弹窗只弹一次，避免重复
  var decisionAccepted = false;    // W5：用户已实际完成决策操作（点「确认保存决策」或保存决策三选项），方可弹完成模态
  var sessionEvents = [];          // P11-5：完整过程事件流（用于历史详情回看）
  var conversation = [];           // P11-4：对话消息流（仅保存对话）
  var lastTradeoff = null;         // P11-5：完整中立权衡数据
  var lastMitigation = null;       // P11-5：缓解建议数据
  var phase = 1;                   // P13：流程阶段 1采集 → 2方案检索 → 3代价预演（阶段三触发收折）
  var collapsedKeys = {};          // P13：各可收起区段当前的收起状态（独立展开/收起互不影响）
  var decisionMode = 'selection';  // F1：selection | reflection（后端 rehearsal 事件 mode 字段 + stage:reflection）

  // ================= 工具 =================
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // 匹配度展示：后端已归一为 0-100 整数；兼容历史数据（0-1 小数）自动 ×100
  function fmtMatch(v) {
    var n = parseFloat(v);
    if (isNaN(n)) return '';
    return n <= 1 ? Math.round(n * 100) : Math.round(n);
  }

  function recordMsg(role, text) { conversation.push({ role: role, text: text, ts: Date.now() }); }
  function recordEvent(stage, data) { sessionEvents.push({ ts: Date.now(), stage: stage, data: data || null }); }

  function newSessionId() {
    return 'ws_' + Date.now() + '_' + Math.floor(Math.random() * 1e6);
  }

  // ================= P13：双模式布局与阶段三收折 =================
  function setLayoutMode(mode) {
    // 卡片 50/50；口述 40/60（work-grid 类切换）
    var grid = $('work-grid');
    if (grid) grid.classList.toggle('mode-talk', mode === 'talk');
  }

  // 进入某阶段：1 采集 → 2 方案检索 → 3 代价预演（只进不退）
  function enterPhase(p) {
    if (p > phase) phase = p;
    document.body.classList.toggle('ws-phase3', phase >= 3);
    // F2：阶段二/三（card 模式）显示追问条，支持中途追问后继续流程
    if (phase >= 2 && collectMode === 'card') showClarifyBar(); else hideClarifyBar();
  }

  // ================= F2：追问条（card 模式阶段二/三的中途追问入口） =================
  function showClarifyBar() { var b = $('clarify-bar'); if (b) b.style.display = 'flex'; }
  function hideClarifyBar() { var b = $('clarify-bar'); if (b) b.style.display = 'none'; }
  function sendClarify() {
    var inp = $('clarify-input');
    if (!inp) return;
    var text = (inp.value || '').trim();
    if (!text || busy) return;
    inp.value = '';
    pushMsg('user', text);        // 用户追问进右侧对话流
    setBusy(true);
    client.send({
      session_id: sessionId,
      message: text,
      scenario: currentScene,
    }).catch(function (e) { onError({ message: e.message || '发送失败' }); });
  }
  function bindClarify() {
    var send = $('clarify-send');
    if (send) send.addEventListener('click', sendClarify);
    var inp = $('clarify-input');
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendClarify(); });
  }

  // 渲染一个「标签条 + 可收起内容」区段
  // key: 'collect' | 'options' | 'tradeoff'；label: 标签文字；bodyHtml: 内容
  function secShell(key, label, bodyHtml) {
    var collapsed = collapsedKeys[key] === true;
    return '<section class="sec-panel' + (collapsed ? ' collapsed' : '') + '" id="sec-' + key + '">' +
      '<button type="button" class="collapse-bar" data-sec="' + key + '" aria-expanded="' + (!collapsed) + '">' +
      '<span class="cb-label">' + esc(label) + '</span><span class="cb-arrow">▾</span></button>' +
      '<div class="sec-body">' + bodyHtml + '</div></section>';
  }

  // 绑定所有 .collapse-bar：独立展开/收起互不影响
  function bindCollapseBars(root) {
    (root || document).querySelectorAll('.collapse-bar').forEach(function (bar) {
      bar.addEventListener('click', function () {
        var key = bar.getAttribute('data-sec');
        var sec = $('sec-' + key);
        if (!sec) return;
        var collapsed = sec.classList.toggle('collapsed');
        collapsedKeys[key] = collapsed;
        bar.setAttribute('aria-expanded', String(!collapsed));
      });
    });
  }

  // 阶段三：除预演卡外，其余全部默认收起（独立展开状态仍可恢复）
  function collapseHistoryForPhase3() {
    ['collect', 'options', 'tradeoff'].forEach(function (key) {
      collapsedKeys[key] = true;
      var sec = $('sec-' + key);
      if (sec) {
        sec.classList.add('collapsed');
        var bar = sec.querySelector('.collapse-bar');
        if (bar) bar.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ================= 渲染：进度条 =================
  function renderProgress(current) {
    var activeIdx = PROGRESS.findIndex(function (p) { return p.id === current; });
    var html = '';
    PROGRESS.forEach(function (p, i) {
      var state = i < activeIdx ? ' done' : (i === activeIdx ? ' active' : '');
      html += '<div class="progress-node' + state + '"><div class="progress-dot"></div><div class="progress-label">' + p.label + '</div></div>';
      if (i < PROGRESS.length - 1) {
        html += '<div class="progress-line' + (i < activeIdx ? ' done' : '') + '"></div>';
      }
    });
    els.progress.innerHTML = '<div class="progress-wrap">' + html + '</div>';
  }

  function stageToProgress(stage) {
    if (stage === 'mining' || stage === 'scene_confirm' || stage === 'scene_recognize' || stage === 'out_of_scope' || stage === 'reflection') return 'mining';
    if (stage === 'retrieval' || stage === 'advocate') return 'retrieval';
    if (stage === 'tradeoff' || stage === 'choice') return 'tradeoff';
    if (stage === 'rehearse' || stage === 'await_accept') return 'rehearse';
    if (stage === 'done') return 'done';
    return 'mining';
  }

  // ================= 渲染：场景选择面板 =================
  function renderSceneGrid() {
    var html = SCENES.map(function (s) {
      return '<button class="scene-card' + (s.key === currentScene ? ' selected' : '') + '" data-scene="' + s.key + '">' +
        '<span class="scene-emoji">' + s.emoji + '</span>' +
        '<span class="scene-name">' + s.name + '</span>' +
        '<span class="scene-desc">' + s.desc + '</span>' +
        '</button>';
    }).join('');
    els.leftBody.innerHTML =
      '<div class="panel-head"><span class="panel-title">选择一次抉择</span></div>' +
      '<div class="scene-grid">' + html + '</div>';
  }

  // ================= 渲染：采集表单（form_card） =================
  function renderFormCard(d) {
    setLayoutMode('card');   // 卡片模式：左 50% / 右 50%
    var fields = d.fields || [];
    var html = '';
    fields.forEach(function (f) {
      var label = esc(f.label || f.key) + (f.required ? '<span class="req">*</span>' : '');
      html += '<div class="form-field"><span class="form-label">' + label + '</span>';
      if (f.type === 'multi_select') {
        html += '<div class="pill-options" data-key="' + esc(f.key) + '" data-type="multi">';
        (f.options || []).forEach(function (op) {
          var opt = typeof op === 'object' ? (op.value != null ? op.value : op.label) : op;
          var on = (formValues[f.key] || []).indexOf(opt) !== -1;
          html += '<button type="button" class="pill' + (on ? ' on' : '') + '" data-val="' + esc(opt) + '">' + esc(opt) + '</button>';
        });
        html += '</div>';
      } else if (f.type === 'select') {
        html += '<div class="pill-options" data-key="' + esc(f.key) + '" data-type="single">';
        (f.options || []).forEach(function (op) {
          var opt = typeof op === 'object' ? (op.value != null ? op.value : op.label) : op;
          var on = formValues[f.key] === opt;
          html += '<button type="button" class="pill' + (on ? ' on' : '') + '" data-val="' + esc(opt) + '">' + esc(opt) + '</button>';
        });
        html += '</div>';
      } else {
        var isArea = f.type === 'textarea' || (f.type === 'text' && (f.key === 'desc' || f.key === 'reason'));
        var tag = isArea ? 'textarea' : 'input';
        var attrs = isArea ? '' : ' type="text"';
        html += '<' + tag + attrs + ' class="' + (isArea ? 'textarea' : 'input') + '" data-key="' + esc(f.key) +
          '" placeholder="' + esc(f.placeholder || '') + '" value="' + esc(formValues[f.key] || '') + '">' +
          (isArea ? esc(formValues[f.key] || '') : '') + '</' + tag + '>';
      }
      html += '</div>';
    });
    // 星球内核（补充诉求）
    html += '<div class="form-field"><span class="form-label">星球内核（补充你的诉求，可选）</span>' +
      '<textarea class="textarea" id="supplement-input" placeholder="还有什么条件或偏好？">' + esc(supplementary) + '</textarea></div>';
    html += '<button class="btn btn-primary form-submit" id="form-submit">交给缓择星球分析</button>';

    var seg = '<div class="seg"><button data-mode="card" class="' + (collectMode === 'card' ? 'on' : '') + '">卡片填写</button>' +
      '<button data-mode="talk" class="' + (collectMode === 'talk' ? 'on' : '') + '">口述对话</button></div>';

    els.leftBody.innerHTML =
      secShell('collect', '需求采集',
        '<div class="panel-head ws-head"><span class="panel-title">' + esc(d.title || '需求采集') + '</span>' + seg + '</div>' +
        renderQuickTemplates() +
        '<div id="form-area">' + html + '</div>' +
        '<div id="talk-area" style="display:none;"></div>');
    bindCollapseBars(els.leftBody);
    bindFormEvents();
    // F2：切回卡片模式时，阶段二/三恢复追问条
    if (phase >= 2) showClarifyBar(); else hideClarifyBar();
  }

  // 模块三：快速模板胶囊栏（横向滚动）
  function renderQuickTemplates() {
    var list = QUICK_TEMPLATES[currentScene] || [];
    if (!list.length) return '';
    var caps = list.map(function (t) {
      return '<button type="button" class="quick-cap" data-tpl="' + esc(t.id) + '">' + esc(t.title) + '</button>';
    }).join('');
    return '<div class="quick-tpl"><div class="quick-tpl-label">快速模板</div><div class="quick-tpl-scroll">' + caps + '</div></div>';
  }

  // 模块三：应用某个快速模板，仅填充当前表单存在的字段 key
  function applyQuickTemplate(tplId) {
    var list = QUICK_TEMPLATES[currentScene] || [];
    var tpl = list.find(function (t) { return t.id === tplId; });
    if (!tpl || !lastFormCard) return;
    var fieldKeys = (lastFormCard.fields || []).map(function (f) { return f.key; });
    var vals = tpl.values || {};
    Object.keys(vals).forEach(function (k) {
      if (fieldKeys.indexOf(k) === -1) return;   // 仅填充与后端 schema 对齐的字段
      formValues[k] = vals[k];
    });
    if (tpl.supplementary) supplementary = tpl.supplementary;  // 映射到「星球内核」补充诉求
    renderFormCard(lastFormCard);   // 重渲染以反映填充值
    toast('已填入「' + tpl.title + '」');
  }

  function toast(msg) {
    if (window.MMXUI && window.MMXUI.toast) { window.MMXUI.toast(msg); return; }
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:999px;font-size:13px;z-index:200;opacity:0;transition:opacity .25s;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 1400);
  }

  function bindFormEvents() {
    var area = els.leftBody || els.left;
    // 模块三：快速模板胶囊，点击一键填充
    area.querySelectorAll('.quick-cap').forEach(function (btn) {
      btn.addEventListener('click', function () { applyQuickTemplate(btn.getAttribute('data-tpl')); });
    });
    area.querySelectorAll('.pill-options').forEach(function (box) {
      var key = box.getAttribute('data-key');
      var type = box.getAttribute('data-type');
      box.querySelectorAll('.pill').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var val = btn.getAttribute('data-val');
          if (type === 'multi') {
            var arr = formValues[key] || [];
            var i = arr.indexOf(val);
            if (i >= 0) arr.splice(i, 1); else arr.push(val);
            formValues[key] = arr;
            btn.classList.toggle('on');
          } else {
            formValues[key] = val;
            box.querySelectorAll('.pill').forEach(function (b) { b.classList.remove('on'); });
            btn.classList.add('on');
          }
        });
      });
    });
    area.querySelectorAll('.input, .textarea').forEach(function (inp) {
      inp.addEventListener('input', function () {
        var key = inp.getAttribute('data-key');
        if (key) formValues[key] = inp.value;
      });
    });
    var sup = $('supplement-input');
    if (sup) sup.addEventListener('input', function () { supplementary = sup.value; });
    var submit = $('form-submit');
    if (submit) submit.addEventListener('click', submitForm);
  }

  function submitForm() {
    if (busy) return;
    var fd = { values: formValues, supplementary: supplementary };
    pushMsg('user', '已填写信息，请分析');
    setBusy(true);
    client.send({
      session_id: sessionId,
      form_data: fd,
      scenario: currentScene,
    }).catch(function (e) { onError({ message: e.message || '提交失败' }); });
  }

  // ================= 渲染：对话模式 =================
  function renderTalkArea() {
    setLayoutMode('talk');   // 口述模式：左 40% / 右 60%
    hideClarifyBar();        // F2：talk 模式用左侧输入框，隐藏右侧追问条
    var seg = '<div class="seg"><button data-mode="card">卡片填写</button>' +
      '<button data-mode="talk" class="on">口述对话</button></div>';
    var bodyHtml =
      '<div class="panel-head ws-head"><span class="panel-title">口述你的纠结</span>' + seg + '</div>' +
      '<div class="chat-log" id="talk-log"></div>' +
      '<div class="talk-input-row" style="display:flex;gap:8px;margin-top:12px;">' +
      '<input class="input" id="talk-input" placeholder="说说你在纠结什么…" />' +
      '<button class="btn btn-primary" id="talk-send">发送</button></div>';

    els.leftBody.innerHTML = secShell('collect', '对话采集', bodyHtml);
    bindCollapseBars(els.leftBody);

    // 恢复既有对话（若有）
    var log = $('talk-log');
    if (log && conversation.length) {
      conversation.forEach(function (m) {
        var div = document.createElement('div');
        div.className = 'chat-msg ' + m.role;
        var avatar = m.role === 'user' ? '你' : '🪐';
        div.innerHTML = '<div class="avatar">' + avatar + '</div><div class="chat-bubble">' + esc(m.text) + '</div>';
        log.appendChild(div);
      });
      log.scrollTop = log.scrollHeight;
    }

    var inp = $('talk-input');
    var send = $('talk-send');
    if (send) send.addEventListener('click', sendTalk);
    if (inp) inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') sendTalk(); });
  }

  function sendTalk() {
    var inp = $('talk-input');
    if (!inp || busy) return;
    var text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    pushMsg('user', text);
    setBusy(true);
    client.send({
      session_id: sessionId,
      message: text,
      scenario: currentScene,
    }).catch(function (e) { onError({ message: e.message || '发送失败' }); });
  }

  // ================= 渲染：候选方案（P13 纵向 2-3 张：名称/核心亮点/匹配度） =================
  function renderOptions(d) {
    var opts = (d && d.options) || [];
    if (!opts.length) return;
    lastOptions = opts;   // 缓存，供 doAccept 存档
    enterPhase(2);        // 阶段二：方案检索

    var html = opts.map(function (o, i) {
      var pros = (o.pros || []).slice(0, 3).map(function (p) { return '<div class="opt-point">· ' + esc(p) + '</div>'; }).join('');
      var cons = (o.cons || []).slice(0, 3).map(function (c) { return '<div class="opt-point">· ' + esc(c) + '</div>'; }).join('');
      var bl = (o.bottomline_hits && o.bottomline_hits.length) ? '<div class="opt-bottomline">⚠ 触碰底线：' + esc(o.bottomline_hits.join('；')) + '</div>' : '';
      return '<div class="opt-card opt-card-v" data-idx="' + i + '">' +
        '<div class="opt-head"><span class="opt-name">' + esc(o.name || ('方案' + (i + 1))) + '</span>' +
        (o.match_score != null ? '<span class="opt-match">匹配 ' + fmtMatch(o.match_score) + '%</span>' : '') + '</div>' +
        (pros ? '<div class="opt-highlight"><div class="blk-title">核心亮点</div>' + pros + '</div>' : '') +
        (cons ? '<div class="opt-highlight cost"><div class="blk-title">潜在弊端</div>' + cons + '</div>' : '') +
        bl +
        '</div>';
    }).join('');

    // 右侧「方案列表」区段：填充数据；口述模式阶段二不展示（阶段三才出现并收起）
    var sec = $('sec-options');
    if (sec) {
      var body = sec.querySelector('.sec-body');
      if (body) body.innerHTML = '<div class="opt-list">' + html + '</div>';
      if (collectMode === 'card') sec.style.display = 'block';
    }

    // 口述模式：方案卡片嵌入左侧对话流（阶段二仅左侧可见）
    if (collectMode === 'talk') {
      embedOptionsInTalk(opts);
    } else {
      // 卡片模式：右侧先补一条检索 AI 气泡（若后端未发 message 事件）
      var slog = $('side-log');
      if (slog && !slog.querySelector('.chat-msg')) {
        pushMsg('ai', '正在根据你的需求检索方案…');
      }
      showRightSection('side-log');
    }

    bindOptCardClicks();
  }

  // 口述模式：把方案卡片作为「嵌入对话流」的消息追加到 talk-log
  function embedOptionsInTalk(opts) {
    var log = $('talk-log');
    if (!log) return;
    var wrap = document.createElement('div');
    wrap.className = 'chat-msg ai';
    wrap.innerHTML = '<div class="avatar">🪐</div><div class="chat-bubble">根据你的描述，为你检索到以下方案，点选一个查看代价预演：</div>';
    log.appendChild(wrap);
    var cards = document.createElement('div');
    cards.className = 'opt-list opt-embed';
    cards.innerHTML = opts.map(function (o, i) {
      var pros = (o.pros || []).slice(0, 3).map(function (p) { return '<div class="opt-point">· ' + esc(p) + '</div>'; }).join('');
      var cons = (o.cons || []).slice(0, 3).map(function (c) { return '<div class="opt-point">· ' + esc(c) + '</div>'; }).join('');
      var bl = (o.bottomline_hits && o.bottomline_hits.length) ? '<div class="opt-bottomline">⚠ 触碰底线：' + esc(o.bottomline_hits.join('；')) + '</div>' : '';
      return '<div class="opt-card opt-card-v" data-idx="' + i + '">' +
        '<div class="opt-head"><span class="opt-name">' + esc(o.name || ('方案' + (i + 1))) + '</span>' +
        (o.match_score != null ? '<span class="opt-match">匹配 ' + fmtMatch(o.match_score) + '%</span>' : '') + '</div>' +
        (pros ? '<div class="opt-highlight"><div class="blk-title">核心亮点</div>' + pros + '</div>' : '') +
        (cons ? '<div class="opt-highlight cost"><div class="blk-title">潜在弊端</div>' + cons + '</div>' : '') +
        bl + '</div>';
    }).join('');
    log.appendChild(cards);
    log.scrollTop = log.scrollHeight;
    bindOptCardClicks(cards);
  }

  function bindOptCardClicks(root) {
    (root || document).querySelectorAll('.opt-card[data-idx]').forEach(function (card) {
      card.addEventListener('click', function () {
        var i = parseInt(card.getAttribute('data-idx'), 10);
        selectOption(i);
      });
    });
  }

  function selectOption(i) {
    var opts = lastOptions;
    var o = opts[i];
    if (!o || busy) return;
    finalChoiceName = o.name || '';
    lastPicked = o;            // P5.1：缓存选定方案，供导出卡用
    // 高亮选中
    document.querySelectorAll('.opt-card[data-idx]').forEach(function (c) {
      c.classList.toggle('picked', parseInt(c.getAttribute('data-idx'), 10) === i);
    });
    pushMsg('user', '选第' + (i + 1) + '个：' + (o.name || ''));
    setBusy(true);
    client.send({
      session_id: sessionId,
      message: '选第' + (i + 1) + '个',
      scenario: currentScene,
    }).catch(function (e) { onError({ message: e.message || '发送失败' }); });
  }

  // ================= 渲染：中立对比表（权衡官） =================
  function renderTradeoff(d) {
    var rows = (d && d.rows) || [];
    if (!rows.length) return;
    enterPhase(2);
    var bl = MMXStore.getBottomLines();
    var cards = rows.map(function (r) {
      var ctx = [r.scheme || '', (r.pros || []).join(' '), (r.cons || []).join(' ')].join('\n');
      var hits = MMXStore.matchBottomLinesDetail([ctx], bl) || [];
      return {
        scheme: r.scheme || '方案',
        pros: r.pros || [],
        cons: r.cons || [],
        touch: hits.length > 0,
        hitTexts: hits.map(function (h) { return h.text; }),
      };
    });
    var head = '<tr><th>维度 / 方案</th>' + cards.map(function (c) { return '<th>' + esc(c.scheme) + '</th>'; }).join('') + '</tr>';
    var prosRow = '<tr><td class="tf-scheme">核心优点</td>' + cards.map(function (c) {
      return '<td class="tf-pros">' + c.pros.map(esc).join('<br/>') + '</td>';
    }).join('') + '</tr>';
    var consRow = '<tr><td class="tf-scheme">潜在弊端</td>' + cards.map(function (c) {
      return '<td class="tf-cons">' + c.cons.map(esc).join('<br/>') + '</td>';
    }).join('') + '</tr>';
    var touchRow = '<tr><td class="tf-scheme">底线校验</td>' + cards.map(function (c) {
      return '<td class="tf-touch">' + (c.touch ? '⚠ ' + esc(c.hitTexts.join('；')) : '未触碰 ✓') + '</td>';
    }).join('') + '</tr>';

    var sec = $('sec-tradeoff');
    if (sec) {
      sec.style.display = 'block';
      var body = sec.querySelector('.sec-body');
      if (body) {
        body.innerHTML =
          '<div class="tf-intro">' + esc((d && d.intro) || '不替你决定，只把利弊摆清楚') + '</div>' +
          '<table class="tf-table"><thead>' + head + '</thead><tbody>' + prosRow + consRow + touchRow + '</tbody></table>' +
          '<div class="tf-guide">👆 请选择一个方案，查看代价预演</div>';
      }
    }
  }

  // ================= 渲染：反事实预演（P13 三段式 + 阶段三收折 + F1 反思形态文案） =================
  function renderRehearsal(d) {
    // F1：以后端 mode 字段为准（stage:reflection 提前切换左栏，rehearsal 数据精确决定文案）
    var isReflection = !!(d && d.mode === 'reflection');
    lastRehearsal = d;            // P5.1：缓存预演三件套，供导出卡用
    showSaveBar();                // W4：代价预演完成 → 出现「保存（存入星轨）」入口
    enterPhase(3);                // 阶段三：代价预演 → 触发历史内容收折
    if (isReflection) {
      // F1 反思形态：左栏替换为「反思模式」提示（无采集表单、无方案区段）
      renderReflectionHint();
    }
    // 口述模式阶段二隐藏的方案列表，此刻出现在右侧并默认收起
    if (!isReflection && collectMode === 'talk') {
      var optSec = $('sec-options');
      if (optSec) optSec.style.display = 'block';
    }
    // 除预演卡外全部默认收起（独立展开状态仍可恢复）
    collapseHistoryForPhase3();

    var sec = $('sec-rehearsal');
    if (sec) {
      sec.style.display = 'block';
      var body = sec.querySelector('.sec-body');
      if (body) {
        var holdTag = isReflection ? '你握住了什么' : '握住';
        var holdTitle = isReflection ? '选择这条路 · 你会得到' : '选择它 · 你会得到';
        var releaseTag = isReflection ? '你会错过什么' : '放下';
        var releaseTitle = isReflection ? '选择这条路 · 你会失去' : '放弃其他 · 你会失去';
        body.innerHTML =
          '<div class="panel rehearsal-card"><div class="panel-head"><span class="panel-title">' + (isReflection ? '反思你的决定' : '反事实代价预演') + '</span></div>' +
          '<div class="rh-grid">' +
          '<div class="rh-col hold"><div class="rh-tag hold-tag">' + holdTag + '</div><div class="rh-title">' + holdTitle + '</div><div class="rh-body">' + esc(d.chosen_gain || '') + '</div></div>' +
          '<div class="rh-col release"><div class="rh-tag release-tag">' + releaseTag + '</div><div class="rh-title">' + releaseTitle + '</div><div class="rh-body">' + esc(d.let_go_cost || '') + '</div></div>' +
          '</div>' +
          (d.counterfactual ? '<div class="rh-cost"><strong>代价收束：</strong>' + esc(d.counterfactual) + '</div>' : '') +
          '<div class="rh-accept"><p>' + esc(d.accept_prompt || '想好了吗？还是要再看看？') + '</p>' +
          '<div class="rh-actions">' +
          '<button class="btn btn-primary" id="save-history">💾 保存到历史星轨</button>' +
          '<button class="btn btn-ghost" id="export-page">📱 导出手机页</button>' +
          '<button class="btn btn-ghost" id="accept-choice">确认保存决策</button>' +
          '<button class="btn btn-ghost" id="reject-choice">返回修改条件</button></div></div></div>';
      }
    }

    var saveBtn = $('save-history');
    if (saveBtn) saveBtn.addEventListener('click', function () { saveToHistory(); });
    var expPage = $('export-page');
    if (expPage) expPage.addEventListener('click', function () { exportDecisionAsPage(); });
    var accept = $('accept-choice');
    if (accept) accept.addEventListener('click', function () { doAccept(); });
    var reject = $('reject-choice');
    if (reject) reject.addEventListener('click', function () {
      pushMsg('user', '返回修改条件');
      renderSceneGrid();
    });
  }

  // ================= F1：反思模式左栏提示卡 =================
  function renderReflectionHint() {
    var lb = els.leftBody;
    if (!lb) return;
    lb.innerHTML =
      '<div class="panel"><div class="panel-head"><span class="panel-title">反思模式</span></div>' +
      '<div class="ws-reflect-hint">' +
      '<div class="planet planet-sm"></div>' +
      '<p class="ws-empty-title">你已做出决定</p>' +
      '<p class="hint">不再列方案、不比选项——只帮你把「走这条路」的得与失摊开看看。</p>' +
      '</div></div>';
  }

  // ================= 渲染：缓解建议 / 转人工 / 完成 =================
  function renderMitigation(d) {
    var sec = $('sec-mitigation');
    if (sec) {
      sec.style.display = 'block';
      var body = sec.querySelector('.sec-body');
      if (body) body.innerHTML = '<div class="mit-card"><div class="panel-head"><span class="panel-title">💡 缓解建议</span></div><div class="mit-body">' + esc((d && d.content) || '') + '</div></div>';
    }
  }

  function renderEscalate(d) {
    var esc = $('right-esc');
    if (esc) {
      esc.style.display = 'block';
      esc.innerHTML =
        '<div class="panel esc-card"><div class="esc-emoji">🪐</div>' +
        '<div class="esc-title">已为你转接决策教练</div>' +
        '<div class="esc-msg">' + esc((d && d.message) || 'AI 连续几次没有接住你的需求，我们转人工继续帮你。') + '</div>' +
        '<button class="btn btn-primary" id="esc-retry">重新发起会话</button></div>';
    }
    var retry = $('esc-retry');
    if (retry) retry.addEventListener('click', function () { resetSession(); });
  }

  function renderDone(d) {
    setBusy(false);
    renderProgress('done');
    showCompleteModal();   // 模块五：完成弹窗（幂等，仅弹一次）
  }

  // 模块四/五：将当前场景/采集/对比/预演结论写入本地历史星轨（同一会话幂等更新，避免重复存档）
  // mode: 'both'(决策+对话) | 'decision'(仅决策) | 'conversation'(仅对话)
  function persistDecision(mode) {
    mode = mode || 'both';
    var rec = {
      scenario_type: currentScene,
      title: finalChoiceName || '一次抉择',
      options: (lastOptions || []).slice(),   // 全部候选（P11-5 全量回看，不再截断 3 条）
      fields: formValues,
      rehearsal: lastRehearsal || null,
      tradeoff: lastTradeoff || null,         // P11-5 完整中立权衡
      mitigation: lastMitigation || null,
      bottomline_hits: (lastPicked && lastPicked.bottomline_hits) || [],
      kind: 'decision',
      ts: Date.now(),
    };
    if (mode === 'both' || mode === 'decision') {
      rec.events = sessionEvents.slice();      // 完整过程时间线
    }
    if (mode === 'both' || mode === 'conversation') {
      rec.conversation = conversation.slice(); // 对话回放
    }
    try {
      if (currentDecisionId) {
        MMXStore.updateDecision(currentDecisionId, rec);
      } else {
        var saved = MMXStore.addDecision(rec);
        currentDecisionId = saved.id;
      }
    } catch (e) {}
    return currentDecisionId;
  }

  // 模块四：点击「存档并导出」→ 打开三选项弹窗（用户偏好 3 选项 UI；选完选项后才真正存档 + 下载 JSON 备份）
  function saveToHistory() {
    openSaveModal();
  }
  function exportDecisionAsJson() {
    try {
      var rec = {
        scenario_type: currentScene,
        title: finalChoiceName || '一次抉择',
        options: (lastOptions || []).slice(),
        fields: formValues,
        rehearsal: lastRehearsal || null,
        tradeoff: lastTradeoff || null,
        mitigation: lastMitigation || null,
        bottomline_hits: (lastPicked && lastPicked.bottomline_hits) || [],
        conversation: conversation.slice(),
        events: sessionEvents.slice(),
        ts: Date.now(),
      };
      var json = JSON.stringify(rec, null, 2);
      // 修复导出 JSON 中文乱码：① MIME 显式声明 UTF-8；② 字符串前缀加 BOM 让 Windows 记事本正确识别
      var blob = new Blob(['\ufeff' + json], { type: 'application/json;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      var d = new Date();
      var p = function (n) { return String(n).padStart(2, '0'); };
      a.download = '缓择星球-' + (rec.title || '抉择') + '-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + p(d.getHours()) + p(d.getMinutes()) + '.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    } catch (e) {
      console.error('导出失败', e);
      alert('导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }
  // P2-12 模态可访问性：焦点陷阱 + Esc + 关闭后归还焦点
  var saveTrapRelease = null, saveTrigger = null;
  var doneTrapRelease = null, doneTrigger = null;

  function openSaveModal() {
    var mask = $('save-mask');
    if (!mask) return;
    saveTrigger = document.activeElement;          // 记录触发元素
    mask.style.display = 'flex';
    var card = mask.querySelector('.modal-card');
    if (card && window.MMXUI && window.MMXUI.trapFocus) {
      saveTrapRelease = window.MMXUI.trapFocus(card, { onEscape: closeSaveModal });
    }
  }
  function closeSaveModal() {
    var mask = $('save-mask');
    if (mask) mask.style.display = 'none';
    if (saveTrapRelease) { saveTrapRelease(); saveTrapRelease = null; }
    if (saveTrigger && typeof saveTrigger.focus === 'function') {
      var t = saveTrigger; saveTrigger = null; t.focus();   // 归还焦点
    }
  }
  function handleSaveChoice(mode) {
    if ((mode === 'both' || mode === 'decision') && !lastRehearsal) {
      toast('请先完成代价预演再保存决策'); return;
    }
    if (mode === 'conversation' && !conversation.length) {
      toast('还没有对话内容可保存'); return;
    }
    persistDecision(mode);
    exportDecisionAsJson();   // 一并下载带 BOM 的 UTF-8 JSON 备份（避免 Windows 记事本乱码）
    closeSaveModal();
    toast('已存档并导出');
    if (mode === 'both' || mode === 'decision') {
      decisionAccepted = true;          // W5：用户通过保存决策三选项显式确认
      showCompleteModal();
    }
  }
  function showSaveBar() { var b = $('save-bar'); if (b) b.classList.add('show'); }
  function hideSaveBar() { var b = $('save-bar'); if (b) b.classList.remove('show'); }

  // 模块五：抉择完成弹窗（圆形浅粉底+对勾），仅在代价预演后 + 保存成功后弹出
  function showCompleteModal() {
    if (doneModalShown) return;
    if (!decisionAccepted) return;     // W5：必须用户显式确认（doAccept / 保存决策），场景点击或 SSE done 事件不再直接触发完成弹窗
    if (!lastRehearsal) return;       // 严禁提前：必须经历反事实代价预演
    doneModalShown = true;
    doneTrigger = document.activeElement;          // 记录触发元素
    var mask = document.getElementById('done-mask');
    if (mask) mask.style.display = 'flex';
    var card = mask && mask.querySelector('.modal-card');
    if (card && window.MMXUI && window.MMXUI.trapFocus) {
      doneTrapRelease = window.MMXUI.trapFocus(card, { onEscape: hideCompleteModal });
    }
  }
  function hideCompleteModal() {
    var mask = document.getElementById('done-mask');
    if (mask) mask.style.display = 'none';
    if (doneTrapRelease) { doneTrapRelease(); doneTrapRelease = null; }
    if (doneTrigger && typeof doneTrigger.focus === 'function') {
      var t = doneTrigger; doneTrigger = null; t.focus();   // 归还焦点
    }
  }

  // 确认保存决策 → 写入 mmx_decisions（幂等）并触发完成弹窗
  function doAccept() {
    if (busy) return;
    decisionAccepted = true;           // W5：用户显式确认决策（仅此路径与保存决策路径可触发完成弹窗）
    persistDecision();
    pushMsg('user', '确认保存决策');
    showCompleteModal();
    if (busy) return;
    setBusy(true);
    client.send({
      session_id: sessionId,
      message: '接受',
      scenario: currentScene,
    }).catch(function () { setBusy(false); });
  }

  // ================= 对话消息 =================
  function pushMsg(role, text) {
    recordMsg(role, text);          // 捕获对话，供「仅保存对话」与历史回看
    // 口述模式：走左侧 talk-log（保持对话连贯）
    // 卡片模式：AI 消息进右侧 side-log，用户消息也进右侧（记录操作轨迹）
    var log = null;
    if (collectMode === 'talk') {
      log = $('talk-log');
      if (!log) {
        // 兜底：右侧 side-log
        log = $('side-log');
        showRightSection('side-log');
      }
    } else {
      log = $('side-log');
      showRightSection('side-log');
    }
    if (!log) return;
    var div = document.createElement('div');
    div.className = 'chat-msg ' + role;
    var avatar = role === 'user' ? '你' : '🪐';
    div.innerHTML = '<div class="avatar">' + avatar + '</div><div class="chat-bubble">' + esc(text) + '</div>';
    log.appendChild(div);
    log.scrollTop = log.scrollHeight;
  }

  // 显示右侧某区段（side-log / sec-options / sec-tradeoff / sec-mitigation / sec-rehearsal）
  function showRightSection(id) {
    var el = $(id);
    if (el) el.style.display = 'block';
    // 隐藏空状态
    var empty = $('right-empty');
    if (empty) empty.style.display = 'none';
  }

  // 右侧空状态提示（阶段一引导文案）
  function setRightHint(html) {
    var empty = $('right-empty');
    if (empty) {
      empty.style.display = 'block';
      empty.innerHTML = '<div class="planet planet-sm"></div><p class="ws-empty-title">' + html + '</p>';
    }
    var side = $('side-log');
    if (side) side.style.display = 'none';
  }

  // 场景确认（W1）：右侧渲染候选场景卡（含理由 + 置信度），用户点击才进入对应场景
  function renderSceneConfirm(d) {
    var cands = (d && d.scene_candidates) || [];
    if (!cands.length) return;
    var empty = $('right-empty');
    if (empty) {
      empty.style.display = 'block';
      var html =
        '<p class="ws-empty-title">你想做哪方面的选择？</p>' +
        '<p class="hint" style="margin:6px 0 14px;">' + esc((d && d.scene_reason) || '帮你把方向再确认一下') + '</p>' +
        '<div class="scene-confirm-list">' +
        cands.map(function (c) {
          var key = c.key || c.scenario || c.value || '';
          var scene = SCENES.find(function (s) { return s.key === key; });
          var emoji = scene ? scene.emoji : '🪐';
          var name = c.name || (scene ? scene.name : key);
          var conf = (c.confidence != null) ? '<span class="scene-confirm-conf">' + fmtMatch(c.confidence * 100) + '%</span>' : '';
          return '<button type="button" class="scene-confirm-card" data-key="' + esc(key) + '">' +
            '<span class="scene-confirm-emoji">' + emoji + '</span>' +
            '<span class="scene-confirm-name">' + esc(name) + '</span>' +
            (c.reason ? '<span class="scene-confirm-reason">' + esc(c.reason) + '</span>' : '') +
            conf +
            '</button>';
        }).join('') +
        '</div>';
      empty.innerHTML = html;
      empty.querySelectorAll('.scene-confirm-card').forEach(function (btn) {
        btn.addEventListener('click', function () {
          pickScene(btn.getAttribute('data-key'), true);  // keepSession：保留原会话作为澄清消息
        });
      });
    }
    var side = $('side-log');
    if (side) side.style.display = 'none';
  }

  // ================= 错误 / 忙碌 =================
  function onError(d) {
    setBusy(false);
    var msg = (d && d.message) || '出错了';
    var sec = $('sec-mitigation');
    if (sec) {
      sec.style.display = 'block';
      var body = sec.querySelector('.sec-body');
      if (body) body.innerHTML = (body.innerHTML || '') + '<div class="mit-card"><div class="mit-body" style="color:#A32D2D;">⚠ ' + esc(msg) + '</div></div>';
    }
  }

  function setBusy(v) {
    busy = v;
    var panel = $('left-panel');
    if (panel) panel.classList.toggle('busy', v);
  }

  // ================= P5.1 决策卡导出（Canvas → PNG） =================
  // 设计：720x1240 暖米白卡 + 品牌头 + 场景标签 + 抉择摘要 + 候选对比 + 预演三件套 + 底线触碰 + 品牌尾
  // 纯画布 API，无外部依赖；中文走 system font
  var EXPORT_W = 720;
  var EXPORT_H = 1240;
  var EXPORT_PAD = 36;
  var CN_FONT = '-apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif';

  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function fmtDate(d) {
    return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) +
      ' ' + pad2(d.getHours()) + ':' + pad2(d.getMinutes());
  }
  function fmtDateForName(d) {
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) +
      '-' + pad2(d.getHours()) + pad2(d.getMinutes());
  }

  // 自动换行（按像素宽度），返回总行数
  function wrapText(ctx, text, maxW, maxLines) {
    var lines = [];
    if (!text) return lines;
    var s = String(text);
    var paras = s.split(/\n/);
    paras.forEach(function (p) {
      if (!p) { lines.push(''); return; }
      var cur = '';
      var cjkMatched = p.match(/[一-龥]/g) || [];
      var cjkCount = cjkMatched.length;
      // 用整段逐字试探
      for (var i = 0; i < p.length; i++) {
        var cand = cur + p[i];
        if (ctx.measureText(cand).width > maxW && cur.length) {
          lines.push(cur);
          cur = p[i];
          if (maxLines && lines.length >= maxLines) {
            // 截断：加省略号
            var last = lines[lines.length - 1];
            while (ctx.measureText(last + '…').width > maxW && last.length) last = last.slice(0, -1);
            lines[lines.length - 1] = last + '…';
            return lines;
          }
        } else {
          cur = cand;
        }
      }
      if (cur || lines.length === 0) lines.push(cur);
    });
    return lines;
  }

  // 圆角矩形 path
  function roundRect(ctx, x, y, w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawTag(ctx, text, x, y, bg, fg) {
    ctx.font = '12px ' + CN_FONT;
    var padX = 10, padY = 6;
    var w = ctx.measureText(text).width + padX * 2;
    var h = 24;
    ctx.fillStyle = bg;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.fillStyle = fg;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + padX, y + h / 2 + 1);
    return { w: w, h: h, endX: x + w };
  }

  function drawHeadline(ctx, text, x, y) {
    ctx.font = '600 26px ' + CN_FONT;
    ctx.fillStyle = '#2C2926';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    var lines = wrapText(ctx, text, EXPORT_W - EXPORT_PAD * 2, 2);
    lines.forEach(function (ln, i) { ctx.fillText(ln, x, y + i * 34); });
    return lines.length * 34;
  }

  function drawSection(ctx, label, x, y) {
    ctx.font = '500 14px ' + CN_FONT;
    ctx.fillStyle = '#E98A68';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, x, y + 10);
    // 短分隔线
    ctx.strokeStyle = 'rgba(233,138,104,.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x, y + 24);
    ctx.lineTo(x + 28, y + 24);
    ctx.stroke();
    return 32;
  }

  function drawOptCard(ctx, o, x, y, w, picked) {
    var h = 160;
    ctx.fillStyle = picked ? 'rgba(233,138,104,0.10)' : '#FFFFFF';
    ctx.strokeStyle = picked ? '#E98A68' : 'rgba(0,0,0,0.06)';
    ctx.lineWidth = picked ? 1.5 : 1;
    roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    // 名称
    ctx.fillStyle = picked ? '#D9774F' : '#2C2926';
    ctx.font = '600 14px ' + CN_FONT;
    ctx.textBaseline = 'top';
    ctx.fillText(o.name || '—', x + 12, y + 12);
    if (picked) {
      var tagEnd = drawTag(ctx, '✓ 已选', x + w - 50, y + 10, '#E98A68', '#FFFFFF');
    }
    // 匹配度
    if (o.match_score != null) {
      ctx.fillStyle = '#888';
      ctx.font = '11px ' + CN_FONT;
      ctx.fillText('匹配 ' + fmtMatch(o.match_score) + '%', x + 12, y + 36);
    }
    // 优点
    ctx.fillStyle = 'rgba(216,228,237,.55)';
    ctx.fillRect(x + 12, y + 56, w - 24, 44);
    ctx.fillStyle = '#3A4A5A';
    ctx.font = '11px ' + CN_FONT;
    var pros = (o.pros || []).slice(0, 2).map(function (p) { return '· ' + p; });
    var prosLines = wrapText(ctx, pros.join('\n') || '—', w - 32, 3);
    prosLines.slice(0, 3).forEach(function (ln, i) { ctx.fillText(ln, x + 18, y + 60 + i * 14); });
    // 缺点
    ctx.fillStyle = 'rgba(242,215,213,.55)';
    ctx.fillRect(x + 12, y + 104, w - 24, 44);
    ctx.fillStyle = '#7A4F4D';
    var cons = (o.cons || []).slice(0, 2).map(function (c) { return '· ' + c; });
    var consLines = wrapText(ctx, cons.join('\n') || '—', w - 32, 3);
    consLines.slice(0, 3).forEach(function (ln, i) { ctx.fillText(ln, x + 18, y + 108 + i * 14); });
  }

  function drawTwoCol(ctx, title1, body1, title2, body2, x, y, w) {
    var colW = (w - 16) / 2;
    // 左 列
    ctx.fillStyle = 'rgba(216,228,237,.55)';
    roundRect(ctx, x, y, colW, 90, 10);
    ctx.fill();
    ctx.fillStyle = '#3A4A5A';
    ctx.font = '500 12px ' + CN_FONT;
    ctx.textBaseline = 'top';
    ctx.fillText(title1, x + 12, y + 10);
    ctx.fillStyle = '#2C2926';
    ctx.font = '12px ' + CN_FONT;
    var l1 = wrapText(ctx, body1 || '—', colW - 24, 4);
    l1.forEach(function (ln, i) { ctx.fillText(ln, x + 12, y + 32 + i * 16); });

    // 右 列
    var x2 = x + colW + 16;
    ctx.fillStyle = 'rgba(242,215,213,.55)';
    roundRect(ctx, x2, y, colW, 90, 10);
    ctx.fill();
    ctx.fillStyle = '#7A4F4D';
    ctx.font = '500 12px ' + CN_FONT;
    ctx.fillText(title2, x2 + 12, y + 10);
    ctx.fillStyle = '#2C2926';
    ctx.font = '12px ' + CN_FONT;
    var l2 = wrapText(ctx, body2 || '—', colW - 24, 4);
    l2.forEach(function (ln, i) { ctx.fillText(ln, x2 + 12, y + 32 + i * 16); });
    return 100;
  }

  function drawBox(ctx, title, body, x, y, w, h) {
    ctx.fillStyle = 'rgba(224,212,240,0.45)';
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.fillStyle = '#6B5B85';
    ctx.font = '500 12px ' + CN_FONT;
    ctx.textBaseline = 'top';
    ctx.fillText(title, x + 12, y + 10);
    ctx.fillStyle = '#2C2926';
    ctx.font = '12px ' + CN_FONT;
    var lines = wrapText(ctx, body || '—', w - 24, Math.floor((h - 36) / 16));
    lines.forEach(function (ln, i) { ctx.fillText(ln, x + 12, y + 32 + i * 16); });
  }

  function drawStarLine(ctx, x, y, label, text) {
    ctx.fillStyle = '#D9774F';
    ctx.font = '500 12px ' + CN_FONT;
    ctx.textBaseline = 'top';
    ctx.fillText(label, x, y);
    ctx.fillStyle = '#2C2926';
    var lines = wrapText(ctx, text, EXPORT_W - EXPORT_PAD * 2 - 80, 2);
    lines.forEach(function (ln, i) { ctx.fillText(ln, x + 64, y + i * 16); });
    return lines.length * 16 + 6;
  }

  function exportDecisionAsPng() {
    try {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var c = document.createElement('canvas');
      c.width = EXPORT_W * dpr;
      c.height = EXPORT_H * dpr;
      var ctx = c.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.textBaseline = 'top';

      // 背景渐变
      var bg = ctx.createLinearGradient(0, 0, 0, EXPORT_H);
      bg.addColorStop(0, '#FAF6F0');
      bg.addColorStop(1, '#F4EDE3');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

      // 顶部品牌头
      // 圆形 logo
      ctx.save();
      var lx = EXPORT_PAD + 16, ly = EXPORT_PAD + 14;
      var grad = ctx.createRadialGradient(lx - 4, ly - 4, 2, lx, ly, 18);
      grad.addColorStop(0, '#FFD9C0');
      grad.addColorStop(1, '#E98A68');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(lx, ly, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.32)';
      ctx.beginPath();
      ctx.ellipse(lx - 4, ly - 5, 7, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.fillStyle = '#2C2926';
      ctx.font = '600 16px ' + CN_FONT;
      ctx.textAlign = 'left';
      ctx.fillText('缓择星球 · 决策档案', EXPORT_PAD + 44, EXPORT_PAD + 4);
      ctx.fillStyle = '#888';
      ctx.font = '11px ' + CN_FONT;
      ctx.fillText('理性拆解选择 · 减少后悔抉择', EXPORT_PAD + 44, EXPORT_PAD + 26);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#A08872';
      ctx.font = '11px ' + CN_FONT;
      ctx.fillText(fmtDate(new Date()), EXPORT_W - EXPORT_PAD, EXPORT_PAD + 14);

      ctx.textAlign = 'left';

      // 分隔线
      var y = 96;
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(EXPORT_PAD, y);
      ctx.lineTo(EXPORT_W - EXPORT_PAD, y);
      ctx.stroke();

      // 场景标签
      var scene = SCENES.find(function (s) { return s.key === currentScene; });
      var sceneText = scene ? (scene.emoji + '  ' + scene.name) : '一次抉择';
      var tagEnd = drawTag(ctx, sceneText, EXPORT_PAD, 116, '#E0D4F0', '#2C2926');
      // 标签后：方案数
      var optN = (lastOptions || []).length;
      ctx.fillStyle = '#888';
      ctx.font = '11px ' + CN_FONT;
      ctx.textBaseline = 'middle';
      ctx.fillText('共 ' + optN + ' 个候选', tagEnd.endX + 10, 116 + 12);

      // 抉择摘要标题
      y = 168;
      var choiceTitle = (lastPicked && lastPicked.name) || finalChoiceName || '一次抉择';
      if (lastPicked) choiceTitle = '我决定 · ' + choiceTitle;
      else choiceTitle = '抉择摘要 · ' + choiceTitle;
      var hHead = drawHeadline(ctx, choiceTitle, EXPORT_PAD, y);
      y += hHead + 18;

      // 候选方案对比
      if (lastOptions && lastOptions.length) {
        y += drawSection(ctx, '📊 候选方案对比', EXPORT_PAD, y);
        var cols = Math.min(lastOptions.length, 3);
        var colW = (EXPORT_W - EXPORT_PAD * 2 - 16 * (cols - 1)) / cols;
        lastOptions.slice(0, 3).forEach(function (o, i) {
          var x = EXPORT_PAD + i * (colW + 16);
          drawOptCard(ctx, o, x, y, colW, o === lastPicked);
        });
        y += 170;
      }

      // 预演三件套
      if (lastRehearsal) {
        y += drawSection(ctx, '🌌 反事实代价预演', EXPORT_PAD, y);
        y += drawTwoCol(ctx, '握住 · 你会得到', lastRehearsal.chosen_gain || '—',
                        '放下 · 你会失去', lastRehearsal.let_go_cost || '—',
                        EXPORT_PAD, y, EXPORT_W - EXPORT_PAD * 2);
        if (lastRehearsal.counterfactual) {
          y += 8;
          drawBox(ctx, '💡 另一种可能', lastRehearsal.counterfactual, EXPORT_PAD, y, EXPORT_W - EXPORT_PAD * 2, 64);
          y += 76;
        }
      }

      // 底线触碰
      if (lastPicked) {
        var bl = MMXStore.getBottomLines().filter(function (x) { return x.enabled !== false; });
        var ctxTxt = [(lastPicked.pros || []).join(' '), (lastPicked.cons || []).join(' ')].join('\n');
        var hits = MMXStore.matchBottomLinesDetail([ctxTxt], bl) || [];
        if (hits.length) {
          y += drawSection(ctx, '⚠ 底线校验', EXPORT_PAD, y);
          ctx.textBaseline = 'top';
          hits.slice(0, 4).forEach(function (h) {
            y += drawStarLine(ctx, EXPORT_PAD, y, '触碰', h.text);
          });
          y += 8;
        }
      }

      // 底部品牌
      var bot = EXPORT_H - 60;
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.moveTo(EXPORT_PAD, bot);
      ctx.lineTo(EXPORT_W - EXPORT_PAD, bot);
      ctx.stroke();

      ctx.fillStyle = '#E98A68';
      ctx.beginPath();
      ctx.arc(EXPORT_PAD + 8, bot + 26, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#666';
      ctx.font = '11px ' + CN_FONT;
      ctx.textBaseline = 'middle';
      ctx.fillText('缓择星球 · 慢慢选 © 2026', EXPORT_PAD + 28, bot + 26);
      ctx.textAlign = 'right';
      ctx.fillText('mmx.manmanxuan.space', EXPORT_W - EXPORT_PAD, bot + 26);
      ctx.textAlign = 'left';

      // 输出 PNG
      c.toBlob(function (blob) {
        if (!blob) return;
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = 'mmx-decision-' + (currentScene || 'unknown') + '-' + fmtDateForName(new Date()) + '.png';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 0);
      }, 'image/png');
    } catch (err) {
      // 兜底：toBlob 在某些浏览器（Safari）PNG 异常时退化为 jpeg
      try {
        var c2 = document.querySelector('#__export_canvas__') || (function () {
          var x = document.createElement('canvas');
          x.id = '__export_canvas__';
          document.body.appendChild(x);
          return x;
        })();
        c2.toBlob(function (b) {
          if (!b) { alert('导出失败，请刷新后重试'); return; }
          var url = URL.createObjectURL(b);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'mmx-decision-' + (currentScene || 'unknown') + '-' + fmtDateForName(new Date()) + '.jpg';
          a.click();
          URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.92);
      } catch (_) {
        alert('当前浏览器不支持导出图片，请用 Chrome / Edge');
      }
    }
  }

  // ================= P14：导出一页手机页面（自包含 HTML） =================
  // 生成一个 390px 手机宽度、可直接在手机打开/分享/打印的独立 HTML 文件。
  function exportDecisionAsPage() {
    try {
      var scene = SCENES.find(function (s) { return s.key === currentScene; });
      var sceneText = scene ? (scene.emoji + '  ' + scene.name) : '一次抉择';
      var optN = (lastOptions || []).length;
      var choiceTitle = (lastPicked && lastPicked.name) || finalChoiceName || '一次抉择';
      var headline = lastPicked ? ('我决定 · ' + choiceTitle) : ('抉择摘要 · ' + choiceTitle);

      // 候选方案对比卡
      var optHtml = '';
      if (lastOptions && lastOptions.length) {
        optHtml = lastOptions.slice(0, 3).map(function (o, i) {
          var picked = o === lastPicked;
          var pros = (o.pros || []).map(function (p) { return '<li>' + esc(p) + '</li>'; }).join('');
          var cons = (o.cons || []).map(function (c) { return '<li>' + esc(c) + '</li>'; }).join('');
          var match = o.match_score != null ? '<span class="match">匹配 ' + fmtMatch(o.match_score) + '%</span>' : '';
          var pickedTag = picked ? '<span class="picked-tag">✓ 已选</span>' : '';
          return '<div class="opt-card' + (picked ? ' picked' : '') + '">' +
            '<div class="opt-head"><span class="opt-name">' + esc(o.name || ('方案' + (i + 1))) + '</span>' + match + pickedTag + '</div>' +
            '<div class="pros"><div class="blk-title">核心优点</div><ul>' + (pros || '<li>—</li>') + '</ul></div>' +
            '<div class="cons"><div class="blk-title">潜在弊端</div><ul>' + (cons || '<li>—</li>') + '</ul></div>' +
            '</div>';
        }).join('');
      }

      // 反事实代价预演
      var rhHtml = '';
      if (lastRehearsal) {
        rhHtml = '<section class="sec"><h2>🌌 反事实代价预演</h2>' +
          '<div class="rh-grid">' +
          '<div class="rh-col hold"><div class="rh-tag hold-tag">握住</div><p>' + esc(lastRehearsal.chosen_gain || '—') + '</p></div>' +
          '<div class="rh-col release"><div class="rh-tag release-tag">放下</div><p>' + esc(lastRehearsal.let_go_cost || '—') + '</p></div>' +
          '</div>' +
          (lastRehearsal.counterfactual ? '<div class="rh-close"><strong>代价收束 · 妥协与遗憾</strong><p>' + esc(lastRehearsal.counterfactual) + '</p></div>' : '') +
          '</section>';
      }

      // 底线校验
      var blHtml = '';
      if (lastPicked) {
        var blList = MMXStore.getBottomLines().filter(function (x) { return x.enabled !== false; });
        var ctxTxt = [(lastPicked.pros || []).join(' '), (lastPicked.cons || []).join(' ')].join('\n');
        var hits = MMXStore.matchBottomLinesDetail([ctxTxt], blList) || [];
        if (hits.length) {
          blHtml = '<section class="sec"><h2>⚠ 底线校验</h2>' +
            hits.slice(0, 4).map(function (h) { return '<div class="bl-hit">触碰 · ' + esc(h.text) + '</div>'; }).join('') +
            '</section>';
        }
      }

      var dateText = fmtDate(new Date());
      var page = '<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8">' +
        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
        '<title>决策档案 · 缓择星球</title>' +
        '<style>' +
        '*{margin:0;padding:0;box-sizing:border-box;-webkit-tap-highlight-color:transparent}' +
        'body{background:#FAF6F0;color:#2C2926;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;padding:20px 16px 40px;}' +
        '.page{max-width:390px;margin:0 auto;}' +
        'header{display:flex;align-items:center;gap:10px;margin-bottom:14px;}' +
        '.logo{width:36px;height:36px;border-radius:50%;background:radial-gradient(circle at 30% 30%,#FFD9C0,#E98A68);flex:none;position:relative;overflow:hidden}' +
        '.logo::after{content:"";position:absolute;left:8px;top:9px;width:12px;height:5px;border-radius:99px;background:rgba(255,255,255,.4);transform:rotate(-15deg)}' +
        '.brand .t1{font-size:15px;font-weight:600}' +
        '.brand .t2{font-size:11px;color:#888}' +
        '.date{margin-left:auto;font-size:11px;color:#A08872;white-space:nowrap}' +
        '.scene-tag{display:inline-block;font-size:12px;padding:4px 12px;border-radius:99px;background:#E0D4F0;color:#2C2926;margin-bottom:10px}' +
        'h1{font-size:22px;line-height:1.4;margin-bottom:18px}' +
        '.sec{margin-bottom:18px}' +
        '.sec h2{font-size:14px;color:#E98A68;font-weight:600;margin-bottom:10px;position:relative;padding-bottom:8px}' +
        '.sec h2::after{content:"";position:absolute;left:0;bottom:0;width:28px;height:2px;background:rgba(233,138,104,.35)}' +
        '.opt-card{background:#fff;border:1px solid rgba(0,0,0,.06);border-radius:14px;padding:14px;margin-bottom:10px}' +
        '.opt-card.picked{border-color:#E98A68;background:rgba(233,138,104,.06)}' +
        '.opt-head{display:flex;align-items:center;gap:8px;margin-bottom:8px}' +
        '.opt-name{font-size:14px;font-weight:600}' +
        '.match{font-size:11px;color:#D9774F}' +
        '.picked-tag{margin-left:auto;font-size:11px;background:#E98A68;color:#fff;padding:2px 8px;border-radius:99px}' +
        '.pros,.cons{border-radius:10px;padding:8px 10px;font-size:12px;margin-bottom:6px}' +
        '.pros{background:rgba(216,228,237,.55)}.cons{background:rgba(242,215,213,.55)}' +
        '.blk-title{font-size:11px;font-weight:600;margin-bottom:2px;opacity:.85}' +
        'ul{list-style:none}.pros ul li,.cons ul li{line-height:1.6}' +
        '.rh-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px}' +
        '.rh-col{border-radius:12px;padding:12px;font-size:12px;line-height:1.7}' +
        '.rh-col.hold{background:rgba(233,138,104,.14)}' +
        '.rh-col.release{background:rgba(216,228,237,.6)}' +
        '.rh-tag{display:inline-block;font-size:11px;font-weight:600;padding:2px 10px;border-radius:99px;margin-bottom:6px}' +
        '.rh-tag.hold-tag{background:#E98A68;color:#fff}' +
        '.rh-tag.release-tag{background:#D8E4ED;color:#2C2926}' +
        '.rh-close{background:rgba(242,215,213,.6);border-radius:12px;padding:12px;font-size:12px;line-height:1.7}' +
        '.rh-close strong{display:block;margin-bottom:4px}' +
        '.bl-hit{background:rgba(233,138,104,.08);border-radius:10px;padding:8px 10px;font-size:12px;color:#D9774F;margin-bottom:6px}' +
        'footer{margin-top:22px;padding-top:14px;border-top:1px solid rgba(0,0,0,.06);display:flex;align-items:center;gap:8px}' +
        'footer .dot{width:18px;height:18px;border-radius:50%;background:#E98A68}' +
        'footer span{font-size:11px;color:#666}' +
        'footer .url{margin-left:auto;font-size:11px;color:#888}' +
        '@media print{body{padding:0}.opt-card,.rh-col,.rh-close{page-break-inside:avoid}}' +
        '</style></head><body><div class="page">' +
        '<header><div class="logo"></div>' +
        '<div class="brand"><div class="t1">缓择星球 · 决策档案</div><div class="t2">理性拆解选择 · 减少后悔抉择</div></div>' +
        '<div class="date">' + esc(dateText) + '</div></header>' +
        '<span class="scene-tag">' + esc(sceneText) + ' · 共 ' + optN + ' 个候选</span>' +
        '<h1>' + esc(headline) + '</h1>' +
        (optHtml ? '<section class="sec"><h2>📊 候选方案对比</h2>' + optHtml + '</section>' : '') +
        rhHtml +
        blHtml +
        '<footer><div class="dot"></div><span>缓择星球 · 慢慢选 © 2026</span>' +
        '<span class="url">mmx.manmanxuan.space</span></footer>' +
        '</div></body></html>';

      var blob = new Blob([page], { type: 'text/html;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'mmx-decision-' + (currentScene || 'unknown') + '-' + fmtDateForName(new Date()) + '.html';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 0);
      toast('已导出手机页面（.html）');
    } catch (e) {
      alert('导出失败：' + (e && e.message ? e.message : '未知错误'));
    }
  }

  // ================= 会话控制 =================
  // 主动丢弃旧 SSE 流：用户点「重新开始」后，旧连接可能继续推 message 进入新会话
  var resetting = false;
  function resetSession() {
    resetting = true;
    sessionId = newSessionId();
    formValues = {};
    supplementary = '';
    finalChoiceName = '';
    sceneConfirmed = false;
    busy = false;
    currentDecisionId = null;
    doneModalShown = false;
    decisionAccepted = false;   // W5：复位显式确认标记
    sessionEvents = [];
    conversation = [];
    lastTradeoff = null;
    lastMitigation = null;
    lastRehearsal = null;       // W5：防止上一会话的预演结论泄漏，导致新会话完成弹窗提前弹出
    phase = 1;
    collapsedKeys = {};
    decisionMode = 'selection';   // F1：重置为选择形态
    document.body.classList.remove('ws-phase3');
    hideCompleteModal();
    hideSaveBar();
    hideClarifyBar();
    setLayoutMode('card');
    renderSceneGrid();
    renderProgress('mining');

    // 右栏复位：只显示空状态
    var empty = $('right-empty');
    if (empty) empty.style.display = 'block';
    ['sec-options', 'sec-tradeoff', 'sec-mitigation', 'sec-rehearsal', 'side-log', 'right-esc'].forEach(function (id) {
      var el = $(id);
      if (el) {
        el.style.display = 'none';
        var body = el.querySelector && el.querySelector('.sec-body');
        if (body) body.innerHTML = '';
      }
    });
    var side = $('side-log');
    if (side) side.innerHTML = '';
    // 下一帧再放开守卫，避免旧流残余 message 抢先 push
    setTimeout(function () { resetting = false; }, 0);
  }

  function pickScene(key, keepSession) {
    var scene = SCENES.find(function (s) { return s.key === key; });
    if (!scene) return;
    currentScene = key;
    sceneConfirmed = true;
    collectMode = 'card';
    formValues = {};
    supplementary = '';
    finalChoiceName = '';
    // W5：新场景意味着新抉择——重置完成相关状态，避免上一会话的 lastRehearsal/decisionAccepted 导致完成弹窗提前弹出
    lastRehearsal = null;
    lastTradeoff = null;
    lastMitigation = null;
    currentDecisionId = null;
    doneModalShown = false;
    decisionAccepted = false;
    if (!keepSession) sessionId = newSessionId();
    phase = 1;
    collapsedKeys = {};
    decisionMode = 'selection';   // F1：重新选场景回到选择形态
    document.body.classList.remove('ws-phase3');
    // W4：保存条改为「代价预演完成」后才出现（renderRehearsal 中显示），选场景阶段不显示
    hideSaveBar();
    renderFormCard({ title: scene.name + ' · 需求采集', fields: [] }); // 占位，等待后端下发
    pushMsg('user', '我选「' + scene.name + '」');
    renderProgress('mining');
    setRightHint('正在为你梳理「' + esc(scene.name) + '」…');
    setBusy(true);
    client.send({
      session_id: sessionId,
      message: keepSession ? ('我选「' + scene.name + '」') : scene.name,
      scenario: key,
    }).catch(function (e) { onError({ message: e.message || '启动失败' }); });
  }

  // ================= 演示模式（线上无本地后端时） =================
  function enterDemoMode() {
    var leftBody = els.leftBody;
    if (leftBody) {
      leftBody.innerHTML =
        '<div style="padding:28px 20px;text-align:center;line-height:1.9">' +
        '<div style="font-size:24px;margin-bottom:10px">🪐 演示模式</div>' +
        '<p style="color:var(--text-2);font-size:13.5px;margin-bottom:14px">当前为网页演示版：AI 实时决策需要连接本地后端服务（127.0.0.1:8001），线上访问暂不开放实时生成。</p>' +
        '<a href="_seed_demo.html" style="display:inline-block;padding:10px 20px;border-radius:999px;background:var(--c);color:#fff;font-weight:700;font-size:13.5px;text-decoration:none">查看「历史星轨」演示 →</a>' +
        '</div>';
    }
    if (els.right) els.right.style.display = 'none';
  }

  // ================= 初始化 =================
  function init() {
    els.progress = $('agent-progress');
    els.left = $('left-panel');
    els.leftBody = $('left-body');
    els.right = $('right-panel');

    /* 线上演示模式守卫：无本地后端（MMX_API_BASE 为空）时直接进入演示模式，
       不创建 SSE 客户端，避免线上访问裸报 Failed to fetch */
    if (!window.MMX_API_BASE) { enterDemoMode(); return; }

    client = ManManXuanWeb.createClient({
      endpoint: (window.MMX_API_BASE || 'http://127.0.0.1:8001') + '/api/chat',
      tokenUrl: (window.MMX_API_BASE || 'http://127.0.0.1:8001') + '/api/token',
      userId: 'web_' + (Math.random().toString(16).slice(2, 10)),
    });
    // 守卫：resetSession 期间丢弃所有旧 SSE 事件，避免旧消息污染新会话
    var _origOn = client.on.bind(client);
    client.on = function (evt, fn) { _origOn(evt, function (d) { if (resetting) return; fn(d); }); };

    client.on('message', function (d) {
      if (d && d.content) pushMsg('ai', d.content);
    });
    client.on('stage', function (d) {
      if (d && d.stage) {
        recordEvent('stage', d);
        renderProgress(stageToProgress(d.stage));
        if (d.stage === 'scene_confirm' && d.scene_candidates && !sceneConfirmed) {
          // 场景确认：展示候选场景卡让用户选（对齐小程序 showConfirm，避免模糊输入被误分流）
          renderSceneConfirm(d);
        }
        if (d.stage === 'reflection') {
          // F1：反思模式（用户已做决定）——左栏切提示卡、右侧显示 AI 对话
          decisionMode = 'reflection';
          renderReflectionHint();
          showRightSection('side-log');
        }
        if (d.stage === 'done') setBusy(false);
      }
    });
    client.on('form_card', function (d) {
      setBusy(false);
      recordEvent('form_card', d);
      if (d && d.scenario) currentScene = d.scenario;
      lastFormCard = d;            // 缓存，供切回卡片模式时本地重渲染
      // 新表单 → 重置填写值（保留上次填写可少打扰；这里重置为干净状态）
      formValues = {};
      supplementary = (d.supplementary && d.supplementary.value) || '';
      if (collectMode === 'card') {
        renderFormCard(d);
        // 阶段一：右侧空状态引导「填写左侧卡片」
        setRightHint('填写左侧卡片，开启AI决策分析');
      }
    });
    client.on('options', function (d) { setBusy(false); recordEvent('options', d); renderOptions(d); });
    client.on('tradeoff', function (d) { setBusy(false); lastTradeoff = d; recordEvent('tradeoff', d); renderTradeoff(d); });
    client.on('rehearsal', function (d) { setBusy(false); recordEvent('rehearsal', d); renderRehearsal(d); });
    client.on('mitigation', function (d) { setBusy(false); lastMitigation = d; recordEvent('mitigation', d); renderMitigation(d); });
    client.on('escalate', function (d) { setBusy(false); recordEvent('escalate', d); renderEscalate(d); });
    client.on('done', function (d) { recordEvent('done', d); renderDone(d); });
    client.on('error', function (d) { onError(d); });

    // 模块五：完成弹窗控制
    var doneExport = document.getElementById('done-export');
    if (doneExport) doneExport.addEventListener('click', exportDecisionAsPng);
    var doneExportPage = document.getElementById('done-export-page');
    if (doneExportPage) doneExportPage.addEventListener('click', exportDecisionAsPage);
    var doneMask = document.getElementById('done-mask');
    if (doneMask) doneMask.addEventListener('click', function (e) { if (e.target === doneMask) hideCompleteModal(); });

    // P11-4：保存弹窗（三选项）+ 悬浮保存条
    var saveBoth = $('save-both'); if (saveBoth) saveBoth.addEventListener('click', function () { handleSaveChoice('both'); });
    var saveDec = $('save-decision'); if (saveDec) saveDec.addEventListener('click', function () { handleSaveChoice('decision'); });
    var saveConv = $('save-conversation'); if (saveConv) saveConv.addEventListener('click', function () { handleSaveChoice('conversation'); });
    var saveCancel = $('save-cancel'); if (saveCancel) saveCancel.addEventListener('click', closeSaveModal);
    var saveMask = $('save-mask'); if (saveMask) saveMask.addEventListener('click', function (e) { if (e.target === saveMask) closeSaveModal(); });
    var saveBarOpen = $('save-bar-open'); if (saveBarOpen) saveBarOpen.addEventListener('click', openSaveModal);
    var saveBarCancel = $('save-bar-cancel'); if (saveBarCancel) saveBarCancel.addEventListener('click', hideSaveBar);

    // 顶部「重新开始」按钮（之前漏绑，导致点击无效）→ 完整重置会话
    var resetBtn = $('reset-session');
    if (resetBtn) resetBtn.addEventListener('click', function () {
      // 关掉可能还在跑的 SSE 流，避免旧消息污染新会话
      try { if (client) client.close && client.close(); } catch (e) {}
      resetSession();
    });

    // F2：追问条绑定（card 模式阶段二/三的中途追问入口）
    bindClarify();

    // P13：阶段三收起标签条（独立展开/收起互不影响）
    bindCollapseBars(document.body);

    resetSession();

    // URL 直达：?scene=shopping 自动选中场景（首页/场景矩阵跳转）
    var params = new URLSearchParams(window.location.search);
    var sceneParam = params.get('scene');
    if (sceneParam && SCENES.some(function (s) { return s.key === sceneParam; })) {
      pickScene(sceneParam);
    }

    // 事件委托：场景卡 / 模式切换（绑定在左面板，动态内容仍可命中）
    els.left.addEventListener('click', function (e) {
      var sceneBtn = e.target.closest('[data-scene]');
      if (sceneBtn) { pickScene(sceneBtn.getAttribute('data-scene')); return; }
      var modeBtn = e.target.closest('[data-mode]');
      if (modeBtn && sceneConfirmed) {
        var target = modeBtn.getAttribute('data-mode');
        if (target === collectMode) return;
        collectMode = target;
        if (collectMode === 'talk') {
          renderTalkArea();
          // 口述阶段一：右侧空状态引导
          if (phase < 2) setRightHint('和AI聊聊你的纠结，逐步理清思路');
        }
        else if (collectMode === 'card') {
          // 切回卡片：优先本地缓存重渲染（避免重复请求后端采集卡）
          if (lastFormCard) {
            renderFormCard(lastFormCard);
            if (phase < 2) setRightHint('填写左侧卡片，开启AI决策分析');
          } else if (client) {
            setBusy(true);
            client.send({ session_id: sessionId, message: '再给我一次需求采集卡', scenario: currentScene })
              .catch(function (e) { onError({ message: e.message || '切换失败' }); });
          }
        }
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
