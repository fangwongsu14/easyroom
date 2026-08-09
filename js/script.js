(function(){
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var canFine = window.matchMedia("(pointer: fine)").matches;

  /* ============================================================
     1. Hero phase reveal (staggered entrance)
  ============================================================ */
  var phaseTiming = { "1": 100, "3": 350, "4": 500, "5": 700, "6": 900, "7": 1100 };

  function runHeroReveal(){
    var phaseEls = document.querySelectorAll(".phase");
    if(reduceMotion){
      phaseEls.forEach(function(el){ el.classList.add("in"); });
      return;
    }
    phaseEls.forEach(function(el){
      var phase = el.getAttribute("data-phase");
      var delay = phaseTiming[phase] || 0;
      window.setTimeout(function(){ el.classList.add("in"); }, delay);
    });
  }

  /* ============================================================
     2. Scroll reveal (IntersectionObserver)
  ============================================================ */
  function initScrollReveal(){
    var els = document.querySelectorAll(".reveal-on-scroll");
    if(reduceMotion || !("IntersectionObserver" in window)){
      els.forEach(function(el){ el.classList.add("in"); });
      return;
    }
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -60px 0px" });
    els.forEach(function(el){ observer.observe(el); });
  }

  /* ============================================================
     3. Mouse ambient light + parallax + 3D tilt (hero, desktop only)
  ============================================================ */
  function initHeroMouse(){
    if(reduceMotion || !canFine) return;

    var hero = document.getElementById("hero");
    var glow = document.getElementById("ambientGlow");
    var logoWrap = document.getElementById("logoWrap");
    var logoTilt = document.getElementById("logoTilt");
    var cards = document.querySelectorAll(".glass-card");
    if(!hero) return;

    hero.classList.add("has-mouse-light");

    var targetX = 0, targetY = 0;   // -1..1 relative to hero center
    var currentX = 0, currentY = 0;
    var raf = null;

    hero.addEventListener("mousemove", function(e){
      var rect = hero.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;   // 0..1
      var py = (e.clientY - rect.top) / rect.height;    // 0..1

      hero.style.setProperty("--mx", (px * 100) + "%");
      hero.style.setProperty("--my", (py * 100) + "%");

      if(logoWrap){
        logoWrap.style.setProperty("--lx", (px * 100) + "%");
        logoWrap.style.setProperty("--ly", (py * 100) + "%");
      }

      targetX = (px - 0.5) * 2;
      targetY = (py - 0.5) * 2;
      if(!raf) raf = requestAnimationFrame(tick);
    });

    hero.addEventListener("mouseleave", function(){
      targetX = 0;
      targetY = 0;
      if(!raf) raf = requestAnimationFrame(tick);
    });

    function tick(){
      currentX += (targetX - currentX) * 0.07;
      currentY += (targetY - currentY) * 0.07;

      if(glow){
        glow.style.transform =
          "translate(calc(-50% + " + (currentX * 34) + "px), calc(-50% + " + (currentY * 34) + "px)) scale(1)";
      }

      if(logoTilt){
        var rotY = currentX * 4;   // max ~4deg
        var rotX = currentY * -3;  // max ~3deg
        logoTilt.style.transform =
          "rotateX(" + rotX + "deg) rotateY(" + rotY + "deg) translateZ(0)";
      }

      cards.forEach(function(card){
        var depth = parseFloat(card.getAttribute("data-depth")) || 0.4;
        var tx = currentX * 20 * depth;
        var ty = currentY * 20 * depth;
        card.style.setProperty("--px", tx + "px");
        card.style.setProperty("--py", ty + "px");
        card.style.transform = "translate(" + tx + "px, " + ty + "px)";
      });

      if(Math.abs(targetX - currentX) > 0.001 || Math.abs(targetY - currentY) > 0.001){
        raf = requestAnimationFrame(tick);
      } else {
        raf = null;
      }
    }
  }

  /* ============================================================
     4. Feature card local spotlight (per-card mouse tracking)
  ============================================================ */
  function initFeatureSpotlight(){
    if(reduceMotion || !canFine) return;
    var cards = document.querySelectorAll(".tilt-card");
    cards.forEach(function(card){
      card.addEventListener("mousemove", function(e){
        var rect = card.getBoundingClientRect();
        var sx = ((e.clientX - rect.left) / rect.width) * 100;
        var sy = ((e.clientY - rect.top) / rect.height) * 100;
        card.style.setProperty("--sx", sx + "%");
        card.style.setProperty("--sy", sy + "%");
      });
    });
  }

  /* ============================================================
     5. Particle field (ambient dust, low CPU)
  ============================================================ */
  function initParticles(){
    if(reduceMotion) return;

    var canvas = document.getElementById("particle-canvas");
    if(!canvas) return;
    var ctx = canvas.getContext("2d");
    var hero = document.getElementById("hero");
    var particles = [];
    var count = window.innerWidth < 700 ? 16 : 30;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var width, height;
    var running = true;

    function resize(){
      var rect = hero ? hero.getBoundingClientRect() : { width: window.innerWidth, height: window.innerHeight, top: 0 };
      width = window.innerWidth;
      height = Math.max(rect.height + rect.top, window.innerHeight);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = width + "px";
      canvas.style.height = height + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function seed(){
      particles = [];
      for(var i = 0; i < count; i++){
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          r: Math.random() * 1.6 + 0.6,
          vx: (Math.random() - 0.5) * 0.1,
          vy: (Math.random() - 0.5) * 0.1,
          o: Math.random() * 0.3 + 0.08
        });
      }
    }

    function draw(){
      if(!running) return;
      ctx.clearRect(0, 0, width, height);
      for(var i = 0; i < particles.length; i++){
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if(p.x < -10) p.x = width + 10;
        if(p.x > width + 10) p.x = -10;
        if(p.y < -10) p.y = height + 10;
        if(p.y > height + 10) p.y = -10;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(74,157,232," + p.o + ")";
        ctx.fill();
      }
      requestAnimationFrame(draw);
    }

    document.addEventListener("visibilitychange", function(){
      running = document.visibilityState === "visible";
      if(running) requestAnimationFrame(draw);
    });

    resize();
    seed();
    requestAnimationFrame(draw);

    var resizeTimeout;
    window.addEventListener("resize", function(){
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function(){
        resize();
        seed();
      }, 200);
    });
  }

  /* ============================================================
     Init
  ============================================================ */
  document.addEventListener("DOMContentLoaded", function(){
    runHeroReveal();
    initScrollReveal();
    initHeroMouse();
    initFeatureSpotlight();
    initParticles();
  });

})();
