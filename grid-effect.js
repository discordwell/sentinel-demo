/**
 * Sentinel Hero Grid Effect
 *
 * Generates a grid of cells over the hero section. Cells near the cursor
 * desaturate in a 5x5 stepped pattern using Chebyshev distance.
 *
 * Figma spec (saturation % per ring):
 *   Ring 0 (center):  40%
 *   Ring 1 (8 cells):  70%
 *   Ring 2 (16 cells): 98%
 *   Everything else:  100% (unchanged)
 */
(function () {
  'use strict';

  var CELL_SIZE_DESKTOP = 48;
  var CELL_SIZE_MOBILE = 36;
  var TOUCH_FADE_MS = 600;

  // Saturation % per Chebyshev ring from cursor cell
  var RING_SAT = ['40%', '70%', '98%'];

  var hero, grid;
  var cells = [];
  var cols = 0, rows = 0;
  var cellSize = CELL_SIZE_DESKTOP;
  var heroRect = null;
  var activeSet = new Set();
  var rafId = null;
  var cursorX = -9999, cursorY = -9999;
  var needsUpdate = false;
  var touchTimeout = null;

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

    var w = hero.offsetWidth;
    var h = hero.offsetHeight;
    cols = Math.ceil(w / cellSize);
    rows = Math.ceil(h / cellSize);

    grid.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellSize + 'px)';
    grid.style.gridTemplateRows = 'repeat(' + rows + ', ' + cellSize + 'px)';

    var frag = document.createDocumentFragment();
    cells = [];

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var cell = document.createElement('div');
        cell.className = 'grid-cell';
        frag.appendChild(cell);
        cells.push(cell);
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
    var touch = e.touches[0];
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
    var touch = e.touches[0];
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
    activeSet.forEach(function (idx) {
      cells[idx].style.filter = '';
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

    var curCol = Math.floor(cursorX / cellSize);
    var curRow = Math.floor(cursorY / cellSize);

    var newActive = new Set();
    var maxRing = RING_SAT.length - 1;

    var rMin = Math.max(0, curRow - maxRing);
    var rMax = Math.min(rows - 1, curRow + maxRing);
    var cMin = Math.max(0, curCol - maxRing);
    var cMax = Math.min(cols - 1, curCol + maxRing);

    for (var r = rMin; r <= rMax; r++) {
      for (var c = cMin; c <= cMax; c++) {
        var ring = Math.max(Math.abs(c - curCol), Math.abs(r - curRow));
        if (ring <= maxRing) {
          var idx = r * cols + c;
          newActive.add(idx);
          cells[idx].style.filter = 'saturate(' + RING_SAT[ring] + ')';
        }
      }
    }

    // Reset cells that left the active set
    activeSet.forEach(function (idx) {
      if (!newActive.has(idx)) {
        cells[idx].style.filter = '';
      }
    });

    activeSet = newActive;
  }

  function debounce(fn, ms) {
    var timer;
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
