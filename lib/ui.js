(function initUi(root) {
  "use strict";

  const HOST_ID = "anibridge-extension-root";
  const i18n = root.AniBridgeI18n || {
    t(key) { return key; }
  };
  const t = i18n.t;
  const confidenceLabel = (level) => t(
    level === "high" ? "confidenceHigh"
      : level === "medium" ? "confidenceMedium"
      : "confidenceLow"
  );
  let drawerCollapsed = true;

  function createPanel() {
    let host = document.getElementById(HOST_ID);
    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.style.all = "initial";
      document.documentElement.appendChild(host);
    }
    const shadow = host.shadowRoot || host.attachShadow({ mode: "open" });
    if (!shadow.querySelector("style")) {
      const style = document.createElement("style");
      style.textContent = `
        :host { color-scheme: light dark; }
        * { box-sizing: border-box; }
        .panel {
          --ink: #17202a;
          --muted: #64707d;
          --surface: rgba(255, 255, 255, .97);
          --line: #dfe5e8;
          --accent: #087f8c;
          position: fixed;
          z-index: 2147483647;
          right: 20px;
          bottom: 20px;
          width: min(390px, calc(100vw - 28px));
          max-height: min(680px, calc(100vh - 28px));
          overflow: auto;
          padding: 0;
          color: var(--ink);
          background: var(--surface);
          border: 1px solid rgba(18, 48, 55, .14);
          border-radius: 18px;
          box-shadow: 0 18px 55px rgba(9, 35, 41, .24);
          font: 14px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          backdrop-filter: blur(16px);
        }
        .panel.docked { top: 50%; right: 0; bottom: auto; overflow: visible; border-right: 0; border-radius: 18px 0 0 18px; transform: translateY(-50%); transition: transform .22s ease; }
        .panel.docked.collapsed { transform: translate(calc(100% - 7px), -50%); }
        .panel.docked .body { max-height: min(590px, calc(100vh - 110px)); overflow: auto; }
        .dock-toggle { display: none; }
        .panel.docked .dock-toggle { position: absolute; top: 50%; left: -42px; display: grid; place-items: center; width: 42px; min-height: 108px; padding: 9px 8px; color: white; background: linear-gradient(180deg, #087f8c, #075b65); border: 0; border-radius: 12px 0 0 12px; box-shadow: -7px 8px 20px rgba(9, 35, 41, .2); cursor: pointer; transform: translateY(-50%); writing-mode: vertical-rl; font: 700 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; letter-spacing: .08em; }
        .panel.docked .dock-toggle:hover, .panel.docked .dock-toggle:focus-visible { background: linear-gradient(180deg, #0a97a5, #08717b); outline: 2px solid white; outline-offset: -3px; }
        .head { display: flex; align-items: center; gap: 10px; padding: 16px 16px 13px; border-bottom: 1px solid var(--line); }
        .mark { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 auto; color: white; background: linear-gradient(140deg, #075b65, #10a2ae); border-radius: 11px; font-weight: 800; }
        .brand { min-width: 0; flex: 1; }
        .brand strong { display: block; font-size: 15px; letter-spacing: .01em; }
        .brand span { display: block; color: var(--muted); font-size: 12px; }
        .close { border: 0; padding: 4px 7px; color: var(--muted); background: transparent; cursor: pointer; font-size: 20px; line-height: 1; }
        .body { padding: 15px 16px 17px; }
        .source { margin: 0 0 13px; font-weight: 750; font-size: 16px; line-height: 1.35; }
        .status { display: inline-flex; align-items: center; gap: 5px; margin-bottom: 12px; padding: 4px 8px; border-radius: 99px; background: #e7f5f4; color: #07636b; font-size: 11px; font-weight: 700; }
        .status::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
        .status.medium { color: #8a5700; background: #fff3d8; }
        .status.low { color: #a13737; background: #ffe8e8; }
        .translations { display: grid; gap: 8px; margin: 0 0 14px; padding: 12px; background: rgba(235, 241, 242, .68); border-radius: 12px; }
        .translation { display: grid; grid-template-columns: 50px 1fr 18px; gap: 8px; width: 100%; padding: 3px 4px; color: inherit; text-align: left; background: transparent; border: 0; border-radius: 7px; cursor: copy; font: inherit; }
        .translation:hover, .translation:focus-visible { background: rgba(8, 127, 140, .1); outline: none; }
        .translation-label { color: var(--muted); font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .translation-value { overflow-wrap: anywhere; }
        .copy-icon { color: var(--muted); opacity: .7; }
        .translation.copied .translation-label { color: var(--accent); }
        .link-group + .link-group { margin-top: 13px; }
        .link-heading { margin: 0 0 7px; color: var(--muted); font-size: 11px; font-weight: 750; letter-spacing: .04em; text-transform: uppercase; }
        .links { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .link { display: flex; justify-content: space-between; gap: 8px; padding: 9px 10px; color: var(--ink); text-decoration: none; background: white; border: 1px solid var(--line); border-radius: 10px; font-weight: 700; }
        .link:hover { border-color: var(--accent); color: var(--accent); }
        .link small { color: var(--muted); font-size: 10px; font-weight: 500; }
        .ratings { display: grid; gap: 8px; margin: 0 0 14px; }
        .rating { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; padding: 10px 11px; color: var(--ink); background: rgba(235, 241, 242, .68); border: 1px solid var(--line); border-radius: 10px; text-decoration: none; }
        .rating:hover { border-color: var(--accent); color: var(--accent); }
        .rating-label { font-weight: 750; }
        .rating-score { font-weight: 800; font-variant-numeric: tabular-nums; }
        .rating-meta { grid-column: 1 / -1; color: var(--muted); font-size: 11px; }
        .tools { display: flex; justify-content: flex-end; margin-top: 11px; }
        .text-button { border: 0; padding: 5px; color: var(--accent); background: transparent; cursor: pointer; font: inherit; font-size: 12px; }
        .correction { display: none; gap: 8px; margin-top: 10px; padding-top: 12px; border-top: 1px solid var(--line); }
        .correction.open { display: grid; grid-template-columns: 1fr 82px auto; }
        input { min-width: 0; padding: 8px 9px; border: 1px solid var(--line); border-radius: 8px; background: white; color: var(--ink); font: inherit; }
        button.submit { padding: 8px 10px; border: 0; border-radius: 8px; color: white; background: var(--accent); cursor: pointer; font: inherit; font-weight: 700; }
        .notice { margin: 11px 0 0; color: var(--muted); font-size: 11px; }
        .error { color: #9a3030; }
        .skeleton { height: 12px; margin: 9px 0; border-radius: 6px; background: linear-gradient(90deg, #e9eeee, #f8fafa, #e9eeee); background-size: 200% 100%; animation: pulse 1.2s infinite; }
        .skeleton.short { width: 58%; }
        @keyframes pulse { to { background-position: -200% 0; } }
        @media (prefers-color-scheme: dark) {
          .panel { --ink: #eef5f5; --muted: #9eacad; --surface: rgba(25, 30, 33, .97); --line: #3b474b; }
          .translations { background: rgba(55, 67, 70, .58); }
          .link, .rating, input { background: #222a2d; }
          .skeleton { background: #354044; }
        }
        @media (max-width: 540px) { .panel { right: 14px; bottom: 14px; } }
      `;
      shadow.appendChild(style);
    }
    return shadow;
  }

  function shell(subtitle, options = {}) {
    const shadow = createPanel();
    const oldPanel = shadow.querySelector(".panel");
    if (oldPanel) oldPanel.remove();

    const panel = element("section", "panel");
    if (options.collapsible) {
      panel.classList.add("docked");
      panel.classList.toggle("collapsed", drawerCollapsed);
      const toggle = element("button", "dock-toggle", "AniBridge");
      toggle.type = "button";
      toggle.setAttribute("aria-label", t(drawerCollapsed ? "drawerExpand" : "drawerCollapse"));
      toggle.setAttribute("aria-expanded", String(!drawerCollapsed));
      toggle.addEventListener("click", () => {
        drawerCollapsed = !drawerCollapsed;
        panel.classList.toggle("collapsed", drawerCollapsed);
        toggle.setAttribute("aria-label", t(drawerCollapsed ? "drawerExpand" : "drawerCollapse"));
        toggle.setAttribute("aria-expanded", String(!drawerCollapsed));
      });
      panel.appendChild(toggle);
    }
    const head = element("header", "head");
    const mark = element("div", "mark", "A");
    const brand = element("div", "brand");
    brand.append(element("strong", "", "AniBridge"), element("span", "", subtitle));
    const close = element("button", "close", "×");
    close.type = "button";
    close.setAttribute("aria-label", t("panelClose"));
    close.addEventListener("click", () => panel.remove());
    head.append(mark, brand, close);
    const body = element("div", "body");
    panel.append(head, body);
    shadow.appendChild(panel);
    return body;
  }

  function renderLoading(subtitle, options = {}) {
    if (subtitle === undefined) subtitle = t("loadingCrossSite");
    const body = shell(subtitle, options);
    body.append(
      element("div", "skeleton"),
      element("div", "skeleton short"),
      element("div", "skeleton"),
      element("div", "skeleton")
    );
  }

  function renderError(message, options = {}) {
    const body = shell(t("queryIncomplete"), options);
    body.append(
      element("p", "source", t("queryFailed")),
      element("p", "notice error", message || t("retryHint"))
    );
  }

  function renderAnime(data, options = {}) {
    const body = shell(t(options.databasePage ? "panelMultiTitle" : "panelDatabaseLinks"), options);
    body.appendChild(element("p", "source", data.sourceTitle || data.translations?.zhtw || t("unknownWork")));

    const status = element(
      "span",
      `status ${data.confidence || "low"}`,
      confidenceLabel(data.confidence)
    );
    body.appendChild(status);

    const translations = element("div", "translations");
    addTranslation(translations, t("labelZhTw"), data.translations?.zhtw);
    addTranslation(translations, t("labelJapanese"), data.translations?.japanese);
    addTranslation(translations, t("labelEnglish"), data.translations?.english);
    if (!data.translations?.english) addTranslation(translations, t("labelRomaji"), data.translations?.romaji);
    body.appendChild(translations);

    if (data.officialWebsite?.url) {
      addLinkGroup(body, [{
        label: data.officialWebsite.label || t("officialWebsite"),
        url: data.officialWebsite.url,
        exact: true
      }], t("officialInfoHeading"));
    }

    if (!options.databasePage && data.links?.length) {
      addLinkGroup(body, data.links.filter((item) => item.category !== "ratings"), t("trackingHeading"));
    }
    const ratingLinks = options.databasePage
      ? []
      : (data.links || []).filter((item) => item.category === "ratings");
    if (data.ratings?.length || ratingLinks.length) addRatingGroup(body, data.ratings || [], ratingLinks);
    if (options.databasePage && data.streamingLinks?.length) {
      addLinkGroup(body, data.streamingLinks, t("streamingHeading"));
      body.appendChild(element("p", "notice", t("streamingNotice")));
    }

    if (typeof options.onCorrect === "function") {
      const tools = element("div", "tools");
      if (typeof options.onOptions === "function") {
        const settings = element("button", "text-button", t("openPlatformSettings"));
        settings.type = "button";
        settings.addEventListener("click", options.onOptions);
        tools.appendChild(settings);
      }
      if (typeof options.onAiAssist === "function") {
        const assist = element("button", "text-button", t("tryLocalAi"));
        assist.type = "button";
        assist.addEventListener("click", async () => {
          assist.disabled = true;
          assist.textContent = t("localAiWorking");
          try {
            await options.onAiAssist();
          } catch (_error) {
            assist.disabled = false;
            assist.textContent = t("tryLocalAi");
          }
        });
        tools.appendChild(assist);
      }
      const toggle = element("button", "text-button", t("manualCorrect"));
      toggle.type = "button";
      tools.appendChild(toggle);
      const form = element("form", "correction");
      const titleInput = document.createElement("input");
      titleInput.name = "title";
      titleInput.value = data.sourceTitle || "";
      titleInput.setAttribute("aria-label", t("animeTitle"));
      titleInput.required = true;
      const yearInput = document.createElement("input");
      yearInput.name = "year";
      yearInput.type = "number";
      yearInput.min = "1900";
      yearInput.max = "2100";
      yearInput.placeholder = t("firstAirYearPlaceholder");
      yearInput.value = data.year || "";
      yearInput.setAttribute("aria-label", t("firstAirYearAria"));
      const submit = element("button", "submit", t("research"));
      submit.type = "submit";
      form.append(titleInput, yearInput, submit);
      toggle.addEventListener("click", () => {
        form.classList.toggle("open");
        if (form.classList.contains("open")) titleInput.focus();
      });
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        options.onCorrect({ title: titleInput.value, year: Number(yearInput.value) || null });
      });
      body.append(tools, form);
    }

    if (data.confidence !== "high") {
      body.appendChild(element("p", "notice", t("seasonWarning")));
    }
    if (data.warnings?.length) {
      body.appendChild(element("p", "notice", data.warnings.join(" · ")));
    }
  }

  function addTranslation(container, label, value) {
    if (!value) return;
    const row = element("button", "translation");
    row.type = "button";
    row.title = t("copyTitleTooltip", [label]);
    row.setAttribute("aria-label", t("copyTitleAria", [label, value]));
    const labelNode = element("span", "translation-label", label);
    row.append(labelNode, element("span", "translation-value", value), element("span", "copy-icon", "⧉"));
    row.addEventListener("click", async () => {
      const copied = await copyText(value);
      if (!copied) return;
      const oldLabel = labelNode.textContent;
      labelNode.textContent = t("copied");
      row.classList.add("copied");
      setTimeout(() => {
        labelNode.textContent = oldLabel;
        row.classList.remove("copied");
      }, 1200);
    });
    container.appendChild(row);
  }

  function addLinkGroup(container, items, heading) {
    if (!items.length) return;
    const group = element("section", "link-group");
    group.appendChild(element("h3", "link-heading", heading));
    appendLinkList(group, items);
    container.appendChild(group);
  }

  function appendLinkList(container, items) {
    const links = element("div", "links");
    for (const item of items) {
      const anchor = element("a", "link");
      anchor.href = item.url;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.append(
        document.createTextNode(item.label),
        element("small", "", t(item.exact ? "linkExact" : "linkSearch"))
      );
      links.appendChild(anchor);
    }
    container.appendChild(links);
  }

  function addRatingGroup(container, ratings, destinationLinks = []) {
    const group = element("section", "rating-group");
    group.appendChild(element("h3", "link-heading", t("ratingsHeading")));
    if (ratings.length) {
      const list = element("div", "ratings");
      for (const item of ratings) {
        const rating = item.url ? element("a", "rating") : element("div", "rating");
        if (item.url) {
          rating.href = item.url;
          rating.target = "_blank";
          rating.rel = "noopener noreferrer";
        }
        const score = Number(item.score);
        rating.append(
          element("span", "rating-label", item.label),
          element("strong", "rating-score", `${Number.isFinite(score) ? score : "–"} / ${item.scale || "–"}`)
        );
        const metadata = [item.rank, item.detail].filter(Boolean).join(" · ");
        if (metadata) rating.appendChild(element("span", "rating-meta", metadata));
        list.appendChild(rating);
      }
      group.appendChild(list);
    }
    if (destinationLinks.length) appendLinkList(group, destinationLinks);
    container.appendChild(group);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (_error) {
      const textarea = document.createElement("textarea");
      textarea.value = value;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand("copy");
      textarea.remove();
      return copied;
    }
  }

  function element(tag, className = "", text = "") {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function removePanel() {
    const host = document.getElementById(HOST_ID);
    if (host) {
      host.remove();
    }
    drawerCollapsed = true;
  }

  root.AniBridgeUi = { renderAnime, renderError, renderLoading, removePanel };
})(globalThis);
