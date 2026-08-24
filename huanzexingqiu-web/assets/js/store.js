/**
 * 缓择星球 · 本地数据层（P3 完整版）
 * 与小程序 utils/storage.js 数据模型 100% 对齐，键名沿用 mmx_*（localStorage）：
 *   mmx_decisions    决策记录 [{id, scenario_type, template_id, title, options[], fields{}, pros[], cons[], tags[], favorite, review_note, reminder_days, ts, kind, bottomline_hits, planet_color}]
 *   mmx_bottomlines  我的底线 [{id, text, keywords, ts}]
 *   mmx_theme        'light' | 'dark'
 *   mmx_sid          会话 id
 *   mmx_recent_tpl   最近使用模板（最多 3）
 *   mmx_reminders    本地复盘提醒 [{id, decision_id, due_ts, days, done}]
 *   mmx_guide / mmx_home_hint  引导标记
 *   mmx_scene_order  场景卡片顺序
 */
(function (global) {
  'use strict';

  var K = {
    DECISIONS: 'mmx_decisions',
    BOTTOMLINES: 'mmx_bottomlines',
    THEME: 'mmx_theme',
    SID: 'mmx_sid',
    RECENT_TPL: 'mmx_recent_tpl',
    REMINDERS: 'mmx_reminders',
    GUIDE: 'mmx_guide',
    HOME_HINT: 'mmx_home_hint',
    SCENE_ORDER: 'mmx_scene_order',
  };

  // 4 条预置底线模板（一键填充，关键词用于对照高亮）
  var BOTTOMLINE_PRESETS = [
    { text: '通勤最长 1 小时，不接受异地长差', keywords: '通勤,出差,搬家,异地' },
    { text: '月薪不低于个人基准线（自行填写具体数字）', keywords: '薪资,工资,收入,涨薪,钱' },
    { text: '单笔非必要消费不超过预算上限（自行填写）', keywords: '消费,花钱,买,价格,预算,分期' },
    { text: '不长期熬夜，尽量 23 点前休息', keywords: '熬夜,加班,作息,睡眠,通宵' },
  ];

  function safeGet(key, fallback) {
    try {
      var v = global.localStorage.getItem(key);
      if (v === null || v === undefined || v === '') return fallback;
      return JSON.parse(v);
    } catch (e) { return fallback; }
  }

  function safeSet(key, val) {
    try { global.localStorage.setItem(key, JSON.stringify(val)); return true; }
    catch (e) { return false; }
  }

  function safeRemove(key) {
    try { global.localStorage.removeItem(key); } catch (e) {}
  }

  // ===================== 决策记录 =====================
  function getDecisions() {
    var list = safeGet(K.DECISIONS, []);
    return Array.isArray(list) ? list : [];
  }

  function saveDecisions(list) {
    if (Array.isArray(list) && list.length > 200) list = list.slice(0, 200);
    safeSet(K.DECISIONS, list);
  }

  function addDecision(d) {
    var list = getDecisions();
    var rec = Object.assign({
      id: 'd_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      ts: Date.now(),
      tags: [],
      kind: 'decision',
      favorite: false,
      review_note: '',
      reminder_days: 0,
      pros: [],
      cons: [],
      bottomline_hits: [],
      planet_color: (Math.random() < 0.5 ? '#F2A987' : '#FFDD99'),
    }, d || {});
    list.unshift(rec);
    saveDecisions(list);
    return rec;
  }

  function getDecision(id) {
    return getDecisions().find(function (x) { return x.id === id; }) || null;
  }

  // 星球画布：由决策记录推导 10 块碎片状态（纯本地）
  function getPlanetState() {
    var list = getDecisions();
    var frags = [];
    for (var i = 0; i < 10; i++) {
      var d = list[i];
      frags.push(d ? {
        idx: i, lit: true, id: d.id,
        title: d.title || '抉择记录',
        category: d.scenario_type || '',
        color: d.planet_color || '#F2A987',
      } : { idx: i, lit: false, id: '', title: '', category: '', color: '' });
    }
    return {
      litCount: Math.min(list.length, 10),
      complete: list.length >= 10,
      frags: frags,
    };
  }

  function updateDecision(id, patch) {
    var list = getDecisions();
    var idx = list.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return null;
    list[idx] = Object.assign({}, list[idx], patch);
    saveDecisions(list);
    return list[idx];
  }

  function removeDecision(id) {
    saveDecisions(getDecisions().filter(function (x) { return x.id !== id; }));
    removeRemindersOf(id);
  }

  function removeDecisionsByIds(ids) {
    var set = {};
    (ids || []).forEach(function (id) { set[id] = true; });
    var kept = [];
    getDecisions().forEach(function (d) {
      if (set[d.id]) removeRemindersOf(d.id);
      else kept.push(d);
    });
    saveDecisions(kept);
    return ids.length;
  }

  function setDecisionTags(id, tags) { return updateDecision(id, { tags: tags || [] }); }
  function toggleFavorite(id) {
    var rec = getDecision(id);
    return rec ? updateDecision(id, { favorite: !rec.favorite }) : null;
  }
  function addReviewNote(id, note) { return updateDecision(id, { review_note: note || '' }); }

  // ===================== 我的底线 =====================
  function getBottomLines() {
    var list = safeGet(K.BOTTOMLINES, []);
    return Array.isArray(list) ? list : [];
  }

  function addBottomLine(text, keywords) {
    var list = getBottomLines();
    var rec = { id: 'bl_' + Date.now(), text: (text || '').trim(), keywords: (keywords || '').trim(), ts: Date.now() };
    list.unshift(rec);
    safeSet(K.BOTTOMLINES, list);
    return rec;
  }

  function updateBottomLine(id, patch) {
    var list = getBottomLines();
    var idx = list.findIndex(function (x) { return x.id === id; });
    if (idx < 0) return null;
    list[idx] = Object.assign({}, list[idx], patch);
    safeSet(K.BOTTOMLINES, list);
    return list[idx];
  }

  function removeBottomLine(id) {
    safeSet(K.BOTTOMLINES, getBottomLines().filter(function (x) { return x.id !== id; }));
  }

  // 底线命中详情：返回 [{id, text, keywords, segs, hitWords, conflict}]
  function matchBottomLinesDetail(contexts, bottomlines) {
    var result = [];
    if (!Array.isArray(contexts)) contexts = [];
    if (!Array.isArray(bottomlines)) return result;
    var corpus = contexts.join('\n');
    bottomlines.forEach(function (bl) {
      if (!bl || !bl.keywords) return;
      var kws = bl.keywords.split(/[,，、;；]/).map(function (s) { return s.trim(); }).filter(Boolean);
      var hitWords = kws.filter(function (kw) { return kw && corpus.indexOf(kw) !== -1; });
      if (hitWords.length) {
        result.push({
          id: bl.id, text: bl.text, keywords: bl.keywords,
          segs: splitByKeywords(bl.text, hitWords),
          hitWords: hitWords, conflict: true,
        });
      }
    });
    return result;
  }

  function splitByKeywords(text, kws) {
    var s = (text || '');
    if (!kws || !kws.length) return [{ t: s, hit: false, i: 0 }];
    var escaped = kws.filter(Boolean)
      .map(function (k) { return k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); })
      .sort(function (a, b) { return b.length - a.length; });
    if (!escaped.length) return [{ t: s, hit: false, i: 0 }];
    var re = new RegExp('(' + escaped.join('|') + ')', 'g');
    var parts = s.split(re);
    var segs = [];
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      if (p === '') continue;
      segs.push({ t: p, hit: escaped.indexOf(p) !== -1, i: segs.length });
    }
    if (!segs.length) segs.push({ t: s, hit: false, i: 0 });
    return segs;
  }

  // ===================== 最近使用模板 =====================
  function getRecentTemplates() {
    var list = safeGet(K.RECENT_TPL, []);
    return Array.isArray(list) ? list : [];
  }

  function pushRecentTemplate(id, name) {
    var list = getRecentTemplates().filter(function (x) { return x.id !== id; });
    list.unshift({ id: id, name: name || '', ts: Date.now() });
    if (list.length > 3) list = list.slice(0, 3);
    safeSet(K.RECENT_TPL, list);
    return list;
  }

  // ===================== 本地复盘提醒（打开时检查） =====================
  function getReminders() {
    var list = safeGet(K.REMINDERS, []);
    return Array.isArray(list) ? list : [];
  }

  function addReminder(decisionId, days) {
    var list = getReminders();
    var rec = { id: 'rm_' + Date.now(), decision_id: decisionId, days: days || 0, due_ts: Date.now() + (days || 0) * 86400000, done: false };
    list.push(rec);
    safeSet(K.REMINDERS, list);
    return rec;
  }

  function getDueReminders() {
    var now = Date.now();
    return getReminders().filter(function (r) { return !r.done && r.due_ts <= now; });
  }

  function markRemindersDone(ids) {
    var set = {};
    (ids || []).forEach(function (id) { set[id] = true; });
    safeSet(K.REMINDERS, getReminders().map(function (r) {
      if (set[r.id]) r.done = true;
      return r;
    }));
  }

  function removeRemindersOf(decisionId) {
    safeSet(K.REMINDERS, getReminders().filter(function (r) { return r.decision_id !== decisionId; }));
  }

  // ===================== 引导标记 =====================
  function isGuideDone() { return safeGet(K.GUIDE, false) === true; }
  function setGuideDone() { safeSet(K.GUIDE, true); }
  function isHomeHintDone() { return safeGet(K.HOME_HINT, false) === true; }
  function setHomeHintDone() { safeSet(K.HOME_HINT, true); }

  // ===================== 场景卡片顺序 =====================
  function getSceneOrder() {
    var arr = safeGet(K.SCENE_ORDER, []);
    return Array.isArray(arr) ? arr : [];
  }
  function setSceneOrder(arr) { if (Array.isArray(arr)) safeSet(K.SCENE_ORDER, arr); }
  function clearSceneOrder() { safeRemove(K.SCENE_ORDER); }

  // ===================== 主题 =====================
  function getTheme() { return safeGet(K.THEME, 'light'); }
  function setTheme(t) { safeSet(K.THEME, t === 'dark' ? 'dark' : 'light'); }

  // ===================== 清空（保留主题与引导标记） =====================
  function clearAll() {
    safeRemove(K.DECISIONS);
    safeRemove(K.BOTTOMLINES);
    safeRemove(K.SID);
    safeRemove(K.RECENT_TPL);
    safeRemove(K.REMINDERS);
  }

  global.MMXStore = {
    K: K,
    BOTTOMLINE_PRESETS: BOTTOMLINE_PRESETS,
    getDecisions: getDecisions,
    addDecision: addDecision,
    getDecision: getDecision,
    getPlanetState: getPlanetState,
    updateDecision: updateDecision,
    removeDecision: removeDecision,
    removeDecisionsByIds: removeDecisionsByIds,
    setDecisionTags: setDecisionTags,
    toggleFavorite: toggleFavorite,
    addReviewNote: addReviewNote,
    getBottomLines: getBottomLines,
    addBottomLine: addBottomLine,
    updateBottomLine: updateBottomLine,
    removeBottomLine: removeBottomLine,
    matchBottomLinesDetail: matchBottomLinesDetail,
    splitByKeywords: splitByKeywords,
    getRecentTemplates: getRecentTemplates,
    pushRecentTemplate: pushRecentTemplate,
    getReminders: getReminders,
    addReminder: addReminder,
    getDueReminders: getDueReminders,
    markRemindersDone: markRemindersDone,
    removeRemindersOf: removeRemindersOf,
    isGuideDone: isGuideDone,
    setGuideDone: setGuideDone,
    isHomeHintDone: isHomeHintDone,
    setHomeHintDone: setHomeHintDone,
    getSceneOrder: getSceneOrder,
    setSceneOrder: setSceneOrder,
    clearSceneOrder: clearSceneOrder,
    getTheme: getTheme,
    setTheme: setTheme,
    clearAll: clearAll,
  };
})(window);
