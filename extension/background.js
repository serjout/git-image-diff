"use strict";

const ext = globalThis.browser ?? globalThis.chrome;

const ALLOWED_HOSTS = [
  "raw.githubusercontent.com",
  "media.githubusercontent.com",
];

const isAllowedSource = (src) => {
  try {
    const url = new URL(src);
    return url.protocol === "https:" && ALLOWED_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
};

const blobToDataUrl = (blob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

const loadImage = async (src) => {
  const response = await fetch(src, {
    credentials: "omit",
    referrerPolicy: "no-referrer",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith("image/")) throw new Error("Not an image");
  return blobToDataUrl(blob);
};

ext.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.id !== ext.runtime.id || request?.action !== "loadImage") return;
  if (!isAllowedSource(request.src)) {
    sendResponse({ success: false, error: "Source not allowed" });
    return;
  }
  loadImage(request.src)
    .then((dataUrl) => sendResponse({ success: true, dataUrl }))
    .catch((error) => sendResponse({ success: false, error: String(error) }));
  return true;
});
