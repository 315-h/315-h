/**
 * 缓择星球 · 主题切换（P1，增强：三态 auto/light/dark）
 * 存储键沿用小程序 mmx_theme，取值：
 *   - 'auto'  ：跟随系统 prefers-color-scheme（默认值）
 *   - 'light' / 'dark' ：用户显式锁定
 * 切换后写回 localStorage，并给 <html> 加 data-theme。
 *
 * 健壮性：导航栏主题按钮在 ui.js 注入导航后，通过 'mmx:nav-ready' 事件订阅绑定，
 * 不再依赖脚本加载顺序（顺序错位也安全）。bindToggle 幂等，重复调用无害。
 */
(function () {
  'use strict';

  var KEY = 'mmx_theme';
  var listeners = [];

  function systemTheme() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
    return 'light';
  }

  // 用户保存的偏好：'auto' | 'light' | 'dark'；未设置默认 'auto'
  function stored() {
    try {
      var s = window.localStorage.getItem(KEY);
      if (s === 'auto' || s === 'light' || s === 'dark') return s;
    } catch (e) {}
    return 'auto';
  }

  // 解析出实际生效主题（auto -> 系统）
  function effective() {
    var s = stored();
    return s === 'auto' ? systemTheme() : s;
  }

  function apply() {
    var eff = effective();
    document.documentElement.setAttribute('data-theme', eff);
    // 同步导航栏主题图标 aria 状态
    var btn = document.querySelector('[data-theme-toggle]');
    if (btn) btn.setAttribute('aria-label', eff === 'dark' ? '切换到浅色模式' : '切换到深色模式');
    // 通知订阅者（如设置页高亮当前态）
    for (var i = 0; i < listeners.length; i++) {
      try { listeners[i](stored(), eff); } catch (e) {}
    }
    return eff;
  }

  function setTheme(mode) {
    var m = (mode === 'auto' || mode === 'light' || mode === 'dark') ? mode : 'auto';
    try { window.localStorage.setItem(KEY, m); } catch (e) {}
    apply();
  }

  // 绑定导航栏主题按钮（点击在 light<->dark 间手动切换；auto 经设置页选择）
  function bindToggle() {
    var btn = document.querySelector('[data-theme-toggle]');
    if (!btn || btn.dataset.themeBound) return;
    btn.dataset.themeBound = '1';
    btn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      setTheme(next);
    });
  }

  function init() {
    apply();
    bindToggle();
    // 系统主题变化时：仅当用户选了 auto 才跟随
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () {
        if (stored() === 'auto') apply();
      });
    }
  }

  // 订阅导航注入完成事件：ui.js 注入导航栏后派发，确保按钮存在再绑定（顺序无关）
  document.addEventListener('mmx:nav-ready', function () { bindToggle(); });

  window.MMXTheme = {
    apply: apply,
    stored: stored,
    effective: effective,
    setTheme: setTheme,
    bindToggle: bindToggle,
    onChange: function (fn) { if (typeof fn === 'function') listeners.push(fn); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
