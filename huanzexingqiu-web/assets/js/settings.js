/**
 * 缓择星球 · 设置与关于页（P4）
 * 浅色/深色显式切换（与 theme.js 共用 mmx_theme 键）；数据清理（confirm 二次确认后 clearAll）。
 */
(function () {
  'use strict';

  function toast(msg) { window.MMXUI && window.MMXUI.toast ? window.MMXUI.toast(msg) : console.log(msg); }

  function init() {
    var demoBtn = document.getElementById('load-demo');
    var removeDemoBtn = document.getElementById('remove-demo');

    // 三态主题（自动 / 浅色 / 深色）：经 window.MMXTheme 统一管理，与导航栏开关一致
    var themeBtns = {
      auto: document.getElementById('theme-auto'),
      light: document.getElementById('theme-light'),
      dark: document.getElementById('theme-dark')
    };
    function syncThemeButtons() {
      var cur = (window.MMXTheme && typeof window.MMXTheme.stored === 'function')
        ? window.MMXTheme.stored() : 'auto';
      Object.keys(themeBtns).forEach(function (mode) {
        var b = themeBtns[mode];
        if (b) b.classList.toggle('active', mode === cur);
      });
    }
    Object.keys(themeBtns).forEach(function (mode) {
      var b = themeBtns[mode];
      if (!b) return;
      b.addEventListener('click', function () {
        if (window.MMXTheme && typeof window.MMXTheme.setTheme === 'function') {
          window.MMXTheme.setTheme(mode);
        }
        syncThemeButtons();
        var label = mode === 'auto' ? '已跟随系统主题' : (mode === 'dark' ? '已切换为深色' : '已切换为浅色');
        toast(label);
      });
    });
    syncThemeButtons();
    // 导航栏切换 / 系统主题变化时也同步高亮（如从 auto 被手动切到 dark）
    if (window.MMXTheme && typeof window.MMXTheme.onChange === 'function') {
      window.MMXTheme.onChange(syncThemeButtons);
    }

    if (demoBtn) demoBtn.addEventListener('click', function () {
      if (!window.MMXUI) return;
      window.MMXUI.loadDemo({
        addedMsg: function (n) { return '已载入 ' + n + ' 条示例数据，正在前往历史星轨…'; },
        existMsg: '示例数据已在星轨中',
        onDone: function (added) {
          if (added > 0) setTimeout(function () { location.href = 'history.html'; }, 900);
        }
      });
    });
    if (removeDemoBtn) removeDemoBtn.addEventListener('click', function () {
      if (!window.MMXSeed) return;
      var removed = MMXSeed.removeDemo();
      if (removed > 0) toast('已删除 ' + removed + ' 条示例数据');
      else toast('当前没有示例数据');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
