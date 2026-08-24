/**
 * 缓择星球 · 首页（P4）
 * 职责：渲染 7 场景公转卡 + 场景矩阵；滚动视差；场景卡点击跳工作台 ?scene=xxx。
 * 动画尽量走 CSS（.orbit-ring 旋转 + hover 暂停），JS 只做数据渲染与视差。
 */
(function () {
  'use strict';

  var SCENES = [
    { key: 'shopping', emoji: '🛍️', name: '购物消费', desc: '数码、服饰、家居、美妆，买之前先想清楚' },
    { key: 'renting',  emoji: '🏠', name: '租房搬家', desc: '地段、通勤、租金、风险，住得安心' },
    { key: 'career',   emoji: '💼', name: '职业选择', desc: 'offer、跳槽、方向，走好下一步' },
    { key: 'travel',   emoji: '🧳', name: '出行旅游', desc: '目的地、路线、预算、体力，玩得尽兴' },
    { key: 'health',   emoji: '🌿', name: '健康生活', desc: '运动、作息、习惯，坚持比开始难' },
    { key: 'move',     emoji: '📦', name: '生活变动', desc: '搬家、换城市、大额决策，重新开始' },
    { key: 'study',    emoji: '📚', name: '学习成长', desc: '课程、考证、技能，把钱花在刀刃上' },
  ];

  function goWorkspace(sceneKey) {
    window.location.href = 'workspace.html?scene=' + sceneKey;
  }

  function renderOrbitRing() {
    var ring = document.getElementById('orbit-ring');
    if (!ring) return;
    ring.innerHTML = SCENES.map(function (s) {
      return '<div class="orbit-item" data-scene="' + s.key + '" title="' + s.name + '">' + s.emoji + ' ' + s.name + '</div>';
    }).join('');
    ring.querySelectorAll('.orbit-item').forEach(function (item) {
      item.addEventListener('click', function () { goWorkspace(item.getAttribute('data-scene')); });
    });
  }

  function renderMatrix() {
    var el = document.getElementById('scene-matrix');
    if (!el) return;
    var cards = SCENES.map(function (s) {
      return '<div class="matrix-card" data-scene="' + s.key + '">' +
        '<div class="matrix-emoji">' + s.emoji + '</div>' +
        '<div class="matrix-name">' + s.name + '</div>' +
        '<div class="matrix-desc">' + s.desc + '</div></div>';
    });
    cards.push('<div class="matrix-card matrix-more" data-scene="templates">' +
      '<div style="font-size:22px;">＋</div><div class="matrix-name">更多场景</div>' +
      '<div class="matrix-desc">试试抉择模板库，纯本地梳理利弊</div></div>');
    el.innerHTML = cards.join('');
    el.querySelectorAll('[data-scene]').forEach(function (card) {
      card.addEventListener('click', function () {
        var k = card.getAttribute('data-scene');
        if (k === 'templates') window.location.href = 'templates.html';
        else goWorkspace(k);
      });
    });
  }

  // 滚动视差：背景层慢速上移
  function initParallax() {
    var bg = document.getElementById('parallax-bg');
    if (!bg) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () {
        bg.style.transform = 'translateY(' + (window.scrollY * 0.15) + 'px)';
        ticking = false;
      });
    }, { passive: true });
  }

  function init() {
    renderOrbitRing();
    renderMatrix();
    initParallax();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
