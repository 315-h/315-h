/** P3 数据层逻辑测试：在 Node 里模拟 localStorage 跑 MMXStore 全功能。 */
'use strict';

// 模拟 localStorage
var store = {};
global.localStorage = {
  getItem: function (k) { return k in store ? store[k] : null; },
  setItem: function (k, v) { store[k] = String(v); },
  removeItem: function (k) { delete store[k]; },
};

global.window = global;
require('../assets/js/store.js');
var S = global.MMXStore;
var ok = true;

function check(name, cond) {
  console.log((cond ? '✅' : '❌') + ' ' + name);
  if (!cond) ok = false;
}

// 1. 决策记录增删改 + 收藏 + 复盘备注
var d1 = S.addDecision({ scenario_type: 'shopping', title: '买耳机', options: [{ name: '索尼', pros: ['降噪好'], cons: ['贵'] }], fields: { budget: '1000' } });
var d2 = S.addDecision({ scenario_type: 'career', title: '选offer', options: ['A', 'B'] });
check('addDecision 2 条', S.getDecisions().length === 2);
check('getDecision 命中', S.getDecision(d1.id) !== null);
S.toggleFavorite(d1.id);
check('toggleFavorite 收藏', S.getDecision(d1.id).favorite === true);
S.addReviewNote(d1.id, '不错');
check('addReviewNote 复盘', S.getDecision(d1.id).review_note === '不错');
S.removeDecision(d2.id);
check('removeDecision 删除', S.getDecisions().length === 1);

// 2. 底线：增改删 + 预置 + 命中高亮
S.addBottomLine('通勤最长 1 小时', '通勤,时长');
S.addBottomLine('月薪不低于基准', '薪资,工资');
check('addBottomLine 2 条', S.getBottomLines().length === 2);
check('BOTTOMLINE_PRESETS 4 条', S.BOTTOMLINE_PRESETS.length === 4);

var hits = S.matchBottomLinesDetail(['这个岗位通勤 40 分钟，薪资 2 万'], S.getBottomLines());
check('底线命中 2 条（通勤+薪资）', hits.length === 2);
var anyHitSeg = hits.some(function (h) { return h.segs.some(function (s) { return s.hit; }); });
check('命中关键词切分（底线文本内含命中词→高亮段）', anyHitSeg === true);

// 3. 星球画布
var ps = S.getPlanetState();
check('星球碎片 10 块', ps.frags.length === 10);
check('点亮 1 块（删后剩 1 条记录）', ps.litCount === 1);

// 4. 提醒 + 最近模板 + 主题 + 清空
S.addReminder(d1.id, 7);
check('addReminder', S.getReminders().length === 1);
S.pushRecentTemplate('dilemma', '通用两难抉择');
S.pushRecentTemplate('compare', '多选项对比');
check('recent_tpl 2 条', S.getRecentTemplates().length === 2);
S.setTheme('dark');
check('theme dark', S.getTheme() === 'dark');
S.clearAll();
check('clearAll 清空决策/底线/提醒', S.getDecisions().length === 0 && S.getBottomLines().length === 0 && S.getReminders().length === 0);
check('clearAll 保留主题', S.getTheme() === 'dark');

console.log('\nP3 数据层:', ok ? 'ALL PASS ✅' : 'FAILED ❌');
process.exit(ok ? 0 : 1);
