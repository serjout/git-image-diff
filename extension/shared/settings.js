"use strict";

(() => {
  const ext = globalThis.browser ?? globalThis.chrome;

  const algoNames = ["difference", "overlay"];

  const defaultSettings = {
    diffSettings: {
      threshold: 0.1,
      includeAA: true,
      alpha: 0,
      aaColor: "#ffff00",
      diffColor: "#ff0000",
      diffColorAlt: "#ff0000",
      diffMask: false,
      checkerboard: false,
    },
    defaultAlgo: "",
    zoomSettings: {
      zoomIncreasePerc: 200,
      enableZoom: true,
    },
  };

  const getSettings = async () => {
    const stored = await ext.storage.local.get(defaultSettings);
    return {
      ...stored,
      diffSettings: { ...defaultSettings.diffSettings, ...stored.diffSettings },
      zoomSettings: { ...defaultSettings.zoomSettings, ...stored.zoomSettings },
    };
  };

  const saveSettings = (settings) => ext.storage.local.set(settings);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  globalThis.gid = {
    ...globalThis.gid,
    ext,
    algoNames,
    defaultSettings,
    getSettings,
    saveSettings,
    capitalize,
  };
})();
