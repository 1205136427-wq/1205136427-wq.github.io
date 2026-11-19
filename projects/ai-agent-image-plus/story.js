(function () {
  "use strict";

  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var progressBar = document.getElementById("readingProgress");
  var topbar = document.getElementById("topbar");
  var navLinks = Array.prototype.slice.call(document.querySelectorAll(".chapter-nav a"));
  var sections = Array.prototype.slice.call(document.querySelectorAll("main section[id]"));
  var ticking = false;

  function updateScroll() {
    var top = window.scrollY || document.documentElement.scrollTop;
    var height = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (progressBar) progressBar.style.width = Math.min(100, Math.max(0, (top / height) * 100)) + "%";
    if (topbar) topbar.classList.toggle("is-scrolled", top > 40);

    var current = "top";
    sections.forEach(function (section) {
      if (section.offsetTop - 130 <= top) current = section.id;
    });
    navLinks.forEach(function (link) {
      link.classList.toggle("is-active", link.getAttribute("href") === "#" + current);
    });
    ticking = false;
  }

  window.addEventListener("scroll", function () {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateScroll);
  }, { passive: true });
  updateScroll();

  if ("IntersectionObserver" in window && !reducedMotion) {
    var revealObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -7% 0px" });
    document.querySelectorAll(".reveal").forEach(function (el) { revealObserver.observe(el); });
  } else {
    document.querySelectorAll(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  var wordDemo = document.getElementById("wordDemo");
  var wordPop = document.getElementById("wordPop");
  var demoWord = document.querySelector(".demo-word");

  function hideWordPop() {
    if (wordPop) wordPop.hidden = true;
  }
  if (demoWord && wordPop) {
    demoWord.addEventListener("click", function (event) {
      event.stopPropagation();
      wordPop.hidden = false;
    });
    wordPop.addEventListener("click", function (event) { event.stopPropagation(); });
    document.addEventListener("pointerdown", function (event) {
      if (!wordDemo || wordDemo.contains(event.target)) return;
      hideWordPop();
    }, true);
  }

  var analysisLab = document.getElementById("analysisDemo");
  var particleLayer = document.getElementById("particleLayer");
  var analyzeButton = document.getElementById("analyzeButton");
  var analysisResult = document.getElementById("analysisResult");
  var analysisStatus = document.getElementById("analysisStatus");
  var selectableSentence = document.getElementById("selectableSentence");
  var orbLab = document.getElementById("orbLab");
  var analysisBusy = false;
  var analysisTimers = [];

  function clearAnalysisTimers() {
    analysisTimers.forEach(function (timer) { window.clearTimeout(timer); });
    analysisTimers = [];
  }

  function particleBurst(from, to, count, duration, baseDelay) {
    if (!analysisLab || !particleLayer || !from || !to || reducedMotion) return;
    var host = analysisLab.getBoundingClientRect();
    var start = from.getBoundingClientRect();
    var end = to.getBoundingClientRect();
    var endX = end.left + end.width / 2 - host.left;
    var endY = end.top + end.height / 2 - host.top;

    for (var i = 0; i < count; i++) {
      var particle = document.createElement("i");
      particle.className = "particle";
      var sx = start.left - host.left + start.width * (0.2 + Math.random() * 0.78);
      var sy = start.top - host.top + start.height * (0.1 + Math.random() * 0.85);
      particle.style.left = sx + "px";
      particle.style.top = sy + "px";
      particle.style.opacity = "0";
      particle.style.width = particle.style.height = (2.5 + Math.random() * 4.5) + "px";
      particleLayer.appendChild(particle);
      var dx = endX - sx;
      var dy = endY - sy;
      var animation = particle.animate([
        { transform: "translate3d(0,0,0) scale(.4)", opacity: 0 },
        { transform: "translate3d(" + (dx * 0.22) + "px," + (dy * 0.22 - 12) + "px,0) scale(1)", opacity: 1, offset: 0.18 },
        { transform: "translate3d(" + dx + "px," + dy + "px,0) scale(.12)", opacity: 0 }
      ], {
        duration: duration,
        delay: baseDelay + Math.random() * 140,
        easing: "cubic-bezier(.2,.72,.22,1)",
        fill: "forwards"
      });
      animation.onfinish = function () { particle.remove(); };
    }
  }

  function runAnalysis() {
    if (analysisBusy || !analysisLab || !orbLab) return;
    analysisBusy = true;
    clearAnalysisTimers();
    analysisResult.classList.remove("show");
    analysisLab.classList.remove("has-result");
    analysisLab.classList.add("is-analyzing");
    analyzeButton.disabled = true;
    analyzeButton.querySelector("span").textContent = "分析中…";
    analysisStatus.innerHTML = "长难句分析中<br><small>正在拆解主干与修饰关系</small>";

    particleBurst(selectableSentence, orbLab.querySelector(".ai-orb"), 34, 900, 0);
    analysisTimers.push(window.setTimeout(function () {
      particleBurst(selectableSentence, orbLab.querySelector(".ai-orb"), 24, 760, 0);
    }, 360));

    analysisTimers.push(window.setTimeout(function () {
      analysisLab.classList.remove("is-analyzing");
      analysisLab.classList.add("has-result");
      analysisResult.classList.add("show");
      analysisStatus.innerHTML = "分析完成<br><small>结果已回到当前阅读页</small>";
      analyzeButton.disabled = false;
      analyzeButton.querySelector("span").textContent = "再看一次";
      particleBurst(orbLab.querySelector(".ai-orb"), analysisResult, 18, 640, 0);
      analysisBusy = false;
      if (!reducedMotion) {
        analysisTimers.push(window.setTimeout(function () {
          analysisResult.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }, 120));
      }
    }, 2450));
  }

  if (analyzeButton) analyzeButton.addEventListener("click", runAnalysis);
  if (selectableSentence) {
    selectableSentence.addEventListener("click", function () {
      if (!analysisBusy) analyzeButton.focus({ preventScroll: true });
    });
  }

  var playground = document.getElementById("orbPlayground");
  var playgroundPage = playground ? playground.querySelector(".playground-page") : null;
  var demoOrb = document.getElementById("demoOrb");
  var demoChat = document.getElementById("demoChat");
  var demoChatClose = document.getElementById("demoChatClose");
  var idleTimer = null;
  var dragging = false;
  var suppressOrbClick = false;

  function resetOrbIdle() {
    if (!demoOrb) return;
    demoOrb.classList.remove("is-idle");
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () {
      if (!dragging) demoOrb.classList.add("is-idle");
    }, 3000);
  }

  function setChat(open) {
    if (!demoChat || !demoOrb) return;
    demoChat.hidden = !open;
    demoOrb.setAttribute("aria-expanded", open ? "true" : "false");
    resetOrbIdle();
  }

  if (demoOrb && demoChat && playgroundPage) {
    demoOrb.setAttribute("aria-expanded", "false");
    demoOrb.addEventListener("click", function (event) {
      event.stopPropagation();
      if (suppressOrbClick) return;
      setChat(demoChat.hidden);
    });
    demoChat.addEventListener("click", function (event) { event.stopPropagation(); });
    if (demoChatClose) demoChatClose.addEventListener("click", function () { setChat(false); });

    document.addEventListener("pointerdown", function (event) {
      if (demoChat.hidden) return;
      if (demoOrb.contains(event.target) || demoChat.contains(event.target)) return;
      setChat(false);
    }, true);

    var dragState = null;
    demoOrb.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      var pageRect = playgroundPage.getBoundingClientRect();
      var orbRect = demoOrb.getBoundingClientRect();
      dragState = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        left: orbRect.left - pageRect.left,
        top: orbRect.top - pageRect.top,
        width: orbRect.width,
        height: orbRect.height,
        moved: false
      };
      demoOrb.style.left = dragState.left + "px";
      demoOrb.style.top = dragState.top + "px";
      demoOrb.style.right = "auto";
      demoOrb.style.bottom = "auto";
      demoOrb.setPointerCapture && demoOrb.setPointerCapture(event.pointerId);
      dragging = true;
      suppressOrbClick = false;
      window.clearTimeout(idleTimer);
    });

    demoOrb.addEventListener("pointermove", function (event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      var dx = event.clientX - dragState.startX;
      var dy = event.clientY - dragState.startY;
      if (Math.abs(dx) + Math.abs(dy) > 4) dragState.moved = true;
      var maxLeft = playgroundPage.clientWidth - dragState.width - 8;
      var maxTop = playgroundPage.clientHeight - dragState.height - 8;
      var left = Math.max(8, Math.min(maxLeft, dragState.left + dx));
      var top = Math.max(8, Math.min(maxTop, dragState.top + dy));
      demoOrb.style.left = left + "px";
      demoOrb.style.top = top + "px";
    });

    function endOrbDrag(event) {
      if (!dragState || event.pointerId !== dragState.pointerId) return;
      suppressOrbClick = dragState.moved;
      dragging = false;
      dragState = null;
      resetOrbIdle();
      window.setTimeout(function () { suppressOrbClick = false; }, 80);
    }
    demoOrb.addEventListener("pointerup", endOrbDrag);
    demoOrb.addEventListener("pointercancel", endOrbDrag);
    resetOrbIdle();
  }

  var swipeCard = document.getElementById("swipeCard");
  var swipeDelete = document.getElementById("swipeDelete");
  if (swipeCard && swipeDelete) {
    var SWIPE_OPEN = -82;
    var swipeStart = null;
    var swipeOffset = 0;
    var swipeMoved = false;

    function setSwipe(x, snap) {
      swipeOffset = Math.max(SWIPE_OPEN, Math.min(0, x));
      swipeCard.style.transition = snap ? "" : "none";
      swipeCard.style.transform = "translateX(" + swipeOffset + "px)";
    }

    swipeCard.addEventListener("pointerdown", function (event) {
      if (event.button !== undefined && event.button !== 0) return;
      swipeStart = { x: event.clientX, base: swipeOffset };
      swipeMoved = false;
      swipeCard.setPointerCapture && swipeCard.setPointerCapture(event.pointerId);
      swipeCard.style.transition = "none";
    });
    swipeCard.addEventListener("pointermove", function (event) {
      if (!swipeStart) return;
      var dx = event.clientX - swipeStart.x;
      if (Math.abs(dx) > 4) swipeMoved = true;
      setSwipe(swipeStart.base + dx, false);
    });
    function endSwipe() {
      if (!swipeStart) return;
      setSwipe(swipeOffset < -38 ? SWIPE_OPEN : 0, true);
      swipeStart = null;
    }
    swipeCard.addEventListener("pointerup", endSwipe);
    swipeCard.addEventListener("pointercancel", endSwipe);
    swipeCard.addEventListener("click", function (event) {
      if (swipeMoved) { event.preventDefault(); swipeMoved = false; }
    });

    swipeDelete.addEventListener("click", function () {
      var word = swipeCard.querySelector(".swipe-word");
      swipeCard.style.transition = "transform .32s ease, opacity .32s ease";
      swipeCard.style.transform = "translateX(-120%)";
      swipeCard.style.opacity = "0";
      window.setTimeout(function () {
        if (word) word.innerHTML = "<b>已清除</b><small>只删除这一条记录</small>";
        swipeCard.style.transition = "none";
        swipeCard.style.transform = "translateX(0)";
        swipeCard.style.opacity = "1";
        swipeOffset = 0;
      }, 340);
    });
  }

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener("click", function () {
      if (!reducedMotion) window.setTimeout(updateScroll, 900);
    });
  });
})();
