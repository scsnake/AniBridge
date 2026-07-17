(function initOptions() {
  "use strict";

  const {
    defaultStreamingVisibility,
    defaultVisibility,
    mergedStreamingVisibility,
    mergedVisibility,
    platforms,
    streamingPlatforms
  } = AniBridgePlatforms;
  const status = document.getElementById("status");

  render();
  restoreSaved();

  document.getElementById("save").addEventListener("click", save);
  document.getElementById("restore").addEventListener("click", () => {
    setVisibility(defaultVisibility());
    setStreamingVisibility(defaultStreamingVisibility());
    flash("已恢復預設，請儲存套用");
  });
  for (const button of document.querySelectorAll("[data-toggle]")) {
    button.addEventListener("click", () => toggleCategory(button.dataset.toggle));
  }
  document.querySelector("[data-toggle-streaming]").addEventListener("click", toggleStreaming);

  function render() {
    for (const platform of platforms) {
      document.getElementById(`${platform.category}-platforms`).appendChild(platformCard(platform, "destination"));
    }
    for (const platform of streamingPlatforms) {
      document.getElementById("streaming-platforms").appendChild(platformCard(platform, "streaming"));
    }
  }

  function platformCard(platform, kind) {
    const card = document.createElement("div");
    card.className = "platform";
    const label = document.createElement("label");
    label.className = "platform-main";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = platform.id;
    checkbox.dataset[kind] = "true";
    if (kind === "destination") checkbox.dataset.category = platform.category;
    const content = document.createElement("span");
    const name = document.createElement("strong");
    name.textContent = platform.label;
    const region = document.createElement("span");
    region.className = "region";
    region.textContent = platform.region;
    name.appendChild(region);
    const description = document.createElement("small");
    description.textContent = platform.description;
    content.append(name, description);
    label.append(checkbox, content);

    const visit = document.createElement("a");
    visit.className = "platform-visit";
    visit.href = platform.homepage;
    visit.target = "_blank";
    visit.rel = "noopener noreferrer";
    visit.title = `在新分頁開啟 ${platform.label}`;
    visit.setAttribute("aria-label", `在新分頁開啟 ${platform.label}`);
    visit.textContent = "↗";
    card.append(label, visit);
    return card;
  }

  async function restoreSaved() {
    const { platformVisibility, streamingVisibility } = await chrome.storage.sync.get([
      "platformVisibility",
      "streamingVisibility"
    ]);
    setVisibility(mergedVisibility(platformVisibility));
    setStreamingVisibility(mergedStreamingVisibility(streamingVisibility));
  }

  function setVisibility(visibility) {
    for (const checkbox of document.querySelectorAll('input[type="checkbox"][data-category]')) {
      checkbox.checked = visibility[checkbox.name] !== false;
    }
  }

  function setStreamingVisibility(visibility) {
    for (const checkbox of document.querySelectorAll('input[data-streaming]')) {
      checkbox.checked = visibility[checkbox.name] !== false;
    }
  }

  async function save() {
    const visibility = {};
    for (const checkbox of document.querySelectorAll('input[type="checkbox"][data-category]')) {
      visibility[checkbox.name] = checkbox.checked;
    }
    const streamingVisibility = {};
    for (const checkbox of document.querySelectorAll('input[data-streaming]')) {
      streamingVisibility[checkbox.name] = checkbox.checked;
    }
    await chrome.storage.sync.set({ platformVisibility: visibility, streamingVisibility });
    await chrome.storage.sync.remove("platformOpenInNewTab");
    flash("設定已儲存");
  }

  function toggleCategory(category) {
    const checkboxes = [...document.querySelectorAll(`input[data-category="${category}"]`)];
    const shouldEnable = checkboxes.some((checkbox) => !checkbox.checked);
    for (const checkbox of checkboxes) checkbox.checked = shouldEnable;
  }

  function toggleStreaming() {
    const checkboxes = [...document.querySelectorAll('input[data-streaming]')];
    const shouldEnable = checkboxes.some((checkbox) => !checkbox.checked);
    for (const checkbox of checkboxes) checkbox.checked = shouldEnable;
  }

  function flash(message) {
    status.textContent = message;
    setTimeout(() => {
      if (status.textContent === message) status.textContent = "";
    }, 2200);
  }
})();
