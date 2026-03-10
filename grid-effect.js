(function () {
  'use strict';

  var DEFAULT_CELL_SIZE = 24;
  var DEFAULT_MOBILE_CELL_SIZE = 18;
  var TOUCH_FADE_MS = 600;
  var RING_BLEND = [0.58, 0.3, 0.12];
  var DEFAULT_HIGHLIGHT = '#f8e8dc';
  var SAMPLE_PATTERNS = {
    card1: [
      ['#c07071', '#a94144', '#a44044', '#a5484d', '#ad5c5d', '#bb7b76', '#c99485', '#cd947f', '#c77e6a', '#c06455', '#bb5247'],
      ['#c9736d', '#b54844', '#ad4646', '#a8494d', '#ab5558', '#b66f6c', '#c48c82', '#cd9a88', '#cc907c', '#c77d6a', '#c26e5d'],
      ['#d57a6c', '#c75a4c', '#c05b52', '#b65855', '#b25e5f', '#b77170', '#c58d87', '#cea194', '#d0a38f', '#cf9b86', '#cf9681'],
      ['#da7e67', '#cf5c45', '#ca5e4d', '#bc5851', '#b2595a', '#b46869', '#be817e', '#c99b91', '#d1ad9d', '#d7b7a4', '#e4cbb9'],
      ['#e7a892', '#df8d76', '#db8b7a', '#d28980', '#ca8a87', '#ca9291', '#d0a5a1', '#d9bab2', '#e1ccbf', '#eadbcc', '#f8f2e5']
    ],
    card2: [
      ['#efd6c8', '#e1b19c', '#dda58f', '#d59785', '#ca8173', '#c5766a', '#ca8273', '#d59684', '#dca48e', '#e0ad97', '#e9c8b6'],
      ['#ecd2c5', '#dba797', '#d39280', '#cb7f71', '#c36f65', '#be645c', '#c16960', '#c8796b', '#d08a78', '#d79d8b', '#e6c2b3'],
      ['#eacdc1', '#d79f92', '#cc8377', '#c56f66', '#c56a62', '#c4635a', '#c05b53', '#bd5c53', '#c26d62', '#cd897c', '#e2bbae'],
      ['#e7c4b7', '#d29488', '#c6776e', '#c2625a', '#cb6053', '#cf5d4c', '#c95447', '#bd5148', '#bd6059', '#cd8b80', '#ecd1c5'],
      ['#edd1c6', '#ddafa5', '#d79d95', '#d68e85', '#e08b7b', '#e58a77', '#de8778', '#d4877e', '#d3938b', '#e4beb5', '#faf2e7']
    ],
    card3: [
      ['#e0847b', '#d16159', '#d06d65', '#d7877a', '#e1a694', '#eabfae', '#ecc9b9', '#e8bbaa', '#e0a191', '#d7867a', '#d1726a'],
      ['#e97968', '#d64f40', '#cc584f', '#ce6e65', '#d78c7e', '#e2aa99', '#e7b7a6', '#e1a595', '#d6887b', '#cd6c63', '#cb574f'],
      ['#ee7d69', '#dd5744', '#cf5950', '#cc6a63', '#d5877b', '#e1a594', '#e7b4a1', '#dfa191', '#d38378', '#cb645d', '#ca4e46'],
      ['#e67f71', '#da6154', '#d26960', '#d37d73', '#dd9b8d', '#e6b3a3', '#ebc1b0', '#e5b1a0', '#db9789', '#d1756b', '#d36d64'],
      ['#de867d', '#d1625a', '#d17269', '#da8f81', '#e4ac9b', '#eac2b1', '#edcaba', '#e9bead', '#e2a796', '#df9e91', '#eec9bf']
    ],
    card4: [
      ['#e69b8e', '#d85a47', '#d75844', '#d05f4f', '#ca6d60', '#cd8070', '#d8957e', '#e0a789', '#e3b398', '#e4c1ad', '#ebd7ca'],
      ['#e19c90', '#cd5748', '#cd5747', '#cc6655', '#cf7c67', '#d58d74', '#db9a7d', '#dfa083', '#e0a88c', '#e1b59e', '#e9ccbb'],
      ['#e2b2a7', '#ce7b6d', '#cf7a69', '#d48973', '#da987d', '#dc9c7f', '#d9987e', '#d8957e', '#d99982', '#da9e87', '#e3b8a4'],
      ['#eacec1', '#deae9c', '#dda691', '#dfa68c', '#dea387', '#d89780', '#d08576', '#cc796c', '#ce796a', '#d07e6e', '#e0ab9c'],
      ['#efddd1', '#e5c4b3', '#e4b9a3', '#e3b094', '#dca188', '#d18a79', '#c66e65', '#c55f56', '#cc6154', '#da8b7f', '#f3dbd0']
    ]
  };

  var surfaces = [];
  var cleanupFns = [];

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
      touchTimeout: null
    };

    buildSurface(state);
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
    state.baseRgb = [];
    state.baseCss = [];

    node.style.gridTemplateColumns = 'repeat(' + cols + ', minmax(0, 1fr))';
    node.style.gridTemplateRows = 'repeat(' + rows + ', minmax(0, 1fr))';
    node.innerHTML = '';

    for (var row = 0; row < rows; row += 1) {
      for (var col = 0; col < cols; col += 1) {
        var rgb = getBaseColor(node, col, row, cols, rows);
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
  }

  function getCellSize(node) {
    var desktop = parseInt(node.dataset.cellSize || DEFAULT_CELL_SIZE, 10);
    var mobile = parseInt(node.dataset.cellSizeMobile || DEFAULT_MOBILE_CELL_SIZE, 10);
    return window.innerWidth <= 768 ? mobile : desktop;
  }

  function getBaseColor(node, col, row, cols, rows) {
    if (node.dataset.pattern && SAMPLE_PATTERNS[node.dataset.pattern]) {
      return getPatternColor(SAMPLE_PATTERNS[node.dataset.pattern], col, row, cols, rows);
    }

    return hexToRgb(node.dataset.baseColor || '#E8753A');
  }

  function getPatternColor(pattern, col, row, cols, rows) {
    var patternRows = pattern.length;
    var patternCols = pattern[0].length;
    var patternCol = cols <= 1 ? 0 : Math.round((patternCols - 1) * (col / (cols - 1)));
    var patternRow = rows <= 1 ? 0 : Math.round((patternRows - 1) * (row / (rows - 1)));
    return hexToRgb(pattern[patternRow][patternCol]);
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
