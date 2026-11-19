(function () {
  'use strict';

  var root = document.documentElement;
  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('js');

  var progress = document.getElementById('readingProgress');
  var navState = document.getElementById('navState');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
  var chapterLinks = Array.prototype.slice.call(document.querySelectorAll('.chapter-nav a'));
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var playButtons = [document.getElementById('playStory'), document.getElementById('heroPlay')].filter(Boolean);
  var playButton = document.getElementById('playStory');
  var playLabel = document.getElementById('playLabel');
  var scrollTicking = false;

  function sceneName(scene) {
    if (!scene) return 'LIVE TWIN';
    if (scene.id === 'top') return 'COVER';
    if (scene.id === 'manifesto') return 'PROLOGUE';
    if (scene.id === 'project-notes') return 'PROJECT NOTES';
    if (/^act-\d+$/.test(scene.id)) return 'SCENE ' + scene.id.slice(-2);
    return 'THE GATE';
  }

  function currentSceneIndex() {
    var anchor = window.scrollY + window.innerHeight * .34;
    var index = 0;
    scenes.forEach(function (scene, sceneIndex) {
      if (scene.offsetTop <= anchor) index = sceneIndex;
    });
    return index;
  }

  function updateScrollState() {
    var scrollable = Math.max(1, root.scrollHeight - window.innerHeight);
    var ratio = Math.min(1, Math.max(0, window.scrollY / scrollable));
    if (progress) progress.style.transform = 'scaleX(' + ratio + ')';

    var index = currentSceneIndex();
    var activeScene = scenes[index];
    if (navState) navState.textContent = sceneName(activeScene);
    chapterLinks.forEach(function (link) {
      link.classList.toggle('is-active', activeScene && link.getAttribute('href') === '#' + activeScene.id);
      if (activeScene && link.getAttribute('href') === '#' + activeScene.id) {
        link.setAttribute('aria-current', 'step');
      } else {
        link.removeAttribute('aria-current');
      }
    });
    scrollTicking = false;
  }

  function requestScrollUpdate() {
    if (scrollTicking) return;
    scrollTicking = true;
    window.requestAnimationFrame(updateScrollState);
  }

  window.addEventListener('scroll', requestScrollUpdate, { passive: true });
  window.addEventListener('resize', requestScrollUpdate);
  updateScrollState();

  if ('IntersectionObserver' in window && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in-view');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -36px 0px' });
    reveals.forEach(function (item) { revealObserver.observe(item); });
  } else {
    reveals.forEach(function (item) { item.classList.add('in-view'); });
  }

  var playing = false;
  var playIndex = 0;
  var playTimer = null;
  var dwell = reducedMotion ? 4200 : 6800;

  function setButtonState(active, atEnd) {
    playing = active;
    playButtons.forEach(function (button) {
      button.classList.toggle('is-playing', active);
      button.setAttribute('aria-label', active ? '暂停自动播放' : '自动播放整个故事');
    });
    if (playLabel) playLabel.textContent = active ? '暂停播放' : (atEnd ? '重播故事' : '播放故事');
  }

  function clearPlayTimer() {
    if (playTimer) {
      window.clearTimeout(playTimer);
      playTimer = null;
    }
  }

  function stopPlayback(atEnd) {
    clearPlayTimer();
    setButtonState(false, Boolean(atEnd));
  }

  function scrollToScene(index) {
    if (index < 0 || index >= scenes.length) return;
    var target = scenes[index];
    target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  }

  function advancePlayback() {
    if (!playing) return;
    if (playIndex >= scenes.length - 1) {
      stopPlayback(true);
      return;
    }
    playIndex += 1;
    scrollToScene(playIndex);
    playTimer = window.setTimeout(advancePlayback, dwell);
  }

  function startPlayback() {
    clearPlayTimer();
    playIndex = currentSceneIndex();
    if (playIndex >= scenes.length - 1) playIndex = -1;
    setButtonState(true, false);
    playTimer = window.setTimeout(advancePlayback, 900);
  }

  function togglePlayback() {
    if (playing) {
      stopPlayback(false);
    } else {
      startPlayback();
    }
  }

  playButtons.forEach(function (button) {
    button.addEventListener('click', togglePlayback);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && playing) stopPlayback(false);
  });

  ['wheel', 'touchstart'].forEach(function (eventName) {
    window.addEventListener(eventName, function () {
      if (playing) stopPlayback(false);
    }, { passive: true });
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden && playing) stopPlayback(false);
  });

  var routeData = {
    manager: {
      role: '李经理 · manager',
      title: '业务不真实，驳回是正确动作。',
      desc: '经理发现单据写的是私人行程，在 submitted 状态发起 reject。系统要求填写原因，随后单据进入 rejected。',
      reason: '“行程与客户拜访记录不一致，请补充说明。”',
      roleCode: 'manager',
      fromCode: 'submitted'
    },
    finance: {
      role: '王财务 · finance',
      title: '票据不一致，复核阶段驳回。',
      desc: '经理已通过业务审批，但财务发现发票抬头与公司主体不一致。财务在 manager_approved 状态发起 reject，并写明原因。',
      reason: '“发票抬头与公司主体不一致，请重新开具。”',
      roleCode: 'finance',
      fromCode: 'manager_approved'
    }
  };

  var rejectTabs = Array.prototype.slice.call(document.querySelectorAll('[data-reject-route]'));
  var rejectStage = document.getElementById('rejectStage');
  var rejectRole = document.getElementById('rejectRole');
  var rejectTitle = document.getElementById('rejectTitle');
  var rejectDesc = document.getElementById('rejectDesc');
  var rejectReason = document.getElementById('rejectReason');
  var rejectOrigin = document.getElementById('rejectOrigin');
  var rejectRoleCode = document.getElementById('rejectRoleCode');
  var rejectFromCode = document.getElementById('rejectFromCode');

  function selectRejectRoute(route) {
    var data = routeData[route];
    if (!data || !rejectStage) return;
    rejectStage.setAttribute('data-route', route);
    if (rejectRole) rejectRole.textContent = data.role;
    if (rejectTitle) rejectTitle.textContent = data.title;
    if (rejectDesc) rejectDesc.textContent = data.desc;
    if (rejectReason) rejectReason.textContent = data.reason;
    if (rejectOrigin) rejectOrigin.textContent = data.fromCode;
    if (rejectRoleCode) rejectRoleCode.textContent = data.roleCode;
    if (rejectFromCode) rejectFromCode.textContent = data.fromCode;

    rejectTabs.forEach(function (tab) {
      var active = tab.getAttribute('data-reject-route') === route;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.setAttribute('tabindex', active ? '0' : '-1');
    });
  }

  rejectTabs.forEach(function (tab, tabIndex) {
    tab.addEventListener('click', function () {
      selectRejectRoute(tab.getAttribute('data-reject-route'));
    });
    tab.addEventListener('keydown', function (event) {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      var direction = event.key === 'ArrowRight' ? 1 : -1;
      var next = (tabIndex + direction + rejectTabs.length) % rejectTabs.length;
      rejectTabs[next].focus();
      selectRejectRoute(rejectTabs[next].getAttribute('data-reject-route'));
    });
  });

  var attackCards = Array.prototype.slice.call(document.querySelectorAll('.attack-card'));
  attackCards.forEach(function (card) {
    card.addEventListener('click', function () {
      var willOpen = !card.classList.contains('is-open');
      attackCards.forEach(function (other) {
        other.classList.remove('is-open');
        other.setAttribute('aria-expanded', 'false');
      });
      if (willOpen) {
        card.classList.add('is-open');
        card.setAttribute('aria-expanded', 'true');
      }
    });
  });

  document.querySelectorAll('a[href]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId.charAt(0) !== '#') return;
      if (targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(null, '', targetId);
    });
  });

  window.addEventListener('pagehide', clearPlayTimer);
})();
