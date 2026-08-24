/**
 * 缓择星球 · 抉择模板库（P4 + 模块一迭代 + P12）
 * 5 套决策辅助模板（与小程序 toolbox 一致），本地填写、草稿缓存、可存历史星轨。
 * 字段类型：text / textarea / list（动态增删条目）。
 * 模块一补齐：①全部输入框 placeholder ②利弊打分模板 5 星打分 ③底部统一「引用星球内核」
 *           ④填写页顶部右上角「底线」「历史」快捷入口。
 * P12：移除「星轨回溯提醒」（用户反馈冗余）；保留 bottomline_hits 字段。
 */
(function () {
  'use strict';

  var TEMPLATES = [
    { id: 'dilemma', name: '通用两难抉择', emoji: '⚖️', desc: '两个选项反复横跳，把两边理由写清楚',
      fields: [
        { key: 'a', label: '选项 A', type: 'text', ph: '如：留在本城工作' },
        { key: 'b', label: '选项 B', type: 'text', ph: '如：去外地发展' },
        { key: 'knot', label: '我最纠结的点', type: 'textarea', ph: '描述一下卡住你的地方' },
        { key: 'options', label: '我的备选方案', type: 'list', listPh: '方案A / 方案B' },
      ] },
    { id: 'compare', name: '多选项对比表格', emoji: '📊', desc: '三个及以上选项横向对比，一目了然',
      fields: [
        { key: 'theme', label: '决策主题', type: 'text', ph: '如：选哪款手机' },
        { key: 'options', label: '备选方案', type: 'list', listPh: '方案A / 方案B / 方案C' },
        { key: 'dims', label: '我想对比的维度', type: 'list', listPh: '价格 / 性能 / 售后' },
      ] },
    { id: 'score', name: '利弊打分模板', emoji: '🧮', desc: '给每个选项的利与弊打分，量化感受', ratings: true,
      fields: [
        { key: 'options', label: '备选方案', type: 'list', listPh: '方案A / 方案B' },
        { key: 'pros', label: '我看重的优点', type: 'list', listPh: '如：性价比高' },
        { key: 'cons', label: '我担心的缺点', type: 'list', listPh: '如：售后一般' },
      ] },
    { id: 'risk', name: '风险预判模板', emoji: '🛡️', desc: '提前想清楚每个选择可能带来的后果',
      fields: [
        { key: 'theme', label: '决策主题', type: 'text', ph: '如：是否换工作' },
        { key: 'options', label: '备选方案', type: 'list', listPh: '方案A / 方案B' },
        { key: 'worst', label: '我最怕出现的后果', type: 'textarea', ph: '描述你最担心发生的事' },
      ] },
    { id: 'tradeoff', name: '取舍清单模板', emoji: '📝', desc: '分清「必须坚持」与「可以妥协」',
      fields: [
        { key: 'must', label: '必需要素', type: 'list', listPh: '如：薪资不低于X' },
        { key: 'may', label: '可让步要素', type: 'list', listPh: '如：公司规模' },
        { key: 'options', label: '我的备选方案', type: 'list', listPh: '方案A / 方案B' },
      ] },
  ];

  var DRAFT_KEY = 'mmx_tpl_draft';
  var els = {};
  var current = null;   // 当前编辑模板
  var formData = {};    // { key: 'value' | ['item1', ...], bottomline_hits:[], ratings:[] }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ================= 模板列表 =================
  function renderIndex() {
    els.grid.innerHTML = TEMPLATES.map(function (t) {
      return '<div class="tpl-card" data-id="' + t.id + '">' +
        '<div class="tpl-emoji">' + t.emoji + '</div>' +
        '<div class="tpl-name">' + t.name + '</div>' +
        '<div class="tpl-desc">' + t.desc + '</div></div>';
    }).join('');
    els.grid.querySelectorAll('.tpl-card').forEach(function (card) {
      card.addEventListener('click', function () { openFill(card.getAttribute('data-id')); });
    });
  }

  // ================= 填写页 =================
  function openFill(id) {
    current = TEMPLATES.find(function (t) { return t.id === id; });
    if (!current) return;
    // 读取草稿
    try {
      var drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      formData = (drafts[id] && drafts[id].values) ? drafts[id].values : {};
    } catch (e) { formData = {}; }
    // 确保 list 字段为数组、统一字段有默认值
    current.fields.forEach(function (f) {
      if (f.type === 'list' && !Array.isArray(formData[f.key])) formData[f.key] = [];
    });
    if (!Array.isArray(formData.bottomline_hits)) formData.bottomline_hits = [];
    if (current.ratings && !Array.isArray(formData.ratings)) formData.ratings = [];

    els.index.style.display = 'none';
    els.fill.style.display = 'block';
    renderForm();
    window.scrollTo(0, 0);
  }

  // 星级评分渲染（利弊打分模板专用）
  function renderStars(idx, value) {
    var html = '<div class="star-rating" data-idx="' + idx + '">';
    for (var n = 1; n <= 5; n++) {
      html += '<button type="button" class="star' + (n <= value ? ' on' : '') + '" data-val="' + n + '" aria-label="' + n + ' 星">★</button>';
    }
    html += '<span class="star-hint">' + (value > 0 ? value + ' 星' : '未评分') + '</span></div>';
    return html;
  }

  // 引用星球内核（用户预设底线）
  function renderBottomline() {
    var bls = (window.MMXStore && MMXStore.getBottomLines) ? MMXStore.getBottomLines() : [];
    var hits = formData.bottomline_hits || [];
    var html = '<div class="bl-ref" id="bl-ref">' +
      '<button type="button" class="bl-ref-row" id="bl-ref-toggle" aria-expanded="false">' +
        '<span class="planet planet-sm"></span>' +
        '<span class="bl-ref-label">引用星球内核（我的底线）</span>' +
        '<span class="bl-ref-count" id="bl-ref-count">' + (hits.length ? hits.length + ' 条' : '未引用') + '</span>' +
        '<span class="bl-ref-caret">▾</span>' +
      '</button>' +
      '<div class="bl-ref-panel" id="bl-ref-panel" style="display:none;">';
    if (!bls.length) {
      html += '<div class="bl-ref-empty">你还没有设置底线，<a href="bottomline.html">去「我的底线」添加 →</a></div>';
    } else {
      bls.forEach(function (bl, i) {
        var on = hits.indexOf(bl.text) !== -1;
        html += '<label class="bl-ref-item' + (on ? ' on' : '') + '" data-i="' + i + '">' +
          '<input type="checkbox" ' + (on ? 'checked' : '') + ' data-bl="' + i + '" />' +
          '<span>' + esc(bl.text) + '</span></label>';
      });
    }
    html += '</div></div>';
    return html;
  }

  function renderForm() {
    var html = '<h3 style="font-size:18px;margin-bottom:6px;">' + current.emoji + ' ' + current.name + '</h3>' +
      '<p class="hint" style="margin-bottom:20px;">' + current.desc + ' · 内容仅保存在本机浏览器</p>';

    html += '<div class="tpl-fill-grid">';
    current.fields.forEach(function (f) {
      html += '<div class="form-field"><span class="form-label">' + esc(f.label) + '</span>';
      if (f.type === 'textarea') {
        html += '<textarea class="textarea" data-key="' + esc(f.key) + '" placeholder="' + esc(f.ph || '') + '">' + esc(formData[f.key] || '') + '</textarea>';
      } else if (f.type === 'list') {
        html += '<div class="tpl-list" data-key="' + esc(f.key) + '">';
        var arr = formData[f.key] || [];
        arr.forEach(function (item, i) {
          html += '<div class="list-field-row"><input class="input" data-i="' + i + '" value="' + esc(item) + '" placeholder="' + esc(f.listPh || '') + '" />' +
            '<button class="btn btn-ghost list-add" data-del="' + i + '">删除</button></div>';
          // 利弊打分：每个选项下方跟随星级
          if (current.ratings && f.key === 'options') {
            var rating = (formData.ratings && formData.ratings[i]) || 0;
            html += renderStars(i, rating);
          }
        });
        html += '<button class="btn btn-ghost list-add" data-add="' + esc(f.key) + '">＋ 添加一项</button>';
        html += '</div>';
      } else {
        html += '<input class="input" type="text" data-key="' + esc(f.key) + '" value="' + esc(formData[f.key] || '') + '" placeholder="' + esc(f.ph || '') + '" />';
      }
      html += '</div>';
    });
    html += '</div>';  // /tpl-fill-grid

    // 底部统一功能：引用星球内核（占满整宽，独立模块）
    html += renderBottomline();

    html += '<div class="tpl-actions">' +
      '<button class="btn btn-primary" id="tpl-save">保存到历史星轨</button>' +
      '<button class="btn btn-ghost" id="tpl-draft">保存草稿</button>' +
      '<button class="btn btn-ghost" id="tpl-clear">清空</button>' +
      '</div>';

    els.form.innerHTML = html;
    bindForm();
  }

  function bindForm() {
    // 文本/文本域输入
    els.form.querySelectorAll('input[data-key], textarea[data-key]').forEach(function (inp) {
      inp.addEventListener('input', function () { formData[inp.getAttribute('data-key')] = inp.value; });
    });
    // list 输入
    els.form.querySelectorAll('.tpl-list').forEach(function (box) {
      var key = box.getAttribute('data-key');
      box.querySelectorAll('input[data-i]').forEach(function (inp) {
        inp.addEventListener('input', function () {
          var i = parseInt(inp.getAttribute('data-i'), 10);
          (formData[key] = formData[key] || [])[i] = inp.value;
        });
      });
      box.querySelectorAll('[data-add]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          (formData[key] = formData[key] || []).push('');
          renderForm();
        });
      });
      box.querySelectorAll('[data-del]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var i = parseInt(btn.getAttribute('data-del'), 10);
          (formData[key] || []).splice(i, 1);
          if (key === 'options' && current.ratings && Array.isArray(formData.ratings)) formData.ratings.splice(i, 1);
          renderForm();
        });
      });
    });
    // 星级打分
    els.form.querySelectorAll('.star-rating').forEach(function (box) {
      var idx = parseInt(box.getAttribute('data-idx'), 10);
      box.querySelectorAll('.star').forEach(function (star) {
        star.addEventListener('click', function () {
          var val = parseInt(star.getAttribute('data-val'), 10);
          (formData.ratings = formData.ratings || [])[idx] = val;
          // 局部更新高亮与提示，避免整页重渲染丢失焦点
          box.querySelectorAll('.star').forEach(function (s) {
            s.classList.toggle('on', parseInt(s.getAttribute('data-val'), 10) <= val);
          });
          box.querySelector('.star-hint').textContent = val + ' 星';
        });
      });
    });
    // 引用星球内核：展开/收起 + 勾选
    bindBottomline();
    // 动作按钮
    document.getElementById('tpl-save').addEventListener('click', saveToHistory);
    document.getElementById('tpl-draft').addEventListener('click', saveDraft);
    document.getElementById('tpl-clear').addEventListener('click', function () {
      formData = {};
      current.fields.forEach(function (f) { if (f.type === 'list') formData[f.key] = []; });
      formData.bottomline_hits = [];
      if (current.ratings) formData.ratings = [];
      renderForm();
    });
  }

  function bindBottomline() {
    var toggle = document.getElementById('bl-ref-toggle');
    var panel = document.getElementById('bl-ref-panel');
    if (!toggle || !panel) return;
    toggle.addEventListener('click', function () {
      var open = panel.style.display === 'none';
      panel.style.display = open ? 'grid' : 'none';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.classList.toggle('open', open);
    });
    panel.querySelectorAll('input[data-bl]').forEach(function (chk) {
      chk.addEventListener('change', function () {
        var i = parseInt(chk.getAttribute('data-bl'), 10);
        var bls = (window.MMXStore && MMXStore.getBottomLines) ? MMXStore.getBottomLines() : [];
        var bl = bls[i];
        if (!bl) return;
        formData.bottomline_hits = formData.bottomline_hits || [];
        var pos = formData.bottomline_hits.indexOf(bl.text);
        if (chk.checked && pos === -1) formData.bottomline_hits.push(bl.text);
        if (!chk.checked && pos !== -1) formData.bottomline_hits.splice(pos, 1);
        var item = chk.closest('.bl-ref-item');
        if (item) item.classList.toggle('on', chk.checked);
        var count = document.getElementById('bl-ref-count');
        if (count) count.textContent = formData.bottomline_hits.length ? formData.bottomline_hits.length + ' 条' : '未引用';
      });
    });
  }

  function saveDraft() {
    try {
      var drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      drafts[current.id] = { values: formData, ts: Date.now() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
      toast('草稿已保存');
    } catch (e) {}
  }

  function saveToHistory() {
    var title = '';
    if (formData.a && formData.b) title = formData.a + ' vs ' + formData.b;
    else if (formData.theme) title = formData.theme;
    else if (formData.must && formData.may) title = '取舍清单整理';
    else if ((formData.options || []).length) title = (formData.options[0] || '') + ' 等';
    else title = current.name;

    var rec = MMXStore.addDecision({
      scenario_type: '',
      template_id: current.id,
      title: title,
      options: (formData.options || []).map(function (o) { return { name: o, pros: [], cons: [] }; }),
      fields: formData,
      bottomline_hits: formData.bottomline_hits || [],
      kind: 'decision',
      ts: Date.now(),
    });
    MMXStore.pushRecentTemplate(current.id, current.name);
    try {
      var drafts = JSON.parse(localStorage.getItem(DRAFT_KEY) || '{}');
      delete drafts[current.id];
      localStorage.setItem(DRAFT_KEY, JSON.stringify(drafts));
    } catch (e) {}
    toast('已保存到历史星轨');
    setTimeout(function () { window.location.href = 'history.html'; }, 900);
  }

  // 轻量 toast
  function toast(msg) {
    if (window.MMXUI && window.MMXUI.toast) { window.MMXUI.toast(msg); return; }
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:999px;font-size:13px;z-index:200;opacity:0;transition:opacity .25s;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 1200);
  }

  // ================= 初始化 =================
  function init() {
    els.index = document.getElementById('tpl-index');
    els.fill = document.getElementById('tpl-fill');
    els.grid = document.getElementById('tpl-grid');
    els.form = document.getElementById('tpl-form');
    document.getElementById('tpl-back').addEventListener('click', function () {
      els.fill.style.display = 'none';
      els.index.style.display = 'block';
      current = null;
    });
    renderIndex();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
