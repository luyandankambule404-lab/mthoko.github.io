/**
 * Currency converter and language (client dashboard)
 */
const KmmFeatures = (function () {
  const RATES = { ZAR: 1, USD: 0.054, EUR: 0.05, GBP: 0.043, BWP: 0.73, NGN: 82 };

  const SYMBOLS = { ZAR: "R", USD: "$", EUR: "€", GBP: "£", BWP: "P", NGN: "₦" };

  function convertCurrency(amountZar, to) {
    const rate = RATES[to] || 1;
    const converted = amountZar * rate;
    const sym = SYMBOLS[to] || to;
    if (to === "ZAR") return `${sym}${amountZar.toLocaleString("en-ZA", { minimumFractionDigits: 2 })}`;
    if (to === "NGN") return `${sym}${Math.round(converted).toLocaleString()}`;
    return `${sym}${converted.toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function updateCurrencyResult() {
    const amount = parseFloat(document.getElementById("currencyAmount")?.value) || 0;
    const to = document.getElementById("currencyTo")?.value || "USD";
    const out = document.getElementById("currencyResult");
    if (out) {
      out.textContent = `${amount} ZAR = ${convertCurrency(amount, to)}`;
    }
  }

  function initCurrency() {
    ["currencyAmount", "currencyTo"].forEach((id) => {
      document.getElementById(id)?.addEventListener("input", updateCurrencyResult);
      document.getElementById(id)?.addEventListener("change", updateCurrencyResult);
    });
    updateCurrencyResult();
  }

  function initLanguage() {
    const sel = document.getElementById("langSelect");
    if (!sel) return;
    sel.value = KmmI18n.getLang();
    sel.addEventListener("change", () => {
      KmmI18n.setLang(sel.value);
      const root = document.getElementById("dashboardApp");
      KmmI18n.apply(root || document);
      updateCurrencyResult();
    });
  }

  function initDashboard() {
    initLanguage();
    initCurrency();
    if (typeof KmmI18n !== "undefined") {
      KmmI18n.apply(document.getElementById("authScreen") || document);
      KmmI18n.apply(document.getElementById("dashboardApp") || document);
    }
  }

  function init() {
    window.addEventListener("kmm-lang-change", () => {
      if (typeof KmmI18n === "undefined") return;
      const dash = document.getElementById("dashboardApp");
      if (dash) KmmI18n.apply(dash);
      KmmI18n.apply(document.getElementById("authScreen") || document);
      window.dispatchEvent(new CustomEvent("kmm-dash-lang"));
    });

    if (document.getElementById("dashboardApp")) {
      initDashboard();
    } else if (typeof KmmI18n !== "undefined") {
      KmmI18n.apply();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  return {
    convertCurrency,
    initDashboard,
    initLanguage,
    initCurrency,
    updateCurrencyResult,
  };
})();
