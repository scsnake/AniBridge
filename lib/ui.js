(function initUi(root) {
  "use strict";

  const HOST_ID = "anibridge-extension-root";
  const CONFIDENCE_LABELS = {
    high: "高可信",
    medium: "請確認",
    low: "可能不精確"
  };
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
      toggle.setAttribute("aria-label", drawerCollapsed ? "展開 AniBridge" : "收合 AniBridge");
      toggle.setAttribute("aria-expanded", String(!drawerCollapsed));
      toggle.addEventListener("click", () => {
        drawerCollapsed = !drawerCollapsed;
        panel.classList.toggle("collapsed", drawerCollapsed);
        toggle.setAttribute("aria-label", drawerCollapsed ? "展開 AniBridge" : "收合 AniBridge");
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
    close.setAttribute("aria-label", "關閉 AniBridge");
    close.addEventListener("click", () => panel.remove());
    head.append(mark, brand, close);
    const body = element("div", "body");
    panel.append(head, body);
    shadow.appendChild(panel);
    return body;
  }

  function renderLoading(subtitle = "正在比對跨站資料", options = {}) {
    const body = shell(subtitle, options);
    body.append(
      element("div", "skeleton"),
      element("div", "skeleton short"),
      element("div", "skeleton"),
      element("div", "skeleton")
    );
  }

  function renderError(message, options = {}) {
    const body = shell("查詢未完成", options);
    body.append(
      element("p", "source", "無法取得跨站資料"),
      element("p", "notice error", message || "請稍後重新整理頁面再試。")
    );
  }

  function renderAnime(data, options = {}) {
    const body = shell(options.databasePage ? "多語標題" : "動畫資料庫連結", options);
    body.appendChild(element("p", "source", data.sourceTitle || data.translations?.zhtw || "未知作品"));

    const status = element(
      "span",
      `status ${data.confidence || "low"}`,
      CONFIDENCE_LABELS[data.confidence] || CONFIDENCE_LABELS.low
    );
    body.appendChild(status);

    const translations = element("div", "translations");
    addTranslation(translations, "繁中", data.translations?.zhtw);
    addTranslation(translations, "日本語", data.translations?.japanese);
    addTranslation(translations, "English", data.translations?.english);
    if (!data.translations?.english) addTranslation(translations, "Romaji", data.translations?.romaji);
    body.appendChild(translations);

    if (data.officialWebsite?.url) {
      addLinkGroup(body, [{
        label: data.officialWebsite.label || "官方網站",
        url: data.officialWebsite.url,
        exact: true
      }], "作品官方資訊");
    }

    if (!options.databasePage && data.links?.length) {
      addLinkGroup(body, data.links.filter((item) => item.category !== "ratings"), "收藏與追蹤");
    }
    const ratingLinks = options.databasePage
      ? []
      : (data.links || []).filter((item) => item.category === "ratings");
    if (data.ratings?.length || ratingLinks.length) addRatingGroup(body, data.ratings || [], ratingLinks);
    if (options.databasePage && data.streamingLinks?.length) {
      addLinkGroup(body, data.streamingLinks, "串流平台搜尋");
      body.appendChild(element("p", "notice", "搜尋結果僅供確認目前上架狀態；實際內容受帳號、地區與授權期間影響。"));
    }

    if (typeof options.onCorrect === "function") {
      const tools = element("div", "tools");
      if (typeof options.onOptions === "function") {
        const settings = element("button", "text-button", "顯示平台設定");
        settings.type = "button";
        settings.addEventListener("click", options.onOptions);
        tools.appendChild(settings);
      }
      if (typeof options.onAiAssist === "function") {
        const assist = element("button", "text-button", "使用本機 AI 嘗試別名");
        assist.type = "button";
        assist.addEventListener("click", async () => {
          assist.disabled = true;
          assist.textContent = "本機 AI 比對中…";
          try {
            await options.onAiAssist();
          } catch (_error) {
            assist.disabled = false;
            assist.textContent = "使用本機 AI 嘗試別名";
          }
        });
        tools.appendChild(assist);
      }
      const toggle = element("button", "text-button", "不是這部？手動修正");
      toggle.type = "button";
      tools.appendChild(toggle);
      const form = element("form", "correction");
      const titleInput = document.createElement("input");
      titleInput.name = "title";
      titleInput.value = data.sourceTitle || "";
      titleInput.setAttribute("aria-label", "動畫標題");
      titleInput.required = true;
      const yearInput = document.createElement("input");
      yearInput.name = "year";
      yearInput.type = "number";
      yearInput.min = "1900";
      yearInput.max = "2100";
      yearInput.placeholder = "首播年";
      yearInput.value = data.year || "";
      yearInput.setAttribute("aria-label", "首播年份");
      const submit = element("button", "submit", "重搜");
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
      body.appendChild(element("p", "notice", "同系列的季度、OVA 與劇場版可能名稱相近，加入清單前請確認作品年份與類型。"));
    }
    if (data.warnings?.length) {
      body.appendChild(element("p", "notice", data.warnings.join(" · ")));
    }
  }

  function addTranslation(container, label, value) {
    if (!value) return;
    const row = element("button", "translation");
    row.type = "button";
    row.title = `複製${label}標題`;
    row.setAttribute("aria-label", `複製${label}標題：${value}`);
    const labelNode = element("span", "translation-label", label);
    row.append(labelNode, element("span", "translation-value", value), element("span", "copy-icon", "⧉"));
    row.addEventListener("click", async () => {
      const copied = await copyText(value);
      if (!copied) return;
      const oldLabel = labelNode.textContent;
      labelNode.textContent = "已複製";
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
        element("small", "", item.exact ? "作品頁 ↗" : "搜尋 ↗")
      );
      links.appendChild(anchor);
    }
    container.appendChild(links);
  }

  function addRatingGroup(container, ratings, destinationLinks = []) {
    const group = element("section", "rating-group");
    group.appendChild(element("h3", "link-heading", "評分與排行"));
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
