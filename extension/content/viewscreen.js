"use strict";

(() => {
  const { ext, algoNames, capitalize, diffPixels, getSettings } =
    globalThis.gid;

  const MIN_SIZE = 100;
  const MAX_WIDTH = 1200;
  const MAX_HEIGHT = 885;
  const EXTRA_FRAME_HEIGHT = 120;
  const LENS_RADIUS = 180;

  const mainElement = document.querySelector('div[data-type="diff"]');
  const fieldset = mainElement?.querySelector("fieldset");
  if (!fieldset) return;

  const reportFrameHeight = (height) => {
    window.parent.postMessage(
      {
        type: "render",
        body: "resize",
        payload: { height },
        identity: window.name,
      },
      "https://github.com",
    );
  };

  const getDisplaySize = ({ width, height }) => {
    const maxScale = Math.min(MAX_WIDTH / width, MAX_HEIGHT / height);
    const minScale = Math.max(MIN_SIZE / width, MIN_SIZE / height);
    let scale = 1;
    if (maxScale < 1) scale = maxScale;
    else if (minScale > 1) scale = minScale;
    return { width: width * scale, height: height * scale };
  };

  const createCanvas = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  };

  const getPixels = (img) => {
    const ctx = createCanvas(img.width, img.height).getContext("2d");
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height).data;
  };

  const renderDifference = (imgA, imgB, diffSettings) => {
    const { width, height } = imgA;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    const diff = ctx.createImageData(width, height);
    const mismatchedPixels = diffPixels(
      getPixels(imgA),
      getPixels(imgB),
      diff.data,
      width,
      height,
      diffSettings,
    );
    ctx.putImageData(diff, 0, 0);
    return { canvas, mismatchedPixels };
  };

  const renderOverlay = (imgA, imgB, diffSettings) => {
    const difference = renderDifference(imgA, imgB, diffSettings);
    const canvas = createCanvas(imgB.width, imgB.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(imgB, 0, 0);
    ctx.globalAlpha = 0.5;
    ctx.drawImage(difference.canvas, 0, 0);
    return { canvas, mismatchedPixels: difference.mismatchedPixels };
  };

  const renderers = { difference: renderDifference, overlay: renderOverlay };

  const loadImage = async (src) => {
    const response = await ext.runtime.sendMessage({
      action: "loadImage",
      src,
    });
    if (!response?.success) {
      throw new Error(`Could not load image: ${response?.error}`);
    }
    const img = new Image();
    img.src = response.dataUrl;
    await img.decode();
    return img;
  };

  let selectedView = null;

  const showView = (viewClass) => {
    for (const view of mainElement.querySelectorAll(":scope > .view")) {
      view.style.display = view.classList.contains(viewClass)
        ? "block"
        : "none";
    }
    for (const input of fieldset.querySelectorAll("input")) {
      input.checked = input.value === viewClass;
      input.parentElement.classList.toggle("selected", input.checked);
    }
  };

  const easePosition = (percent) => {
    const t = (percent - 50) / 50;
    return 50 + 65 * Math.pow(t, 3);
  };

  const addZoom = (frame, image, zoomIncreasePerc) => {
    const lens = document.createElement("div");
    lens.className = "magnifiedImg";
    lens.style.backgroundImage = `url("${image.src}")`;
    lens.style.backgroundSize = `${zoomIncreasePerc}%`;
    frame.classList.add("zoomable");
    frame.appendChild(lens);
    const zoom = zoomIncreasePerc / 100;

    const lensPosition = (offset, imageSize, lensSize) => {
      const overshoot = (lensSize / 2 / (imageSize * zoom)) * 100;
      const percent = (offset / imageSize) * 100;
      return easePosition(percent * ((100 + overshoot * 2) / 100) - overshoot);
    };

    frame.addEventListener("mousemove", (e) => {
      const x = e.pageX - frame.offsetLeft;
      const y = e.pageY - frame.offsetTop;
      lens.style.backgroundPositionX = `${lensPosition(
        x,
        image.offsetWidth,
        lens.offsetWidth,
      )}%`;
      lens.style.backgroundPositionY = `${lensPosition(
        y,
        image.offsetHeight,
        lens.offsetHeight,
      )}%`;
      lens.style.left = `${x - LENS_RADIUS}px`;
      lens.style.top = `${y - LENS_RADIUS}px`;
    });
  };

  const addView = (algoName, { canvas, mismatchedPixels }, zoomSettings) => {
    const viewClass = `${algoName}-skin`;
    const size = getDisplaySize(canvas);

    const view = document.createElement("div");
    view.className = `${viewClass} view diffView`;
    view.style.display = "none";
    view.style.setProperty("--diff-width", `${size.width}px`);
    view.style.setProperty("--diff-height", `${size.height}px`);

    const mismatch = document.createElement("div");
    mismatch.className = "pixelMismatchView";
    mismatch.textContent = `Mismatched pixels: ${mismatchedPixels}px`;

    const frame = document.createElement("div");
    frame.className = "diffFrame";
    const img = document.createElement("img");
    img.className = "diffImage";
    img.src = canvas.toDataURL();
    frame.appendChild(img);

    view.append(mismatch, frame);
    mainElement.insertBefore(view, mainElement.lastElementChild);
    if (zoomSettings.enableZoom) {
      addZoom(frame, img, zoomSettings.zoomIncreasePerc);
    }

    const label = document.createElement("label");
    label.className = "js-view-mode-item";
    const input = document.createElement("input");
    input.name = "view-mode";
    input.type = "radio";
    input.value = viewClass;
    label.append(input, capitalize(algoName));
    fieldset.appendChild(label);

    input.addEventListener("click", () => {
      selectedView = viewClass;
      showView(viewClass);
      reportFrameHeight(Math.ceil(size.height + EXTRA_FRAME_HEIGHT));
    });

    return input;
  };

  const keepSelectedView = (ourInputs) => {
    const releaseView = (event) => {
      const input = event.target.closest("label")?.querySelector("input");
      if (input && !ourInputs.includes(input)) selectedView = null;
    };
    fieldset.addEventListener("mousedown", releaseView, true);
    fieldset.addEventListener("click", releaseView, true);

    new MutationObserver(() => {
      if (!selectedView) return;
      const views = mainElement.querySelectorAll(":scope > .view");
      const otherViewShown = [...views].some(
        (view) =>
          !view.classList.contains(selectedView) &&
          view.style.display !== "none",
      );
      if (otherViewShown) showView(selectedView);
    }).observe(mainElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["style"],
    });
  };

  const run = async () => {
    const { file1, file2 } = mainElement.dataset;
    if (!file1 || !file2) return;

    const settings = await getSettings();
    const [imgA, imgB] = await Promise.all([loadImage(file1), loadImage(file2)]);
    if (imgA.width !== imgB.width || imgA.height !== imgB.height) return;

    const inputs = {};
    for (const algoName of algoNames) {
      const rendered = renderers[algoName](imgA, imgB, settings.diffSettings);
      inputs[algoName] = addView(algoName, rendered, settings.zoomSettings);
    }
    keepSelectedView(Object.values(inputs));
    inputs[settings.defaultAlgo]?.click();
  };

  run().catch((error) => console.error("[git-image-diff]", error));
})();
