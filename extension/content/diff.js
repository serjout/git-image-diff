"use strict";

(() => {
  const MAX_YIQ_DELTA = 35215;
  const CHECKER_SIZE = 8;

  const luma = (r, g, b) => r * 0.29889531 + g * 0.58662247 + b * 0.11448223;
  const chromaI = (r, g, b) =>
    r * 0.59597799 - g * 0.2741761 - b * 0.32180189;
  const chromaQ = (r, g, b) =>
    r * 0.21147017 - g * 0.52261711 + b * 0.31114694;

  const hexToRgb = (hex) => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];

  const samePixel = (a, i, b, j) =>
    a[i] === b[j] &&
    a[i + 1] === b[j + 1] &&
    a[i + 2] === b[j + 2] &&
    a[i + 3] === b[j + 3];

  const rgbOverWhite = (data, i) => {
    const alpha = data[i + 3];
    const blend = (c) => 255 + ((c - 255) * alpha) / 255;
    return [blend(data[i]), blend(data[i + 1]), blend(data[i + 2])];
  };

  const colorDelta = (a, i, b, j, lumaOnly = false) => {
    if (samePixel(a, i, b, j)) return 0;
    const [r1, g1, b1] = rgbOverWhite(a, i);
    const [r2, g2, b2] = rgbOverWhite(b, j);
    const dy = luma(r1, g1, b1) - luma(r2, g2, b2);
    if (lumaOnly) return dy;
    const di = chromaI(r1, g1, b1) - chromaI(r2, g2, b2);
    const dq = chromaQ(r1, g1, b1) - chromaQ(r2, g2, b2);
    const delta = 0.5053 * dy * dy + 0.299 * di * di + 0.1957 * dq * dq;
    return dy > 0 ? -delta : delta;
  };

  const forEachNeighbor = (x, y, width, height, callback) => {
    for (let ny = Math.max(y - 1, 0); ny <= Math.min(y + 1, height - 1); ny++) {
      for (let nx = Math.max(x - 1, 0); nx <= Math.min(x + 1, width - 1); nx++) {
        if ((nx !== x || ny !== y) && callback(nx, ny) === false) return;
      }
    }
  };

  const isFlatArea = (data, x, y, width, height) => {
    const i = (y * width + x) * 4;
    let same = 0;
    forEachNeighbor(x, y, width, height, (nx, ny) => {
      if (samePixel(data, i, data, (ny * width + nx) * 4)) same++;
      return same < 3;
    });
    return same >= 3;
  };

  const isAntiAliased = (a, b, x, y, width, height) => {
    const i = (y * width + x) * 4;
    const onEdge = x === 0 || y === 0 || x === width - 1 || y === height - 1;
    let equalNeighbors = onEdge ? 1 : 0;
    let darkest = { delta: 0 };
    let brightest = { delta: 0 };

    forEachNeighbor(x, y, width, height, (nx, ny) => {
      const delta = colorDelta(a, i, a, (ny * width + nx) * 4, true);
      if (delta === 0) equalNeighbors++;
      else if (delta < darkest.delta) darkest = { delta, x: nx, y: ny };
      else if (delta > brightest.delta) brightest = { delta, x: nx, y: ny };
      return equalNeighbors <= 2;
    });

    if (equalNeighbors > 2 || darkest.delta === 0 || brightest.delta === 0) {
      return false;
    }

    const flatInBoth = ({ x, y }) =>
      isFlatArea(a, x, y, width, height) && isFlatArea(b, x, y, width, height);
    return flatInBoth(darkest) || flatInBoth(brightest);
  };

  const paint = (out, i, [r, g, b]) => {
    out[i] = r;
    out[i + 1] = g;
    out[i + 2] = b;
    out[i + 3] = 255;
  };

  const paintBackground = (out, src, i, x, y, alpha, checkerboard) => {
    const isDarkSquare =
      (Math.floor(x / CHECKER_SIZE) + Math.floor(y / CHECKER_SIZE)) % 2 === 1;
    const base = checkerboard && isDarkSquare ? 204 : 255;
    const blend = (c) => base + ((c - base) * src[i + 3]) / 255;
    const gray = luma(blend(src[i]), blend(src[i + 1]), blend(src[i + 2]));
    const value = base + (gray - base) * alpha;
    paint(out, i, [value, value, value]);
  };

  const diffPixels = (a, b, out, width, height, settings) => {
    const { threshold, includeAA, alpha, diffMask, checkerboard } = settings;
    const aaColor = hexToRgb(settings.aaColor);
    const diffColor = hexToRgb(settings.diffColor);
    const diffColorAlt = hexToRgb(settings.diffColorAlt);
    const maxDelta = MAX_YIQ_DELTA * threshold * threshold;
    let mismatched = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = (y * width + x) * 4;
        const delta = colorDelta(a, i, b, i);

        if (Math.abs(delta) <= maxDelta) {
          if (!diffMask) paintBackground(out, a, i, x, y, alpha, checkerboard);
        } else if (
          !includeAA &&
          (isAntiAliased(a, b, x, y, width, height) ||
            isAntiAliased(b, a, x, y, width, height))
        ) {
          if (!diffMask) paint(out, i, aaColor);
        } else {
          paint(out, i, delta < 0 ? diffColorAlt : diffColor);
          mismatched++;
        }
      }
    }

    return mismatched;
  };

  globalThis.gid = { ...globalThis.gid, diffPixels };
})();
