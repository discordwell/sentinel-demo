(function () {
  'use strict';

  var TOUCH_FADE_MS = 600;
  var RING_SATURATION = ['40%', '70%', '98%'];
  var DEFAULT_CELL_SIZE = 24;
  var DEFAULT_MOBILE_CELL_SIZE = 18;
  var PALETTES = {
    'warm-a': ['#98323a', '#f1dac9', '#ef6736', '#c24f3c'],
    'warm-b': ['#c85649', '#f1dfd1', '#ea7a49', '#a03337'],
    'warm-c': ['#a63838', '#f0ded2', '#f06a35', '#be4c3c'],
    'warm-d': ['#b34136', '#efd9cb', '#ec7b48', '#913237']
  };

  var surfaces = [];

  function init() {
    var nodes = document.querySelectorAll('.pixel-surface');
    nodes.forEach(function (node) {
      surfaces.push(createSurface(node));
    });

    if (!surfaces.length) return;

    var debouncedRebuild = debounce(function () {
      surfaces.forEach(buildSurface);
    }, 150);

    window.addEventListener('resize', debouncedRebuild);
  }

  function createSurface(node) {
    var target = resolveTarget(node);
    var state = {
      node: node,
      target: target,
      cells: [],
      active: new Set(),
      cols: 0,
      rows: 0,
      cellSize: 0,
      rect: null,
      cursorX: -9999,
      cursorY: -9999,
      rafId: null,
      needsUpdate: false,
      touchTimeout: null
    };

    buildSurface(state);
    attachListeners(state);

    return state;
  }

  function resolveTarget(node) {
    if (node.dataset.listenParent) {
      return document.querySelector(node.dataset.listenParent) || node.parentElement || node;
    }
    return node.parentElement || node;
  }

  function buildSurface(state) {
    var node = state.node;
    var width = node.offsetWidth;
    var height = node.offsetHeight;
    var cellSize = getCellSize(node);
    var cols = Math.ceil(width / cellSize);
    var rows = Math.ceil(height / cellSize);
    var fragment = document.createDocumentFragment();

    state.cellSize = cellSize;
    state.cols = cols;
    state.rows = rows;
    state.cells = [];
    state.active.clear();

    node.style.gridTemplateColumns = 'repeat(' + cols + ', ' + cellSize + 'px)';
    node.style.gridTemplateRows = 'repeat(' + rows + ', ' + cellSize + 'px)';
    node.innerHTML = '';

    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var cell = document.createElement('div');
        cell.className = 'pixel-cell';
        cell.style.backgroundColor = getBaseColor(node, col, row, cols, rows);
        fragment.appendChild(cell);
        state.cells.push(cell);
      }
    }

    node.appendChild(fragment);
    state.rect = state.target.getBoundingClientRect();
  }

  function getCellSize(node) {
    var desktop = parseInt(node.dataset.cellSize || DEFAULT_CELL_SIZE, 10);
    var mobile = parseInt(node.dataset.cellSizeMobile || DEFAULT_MOBILE_CELL_SIZE, 10);
    return window.innerWidth <= 768 ? mobile : desktop;
  }

  function getBaseColor(node, col, row, cols, rows) {
    if ((node.dataset.mode || 'solid') === 'solid') {
      return node.dataset.baseColor || '#E8753A';
    }

    var palette = PALETTES[node.dataset.palette] || PALETTES['warm-a'];
    var x = cols <= 1 ? 0 : col / (cols - 1);
    var y = rows <= 1 ? 0 : row / (rows - 1);

    var top = mixHex(palette[0], palette[1], x);
    var bottom = mixHex(palette[2], palette[3], x);

    return mixHex(top, bottom, y);
  }

  function attachListeners(state) {
    state.target.addEventListener('mousemove', function (event) {
      onPointerMove(state, event.clientX, event.clientY);
    });

    state.target.addEventListener('mouseleave', function () {
      resetSurface(state);
    });

    state.target.addEventListener('touchstart', function (event) {
      var touch = event.touches[0];
      onTouchMove(state, touch.clientX, touch.clientY);
    }, { passive: true });

    state.target.addEventListener('touchmove', function (event) {
      var touch = event.touches[0];
      onTouchMove(state, touch.clientX, touch.clientY);
    }, { passive: true });

    state.target.addEventListener('touchend', function () {
      resetSurface(state);
    });

    window.addEventListener('scroll', debounce(function () {
      state.rect = state.target.getBoundingClientRect();
    }, 80), { passive: true });
  }

  function onPointerMove(state, clientX, clientY) {
    if (!state.rect) state.rect = state.target.getBoundingClientRect();

    state.cursorX = clientX - state.rect.left;
    state.cursorY = clientY - state.rect.top;
    scheduleUpdate(state);
  }

  function onTouchMove(state, clientX, clientY) {
    if (state.touchTimeout) clearTimeout(state.touchTimeout);
    onPointerMove(state, clientX, clientY);
    state.touchTimeout = setTimeout(function () {
      resetSurface(state);
    }, TOUCH_FADE_MS);
  }

  function scheduleUpdate(state) {
    if (state.needsUpdate) return;

    state.needsUpdate = true;
    state.rafId = window.requestAnimationFrame(function () {
      updateSurface(state);
    });
  }

  function updateSurface(state) {
    var currentCol = Math.floor(state.cursorX / state.cellSize);
    var currentRow = Math.floor(state.cursorY / state.cellSize);
    var maxRing = RING_SATURATION.length - 1;
    var nextActive = new Set();

    state.needsUpdate = false;
    state.rafId = null;

    if (currentCol < 0 || currentRow < 0 || currentCol >= state.cols || currentRow >= state.rows) {
      resetSurface(state);
      return;
    }

    for (var row = Math.max(0, currentRow - maxRing); row <= Math.min(state.rows - 1, currentRow + maxRing); row += 1) {
      for (var col = Math.max(0, currentCol - maxRing); col <= Math.min(state.cols - 1, currentCol + maxRing); col += 1) {
        var ring = Math.max(Math.abs(col - currentCol), Math.abs(row - currentRow));
        if (ring > maxRing) continue;

        var index = row * state.cols + col;
        nextActive.add(index);
        state.cells[index].style.filter = 'saturate(' + RING_SATURATION[ring] + ')';
      }
    }

    state.active.forEach(function (index) {
      if (!nextActive.has(index)) {
        state.cells[index].style.filter = '';
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
    state.cursorX = -9999;
    state.cursorY = -9999;

    state.active.forEach(function (index) {
      state.cells[index].style.filter = '';
    });

    state.active.clear();
  }

  function mixHex(a, b, amount) {
    var colorA = hexToRgb(a);
    var colorB = hexToRgb(b);
    var r = Math.round(colorA.r + ((colorB.r - colorA.r) * amount));
    var g = Math.round(colorA.g + ((colorB.g - colorA.g) * amount));
    var bl = Math.round(colorA.b + ((colorB.b - colorA.b) * amount));
    return 'rgb(' + r + ', ' + g + ', ' + bl + ')';
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
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
