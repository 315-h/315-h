/**
 * 缓择星球 · 示例数据（单一数据源）
 * 暴露 window.MMXSeed.loadDemo()：幂等灌入演示决策（跨近 14 天 / 7 场景 / 含复盘笔记）。
 * 每条记录带稳定 id（demo_001~），重复调用不会重复插入，便于「清除后再次载入」。
 * 依赖：store.js（MMXStore.addDecision）。
 */
(function (global) {
  'use strict';

  function dayTS(daysAgo, h) {
    var d = new Date(); d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(h || 12, 0, 0, 0);
    return d.getTime();
  }

  // 字段与 store.js 的 addDecision 完全对齐：scenario_type / ts / title / options / fields / review_note / favorite / bottomline_hits
  var RAW = [
    { ts: dayTS(0), scenario_type: 'shopping', title: '换手机：A 旗舰还是 B 性价比',
      options: [{ name: 'A 旗舰新款', pros: ['拍照强', '系统流畅'], cons: ['贵 2000'] },
                { name: 'B 性价比机型', pros: ['便宜', '续航好'], cons: ['拍照一般'] }],
      fields: { '预算': '4000 以内', '用途': '日常+拍照' } },

    { ts: dayTS(1), scenario_type: 'career', title: '两份 offer：大厂 vs 创业',
      options: [{ name: '大厂稳定岗', pros: ['平台大', '福利好'], cons: ['成长慢'] },
                { name: '创业公司', pros: ['空间大', '股权'], cons: ['风险高'] }],
      fields: { '阶段': '3 年经验', '城市': '上海' }, review_note: '选了大厂，先攒平台再跳。', favorite: true },
    { ts: dayTS(1), scenario_type: 'career', title: '要不要转产品岗',
      options: [{ name: '转产品', pros: ['更接近业务'], cons: ['从零学'] },
                { name: '留技术', pros: ['深耕'], cons: ['天花板'] }],
      fields: { '当前': '后端开发' } },

    { ts: dayTS(2), scenario_type: 'renting', title: '租房：地铁口贵 vs 远一点便宜',
      options: [{ name: '地铁口一居室', pros: ['通勤 20 分钟'], cons: ['月租 3800'] },
                { name: '稍远两居合租', pros: ['月租 2200'], cons: ['通勤 50 分钟'] }],
      fields: { '预算': '3000', '通勤': '≤1 小时' }, bottomline_hits: ['通勤最长 1 小时'] },

    { ts: dayTS(3), scenario_type: 'health', title: '办健身卡还是户外跑',
      options: [{ name: '年卡健身房', pros: ['器械全'], cons: ['易闲置'] },
                { name: '户外跑步', pros: ['免费', '自由'], cons: ['看天气'] }],
      review_note: '坚持户外跑三个月，省了卡费。' },

    { ts: dayTS(4), scenario_type: 'travel', title: '国庆去成都还是大理',
      options: [{ name: '成都', pros: ['美食', '人文'], cons: ['人多'] },
                { name: '大理', pros: ['安静', '风景'], cons: ['远'] }],
      fields: { '天数': '6 天', '预算': '5000' }, favorite: true },

    { ts: dayTS(5), scenario_type: 'shopping', title: '买降噪耳机：头戴 vs 入耳',
      options: [{ name: '头戴式', pros: ['音质好', '续航长'], cons: ['夏天热'] },
                { name: '入耳式', pros: ['便携'], cons: ['续航短'] }],
      review_note: '选了头戴，通勤安静很多。' },

    { ts: dayTS(6), scenario_type: 'career', title: '是否接受外派半年',
      options: [{ name: '接受外派', pros: ['补贴高'], cons: ['离家远'] },
                { name: '拒绝', pros: ['稳定'], cons: ['少机会'] }],
      fields: { '时长': '6 个月' } },

    { ts: dayTS(7), scenario_type: 'move', title: '搬家：找搬家公司还是自己来',
      options: [{ name: '搬家公司', pros: ['省力'], cons: ['花 800'] },
                { name: '自己租车', pros: ['便宜'], cons: ['累'] }],
      review_note: '找了搬家公司，省心。', bottomline_hits: ['通勤最长 1 小时'] },

    { ts: dayTS(8), scenario_type: 'study', title: '报班学英语还是自学',
      options: [{ name: '线下班', pros: ['有氛围'], cons: ['贵'] },
                { name: '自学 APP', pros: ['灵活', '免费'], cons: ['需自律'] }],
      fields: { '目标': '口语' } },

    { ts: dayTS(9), scenario_type: 'shopping', title: '买笔记本：轻薄本 vs 游戏本',
      options: [{ name: '轻薄本', pros: ['便携', '续航'], cons: ['性能弱'] },
                { name: '游戏本', pros: ['性能强'], cons: ['重 2.5kg'] }],
      fields: { '用途': '办公+偶尔剪辑' }, review_note: '轻薄本够用，背着不累。' },
    { ts: dayTS(9), scenario_type: 'health', title: '体检套餐怎么选',
      options: [{ name: '基础套餐', pros: ['便宜'], cons: ['项目少'] },
                { name: '深度套餐', pros: ['全面'], cons: ['贵 1500'] }],
      fields: { '年龄': '28' } },

    { ts: dayTS(10), scenario_type: 'renting', title: '续租还是换房',
      options: [{ name: '续租', pros: ['熟环境'], cons: ['涨租 5%'] },
                { name: '换房', pros: ['更便宜'], cons: ['折腾'] }],
      fields: { '当前租金': '3500' }, bottomline_hits: ['通勤最长 1 小时'] },

    { ts: dayTS(11), scenario_type: 'travel', title: '周末周边游：爬山 vs 看展',
      options: [{ name: '近郊爬山', pros: ['锻炼'], cons: ['累'] },
                { name: '市里看展', pros: ['轻松'], cons: ['人多'] }],
      fields: { '天气': '晴' } },

    { ts: dayTS(12), scenario_type: 'career', title: '要不要考个证',
      options: [{ name: '考 PMP', pros: ['加分'], cons: ['费时 3 月'] },
                { name: '不考', pros: ['省时间'], cons: ['少筹码'] }],
      review_note: '决定考，计划和健身错开。' },

    { ts: dayTS(13), scenario_type: 'shopping', title: '买显示器：27 寸 4K vs 2K',
      options: [{ name: '27 寸 4K', pros: ['清晰'], cons: ['贵 600'] },
                { name: '27 寸 2K', pros: ['够用', '便宜'], cons: ['颗粒感'] }],
      review_note: '选 2K，钱包友好。' },
  ];

  // 注入稳定 id，使 loadDemo 幂等（按 id 去重）
  var DEMO = RAW.map(function (r, i) {
    r.id = 'demo_' + ('00' + (i + 1)).slice(-3);
    return r;
  });

  function loadDemo() {
    if (!global.MMXStore) return 0;
    var existing = global.MMXStore.getDecisions();
    var existIds = {};
    existing.forEach(function (d) { existIds[d.id] = true; });
    var added = 0;
    DEMO.forEach(function (r) {
      if (!existIds[r.id]) { global.MMXStore.addDecision(r); added++; }
    });
    try { global.localStorage.setItem('mmx_demo_seeded', '1'); } catch (e) {}
    return added;
  }

  function isSeeded() {
    try { return global.localStorage.getItem('mmx_demo_seeded') === '1'; } catch (e) { return false; }
  }

  // 仅移除演示数据（demo_001~demo_016），不影响用户真实记录；同时清掉 seeded 标记
  function removeDemo() {
    if (!global.MMXStore) return 0;
    var list = global.MMXStore.getDecisions();
    var demoIds = list
      .filter(function (d) { return /^demo_\d{3}$/.test(d.id || ''); })
      .map(function (d) { return d.id; });
    if (!demoIds.length) {
      try { global.localStorage.removeItem('mmx_demo_seeded'); } catch (e) {}
      return 0;
    }
    global.MMXStore.removeDecisionsByIds(demoIds);
    try { global.localStorage.removeItem('mmx_demo_seeded'); } catch (e) {}
    return demoIds.length;
  }

  global.MMXSeed = {
    DEMO: DEMO,
    count: DEMO.length,
    loadDemo: loadDemo,
    isSeeded: isSeeded,
    removeDemo: removeDemo,
  };
})(window);
