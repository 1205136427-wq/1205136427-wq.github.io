(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var progress = document.getElementById('readingProgress');
  var navState = document.getElementById('navState');
  var scenes = Array.prototype.slice.call(document.querySelectorAll('[data-scene]'));
  var chapterLinks = Array.prototype.slice.call(document.querySelectorAll('.chapter-nav a'));
  var reveals = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var playButton = document.getElementById('playStory');
  var playLabel = document.getElementById('playLabel');
  var scrollTicking = false;

  function sceneName(scene) {
    if (!scene) return 'COVER';
    if (scene.id === 'top') return 'COVER';
    if (scene.id === 'manifesto') return 'THESIS';
    if (scene.id === 'project-notes') return 'DOSSIER';
    if (/^act-\d+$/.test(scene.id)) return 'SCENE ' + scene.id.slice(-2);
    return 'ASSET STORY';
  }

  function currentSceneIndex() {
    var anchor = window.scrollY + window.innerHeight * 0.34;
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

    var activeScene = scenes[currentSceneIndex()];
    if (navState) navState.textContent = sceneName(activeScene);

    chapterLinks.forEach(function (link) {
      var active = Boolean(activeScene && link.getAttribute('href') === '#' + activeScene.id);
      link.classList.toggle('is-active', active);
      if (active) link.setAttribute('aria-current', 'step');
      else link.removeAttribute('aria-current');
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
    }, { threshold: 0.07, rootMargin: '0px 0px -36px 0px' });
    reveals.forEach(function (item) { revealObserver.observe(item); });
  } else {
    reveals.forEach(function (item) { item.classList.add('in-view'); });
  }

  var playing = false;
  var playIndex = 0;
  var playTimer = null;
  var dwell = reducedMotion ? 4200 : 7200;

  function setButtonState(active, atEnd) {
    playing = active;
    if (playButton) {
      playButton.classList.toggle('is-playing', active);
      playButton.setAttribute('aria-label', active ? '暂停自动播放' : '自动播放整个作品');
    }
    if (playLabel) playLabel.textContent = active ? '暂停播放' : (atEnd ? '重新播放' : '播放过程');
  }

  function clearPlayTimer() {
    if (!playTimer) return;
    window.clearTimeout(playTimer);
    playTimer = null;
  }

  function stopPlayback(atEnd) {
    clearPlayTimer();
    setButtonState(false, Boolean(atEnd));
  }

  function scrollToScene(index) {
    if (index < 0 || index >= scenes.length) return;
    scenes[index].scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
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
    if (playing) stopPlayback(false);
    else startPlayback();
  }

  if (playButton) playButton.addEventListener('click', togglePlayback);

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

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var targetId = link.getAttribute('href');
      if (!targetId || targetId === '#') return;
      var target = document.querySelector(targetId);
      if (!target) return;
      if (playing) stopPlayback(false);
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
      window.history.replaceState(null, '', targetId);
    });
  });

  var featureChips = Array.prototype.slice.call(document.querySelectorAll('.feature-chip'));
  var verdictStatus = document.getElementById('verdictStatus');
  var verdictTitle = document.getElementById('verdictTitle');
  var verdictReason = document.getElementById('verdictReason');
  var featureCount = document.getElementById('featureCount');

  function updateFeasibility() {
    var missing = featureChips.filter(function (chip) {
      return chip.dataset.support === 'no' && chip.classList.contains('is-on');
    }).length;
    if (featureCount) featureCount.textContent = missing ? missing + ' 项能力缺口' : '无能力缺口';

    if (!verdictStatus || !verdictTitle || !verdictReason) return;
    if (missing === 0) {
      verdictStatus.textContent = 'FEASIBLE';
      verdictStatus.style.color = 'var(--lime)';
      verdictTitle.textContent = '当前请求可以进入静态资产链路。';
      verdictReason.textContent = '所有已选能力都有可调度实现。分析仍会暴露运行时依赖与未验证的付费链路，但不会在分析阶段消耗额度。';
    } else if (missing <= 2) {
      verdictStatus.textContent = 'PARTIAL_SUPPORT';
      verdictStatus.style.color = 'var(--amber)';
      verdictTitle.textContent = '核心交付可保留，但需要接受动态能力降级。';
      verdictReason.textContent = '主体、图片和静态模型可以继续；被关闭的能力不会写进交付承诺。用户必须显式确认降级。';
    } else {
      verdictStatus.textContent = 'PARTIAL_SUPPORT';
      verdictStatus.style.color = 'var(--amber)';
      verdictTitle.textContent = '能交付静态资产，不能承诺活体步态。';
      verdictReason.textContent = '当前请求包含可生成主体与不可承诺的多足运动能力。系统不会把“能建模”说成“能做爬墙动画”。';
    }
  }

  featureChips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var next = !chip.classList.contains('is-on');
      chip.classList.toggle('is-on', next);
      chip.setAttribute('aria-pressed', next ? 'true' : 'false');
      updateFeasibility();
    });
  });
  updateFeasibility();

  var reviewCards = Array.prototype.slice.call(document.querySelectorAll('.review-card'));
  var selectedVariant = document.getElementById('selectedVariant');
  var reviewHint = document.getElementById('reviewHint');
  var imageReviewFeedback = document.getElementById('imageReviewFeedback');
  var imageActionButtons = Array.prototype.slice.call(document.querySelectorAll('[data-image-action]'));
  var activeVariant = 'B';

  function setImageFeedback(kind, title, detail, impact) {
    if (!imageReviewFeedback) return;
    imageReviewFeedback.classList.remove('is-building', 'is-stopped');
    if (kind === 'build') imageReviewFeedback.classList.add('is-building');
    if (kind === 'stop') imageReviewFeedback.classList.add('is-stopped');
    var paragraph = imageReviewFeedback.querySelector('p');
    var code = imageReviewFeedback.querySelector('.mono');
    if (paragraph) paragraph.innerHTML = '<b>' + title + '</b> ' + detail;
    if (code) code.textContent = impact;
  }

  function selectVariant(variant) {
    activeVariant = variant;
    reviewCards.forEach(function (card) {
      var active = card.dataset.variant === variant;
      card.classList.toggle('is-selected', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
      var marker = card.querySelector('.variant-meta i');
      if (marker) marker.textContent = active ? '已选择' : '选择 ' + card.dataset.variant;
    });
    if (selectedVariant) selectedVariant.textContent = variant;
    if (reviewHint) reviewHint.textContent = '继续后将复用这张双联图裁出给 Tripo 的正面 / 背面参考。';
    setImageFeedback('wait', '已切换到版本 ' + variant + '。', '等待你的决定：只保留图片，或继续进入模型阶段。', 'COST IMPACT / 0');
  }

  reviewCards.forEach(function (card) {
    card.addEventListener('click', function () { selectVariant(card.dataset.variant); });
  });

  imageActionButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      if (button.dataset.imageAction === 'stop') {
        setImageFeedback('stop', '已选择不建模。', '任务停在图片检查点并保留版本 ' + activeVariant + '，不会向 Tripo 模型队列投递。', 'STATUS / CANCELLED · TRIPO / 0');
        return;
      }
      setImageFeedback('build', '检查点已通过。', '系统会用版本 ' + activeVariant + ' 的正面 / 背面参考进入建模阶段；模型完成后仍会再次暂停确认。', 'NEXT / MODEL · REVIEW AGAIN');
    });
  });

  var modeButtons = Array.prototype.slice.call(document.querySelectorAll('[data-model-mode]'));
  var modelModeDetail = document.getElementById('modelModeDetail');
  var deliveryModeCode = document.getElementById('deliveryModeCode');
  var deliveryFeedback = document.getElementById('deliveryFeedback');
  var deliveryContinue = document.getElementById('deliveryContinue');
  var activeDeliveryMode = 'static';

  var deliveryModes = {
    static: {
      code: 'STATIC',
      head: 'STATIC MODEL',
      copy: '跳过 Tripo rig，模型原样进入 UE。适合道具、环境物件和当前不需要动画的角色。',
      items: ['复用已生成模型', '不再调用绑骨', '交付档：static_model'],
      confirm: '已确认静态模型。真实链路会锁定 static_model 交付档，不再调用绑骨。'
    },
    rig: {
      code: 'RIGGED',
      head: 'RIG PREFLIGHT',
      copy: '先读取免费 rig_check；只有明确可绑且用户确认，才发起付费绑骨与 rig_qc。',
      items: ['免费检查可绑性', '不可绑时禁止付费', '交付档：rigged_model'],
      confirm: '已选择绑定骨骼。真实链路会先做预检；不可绑时不会把钱花在注定失败的绑骨上。'
    },
    image: {
      code: 'IMAGE_ONLY',
      head: 'IMAGE ONLY',
      copy: '停在图片阶段，保留选定版本和双联图，不进入模型队列。',
      items: ['不调用 3D', '不产生 Tripo 费用', '任务终态：CANCELLED'],
      confirm: '已确认只保留图片。真实任务会结束在图片阶段，不调用 3D 或绑骨。'
    }
  };

  function setDeliveryMode(mode) {
    var data = deliveryModes[mode];
    if (!data) return;
    activeDeliveryMode = mode;
    modeButtons.forEach(function (button) {
      button.classList.toggle('is-active', button.dataset.modelMode === mode);
    });
    if (deliveryModeCode) deliveryModeCode.textContent = data.code;
    if (deliveryFeedback) deliveryFeedback.textContent = '等待确认。模型阶段已暂停在人工检查点。';
    if (modelModeDetail) {
      modelModeDetail.innerHTML = '<div class="mode-detail-head"><span class="status-orb"></span><b>' + data.head + '</b></div>' +
        '<p>' + data.copy + '</p>' +
        '<ul class="check-list">' + data.items.map(function (item) { return '<li>' + item + '</li>'; }).join('') + '</ul>';
    }
  }

  modeButtons.forEach(function (button) {
    button.addEventListener('click', function () { setDeliveryMode(button.dataset.modelMode); });
  });

  if (deliveryContinue) {
    deliveryContinue.addEventListener('click', function () {
      if (deliveryFeedback) deliveryFeedback.textContent = deliveryModes[activeDeliveryMode].confirm;
    });
  }

  var retryModelButton = document.getElementById('retryModelButton');
  var retryStatus = document.getElementById('retryStatus');
  var modelAttempts = document.getElementById('modelAttempts');
  var modelAttemptNote = document.getElementById('modelAttemptNote');
  var recoveryStateFailed = document.getElementById('recoveryStateFailed');
  var recoveryStateRetrying = document.getElementById('recoveryStateRetrying');
  var recoveryStateQueued = document.getElementById('recoveryStateQueued');
  var recoveryLog = document.getElementById('recoveryLog');
  var recoveryRunning = false;

  function markLogLine(index, state) {
    if (!recoveryLog) return;
    var lines = recoveryLog.querySelectorAll('.log-line');
    if (!lines[index]) return;
    lines[index].classList.remove('is-ready', 'is-done');
    if (state) lines[index].classList.add(state);
  }

  function beginRecoveryReplay() {
    if (recoveryRunning || !retryModelButton) return;
    recoveryRunning = true;
    retryModelButton.disabled = true;
    retryModelButton.textContent = '正在重验现场…';
    if (retryStatus) retryStatus.textContent = '校验任务归属、资源守卫与已上传产物，不重新生成图片。';
    markLogLine(0, 'is-done');

    window.setTimeout(function () {
      if (recoveryStateFailed) recoveryStateFailed.classList.remove('is-current');
      if (recoveryStateRetrying) recoveryStateRetrying.classList.add('is-current');
      if (retryStatus) retryStatus.textContent = '图片阶段已成功，版本 B 的正背参考图与职责归属均可复用。';
      markLogLine(1, 'is-done');
    }, reducedMotion ? 60 : 650);

    window.setTimeout(function () {
      if (retryStatus) retryStatus.textContent = '保留 image attempt 1；准备创建新的 model attempt 2。';
      markLogLine(2, 'is-done');
    }, reducedMotion ? 120 : 1350);

    window.setTimeout(function () {
      if (recoveryStateRetrying) recoveryStateRetrying.classList.remove('is-current');
      if (recoveryStateQueued) recoveryStateQueued.classList.add('is-current', 'is-done');
      if (modelAttempts) modelAttempts.textContent = '2';
      if (modelAttemptNote) modelAttemptNote.textContent = '新增一次，只重跑模型阶段';
      markLogLine(3, 'is-done');
      retryModelButton.textContent = '已入队 · 等待 model worker';
      if (retryStatus) retryStatus.textContent = '已进入队列。真实任务从 model attempt 2 继续；image attempt 仍为 1。';
    }, reducedMotion ? 180 : 2200);
  }

  if (retryModelButton) retryModelButton.addEventListener('click', beginRecoveryReplay);

  document.querySelectorAll('[data-copy-target]').forEach(function (button) {
    button.addEventListener('click', function () {
      var target = document.getElementById(button.dataset.copyTarget);
      if (!target) return;
      var text = target.innerText;
      function finish() {
        var original = button.textContent;
        button.textContent = '已复制';
        window.setTimeout(function () { button.textContent = original; }, 1600);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(finish).catch(function () { fallbackCopy(text, finish); });
      } else {
        fallbackCopy(text, finish);
      }
    });
  });

  function fallbackCopy(text, done) {
    var area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    try { document.execCommand('copy'); } catch (error) { /* no-op */ }
    document.body.removeChild(area);
    done();
  }

  window.addEventListener('pagehide', clearPlayTimer);
})();
