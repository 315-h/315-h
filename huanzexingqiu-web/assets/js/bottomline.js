/**
 * 缓择星球 · 我的底线页（P3）
 * 分类清单 + 新增/编辑/删除 + 启用开关 + 预置底线一键填充。
 * 数据源：MMXStore.getBottomLines()（mmx_bottomlines）。底线上带 enabled 开关字段。
 */
(function () {
  'use strict';

  var els = {};

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ================= 渲染底线清单 =================
  function renderList() {
    var list = MMXStore.getBottomLines();
    if (!list.length) {
      els.list.innerHTML = '<div class="empty-tip">还没有底线，先添加一条，或点击上方预置底线一键填充</div>';
      return;
    }
    els.list.innerHTML = list.map(function (bl) {
      var off = bl.enabled === false ? ' bl-off' : '';
      var kw = (bl.keywords || '').split(/[,，、;；]/).filter(Boolean);
      var kwHtml = kw.map(function (k) { return '<span class="tag tag-pos">' + esc(k) + '</span>'; }).join(' ');
      return '<div class="bl-card' + off + '" data-id="' + esc(bl.id) + '">' +
        '<div style="flex:1;">' +
        '<div class="bl-text">' + esc(bl.text) + '</div>' +
        (kwHtml ? '<div class="bl-kw">' + kwHtml + '</div>' : '') +
        '</div>' +
        '<div class="bl-actions">' +
        '<button class="switch' + (bl.enabled === false ? '' : ' on') + '" data-act="toggle" aria-label="启用开关"></button>' +
        '<button class="btn btn-ghost" data-act="edit">编辑</button>' +
        '<button class="btn btn-ghost" data-act="del">删除</button>' +
        '</div></div>';
    }).join('');

    // 委托事件
    els.list.querySelectorAll('.bl-card').forEach(function (card) {
      var id = card.getAttribute('data-id');
      card.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          var act = btn.getAttribute('data-act');
          var rec = MMXStore.getBottomLines().find(function (x) { return x.id === id; });
          if (!rec) return;
          if (act === 'toggle') {
            MMXStore.updateBottomLine(id, { enabled: rec.enabled === false ? true : false });
            renderList();
          } else if (act === 'edit') {
            openEditor(rec);
          } else if (act === 'del') {
            MMXStore.removeBottomLine(id);
            renderList();
          }
        });
      });
    });
  }

  // ================= 内联编辑器 =================
  function openEditor(rec) {
    var listEl = els.list;
    // 先移除旧编辑器
    var old = document.getElementById('bl-editor');
    if (old) old.remove();
    var box = document.createElement('div');
    box.id = 'bl-editor';
    box.className = 'card bl-editor';
    box.innerHTML =
      '<h3 style="font-size:15px;margin-bottom:12px;">编辑底线</h3>' +
      '<div class="row"><div><label class="form-label">底线内容</label>' +
      '<input class="input" id="bl-e-text" value="' + esc(rec.text) + '" /></div>' +
      '<div><label class="form-label">关键词（逗号分隔）</label>' +
      '<input class="input" id="bl-e-kw" value="' + esc(rec.keywords || '') + '" /></div></div>' +
      '<div style="display:flex;gap:10px;">' +
      '<button class="btn btn-primary" id="bl-e-save">保存</button>' +
      '<button class="btn btn-ghost" id="bl-e-cancel">取消</button></div>';
    listEl.prepend(box);
    document.getElementById('bl-e-save').addEventListener('click', function () {
      var text = document.getElementById('bl-e-text').value.trim();
      var kw = document.getElementById('bl-e-kw').value.trim();
      if (!text) return;
      MMXStore.updateBottomLine(rec.id, { text: text, keywords: kw });
      box.remove();
      renderList();
    });
    document.getElementById('bl-e-cancel').addEventListener('click', function () { box.remove(); });
    setTimeout(function () {
      var inp = document.getElementById('bl-e-text');
      if (inp) inp.focus();
    }, 100);
  }

  // ================= 初始化 =================
  function init() {
    els.list = document.getElementById('bl-list');
    var addText = document.getElementById('bl-new-text');
    var addKw = document.getElementById('bl-new-kw');
    var addBtn = document.getElementById('bl-add');

    addBtn.addEventListener('click', function () {
      var text = addText.value.trim();
      if (!text) return;
      MMXStore.addBottomLine(text, addKw.value.trim());
      addText.value = '';
      addKw.value = '';
      renderList();
    });

    // 预置底线
    var presets = document.getElementById('bl-presets');
    MMXStore.BOTTOMLINE_PRESETS.forEach(function (p) {
      var btn = document.createElement('button');
      btn.className = 'preset-chip';
      btn.textContent = p.text;
      btn.addEventListener('click', function () {
        // 避免重复添加同文本
        var dup = MMXStore.getBottomLines().some(function (x) { return x.text === p.text; });
        if (!dup) MMXStore.addBottomLine(p.text, p.keywords);
        renderList();
      });
      presets.appendChild(btn);
    });

    renderList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
