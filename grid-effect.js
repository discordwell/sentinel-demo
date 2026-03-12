(function () {
  'use strict';

  var DEFAULT_CELL_SIZE = 24;
  var DEFAULT_MOBILE_CELL_SIZE = 18;
  var TOUCH_FADE_MS = 600;
  var RING_BLEND = [0.74, 0.42, 0.18];
  var DEFAULT_HIGHLIGHT = '#f8e8dc';
  var HERO_PANEL_COLOR = '#eb8a55';
  var SAMPLE_PATTERNS = {
    hero: [
      ['#e9763b', '#e97a40', '#e9773c', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9783e', '#e9783d', '#e9783e', '#e9783e', '#e9783e', '#e97a41', '#e9763b'],
      ['#e9763b', '#e9783e', '#e9783e', '#e9783e', '#e9783e', '#e9783e', '#e9763c', '#e9763b', '#e9763b', '#e9763c', '#e9763c', '#e9763b', '#e9763c', '#e9763c', '#e9763c', '#e9763b'],
      ['#e8763b', '#ed8c5b', '#ed8f5f', '#ed8e5e', '#ec8957', '#eb8550', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e8763b', '#e9763b', '#e9763b', '#e9763b', '#e8763b'],
      ['#e9763b', '#ef9e75', '#f2b18f', '#f1a984', '#ed9162', '#eb8550', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b'],
      ['#e9763b', '#ef9c72', '#f1aa85', '#f1ab87', '#ef986d', '#ec8855', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b', '#e9763b'],
      ['#e8763b', '#ef9e74', '#f3b190', '#f0a47d', '#f1a680', '#ed9162', '#e9763c', '#e9763b', '#e9763b', '#e9763c', '#e9763c', '#e8763b', '#e9763c', '#e9763c', '#e9763c', '#e8763b'],
      ['#e8763b', '#ee976b', '#f0a078', '#f0a077', '#f0a37c', '#ed8e5e', '#e9763c', '#e9763b', '#e9763b', '#e9763c', '#e9763c', '#e8763b', '#e9763c', '#e9763c', '#e9763c', '#e8763b'],
      ['#e8763b', '#ee9467', '#f0a37c', '#ed9061', '#eb8652', '#eb8550', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b'],
      ['#e8763c', '#eca782', '#ebb799', '#ecab88', '#eb8652', '#eb8450', '#e9763c', '#e9763c', '#e9763c', '#e9763c', '#e9763c', '#e8763c', '#e9763c', '#e9763c', '#e9763c', '#e8763c'],
      ['#e8763b', '#e8773c', '#e8773c', '#e8763c', '#e8763c', '#e8763c', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b', '#e8763b']
    ],
    card1: [
      ['#a84f53', '#ab5659', '#b47070', '#c99c91', '#d09d86', '#c26e5d', '#b74b42'],
      ['#ab3e3f', '#a33d42', '#a64b50', '#bb7b75', '#ce9a85', '#c57a66', '#bc584b'],
      ['#c04130', '#b33f39', '#a44144', '#ab585a', '#c69388', '#d0a089', '#ca8a74'],
      ['#ca4221', '#c3402c', '#a93f40', '#a95155', '#bf8883', '#d1b2a1', '#d3b39c']
    ],
    card2: [
      ['#e4b9a3', '#e4beab', '#ddae9d', '#d89d8a', '#ddae9c', '#e4bdaa', '#e1b6a0'],
      ['#e0b29e', '#dba08a', '#cb8374', '#c06e64', '#cf8a7b', '#daa089', '#e0b29e'],
      ['#d59d90', '#c27065', '#b9534c', '#b5453f', '#ba554d', '#c27165', '#d49b8d'],
      ['#c97f73', '#ba5b53', '#c13f32', '#d24026', '#c03e32', '#b8554e', '#c77d72']
    ],
    card3: [
      ['#d04c42', '#cb6159', '#db9383', '#e9bfae', '#e9bead', '#db9382', '#cb6059'],
      ['#e44a30', '#c9514a', '#ce746b', '#e1a795', '#e1a694', '#ce746b', '#c9514a'],
      ['#e24933', '#c95048', '#d07b70', '#e3aa98', '#e3a997', '#d07a6f', '#ca4f48'],
      ['#cc4c42', '#cb6158', '#dd9887', '#e8bead', '#e8bdac', '#dd9787', '#cb645b']
    ],
    card4: [
      ['#d44632', '#d74b36', '#c65c4f', '#c97868', '#dc9b7c', '#e1b094', '#e1c4b6'],
      ['#c5574a', '#c85c4e', '#d1826c', '#db9a7c', '#dfa183', '#e0a488', '#e1b39c'],
      ['#d49583', '#d48e79', '#dc9d7e', '#d89579', '#cd7e6c', '#cd7e6b', '#d08671'],
      ['#e1bfaf', '#e0b096', '#dc9d7f', '#ca7a6a', '#bc514c', '#c75144', '#c45548']
    ],
    signup: [
      ['#e2482d', '#db462e', '#d84530', '#d0412f', '#c93f31', '#be3a2f', '#ba3930', '#b23530', '#aa3330', '#a43132', '#9a2d31', '#922930', '#89242c', '#872530'],
      ['#e44a2b', '#e0492b', '#db472c', '#d4432d', '#cb3f2f', '#c53d30', '#bf3b2f', '#b63830', '#b03631', '#a83231', '#9e2e31', '#982c31', '#91282f', '#8d2832'],
      ['#e74f26', '#e34d28', '#de492a', '#d7462c', '#d0422e', '#c73f30', '#c53d30', '#ba3931', '#b03631', '#aa3330', '#a12f30', '#9b2d31', '#962b31', '#8f2730'],
      ['#ea5426', '#e34f22', '#e24e25', '#dc482a', '#d5442e', '#cb3f2f', '#c23c30', '#bd3a30', '#b53630', '#ae342f', '#a63130', '#9f3033', '#9d3034', '#9f3136'],
      ['#ec5a27', '#e75422', '#e24e25', '#dd492a', '#d4432d', '#cd402f', '#c63d2f', '#c03b30', '#ba3a31', '#b33630', '#ac3431', '#a33031', '#9d2e33', '#9f353b']
    ]
  };

  var surfaces = [];
  var cleanupFns = [];
  var imageCache = {};
  var sampledPatternCache = {};

  function init() {
    var nodes = document.querySelectorAll('.pixel-surface');
    nodes.forEach(function (node) {
      surfaces.push(createSurface(node));
    });

    if (!surfaces.length) return;

    bindEvents();
  }

  function createSurface(node) {
    var state = {
      node: node,
      cells: [],
      baseRgb: [],
      baseCss: [],
      active: new Set(),
      cols: 0,
      rows: 0,
      highlight: hexToRgb(node.dataset.highlight || DEFAULT_HIGHLIGHT),
      cellSize: 0,
      rafId: null,
      needsUpdate: false,
      pointerInside: false,
      cursorX: 0,
      cursorY: 0,
      touchTimeout: null,
      image: null
    };

    buildSurface(state);
    ensureSurfaceImage(state);
    return state;
  }

  function bindEvents() {
    var onPointerMove = function (event) {
      surfaces.forEach(function (state) {
        updatePointerState(state, event.clientX, event.clientY);
      });
    };

    var onTouchMove = function (event) {
      var touch = event.touches[0];
      if (!touch) return;

      surfaces.forEach(function (state) {
        if (state.touchTimeout) clearTimeout(state.touchTimeout);
        updatePointerState(state, touch.clientX, touch.clientY);
        state.touchTimeout = setTimeout(function () {
          resetSurface(state);
        }, TOUCH_FADE_MS);
      });
    };

    var onTouchEnd = function () {
      surfaces.forEach(resetSurface);
    };

    var onResize = debounce(function () {
      surfaces.forEach(buildSurface);
    }, 150);

    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('touchstart', onTouchMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', debounce(function () {
      surfaces.forEach(function (state) {
        if (state.pointerInside) {
          scheduleUpdate(state);
        }
      });
    }, 50), { passive: true });

    cleanupFns.push(function () {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('touchstart', onTouchMove);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', onResize);
    });
  }

  function buildSurface(state) {
    var node = state.node;
    var rect = node.getBoundingClientRect();
    var width = Math.max(1, Math.round(rect.width));
    var height = Math.max(1, Math.round(rect.height));
    var cellSize = getCellSize(node);
    var cols = Math.max(1, Math.ceil(width / cellSize));
    var rows = Math.max(1, Math.ceil(height / cellSize));
    var fragment = document.createDocumentFragment();

    resetSurface(state);

    state.cols = cols;
    state.rows = rows;
    state.cellSize = cellSize;
    state.cells = [];
    state.baseRgb = getBaseColors(state, cols, rows);
    state.baseCss = [];

    node.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
    node.style.gridTemplateRows = 'repeat(' + rows + ', minmax(0, 1fr))';
    node.innerHTML = '';

    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var rgb = state.baseRgb[(row * cols) + col];
        var css = rgbToCss(rgb);
        var cell = document.createElement('div');

        cell.className = 'pixel-cell';
        cell.style.backgroundColor = css;
        fragment.appendChild(cell);

        state.cells.push(cell);
        state.baseRgb.push(rgb);
        state.baseCss.push(css);
      }
    }

    node.appendChild(fragment);

    syncSurfaceUi(state, width, height);
  }

  function ensureSurfaceImage(state) {
    var src = state.node.dataset.imageSrc;
    if (!src) return;

    if (imageCache[src]) {
      if (imageCache[src].status === 'loaded') {
        state.image = imageCache[src].image;
        return;
      }

      imageCache[src].listeners.push(function (image) {
        state.image = image;
        buildSurface(state);
      });
      return;
    }

    imageCache[src] = {
      status: 'loading',
      image: null,
      listeners: [function (image) {
        state.image = image;
        buildSurface(state);
      }]
    };

    var image = new Image();
    image.onload = function () {
      var entry = imageCache[src];
      entry.status = 'loaded';
      entry.image = image;
      entry.listeners.forEach(function (listener) {
        listener(image);
      });
      entry.listeners = [];
    };
    image.onerror = function () {
      imageCache[src].status = 'error';
      imageCache[src].listeners = [];
    };
    image.src = src;
  }

  function getCellSize(node) {
    var desktop = parseInt(node.dataset.cellSize || DEFAULT_CELL_SIZE, 10);
    var mobile = parseInt(node.dataset.cellSizeMobile || DEFAULT_MOBILE_CELL_SIZE, 10);
    return window.innerWidth <= 768 ? mobile : desktop;
  }

  function getBaseColors(state, cols, rows) {
    var node = state.node;
    var src = node.dataset.imageSrc;

    if (node.dataset.pattern === 'hero-wireframe') {
      return getHeroWireframeColors(state, cols, rows);
    }

    if (src && imageCache[src] && imageCache[src].status === 'loaded') {
      return getImageColors(src, imageCache[src].image, cols, rows);
    }

    if (node.dataset.pattern && SAMPLE_PATTERNS[node.dataset.pattern]) {
      return getPatternColors(SAMPLE_PATTERNS[node.dataset.pattern], cols, rows);
    }

    return fillColors(hexToRgb(node.dataset.baseColor || '#E8753A'), cols * rows);
  }

  function getHeroWireframeColors(state, cols, rows) {
    var node = state.node;
    var hero = node.closest('.hero');
    var rect = node.getBoundingClientRect();
    var base = hexToRgb(node.dataset.baseColor || '#E8753A');
    var panel = hexToRgb(HERO_PANEL_COLOR);
    var colors = fillColors(base, cols * rows);

    if (!hero || !rect.width || !rect.height) {
      return colors;
    }

    hero.classList.add('hero--wireframe-ready');
    fillElementRect(colors, cols, rows, rect, hero.querySelector('.hero__title-block'), panel);
    fillElementRect(colors, cols, rows, rect, hero.querySelector('.hero__cta-block'), panel);
    return colors;
  }

  function fillElementRect(colors, cols, rows, surfaceRect, element, rgb) {
    if (!element) return;

    var rect = element.getBoundingClientRect();
    var cellWidth = surfaceRect.width / cols;
    var cellHeight = surfaceRect.height / rows;
    var colStart = Math.floor((rect.left - surfaceRect.left) / cellWidth);
    var colEnd = Math.ceil((rect.right - surfaceRect.left) / cellWidth);
    var rowStart = Math.floor((rect.top - surfaceRect.top) / cellHeight);
    var rowEnd = Math.ceil((rect.bottom - surfaceRect.top) / cellHeight);

    for (var row = Math.max(0, rowStart); row < Math.min(rows, rowEnd); row += 1) {
      for (var col = Math.max(0, colStart); col < Math.min(cols, colEnd); col += 1) {
        colors[(row * cols) + col] = rgb;
      }
    }
  }

  function getPatternColors(pattern, cols, rows) {
    var colors = [];
    var patternRows = pattern.length;
    var patternCols = pattern[0].length;

    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var patternCol = cols <= 1 ? 0 : Math.round((patternCols - 1) * (col / (cols - 1)));
        var patternRow = rows <= 1 ? 0 : Math.round((patternRows - 1) * (row / (rows - 1)));
        colors.push(hexToRgb(pattern[patternRow][patternCol]));
      }
    }

    return colors;
  }

  function getImageColors(src, image, cols, rows) {
    var cacheKey = src + ':' + cols + 'x' + rows;
    if (sampledPatternCache[cacheKey]) {
      return sampledPatternCache[cacheKey];
    }

    var canvas = document.createElement('canvas');
    var context = canvas.getContext('2d');
    var colors = [];

    canvas.width = cols;
    canvas.height = rows;
    context.drawImage(image, 0, 0, cols, rows);

    var data = context.getImageData(0, 0, cols, rows).data;
    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var index = ((row * cols) + col) * 4;
        colors.push({
          r: data[index],
          g: data[index + 1],
          b: data[index + 2]
        });
      }
    }

    sampledPatternCache[cacheKey] = colors;
    return colors;
  }

  function fillColors(rgb, count) {
    var colors = [];
    for (var index = 0; index < count; index += 1) {
      colors.push(rgb);
    }
    return colors;
  }

  function syncSurfaceUi(state, width, height) {
    if (!state.node.classList.contains('hero__pixels')) return;

    var hero = state.node.closest('.hero');
    if (!hero || !state.cols || !state.rows) return;

    hero.style.setProperty('--hero-grid-cell-width', (width / state.cols) + 'px');
    hero.style.setProperty('--hero-grid-cell-height', (height / state.rows) + 'px');
  }

  function updatePointerState(state, clientX, clientY) {
    var rect = state.node.getBoundingClientRect();
    var inside = clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;

    if (!inside) {
      if (state.pointerInside) resetSurface(state);
      return;
    }

    state.pointerInside = true;
    state.cursorX = clientX - rect.left;
    state.cursorY = clientY - rect.top;
    scheduleUpdate(state);
  }

  function scheduleUpdate(state) {
    if (state.needsUpdate) return;

    state.needsUpdate = true;
    state.rafId = window.requestAnimationFrame(function () {
      updateSurface(state);
    });
  }

  function updateSurface(state) {
    var rect = state.node.getBoundingClientRect();
    var col = Math.min(state.cols - 1, Math.max(0, Math.floor((state.cursorX / Math.max(rect.width, 1)) * state.cols)));
    var row = Math.min(state.rows - 1, Math.max(0, Math.floor((state.cursorY / Math.max(rect.height, 1)) * state.rows)));
    var nextActive = new Set();
    var maxRing = RING_BLEND.length - 1;

    state.needsUpdate = false;
    state.rafId = null;

    for (var y = Math.max(0, row - maxRing); y <= Math.min(state.rows - 1, row + maxRing); y += 1) {
      for (var x = Math.max(0, col - maxRing); x <= Math.min(state.cols - 1, col + maxRing); x += 1) {
        var ring = Math.max(Math.abs(x - col), Math.abs(y - row));
        if (ring > maxRing) continue;

        var index = (y * state.cols) + x;
        var base = state.baseRgb[index];
        var hover = mixRgb(base, state.highlight, RING_BLEND[ring]);
        nextActive.add(index);
        state.cells[index].style.backgroundColor = rgbToCss(hover);
      }
    }

    state.active.forEach(function (index) {
      if (!nextActive.has(index)) {
        state.cells[index].style.backgroundColor = state.baseCss[index];
      }
    });

    state.active = nextActive;
  }

  function resetSurface(state) {
    if (state.touchTimeout) {
      clearTimeout(state.touchTimeout);
      state.touchTimeout = null;
    }

    if (state.rafId) {
      window.cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }

    state.needsUpdate = false;
    state.pointerInside = false;

    state.active.forEach(function (index) {
      state.cells[index].style.backgroundColor = state.baseCss[index];
    });
    state.active.clear();
  }

  function mixRgb(a, b, amount) {
    return {
      r: Math.round(a.r + ((b.r - a.r) * amount)),
      g: Math.round(a.g + ((b.g - a.g) * amount)),
      b: Math.round(a.b + ((b.b - a.b) * amount))
    };
  }

  function rgbToCss(rgb) {
    return 'rgb(' + rgb.r + ', ' + rgb.g + ', ' + rgb.b + ')';
  }

  function hexToRgb(hex) {
    var value = hex.replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16)
    };
  }

  function debounce(fn, delay) {
    var timeout = null;
    return function () {
      clearTimeout(timeout);
      timeout = setTimeout(fn, delay);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
