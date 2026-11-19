(() => {
  document.documentElement.classList.add('js');

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const masthead = $('#masthead');
  const progressBar = $('#progressBar');
  const menuButton = $('#menuButton');
  const mobileMenu = $('#mobileMenu');
  let scrollTick = false;

  function updateScrollUI() {
    const y = window.scrollY || window.pageYOffset;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.width = `${max > 0 ? Math.min(100, (y / max) * 100) : 0}%`;
    masthead.classList.toggle('is-scrolled', y > 24);
    scrollTick = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollTick) {
      scrollTick = true;
      requestAnimationFrame(updateScrollUI);
    }
  }, { passive: true });
  updateScrollUI();

  if ('IntersectionObserver' in window && !reduceMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    $$('.reveal').forEach(el => revealObserver.observe(el));
  } else {
    $$('.reveal').forEach(el => el.classList.add('is-visible'));
  }

  const navLinks = $$('.desk-nav a');
  const mainSections = $$('main > section');
  if ('IntersectionObserver' in window) {
    const navObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navLinks.forEach(link => link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`));
      });
    }, { rootMargin: '-38% 0px -55% 0px', threshold: 0 });
    mainSections.forEach(section => navObserver.observe(section));
  }

  function closeMenu() {
    mobileMenu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
  }
  menuButton.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  $$('.mobile-menu a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });

  const cover = $('#cover');
  if (cover && window.matchMedia('(pointer:fine)').matches) {
    cover.addEventListener('pointermove', event => {
      const rect = cover.getBoundingClientRect();
      cover.style.setProperty('--mx', `${((event.clientX - rect.left) / rect.width) * 100}%`);
      cover.style.setProperty('--my', `${((event.clientY - rect.top) / rect.height) * 100}%`);
    }, { passive: true });
  }

  const tourButton = $('#tourButton');
  const tourLabel = $('#tourLabel');
  const tourTargets = [$('#cover'), ...$$('main > .act')].filter(Boolean);
  let touring = false;
  let tourTimer = null;
  let tourIndex = 0;

  function stopTour() {
    if (!touring) return;
    touring = false;
    window.clearInterval(tourTimer);
    tourTimer = null;
    tourButton.classList.remove('is-playing');
    tourLabel.textContent = '自动导览';
    tourButton.setAttribute('aria-label', '自动导览全页');
  }

  function scrollToTourSection(index) {
    const target = tourTargets[index];
    if (!target) return;
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }

  tourButton.addEventListener('click', () => {
    if (touring) {
      stopTour();
      return;
    }
    touring = true;
    tourButton.classList.add('is-playing');
    tourLabel.textContent = '停止导览';
    tourButton.setAttribute('aria-label', '停止自动导览');
    const y = window.scrollY + window.innerHeight * 0.36;
    tourIndex = Math.max(0, tourTargets.findIndex(section => section.offsetTop > y));
    scrollToTourSection(tourIndex);
    tourTimer = window.setInterval(() => {
      tourIndex += 1;
      if (tourIndex >= tourTargets.length) {
        stopTour();
        return;
      }
      scrollToTourSection(tourIndex);
    }, 9000);
  });
  ['wheel', 'touchstart'].forEach(type => window.addEventListener(type, stopTour, { passive: true }));
  window.addEventListener('keydown', event => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) stopTour();
  });

  const jointData = {
    head: { kicker: '01 / NECK', title: '颈 · 头茬', copy: '头茬绕颈后的铆钉转动。点头、回眸与亮相的停顿，都从这一处开始。', material: '牛皮 / 铜铆钉', motion: '俯仰 · 侧转 · 停顿', img: 'assets/parts/head.png', alt: '头茬部件' },
    'left-arm': { kicker: '02 / LEFT SHOULDER', title: '左肩 · 云肩', copy: '肩关节打开时，云肩随手臂一起展开。一个“云手”能不能成立，先看这里给不给空间。', material: '牛皮 / 竹签', motion: '抬臂 · 云手 · 外展', img: 'assets/parts/left-arm.png', alt: '左臂部件' },
    'right-arm': { kicker: '03 / RIGHT SHOULDER', title: '右肩 · 云肩', copy: '右肩承担大量主动作。水袖的重量会沿着肩、肘一路传到手腕，所以关节要留出回弹。', material: '牛皮 / 竹签', motion: '外展 · 回旋 · 起势', img: 'assets/parts/right-arm.png', alt: '右臂部件' },
    'left-hand': { kicker: '04 / LEFT WRIST', title: '左腕 · 水袖', copy: '腕部的半拍延迟，是水袖“甩出去”的关键。线拉得太直，布料就没有余韵。', material: '牛皮 / 细铜线', motion: '翻腕 · 抖袖 · 收袖', img: 'assets/parts/left-hand.png', alt: '左手部件' },
    'right-hand': { kicker: '05 / RIGHT WRIST', title: '右腕 · 手签', copy: '主签控重心，手签控细节。手腕的动作最轻，却最能让台下相信她正在看、正在等。', material: '牛皮 / 细铜线', motion: '点指 · 探手 · 回袖', img: 'assets/parts/right-hand.png', alt: '右手部件' },
    body: { kicker: '06 / WAIST', title: '腰 · 身甲', copy: '腰是整具影偶的重心。前后倾多少、转多少，决定了她是“站着”还是“演着”。', material: '牛皮 / 三层纸甲', motion: '前倾 · 后仰 · 拧身', img: 'assets/parts/body.png', alt: '身甲部件' },
    skirt: { kicker: '07 / SKIRT', title: '裙门 · 下摆', copy: '裙门不是装饰。它把腿部动作放大成好看的弧度，也遮住关节，让动作更像人。', material: '牛皮 / 套色纸片', motion: '摆动 · 拖尾 · 收势', img: 'assets/parts/skirt.png', alt: '裙门部件' },
    'left-leg': { kicker: '08 / LEFT HIP', title: '左胯 · 胫甲', copy: '左腿负责支撑与转向。圆场能不能稳，看的不是步子多快，而是这一胯能不能把重心送出去。', material: '牛皮 / 铜铆钉', motion: '迈步 · 转身 · 支撑', img: 'assets/parts/left-leg.png', alt: '左腿部件' },
    'right-leg': { kicker: '09 / RIGHT HIP', title: '右胯 · 胫甲', copy: '右腿给方向和收势。开打时动作可以快，但最后一步必须落得住。', material: '牛皮 / 铜铆钉', motion: '开步 · 急停 · 落地', img: 'assets/parts/right-leg.png', alt: '右腿部件' }
  };

  const jointPreview = $('#jointImage');
  const jointKicker = $('#jointKicker');
  const jointTitle = $('#jointTitle');
  const jointCopy = $('#jointCopy');
  const jointFacts = $('.joint-facts');
  const jointButtons = $$('.joint-point');

  function selectJoint(key, button) {
    const data = jointData[key];
    if (!data) return;
    jointButtons.forEach(item => item.classList.toggle('is-active', item === button));
    const previewWrap = $('.joint-preview');
    previewWrap.classList.add('is-changing');
    window.setTimeout(() => {
      jointPreview.src = data.img;
      jointPreview.alt = data.alt;
      jointKicker.textContent = data.kicker;
      jointTitle.textContent = data.title;
      jointCopy.textContent = data.copy;
      jointFacts.innerHTML = `<div><dt>材料</dt><dd>${data.material}</dd></div><div><dt>运动</dt><dd>${data.motion}</dd></div>`;
      previewWrap.classList.remove('is-changing');
    }, reduceMotion ? 0 : 150);
  }
  jointButtons.forEach(button => button.addEventListener('click', () => selectJoint(button.dataset.part, button)));

  const gameUI = $('#gameUI');
  if (gameUI) {
    const uiTabs = $$('[data-ui-tab]', gameUI);
    const uiPanels = $$('[data-ui-panel]', gameUI);
    const showPanel = name => {
      uiTabs.forEach(tab => {
        const active = tab.dataset.uiTab === name;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', String(active));
      });
      uiPanels.forEach(panel => {
        const active = panel.dataset.uiPanel === name;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    };
    uiTabs.forEach(tab => tab.addEventListener('click', () => showPanel(tab.dataset.uiTab)));
    $$('[data-ui-go]', gameUI).forEach(button => button.addEventListener('click', () => showPanel(button.dataset.uiGo)));
  }

  window.addEventListener('load', () => {
    if (location.hash) {
      const target = document.querySelector(location.hash);
      if (target) window.setTimeout(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }), 60);
    }
  });
})();
