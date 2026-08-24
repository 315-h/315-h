/**
 * 缓择星球 · 历史星轨页（P3）
 * 星轨总览（累计次数/场景分布/星球碎片）→ 场景筛选 → 记录流 → 详情抽屉（收藏/复盘备注/删除/重新编辑）。
 * 数据源：MMXStore.getDecisions()（localStorage mmx_decisions）。
 */
(function () {
  'use strict';

  var SCENARIOS = {
    renting:  { short: '租房', color: '#8FB9D9' },
    career:   { short: '职业', color: '#E0A98F' },
    travel:   { short: '旅行', color: '#9BB7A3' },
    shopping: { short: '购物', color: '#C9A9D4' },
    health:   { short: '健康', color: '#E59A9A' },
    move:     { short: '搬家', color: '#B8A6D9' },
    study:    { short: '学习', color: '#D9C089' },
  };

  var FILTERS = [
    { key: 'all', label: '全部' },
    { key: 'renting', label: '租房' },
    { key: 'career', label: '职业' },
    { key: 'travel', label: '旅行' },
    { key: 'shopping', label: '购物' },
    { key: 'health', label: '健康' },
    { key: 'move', label: '搬家' },
    { key: 'study', label: '学习' },
  ];

  var els = {};
  var currentFilter = 'all';
  var currentTimeWindow = 0; // 0 = 全部；否则天数（7/30/90）

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtTime(ts) {
    if (!ts) return '';
    var d = new Date(ts);
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function sceneShort(key) { return (SCENARIOS[key] || { short: key }).short; }
  function sceneColor(key) { return (SCENARIOS[key] || { color: '#888' }).color; }

  var STAGE_LABELS = {
    scene_confirm: '场景确认', mining: '需求挖掘', retrieval: '方案检索',
    options: '候选方案', tradeoff: '中立权衡', rehearsal: '代价预演',
    mitigation: '缓解建议', done: '完成'
  };
  function stageLabel(s) { return STAGE_LABELS[s] || s; }

  function eventSummary(ev) {
    var d = ev.data;
    if (!d) return '';
    if (ev.stage === 'options' && d.options) return '陈列 ' + d.options.length + ' 个候选方案';
    if (ev.stage === 'tradeoff' && d.rows) return '中立对比 ' + d.rows.length + ' 个方案利弊';
    if (ev.stage === 'rehearsal') return '预演代价：握住与放下的后果';
    if (ev.stage === 'mitigation') return '给出缓解建议';
    if (ev.stage === 'form_card') return '下发需求采集卡';
    return '';
  }

  // 完整过程回看：时间线 + 中立权衡 + 代价预演 + 对话回放（P11-5）
  function processSectionsHtml(d) {
    var html = '';
    var events = d.events || [];
    if (events.length) {
      var tl = events.map(function (ev) {
        var sum = eventSummary(ev);
        return '<div class="tl-item"><div class="tl-dot"></div><div class="tl-body"><div class="tl-stage">' + esc(stageLabel(ev.stage)) + '</div>' + (sum ? '<div class="tl-sum">' + sum + '</div>' : '') + '</div></div>';
      }).join('');
      html += '<div class="detail-section"><h4>完整过程时间线</h4><div class="detail-timeline">' + tl + '</div></div>';
    }
    if (d.tradeoff && d.tradeoff.rows && d.tradeoff.rows.length) {
      var rows = d.tradeoff.rows;
      var head = '<tr><th>维度 / 方案</th>' + rows.map(function (r) { return '<th>' + esc(r.scheme || '方案') + '</th>'; }).join('') + '</tr>';
      var pros = '<tr><td class="tf-scheme">核心优点</td>' + rows.map(function (r) { return '<td class="tf-pros">' + (r.pros || []).map(esc).join('<br/>') + '</td>'; }).join('') + '</tr>';
      var cons = '<tr><td class="tf-scheme">潜在弊端</td>' + rows.map(function (r) { return '<td class="tf-cons">' + (r.cons || []).map(esc).join('<br/>') + '</td>'; }).join('') + '</tr>';
      html += '<div class="detail-section"><h4>中立权衡（完整方案对比）</h4><div class="detail-tradeoff"><table class="tf-table"><thead>' + head + '</thead><tbody>' + pros + cons + '</tbody></table></div></div>';
    }
    if (d.rehearsal) {
      var rh = d.rehearsal;
      html += '<div class="detail-section"><h4>代价预演（完整）</h4><div class="detail-rehearsal">' +
        '<div class="rh-grid">' +
        '<div class="rh-col hold"><div class="rh-title">握住 · 你会得到</div><div class="rh-body">' + esc(rh.chosen_gain || '') + '</div></div>' +
        '<div class="rh-col release"><div class="rh-title">放下 · 你会失去</div><div class="rh-body">' + esc(rh.let_go_cost || '') + '</div></div>' +
        '</div>' +
        (rh.counterfactual ? '<div class="rh-counterfactual"><strong>另一种可能：</strong>' + esc(rh.counterfactual) + '</div>' : '') +
        '</div></div>';
    }
    if (d.conversation && d.conversation.length) {
      var conv = d.conversation.map(function (m) {
        return '<div class="convo-msg ' + (m.role === 'user' ? 'user' : 'ai') + '"><span class="convo-role">' + (m.role === 'user' ? '你' : '🪐') + '</span><span class="convo-text">' + esc(m.text) + '</span></div>';
      }).join('');
      html += '<div class="detail-section"><h4>对话回放</h4><div class="detail-convo">' + conv + '</div></div>';
    }
    return html;
  }

  // ================= 星轨总览 =================
  function renderOrbit() {
    var list = MMXStore.getDecisions();
    var planet = MMXStore.getPlanetState();
    var byScene = {};
    list.forEach(function (d) {
      var k = d.scenario_type || 'other';
      byScene[k] = (byScene[k] || 0) + 1;
    });
    var sceneHtml = Object.keys(byScene).map(function (k) {
      return '<span class="tag tag-scene" style="background:' + sceneColor(k) + '22;color:var(--text);">' + sceneShort(k) + ' ×' + byScene[k] + '</span>';
    }).join('');
    var frags = planet.frags.map(function (f) {
      return '<span class="orbit-frag ' + (f.lit ? 'lit' : 'dim') + '" style="' + (f.lit ? 'background:' + f.color : '') + '" title="' + esc(f.title || '') + '"></span>';
    }).join('');

    els.orbit.innerHTML =
      '<div class="orbit-flex">' +
      '<div class="orbit-stats">' +
      '<div class="orbit-stat"><div class="num">' + list.length + '</div><div class="lbl">累计抉择</div></div>' +
      '<div class="orbit-stat"><div class="num">' + planet.litCount + '/10</div><div class="lbl">星球点亮</div></div>' +
      '</div>' +
      '<div class="orbit-planet-wrap">' + frags + '</div>' +
      '<div style="flex:1;display:flex;gap:8px;flex-wrap:wrap;">' + (sceneHtml || '<span class="hint">还没有决策记录，去工作台开始一次抉择吧</span>') + '</div>' +
      '</div>';
  }

  // ================= 决策洞察（趋势 / 复盘率 / 场景偏好） =================
  function miniStat(n, label) {
    return '<div class="ins-mini"><span class="n">' + n + '</span><span class="l">' + label + '</span></div>';
  }
  function topDayLabel(buckets) {
    var maxCount = 0;
    buckets.forEach(function (b) { if (b.count > maxCount) maxCount = b.count; });
    if (maxCount === 0) return '还没有高频日，慢慢来';
    // 从最近一天往回找第一个 = maxCount 的，更贴合用户直觉（"最近活跃日"）
    for (var i = buckets.length - 1; i >= 0; i--) {
      if (buckets[i].count === maxCount) {
        return buckets[i].label + '（' + maxCount + ' 次）';
      }
    }
    return '还没有高频日，慢慢来';
  }

  function renderInsights() {
    var list = MMXStore.getDecisions();
    if (!list.length) {
      els.insights.innerHTML = window.MMXUI.renderEmptyState({
        icon: '📊',
        title: '决策洞察即将解锁',
        desc: '当你积累几次抉择后，这里会呈现你的决策节奏、复盘习惯与场景偏好。',
        card: true
      });
      return;
    }

    /* —— 趋势：近 14 天按日聚合 —— */
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var days = 14;
    var buckets = [];
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(today.getTime() - i * 86400000);
      buckets.push({ t: d.getTime(), label: (d.getMonth() + 1) + '/' + d.getDate(), count: 0 });
    }
    list.forEach(function (rec) {
      var dd = new Date(rec.ts || 0); dd.setHours(0, 0, 0, 0);
      for (var j = 0; j < buckets.length; j++) {
        if (buckets[j].t === dd.getTime()) { buckets[j].count++; break; }
      }
    });
    var maxCount = Math.max.apply(null, buckets.map(function (b) { return b.count; }).concat([1]));
    var total = list.length;
    var reviewed = list.filter(function (d) { return (d.review_note || '').trim().length > 0; }).length;
    var favCount = list.filter(function (d) { return d.favorite; }).length;
    var blCount = list.filter(function (d) { return (d.bottomline_hits || []).length > 0; }).length;
    var reviewRate = Math.round((reviewed / total) * 100);

    /* —— 场景分布 —— */
    var byScene = {};
    list.forEach(function (d) { var k = d.scenario_type || 'other'; byScene[k] = (byScene[k] || 0) + 1; });
    var sceneArr = Object.keys(byScene).map(function (k) { return { k: k, c: byScene[k] }; })
      .sort(function (a, b) { return b.c - a.c; });
    var maxScene = Math.max.apply(null, sceneArr.map(function (s) { return s.c; }).concat([1]));

    /* —— 趋势 SVG 柱状 —— */
    var W = 100, H = 42, gap = 1.1, bw = (W - gap * (days - 1)) / days;
    var bars = buckets.map(function (b, idx) {
      var h = maxCount ? (b.count / maxCount) * (H - 4) : 0;
      var x = idx * (bw + gap);
      var y = H - h;
      return '<rect class="ins-bar" x="' + x.toFixed(2) + '" y="' + y.toFixed(2) + '" width="' + bw.toFixed(2) +
        '" height="' + Math.max(h, 0.4).toFixed(2) + '" rx="0.6" opacity="' + (b.count ? '1' : '0.25') +
        '"><title>' + b.label + '：' + b.count + ' 次</title></rect>';
    }).join('');
    var trendSvg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="ins-trend-svg" preserveAspectRatio="none" role="img" aria-label="近14天决策趋势">' + bars + '</svg>';

    /* —— 复盘率环形 SVG —— */
    var R = 26, C = 2 * Math.PI * R;
    var off = C * (1 - reviewRate / 100);
    var ringSvg =
      '<svg viewBox="0 0 64 64" class="ins-ring-svg" role="img" aria-label="复盘率 ' + reviewRate + '%">' +
      '<circle class="ins-ring-bg" cx="32" cy="32" r="' + R + '" fill="none" stroke-width="7"/>' +
      '<circle class="ins-ring-fg" cx="32" cy="32" r="' + R + '" fill="none" stroke-width="7" stroke-linecap="round" ' +
      'stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + off.toFixed(1) + '" transform="rotate(-90 32 32)"/>' +
      '<text x="32" y="31" text-anchor="middle" class="ins-ring-num">' + reviewRate + '%</text>' +
      '<text x="32" y="43" text-anchor="middle" class="ins-ring-sub">复盘率</text>' +
      '</svg>';

    /* —— 场景条形 —— */
    var sceneBars = sceneArr.map(function (s) {
      var pct = Math.round((s.c / maxScene) * 100);
      return '<div class="ins-scene-row">' +
        '<span class="ins-scene-name">' + sceneShort(s.k) + '</span>' +
        '<span class="ins-scene-track"><span class="ins-scene-fill" style="width:' + pct + '%;background:' + sceneColor(s.k) + '"></span></span>' +
        '<span class="ins-scene-num">' + s.c + '</span>' +
        '</div>';
    }).join('');

    els.insights.innerHTML =
      '<div class="ins-grid">' +
        '<div class="ins-card">' +
          '<div class="ins-card-head"><span class="ins-card-title">决策节奏</span><span class="ins-card-meta">近 14 天</span></div>' +
          trendSvg +
          '<div class="ins-card-foot">最活跃的一天：' + topDayLabel(buckets) + '</div>' +
        '</div>' +
        '<div class="ins-card">' +
          '<div class="ins-card-head"><span class="ins-card-title">复盘习惯</span></div>' +
          '<div class="ins-ring-wrap">' + ringSvg +
            '<div class="ins-mini-stats">' + miniStat(reviewed, '已复盘') + miniStat(favCount, '已收藏') + miniStat(blCount, '触底线') + '</div>' +
          '</div>' +
        '</div>' +
        '<div class="ins-card">' +
          '<div class="ins-card-head"><span class="ins-card-title">场景偏好</span><span class="ins-card-meta">' + sceneArr.length + ' 类</span></div>' +
          '<div class="ins-scene-list">' + sceneBars + '</div>' +
        '</div>' +
      '</div>';
  }

  // ================= 筛选栏 =================
  function renderFilters() {
    var filterHtml = FILTERS.map(function (f) {
      return '<div class="filter-item' + (f.key === currentFilter ? ' active' : '') + '" data-filter="' + f.key + '">' + f.label + '</div>';
    }).join('');

    var timeChips = [
      { d: 0, label: '全部' },
      { d: 7, label: '7天' },
      { d: 30, label: '30天' },
      { d: 90, label: '90天' },
    ].map(function (t) {
      return '<button type="button" class="time-chip' + (t.d === currentTimeWindow ? ' active' : '') + '" data-time="' + t.d + '">' + t.label + '</button>';
    }).join('');

    var cleanupEntry = '<a class="cleanup-link-row" href="cleanup.html"><span class="cl-label">🧹 清理星际尘埃</span><span class="cl-arrow">›</span></a>';

    els.filters.innerHTML =
      filterHtml +
      '<div class="time-filter"><span class="time-filter-label">时间筛选</span><div class="time-chip-row">' + timeChips + '</div></div>' +
      cleanupEntry;

    els.filters.querySelectorAll('[data-filter]').forEach(function (item) {
      item.addEventListener('click', function () {
        currentFilter = item.getAttribute('data-filter');
        renderFilters();
        renderRecords();
      });
    });
    els.filters.querySelectorAll('[data-time]').forEach(function (item) {
      item.addEventListener('click', function () {
        currentTimeWindow = parseInt(item.getAttribute('data-time'), 10) || 0;
        renderFilters();
        renderRecords();
      });
    });
  }

  // ================= 记录流 =================
  function renderRecords() {
    var list = MMXStore.getDecisions();
    if (currentFilter !== 'all') {
      list = list.filter(function (d) { return d.scenario_type === currentFilter; });
    }
    if (currentTimeWindow > 0) {
      var cutoff = Date.now() - currentTimeWindow * 86400000;
      list = list.filter(function (d) { return (d.ts || 0) >= cutoff; });
    }
    if (els.count) {
      els.count.innerHTML = '共 <b>' + list.length + '</b> 条' +
        (currentFilter !== 'all' || currentTimeWindow > 0 ? '（已筛选）' : '');
    }
    if (!list.length) {
      var tip = currentFilter === 'all' ? '还没有决策记录' : '该场景下暂无记录';
      els.records.innerHTML = window.MMXUI.renderEmptyState({
        icon: '🪐',
        title: tip,
        desc: '每一次抉择都会在这里留下一段星轨，方便你日后回看与复盘。',
        ctaLabel: '开始第一次抉择',
        ctaHref: 'workspace.html'
      });
      return;
    }
    els.records.innerHTML = list.map(function (d) {
      var opts = (d.options || []).map(function (o) {
        var name = typeof o === 'string' ? o : (o.name || o.scheme || '');
        return '<b>' + esc(name) + '</b>';
      }).join(' / ');
      var fav = d.favorite ? '<span class="record-fav">★</span>' : '';
      return '<div class="record-card" data-id="' + esc(d.id) + '">' +
        '<div class="record-head"><div>' +
        '<span class="tag tag-scene" style="background:' + sceneColor(d.scenario_type) + '22;">' + sceneShort(d.scenario_type) + '</span>' +
        ' <span class="record-title">' + esc(d.title || '一次抉择') + '</span> ' + fav +
        '</div><span class="hint">' + fmtTime(d.ts) + '</span></div>' +
        (opts ? '<div class="record-options">' + opts + '</div>' : '') +
        '<div class="record-actions">' +
        '<button class="btn btn-ghost" data-act="detail">查看详情</button>' +
        '<button class="btn btn-ghost" data-act="review">继续复盘</button>' +
        '<button class="btn btn-ghost" data-act="fav">' + (d.favorite ? '取消收藏' : '收藏') + '</button>' +
        '<button class="btn btn-ghost" data-act="del">删除</button>' +
        '</div></div>';
    }).join('');

    // 委托事件
    els.records.querySelectorAll('.record-card').forEach(function (card) {
      var id = card.getAttribute('data-id');
      card.querySelectorAll('[data-act]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var act = btn.getAttribute('data-act');
          if (act === 'detail') openDetail(id);
          else if (act === 'review') openDetail(id, true);
          else if (act === 'fav') { MMXStore.toggleFavorite(id); renderRecords(); renderOrbit(); renderInsights(); }
          else if (act === 'del') { MMXStore.removeDecision(id); renderRecords(); renderOrbit(); renderInsights(); }
        });
      });
    });
  }

  // ================= 详情抽屉 =================
  var detailTrapRelease = null;   // P2-12 焦点陷阱解绑函数
  var detailTrigger = null;       // P2-12 记录打开抽屉的触发元素，关闭后归还焦点
  function openDetail(id, focusReview) {
    var d = MMXStore.getDecision(id);
    if (!d) return;
    detailTrigger = document.activeElement;   // P2-12：记录触发元素
    var fields = d.fields || {};
    var fieldHtml = Object.keys(fields).map(function (k) {
      var v = fields[k];
      var text = Array.isArray(v) ? v.join('、') : String(v || '');
      return text ? '<div><b>' + esc(k) + '</b>：' + esc(text) + '</div>' : '';
    }).join('');
    var bl = (d.bottomline_hits || []).map(esc).join('；');

    els.detailBody.innerHTML =
      '<h3 style="font-size:18px;">' + esc(d.title || '一次抉择') + '</h3>' +
      '<div class="hint" style="margin-top:6px;">' + sceneShort(d.scenario_type) + ' · ' + fmtTime(d.ts) + '</div>' +

      '<div class="detail-section"><h4>核心选项</h4>' +
      '<div class="kv">' + ((d.options || []).map(function (o) {
        var name = typeof o === 'string' ? o : (o.name || o.scheme || '');
        var pros = o && (o.pros || []).join('；');
        var cons = o && (o.cons || []).join('；');
        return '<div style="margin-bottom:8px;"><b>' + esc(name) + '</b>' +
          (pros ? '<br/><span style="color:var(--sub)">优点：' + esc(pros) + '</span>' : '') +
          (cons ? '<br/><span style="color:var(--sub)">弊端：' + esc(cons) + '</span>' : '') + '</div>';
      }).join('') || '<div>—</div>') + '</div></div>' +

      (fieldHtml ? '<div class="detail-section"><h4>采集信息</h4><div class="kv">' + fieldHtml + '</div></div>' : '') +
      (bl ? '<div class="detail-section"><h4>底线触碰</h4><div class="kv" style="color:var(--primary-strong)">' + bl + '</div></div>' : '') +

      processSectionsHtml(d) +

      '<div class="detail-section"><h4>复盘笔记</h4>' +
      '<textarea class="textarea review-input" id="review-note" placeholder="现在回看，这个决定怎么样？">' + esc(d.review_note || '') + '</textarea></div>' +

      '<div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">' +
      '<button class="btn btn-primary" id="review-save">保存笔记</button>' +
      '<button class="btn btn-ghost" id="review-del">删除记录</button>' +
      '<button class="btn btn-ghost" id="review-reedit" style="display:none;">重新编辑</button>' +
      '</div>';

    els.mask.classList.add('open');
    els.panel.classList.add('open');

    // P2-12：焦点陷阱 + Esc 关闭（focusReview 时由下方手动聚焦复盘框，故跳过初始聚焦）
    if (window.MMXUI && window.MMXUI.trapFocus) {
      detailTrapRelease = window.MMXUI.trapFocus(els.panel, {
        onEscape: closeDetail,
        skipFocus: !!focusReview
      });
    }

    if (focusReview) {
      setTimeout(function () {
        var note = document.getElementById('review-note');
        if (note) note.focus();
      }, 300);
    }

    document.getElementById('review-save').addEventListener('click', function () {
      var note = document.getElementById('review-note').value;
      MMXStore.addReviewNote(id, note);
      closeDetail();
      renderRecords();
    });
    document.getElementById('review-del').addEventListener('click', function () {
      MMXStore.removeDecision(id);
      closeDetail();
      renderRecords();
      renderOrbit();
      renderInsights();
    });
  }

  function closeDetail() {
    els.mask.classList.remove('open');
    els.panel.classList.remove('open');
    if (detailTrapRelease) { detailTrapRelease(); detailTrapRelease = null; }  // P2-12 解绑焦点陷阱
    if (detailTrigger && typeof detailTrigger.focus === 'function') {          // P2-12 归还焦点
      var t = detailTrigger; detailTrigger = null; t.focus();
    }
  }

  // 载入示例数据（幂等，重复点击不会重复插入）
  function loadDemoHere() {
    if (!window.MMXUI) return;
    window.MMXUI.loadDemo({
      onDone: function (added) {
        if (added > 0) { renderOrbit(); renderInsights(); renderFilters(); renderRecords(); }
      }
    });
  }

  // 导出全部历史星轨为 JSON（客户端下载，文件名含日期）
  function exportHistory() {
    var list = MMXStore.getDecisions();
    if (!list.length) {
      if (window.MMXUI && window.MMXUI.toast) window.MMXUI.toast('还没有可导出的决策记录');
      return;
    }
    var blob = new Blob([JSON.stringify(list, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var d = new Date();
    function p(n) { return n < 10 ? '0' + n : '' + n; }
    a.href = url;
    a.download = '缓择星球-历史星轨-' + d.getFullYear() + p(d.getMonth() + 1) + p(d.getDate()) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  // ================= 初始化 =================
  function init() {
    els.orbit = document.getElementById('orbit-body');
    els.insights = document.getElementById('insights-body');
    els.filters = document.getElementById('filter-list');
    els.records = document.getElementById('record-list');
    els.mask = document.getElementById('detail-mask');
    els.panel = document.getElementById('detail-panel');
    els.detailBody = document.getElementById('detail-body');
    els.exportBtn = document.getElementById('hist-export');
    els.filterClear = document.getElementById('filter-clear');
    els.count = document.getElementById('record-count');
    els.detailBack = document.getElementById('detail-back');

    document.getElementById('detail-close').addEventListener('click', closeDetail);
    els.mask.addEventListener('click', closeDetail);
    if (els.exportBtn) els.exportBtn.addEventListener('click', exportHistory);
    if (els.detailBack) els.detailBack.addEventListener('click', closeDetail);
    if (els.filterClear) els.filterClear.addEventListener('click', function () {
      currentFilter = 'all';
      currentTimeWindow = 0;
      renderFilters();
      renderRecords();
    });

    // 示例数据入口：委托监听任意 [data-demo] 按钮
    document.addEventListener('click', function (e) {
      var t = e.target;
      while (t && t !== document) {
        if (t.hasAttribute && t.hasAttribute('data-demo')) { loadDemoHere(); return; }
        t = t.parentNode;
      }
    });

    renderOrbit();
    renderInsights();
    renderFilters();
    renderRecords();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
