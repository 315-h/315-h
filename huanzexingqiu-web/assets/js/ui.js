/**
 * 缓择星球 · 共享 UI（P1 → P0 导航组件化）
 * 职责：
 *   1) 顶部导航 / 移动端底部导航统一由本文件注入（解决 6 页硬编码重复问题）；
 *   2) 按当前页高亮 active（cleanup 等子页回退到 settings）；
 *   3) 滚动收缩、移动端抽屉开合；
 *   4) 滚动渐入；
 *   5) 共享轻提示 toast。
 * 依赖：无（纯 vanilla）。
 */
(function () {
  'use strict';

  // ---- 统一导航配置（桌面 navbar 与移动 tabbar 共用）----
  // 6 主频道，对齐桌面与移动，消除"移动端缺设置"的不一致。
  var NAV_ITEMS = [
    { key: 'index',      label: '首页',       href: 'index.html',      short: '首页',
      icon: '<path d="M3 11l9-7 9 7M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9"/>' },
    { key: 'workspace',  label: '决策工作台', href: 'workspace.html',  short: '工作台',
      icon: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' },
    { key: 'templates',  label: '模板库',     href: 'templates.html',  short: '模板库',
      icon: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>' },
    { key: 'history',    label: '历史星轨',   href: 'history.html',    short: '历史星轨',
      icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
    { key: 'bottomline', label: '我的底线',   href: 'bottomline.html', short: '我的底线',
      icon: '<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>' },
    { key: 'settings',   label: '设置与关于', href: 'settings.html',   short: '设置',
      icon: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>' }
  ];
  // 子页回退：cleanup 属于"设置"域，高亮设置项
  var ACTIVE_FALLBACK = { cleanup: 'settings' };
  var NAV_KEYS = NAV_ITEMS.map(function (i) { return i.key; });

  function pageKey() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path.replace(/\.html$/, '');
  }

  function svg(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round">' + inner + '</svg>';
  }

  function renderNav() {
    var mount = document.getElementById('nav-mount');
    if (!mount) return;
    var key = pageKey();
    var activeKey = NAV_KEYS.indexOf(key) >= 0 ? key : (ACTIVE_FALLBACK[key] || '');
    var links = NAV_ITEMS.map(function (it) {
      var cls = 'nav-link' + (it.key === activeKey ? ' active' : '');
      var aria = (it.key === activeKey) ? ' aria-current="page"' : '';
      return '<a class="' + cls + '"' + aria + ' data-nav="' + it.key + '" href="' + it.href + '">' + it.label + '</a>';
    }).join('');

    mount.innerHTML =
      '<nav class="navbar">' +
        '<div class="nav-inner">' +
          '<a class="nav-back" href="../portfolio.html" aria-label="返回作品集">← 返回作品集</a>' +
          '<a class="nav-logo" href="index.html">' +
            '<span class="planet planet-sm"></span><span>缓择星球</span>' +
          '</a>' +
          '<div class="nav-links">' + links + '</div>' +
          '<div class="nav-actions">' +
            '<button class="icon-btn" data-theme-toggle aria-label="切换主题">' +
              svg('<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>') +
              svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>') +
            '</button>' +
            '<button class="icon-btn menu-btn" data-menu-toggle aria-label="菜单">' +
              svg('<path d="M4 7h16M4 12h16M4 17h16"/>') +
            '</button>' +
          '</div>' +
        '</div>' +
      '</nav>';
  }

  function renderTabbar() {
    var mount = document.getElementById('tabbar-mount');
    if (!mount) return;
    var key = pageKey();
    var activeKey = NAV_KEYS.indexOf(key) >= 0 ? key : (ACTIVE_FALLBACK[key] || '');
    var items = NAV_ITEMS.map(function (it) {
      var cls = 'tab-item' + (it.key === activeKey ? ' active' : '');
      var aria = (it.key === activeKey) ? ' aria-current="page"' : '';
      return '<a class="' + cls + '"' + aria + ' data-tab="' + it.key + '" href="' + it.href + '">' +
        svg(it.icon) + it.short + '</a>';
    }).join('');

    mount.innerHTML = '<nav class="tabbar">' + items + '</nav>';
  }

  function mountChrome() {
    renderNav();
    renderTabbar();
    // 导航注入完成：派发事件供 theme.js 等订阅（顺序无关，幂等）
    if (!window.__mmxNavReady) {
      window.__mmxNavReady = true;
      document.dispatchEvent(new CustomEvent('mmx:nav-ready'));
    }
  }

  function initNav() {
    var key = pageKey();

    // 顶部导航 active（已由 renderNav 预置，此处兜底：若未来静态写死也可高亮）
    var links = document.querySelectorAll('[data-nav]');
    links.forEach(function (a) {
      if (a.getAttribute('data-nav') === key) a.classList.add('active');
    });

    // 底部导航（移动端）active
    var tabs = document.querySelectorAll('[data-tab]');
    tabs.forEach(function (t) {
      if (t.getAttribute('data-tab') === key) t.classList.add('active');
    });

    // 滚动收缩
    var navbar = document.querySelector('.navbar');
    if (navbar) {
      var onScroll = function () {
        navbar.classList.toggle('scrolled', window.scrollY > 12);
      };
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }

    // 移动端菜单开合（顶部抽屉 + 底部 tabbar 联动）
    var menuBtn = document.querySelector('[data-menu-toggle]');
    var drawer = document.querySelector('.nav-links');
    if (menuBtn && drawer) {
      menuBtn.addEventListener('click', function () {
        drawer.classList.toggle('open');
      });
      // 点任一导航项后关闭抽屉
      links.forEach(function (a) {
        a.addEventListener('click', function () { drawer.classList.remove('open'); });
      });
    }
  }

  // 滚动渐入：进入视口才淡入（避免长页面一次性全动画）
  function initReveal() {
    var targets = document.querySelectorAll(
      '.cap-cards .card, .scene-matrix .matrix-card, .philosophy .card, .step-trail .step-item, .sec-title, .sec-sub'
    );
    if (!targets.length) return;
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    targets.forEach(function (el) { el.classList.add('reveal'); });
    // 首屏内元素立即显示（避免初始闪烁），其余交给观察器
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add('in');
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    targets.forEach(function (el) {
      if (!el.classList.contains('in')) io.observe(el);
    });
  }

  // ================= 共享轻提示（toast） =================
  // 颜色走 CSS 变量，自动适配浅色 / 深色主题。
  function toast(msg, ms) {
    var t = document.createElement('div');
    t.setAttribute('role', 'status');
    t.style.cssText = 'position:fixed;left:50%;bottom:32px;transform:translateX(-50%) translateY(8px);' +
      'background:var(--text);color:var(--bg);padding:10px 20px;border-radius:999px;font-size:13px;' +
      'z-index:300;opacity:0;transition:opacity .25s,transform .25s;box-shadow:0 8px 24px rgba(0,0,0,.18);pointer-events:none;';
    t.textContent = msg;
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = '1'; t.style.transform = 'translateX(-50%) translateY(0)'; });
    setTimeout(function () {
      t.style.opacity = '0'; t.style.transform = 'translateX(-50%) translateY(8px)';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 320);
    }, ms || 1600);
  }

  window.MMXUI = { toast: toast };

  // ================= 统一空状态组件（P1-6，对应方案 #16） =================
  // 规范：icon + title(--fs-card) + desc(--fs-sub) + 可选 CTA。
  // 传入值均为内部受控字符串（非用户输入），可直接拼接。
  function renderEmptyState(opts) {
    opts = opts || {};
    var icon = (opts.icon != null) ? opts.icon : '🪐';
    var title = opts.title || '这里还空着';
    var desc = opts.desc || '';
    var cta = '';
    if (opts.ctaLabel) {
      cta = '<div class="empty-cta-row">' +
        '<a class="btn btn-primary empty-cta" href="' + (opts.ctaHref || '#') + '">' +
        opts.ctaLabel + '</a></div>';
    }
    var cls = 'empty-state' + (opts.card ? ' empty-state-card' : '');
    return '<div class="' + cls + '">' +
      '<div class="empty-emoji">' + icon + '</div>' +
      '<p class="empty-title">' + title + '</p>' +
      (desc ? '<p class="hint">' + desc + '</p>' : '') +
      cta +
      '</div>';
  }

  // ================= 演示数据入口收敛（P1-7，对应方案 #17） =================
  // 统一封装 MMXSeed.loadDemo + toast + 可选回调 onDone(added)。
  // addedMsg/existMsg 可为字符串或 function(added)→string。
  function loadDemo(opts) {
    opts = opts || {};
    if (!window.MMXSeed) {
      if (typeof opts.onDone === 'function') opts.onDone(0);
      return 0;
    }
    var added = window.MMXSeed.loadDemo();
    if (added > 0) {
      var msg = (typeof opts.addedMsg === 'function') ? opts.addedMsg(added)
        : (opts.addedMsg || ('已载入 ' + added + ' 条示例数据'));
      toast(msg);
    } else {
      toast(opts.existMsg || '示例数据已在星轨中');
    }
    if (typeof opts.onDone === 'function') opts.onDone(added);
    return added;
  }

  // ================= 焦点陷阱（P2-12，对应方案 #3 / UX） =================
  // 用于抽屉 / 模态：Tab / Shift+Tab 在容器内循环；Esc 触发 onEscape。
  // 打开时聚焦容器内首个可聚焦元素；返回 release() 供关闭时解绑监听。
  function trapFocus(container, opts) {
    opts = opts || {};
    var selector = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    function items() {
      return Array.prototype.slice.call(container.querySelectorAll(selector)).filter(function (el) {
        return !el.disabled && (el.offsetParent !== null || el === document.activeElement);
      });
    }
    function onKey(e) {
      if (e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        if (typeof opts.onEscape === 'function') opts.onEscape();
        return;
      }
      if (e.key !== 'Tab' && e.keyCode !== 9) return;
      var list = items();
      if (!list.length) { e.preventDefault(); return; }
      var first = list[0], last = list[list.length - 1];
      if (e.shiftKey) {
        if (!container.contains(document.activeElement) || document.activeElement === first) {
          e.preventDefault(); last.focus();
        }
      } else {
        if (!container.contains(document.activeElement) || document.activeElement === last) {
          e.preventDefault(); first.focus();
        }
      }
    }
    container.addEventListener('keydown', onKey);
    if (!opts.skipFocus) {
      var list = items();
      if (list.length) list[0].focus();
      else { container.tabIndex = -1; container.focus(); }
    }
    return function release() { container.removeEventListener('keydown', onKey); };
  }

  window.MMXUI = {
    toast: toast,
    renderEmptyState: renderEmptyState,
    loadDemo: loadDemo,
    trapFocus: trapFocus
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { mountChrome(); initNav(); initReveal(); });
  } else {
    mountChrome();
    initNav();
    initReveal();
  }
})();
