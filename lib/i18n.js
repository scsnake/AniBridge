(function initI18n(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.AniBridgeI18n = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function i18nFactory() {
  "use strict";

  function t(key, substitutions) {
    const api = typeof chrome !== "undefined" ? chrome.i18n : null;
    if (api && typeof api.getMessage === "function") {
      const value = substitutions === undefined
        ? api.getMessage(key)
        : api.getMessage(key, substitutions);
      if (value) return value;
    }
    return key;
  }

  function applyDom(root = typeof document !== "undefined" ? document : null) {
    if (!root) return;
    const attrMap = [
      ["data-i18n", (element, value) => { element.textContent = value; }],
      ["data-i18n-title", (element, value) => element.setAttribute("title", value)],
      ["data-i18n-aria-label", (element, value) => element.setAttribute("aria-label", value)],
      ["data-i18n-placeholder", (element, value) => element.setAttribute("placeholder", value)],
      ["data-i18n-html-lang", (element, value) => element.setAttribute("lang", value)]
    ];
    for (const [attr, apply] of attrMap) {
      for (const element of root.querySelectorAll(`[${attr}]`)) {
        const key = element.getAttribute(attr);
        if (!key) continue;
        apply(element, t(key));
      }
    }
    if (root === document) {
      const titleKey = document.documentElement.getAttribute("data-i18n-title");
      if (titleKey) document.title = t(titleKey);
      const uiLang = t("@@ui_locale");
      if (uiLang && !document.documentElement.getAttribute("lang")) {
        document.documentElement.setAttribute("lang", uiLang.replace("_", "-"));
      }
    }
  }

  return { t, applyDom };
});
