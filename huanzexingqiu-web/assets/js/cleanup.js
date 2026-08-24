/**
 * 缓择星球 · 清理星际尘埃（模块二：数据清理页）
 * 双维度多选标签筛选（类型 / 情景） + 自动/手动勾选模式 + 底部固定操作区。
 * 左 30% 筛选，右 70% 可滚动列表（每条复选框+场景标签+主题+时间）。
 */
(function () {
  'use strict';

  // 类型筛选（多选；组内 OR，跨组 AND）
  var TYPE_FILTERS = [
    { key: 'no_final', name: '未记录最终选择' },
    { key: 'decision', name: '决策' },
    { key: 'dialogue', name: '对话' },
    { key: 'high', name: '高风险' },
    { key: 'mid', name: '中风险' },
    { key: 'low', name: '低风险' },
    { key: 'template', name: '模板库' },
    { key: 'has_bottomline', name: '含底线' },
  ];

  // 情景筛选（键对齐 store 的 scenario_type）
  var SCENE_FILTERS = [
    { key: 'shopping', name: '购物' },
    { key: 'renting', name: '租房' },
    { key: 'career', name: '职业' },
    { key: 'travel', name: '旅行' },
    { key: 'health', name: '健康' },
    { key: 'move', name: '搬家' },
    { key: 'study', name: '学习' },
  ];

  var SCENE_NAME = {
    shopping: '购物', renting: '租房', career: '职业', travel: '旅行',
    health: '健康', move: '搬家', study: '学习',
  };

  var state = {
    typeSel: new Set(),
    sceneSel: new Set(),
    mode: 'auto',            // auto | manual
    checked: new Set(),      // manual 模式下用户勾选的 id
  };

  var els = {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtDate(ts) {
    var d = new Date(ts || Date.now());
    var p = function (n) { return n < 10 ? '0' + n : '' + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }

  // 风险等级：优先决策自带 risk_level，否则按情景近似映射（仅用于筛选演示）
  function riskOf(d) {
    if (d && d.risk_level) return d.risk_level; // 'high' | 'mid' | 'low'
    var high = ['career', 'move', 'renting'];
    var mid = ['travel', 'study'];
    if (high.indexOf(d.scenario_type) >= 0) return 'high';
    if (mid.indexOf(d.scenario_type) >= 0) return 'mid';
    return 'low';
  }

  function matchType(d) {
    if (state.typeSel.size === 0) return true;
    var ok = false;
    state.typeSel.forEach(function (k) {
      if (k === 'no_final') { if (!d.final_choice) ok = true; }
      else if (k === 'decision') { if (d.kind !== 'dialogue') ok = true; }
      else if (k === 'dialogue') { if (d.kind === 'dialogue') ok = true; }
      else if (k === 'high') { if (riskOf(d) === 'high') ok = true; }
      else if (k === 'mid') { if (riskOf(d) === 'mid') ok = true; }
      else if (k === 'low') { if (riskOf(d) === 'low') ok = true; }
      else if (k === 'template') { if (d.template_id) ok = true; }
      else if (k === 'has_bottomline') { if ((d.bottomline_hits || []).length > 0) ok = true; }
    });
    return ok;
  }

  function matchScene(d) {
    if (state.sceneSel.size === 0) return true;
    return state.sceneSel.has(d.scenario_type);
  }

  function getFiltered() {
    return MMXStore.getDecisions().filter(function (d) {
      return matchType(d) && matchScene(d);
    });
  }

  // ============== 渲染：筛选标签 ==============
  function renderFilters() {
    els.filterType.innerHTML = TYPE_FILTERS.map(function (f) {
      var on = state.typeSel.has(f.key);
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-type="type" data-key="' + f.key + '">' + esc(f.name) + '</button>';
    }).join('');
    els.filterScene.innerHTML = SCENE_FILTERS.map(function (f) {
      var on = state.sceneSel.has(f.key);
      return '<button type="button" class="chip' + (on ? ' on' : '') + '" data-type="scene" data-key="' + f.key + '">' + esc(f.name) + '</button>';
    }).join('');

    els.filterType.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () { toggleSel(state.typeSel, b.getAttribute('data-key')); afterFilterChange(); });
    });
    els.filterScene.querySelectorAll('.chip').forEach(function (b) {
      b.addEventListener('click', function () { toggleSel(state.sceneSel, b.getAttribute('data-key')); afterFilterChange(); });
    });
  }

  function toggleSel(set, key) {
    if (set.has(key)) set.delete(key); else set.add(key);
  }

  // 筛选变化后：自动模式下勾选全部命中项；手动模式保留用户勾选（但移除已不可见的）
  function afterFilterChange() {
    renderFilters();
    var filtered = getFiltered();
    if (state.mode === 'auto') {
      state.checked = new Set(filtered.map(function (d) { return d.id; }));
    } else {
      var visible = new Set(filtered.map(function (d) { return d.id; }));
      state.checked.forEach(function (id) { if (!visible.has(id)) state.checked.delete(id); });
    }
    renderList();
  }

  // ============== 渲染：列表 ==============
  function renderList() {
    var filtered = getFiltered();
    els.listCount.textContent = filtered.length + ' 条记录';
    els.selCount.textContent = state.checked.size;

    if (!filtered.length) {
      els.records.innerHTML = window.MMXUI.renderEmptyState({
        icon: '🌌',
        title: '没有符合条件的记录',
        desc: '试试调整上方的筛选标签，或返回历史星轨看看。'
      });
      return;
    }

    els.records.innerHTML = filtered.map(function (d) {
      var isOn = state.mode === 'auto' || state.checked.has(d.id);
      var scene = SCENE_NAME[d.scenario_type] || '未分类';
      return '<label class="cleanup-row' + (isOn ? ' on' : '') + '">' +
        '<input type="checkbox" class="row-check"' + (isOn ? ' checked' : '') + ' data-id="' + esc(d.id) + '" />' +
        '<span class="tag tag-scene scene-tag">' + esc(scene) + '</span>' +
        '<span class="row-title">' + esc(d.title || '未命名抉择') + '</span>' +
        '<span class="row-time">' + fmtDate(d.ts) + '</span>' +
        '</label>';
    }).join('');

    els.records.querySelectorAll('.row-check').forEach(function (chk) {
      chk.addEventListener('change', function () {
        if (state.mode === 'auto') {
          // 自动模式下不允许手动改勾选（筛选即选），复位回自动态
          chk.checked = true;
          return;
        }
        var id = chk.getAttribute('data-id');
        if (chk.checked) state.checked.add(id); else state.checked.delete(id);
        chk.closest('.cleanup-row').classList.toggle('on', chk.checked);
        els.selCount.textContent = state.checked.size;
      });
    });
  }

  // ============== 删除 ==============
  function doClearSelected() {
    var ids = (state.mode === 'auto')
      ? getFiltered().map(function (d) { return d.id; })
      : Array.from(state.checked);
    if (!ids.length) { toast('没有可清理的记录'); return; }
    var n = MMXStore.removeDecisionsByIds(ids);
    state.checked = new Set();
    afterFilterChange();
    toast('已清理 ' + n + ' 条记录');
  }

  function doClearAll() {
    MMXStore.clearAll();
    state.checked = new Set();
    hideConfirm();
    afterFilterChange();
    toast('已清空全部数据');
  }

  // ============== 确认弹窗（P2-12 a11y：焦点陷阱 + Esc + 焦点归还） ==============
  var confirmTrapRelease = null;
  var confirmTrigger = null;
  function showConfirm() {
    confirmTrigger = document.activeElement;          // 记录触发元素
    els.confirmMask.style.display = 'flex';
    var card = els.confirmMask.querySelector('.modal-card');
    if (card && window.MMXUI && window.MMXUI.trapFocus) {
      confirmTrapRelease = window.MMXUI.trapFocus(card, { onEscape: hideConfirm });
    }
  }
  function hideConfirm() {
    els.confirmMask.style.display = 'none';
    if (confirmTrapRelease) { confirmTrapRelease(); confirmTrapRelease = null; }
    if (confirmTrigger && typeof confirmTrigger.focus === 'function') {
      var t = confirmTrigger; confirmTrigger = null; t.focus();   // 归还焦点
    }
  }

  // ============== 模式切换 ==============
  function setMode(mode) {
    state.mode = mode;
    els.modeBtns.forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-mode') === mode); });
    afterFilterChange();
  }

  function toast(msg) {
    if (window.MMXUI && window.MMXUI.toast) { window.MMXUI.toast(msg); return; }
    var t = document.createElement('div');
    t.style.cssText = 'position:fixed;left:50%;bottom:96px;transform:translateX(-50%);background:var(--text);color:var(--bg);padding:10px 20px;border-radius:999px;font-size:13px;z-index:300;opacity:0;transition:opacity .25s;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; });
    setTimeout(function () { t.style.opacity = '0'; setTimeout(function () { t.remove(); }, 300); }, 1400);
  }

  // ============== 初始化 ==============
  function init() {
    els.filterType = document.getElementById('filter-type');
    els.filterScene = document.getElementById('filter-scene');
    els.records = document.getElementById('cleanup-records');
    els.listCount = document.getElementById('list-count');
    els.selCount = document.getElementById('sel-count');
    els.modeBtns = document.querySelectorAll('.mode-btn');
    els.confirmMask = document.getElementById('confirm-mask');

    els.modeBtns.forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });

    document.getElementById('select-all-toggle').addEventListener('click', function () {
      // 在手动模式下：对当前可见项做全选/反选
      if (state.mode === 'auto') { toast('自动勾选模式下无需手动勾选'); return; }
      var filtered = getFiltered();
      var allOn = filtered.every(function (d) { return state.checked.has(d.id); });
      filtered.forEach(function (d) { if (allOn) state.checked.delete(d.id); else state.checked.add(d.id); });
      renderList();
    });

    document.getElementById('clear-selected').addEventListener('click', doClearSelected);
    document.getElementById('clear-all').addEventListener('click', showConfirm);
    document.getElementById('confirm-cancel').addEventListener('click', hideConfirm);
    document.getElementById('confirm-ok').addEventListener('click', doClearAll);
    els.confirmMask.addEventListener('click', function (e) { if (e.target === els.confirmMask) hideConfirm(); });
    document.getElementById('cancel-back').addEventListener('click', function () { window.location.href = 'history.html'; });

    renderFilters();
    afterFilterChange();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
