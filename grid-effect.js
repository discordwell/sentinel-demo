/**
 * Sentinel Hero Grid Effect
 *
 * Generates a grid of cells over the hero section. Cells near the cursor
 * become transparent, revealing the dark background beneath.
 */
(function () {
  'use strict';

  const CELL_SIZE_DESKTOP = 48;
  const CELL_SIZE_MOBILE = 36;
  const RADIUS_CELLS = 4;
  const TOUCH_FADE_MS = 600;

  let hero, grid;
  let cells = [];
  let centers = [];
  let cols = 0, rows = 0;
  let cellSize = CELL_SIZE_DESKTOP;
  let radius = 0;
  let radiusSq = 0;
  let heroRect = null;
  let activeSet = new Set();
  let rafId = null;
  let cursorX = -9999, cursorY = -9999;
  let needsUpdate = false;
  let touchTimeout = null;

  function init() {
    hero = document.getElementById('hero');
    grid = hero.querySelector('.hero__grid');
    if (!hero || !grid) return;

    buildGrid();
    attachListeners();

    window.addEventListener('resize', debounce(rebuild, 200));
  }

  function buildGrid() {
    cellSize = window.innerWidth <= 768 ? CELL_SIZE_MOBILE : CELL_SIZE_DESKTOP;
    radius = cellSize * RADIUS_CELLS;
    radiusSq = radius * radius;

    const w = hero.offsetWidth;
    const h = hero.offsetHeight;
    cols = Math.ceil(w / cellSize);
    rows = Math.ceil(h / cellSize);

    grid.style.gridTemplateColumns = `repeat(${cols}, ${cellSize}px)`;
    grid.style.gridTemplateRows = `repeat(${rows}, ${cellSize}px)`;

    const frag = document.createDocumentFragment();
    cells = [];
    centers = [];

    const halfCell = cellSize / 2;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        frag.appendChild(cell);
        cells.push(cell);
        centers.push(c * cellSize + halfCell, r * cellSize + halfCell);
      }
    }

    grid.innerHTML = '';
    grid.appendChild(frag);
    activeSet.clear();
    cacheRect();
  }

  function rebuild() {
    buildGrid();
    cursorX = -9999;
    cursorY = -9999;
  }

  function cacheRect() {
    heroRect = hero.getBoundingClientRect();
  }

  function attachListeners() {
    hero.addEventListener('mousemove', onPointerMove);
    hero.addEventListener('mouseleave', onPointerLeave);

    hero.addEventListener('touchstart', onTouchStart, { passive: true });
    hero.addEventListener('touchmove', onTouchMove, { passive: true });
    hero.addEventListener('touchend', onPointerLeave);

    window.addEventListener('scroll', debounce(cacheRect, 100), { passive: true });
  }

  function onPointerMove(e) {
    if (!heroRect) cacheRect();
    cursorX = e.clientX - heroRect.left;
    cursorY = e.clientY - heroRect.top;
    scheduleUpdate();
  }

  function onTouchStart(e) {
    if (touchTimeout) clearTimeout(touchTimeout);
    const touch = e.touches[0];
    if (!heroRect) cacheRect();
    cursorX = touch.clientX - heroRect.left;
    cursorY = touch.clientY - heroRect.top;
    scheduleUpdate();

    touchTimeout = setTimeout(function () {
      onPointerLeave();
    }, TOUCH_FADE_MS);
  }

  function onTouchMove(e) {
    if (touchTimeout) clearTimeout(touchTimeout);
    const touch = e.touches[0];
    if (!heroRect) cacheRect();
    cursorX = touch.clientX - heroRect.left;
    cursorY = touch.clientY - heroRect.top;
    scheduleUpdate();

    touchTimeout = setTimeout(function () {
      onPointerLeave();
    }, TOUCH_FADE_MS);
  }

  function onPointerLeave() {
    cursorX = -9999;
    cursorY = -9999;
    // Reset all active cells
    activeSet.forEach(function (idx) {
      cells[idx].style.opacity = '1';
    });
    activeSet.clear();
    needsUpdate = false;
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  }

  function scheduleUpdate() {
    if (!needsUpdate) {
      needsUpdate = true;
      rafId = requestAnimationFrame(updateGrid);
    }
  }

  function updateGrid() {
    needsUpdate = false;
    rafId = null;

    const newActive = new Set();
    const count = cells.length;

    for (let i = 0; i < count; i++) {
      const cx = centers[i * 2];
      const cy = centers[i * 2 + 1];
      const dx = cursorX - cx;
      const dy = cursorY - cy;

      // Early exit: skip sqrt if clearly outside radius
      if (dx > radius || dx < -radius || dy > radius || dy < -radius) {
        continue;
      }

      const distSq = dx * dx + dy * dy;
      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const opacity = dist / radius;
        newActive.add(i);
        cells[i].style.opacity = opacity.toFixed(2);
      }
    }

    // Reset cells that left the active set
    activeSet.forEach(function (idx) {
      if (!newActive.has(idx)) {
        cells[idx].style.opacity = '1';
      }
    });

    activeSet = newActive;
  }

  function debounce(fn, ms) {
    let timer;
    return function () {
      clearTimeout(timer);
      timer = setTimeout(fn, ms);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
