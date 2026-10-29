"use strict";

const { algoNames, capitalize, defaultSettings, getSettings, saveSettings } =
  globalThis.gid;

const form = document.querySelector("form");
const field = (id) => document.getElementById(id);

const readField = (element) => {
  if (element.type === "checkbox") return element.checked;
  if (element.type === "number") return Number(element.value);
  return element.value;
};

const writeField = (element, value) => {
  if (element.type === "checkbox") element.checked = value;
  else element.value = value;
};

const readGroup = (group) =>
  Object.fromEntries(
    Object.keys(group).map((key) => [key, readField(field(key))]),
  );

const readForm = () => ({
  diffSettings: readGroup(defaultSettings.diffSettings),
  zoomSettings: readGroup(defaultSettings.zoomSettings),
  defaultAlgo: field("defaultAlgo").value,
});

const fillForm = ({ diffSettings, zoomSettings, defaultAlgo }) => {
  for (const [key, value] of Object.entries({ ...diffSettings, ...zoomSettings })) {
    writeField(field(key), value);
  }
  field("defaultAlgo").value = defaultAlgo;
};

const save = async () => {
  await saveSettings(readForm());
  const button = field("submit");
  button.textContent = "Saved!";
  setTimeout(() => (button.textContent = "Save Settings"), 2000);
};

for (const algoName of algoNames) {
  field("defaultAlgo").add(new Option(capitalize(algoName), algoName));
}

getSettings().then(fillForm);

form.addEventListener("submit", (event) => {
  event.preventDefault();
  save();
});

field("reset").addEventListener("click", () => {
  fillForm(defaultSettings);
  save();
});
