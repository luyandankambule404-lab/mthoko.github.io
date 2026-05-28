/**
 * KMM Lifestyle — multi-language (EN, ZU, AF, FR)
 */
const KmmI18n = (function () {
  const LANG_KEY = "kmm_lang";

  const strings = {
    en: {
      "nav.home": "Home",
      "nav.about": "About",
      "nav.rooms": "Rooms",
      "nav.gallery": "Gallery",
      "nav.properties": "Properties",
      "nav.tours": "Tours",
      "nav.events": "Events",
      "nav.reviews": "Reviews",
      "nav.subscribe": "Subscribe",
      "nav.contact": "Contact",
      "btn.account": "My Account",
      "btn.admin": "Admin",
      "btn.book": "Book Now",
      "toolbar.lang": "Language",
      "toolbar.currency": "Currency",
      "currency.title": "Currency Converter",
      "currency.amount": "Amount in ZAR",
      "currency.convert": "Convert",
      "chat.title": "Live Chat",
      "chat.placeholder": "Type a message...",
      "chat.send": "Send",
      "chat.online": "Support is online",
      "chat.welcome": "Hi! How can we help you today?",
      "notify.enable": "Enable alerts",
      "notify.enabled": "Alerts on",
      "loyalty.title": "Loyalty Rewards",
      "loyalty.points": "Points",
      "loyalty.tier": "Tier",
      "social.continue": "Continue with",
      "dash.bookings": "My Bookings",
      "dash.favorites": "Saved Favorites",
      "dash.profile": "Profile",
      "dash.invoices": "Invoices",
      "dash.subscribe": "Newsletter",
      "dash.subscribe.lead": "Get exclusive deals, property updates, and tour offers by email.",
      "dash.loyalty": "Loyalty Rewards",
      "dash.language": "Language",
      "dash.currency": "Currency",
      "dash.notifications": "Notifications",
      "dash.support": "Support",
      "dash.lang.lead": "Choose your preferred language for the dashboard and website.",
      "dash.notify.lead": "Get alerts when bookings are confirmed and for special offers.",
      "dash.notify.enable": "Enable push notifications",
      "dash.notify.status.on": "Notifications are enabled",
      "dash.notify.status.off": "Notifications are disabled",
    },
    zu: {
      "nav.home": "Ikhaya",
      "nav.about": "Mayelana",
      "nav.rooms": "Amakamelo",
      "nav.gallery": "Igalari",
      "nav.properties": "Izindawo",
      "nav.tours": "Izivakashi",
      "nav.events": "Imicimbi",
      "nav.reviews": "Ukubuyekeza",
      "nav.subscribe": "Bhalisa",
      "nav.contact": "Xhumana",
      "btn.account": "I-akhawunti yami",
      "btn.admin": "Admin",
      "btn.book": "Bhukha Manje",
      "toolbar.lang": "Ulimi",
      "toolbar.currency": "Imali",
      "currency.title": "Isiguquli Semali",
      "currency.amount": "Inani nge-ZAR",
      "currency.convert": "Guqula",
      "chat.title": "Ingxoxo Ebukhoma",
      "chat.placeholder": "Bhala umlayezo...",
      "chat.send": "Thumela",
      "chat.online": "Usekelo luyatholakala",
      "chat.welcome": "Sawubona! Singakusiza kanjani namhlanje?",
      "notify.enable": "Vula izaziso",
      "notify.enabled": "Izaziso zivuliwe",
      "loyalty.title": "Imivuzo Yokwethembeka",
      "loyalty.points": "Amaphuzu",
      "loyalty.tier": "Izinga",
      "social.continue": "Qhubeka nge",
      "dash.bookings": "Amabhukhi Ami",
      "dash.favorites": "Okuthandwayo",
      "dash.profile": "Iphrofayili",
      "dash.invoices": "Ama-invoyisi",
      "dash.subscribe": "Incwadi yezindaba",
      "dash.subscribe.lead": "Thola iziphakamiso ezikhethekile, izibuyekezo zezindawo, neziphakamiso zezivakashi nge-imeyili.",
      "dash.loyalty": "Imivuzo Yokwethembeka",
      "dash.language": "Ulimi",
      "dash.currency": "Imali",
      "dash.notifications": "Izaziso",
      "dash.support": "Ingxoxo / Usekelo",
      "dash.lang.lead": "Khetha ulimi oluthandayo kwidashboard nakuwebhusayithi.",
      "dash.notify.lead": "Thola izaziso uma amabhukhi eqinisekisiwe neziphakamiso ezikhethekile.",
      "dash.notify.enable": "Vula izaziso zokusunduza",
      "dash.notify.status.on": "Izaziso zivuliwe",
      "dash.notify.status.off": "Izaziso zivaliwe",
    },
    af: {
      "nav.home": "Tuis",
      "nav.about": "Oor Ons",
      "nav.rooms": "Kamers",
      "nav.gallery": "Galery",
      "nav.properties": "Eiendomme",
      "nav.tours": "Toere",
      "nav.events": "Gebeurtenisse",
      "nav.reviews": "Resensies",
      "nav.subscribe": "Teken In",
      "nav.contact": "Kontak",
      "btn.account": "My Rekening",
      "btn.admin": "Admin",
      "btn.book": "Bespreek Nou",
      "toolbar.lang": "Taal",
      "toolbar.currency": "Geld",
      "currency.title": "Geldomsetter",
      "currency.amount": "Bedrag in ZAR",
      "currency.convert": "Omskakel",
      "chat.title": "Lewendige Klets",
      "chat.placeholder": "Tik 'n boodskap...",
      "chat.send": "Stuur",
      "chat.online": "Ondersteuning is aanlyn",
      "chat.welcome": "Hallo! Hoe kan ons u vandag help?",
      "notify.enable": "Aktiveer kennisgewings",
      "notify.enabled": "Kennisgewings aan",
      "loyalty.title": "Lojaliteitsbelonings",
      "loyalty.points": "Punte",
      "loyalty.tier": "Vlak",
      "social.continue": "Gaan voort met",
      "dash.bookings": "My Besprekings",
      "dash.favorites": "Gunstelinge",
      "dash.profile": "Profiel",
      "dash.invoices": "Fakture",
      "dash.subscribe": "Nuusbrief",
      "dash.subscribe.lead": "Kry eksklusiewe aanbiedings, eiendom-opdaterings en toerpakkette per e-pos.",
      "dash.loyalty": "Lojaliteitsbelonings",
      "dash.language": "Taal",
      "dash.currency": "Geld",
      "dash.notifications": "Kennisgewings",
      "dash.support": "Klets / Ondersteuning",
      "dash.lang.lead": "Kies u voorkeurtaal vir die dashboard en webwerf.",
      "dash.notify.lead": "Kry kennisgewings wanneer besprekings bevestig word en vir spesiale aanbiedinge.",
      "dash.notify.enable": "Aktiveer stootkennisgewings",
      "dash.notify.status.on": "Kennisgewings is aan",
      "dash.notify.status.off": "Kennisgewings is af",
    },
    fr: {
      "nav.home": "Accueil",
      "nav.about": "À propos",
      "nav.rooms": "Chambres",
      "nav.gallery": "Galerie",
      "nav.properties": "Propriétés",
      "nav.tours": "Circuits",
      "nav.events": "Événements",
      "nav.reviews": "Avis",
      "nav.subscribe": "S'abonner",
      "nav.contact": "Contact",
      "btn.account": "Mon compte",
      "btn.admin": "Admin",
      "btn.book": "Réserver",
      "toolbar.lang": "Langue",
      "toolbar.currency": "Devise",
      "currency.title": "Convertisseur",
      "currency.amount": "Montant en ZAR",
      "currency.convert": "Convertir",
      "chat.title": "Chat en direct",
      "chat.placeholder": "Écrivez un message...",
      "chat.send": "Envoyer",
      "chat.online": "Support en ligne",
      "chat.welcome": "Bonjour! Comment pouvons-nous vous aider?",
      "notify.enable": "Activer alertes",
      "notify.enabled": "Alertes activées",
      "loyalty.title": "Récompenses fidélité",
      "loyalty.points": "Points",
      "loyalty.tier": "Niveau",
      "social.continue": "Continuer avec",
      "dash.bookings": "Mes réservations",
      "dash.favorites": "Favoris",
      "dash.profile": "Profil",
      "dash.invoices": "Factures",
      "dash.subscribe": "Newsletter",
      "dash.subscribe.lead": "Recevez des offres exclusives, des mises à jour et des forfaits par e-mail.",
      "dash.loyalty": "Récompenses fidélité",
      "dash.language": "Langue",
      "dash.currency": "Devise",
      "dash.notifications": "Notifications",
      "dash.support": "Support",
      "dash.lang.lead": "Choisissez votre langue pour le tableau de bord et le site.",
      "dash.notify.lead": "Recevez des alertes pour les réservations et les offres spéciales.",
      "dash.notify.enable": "Activer les notifications",
      "dash.notify.status.on": "Notifications activées",
      "dash.notify.status.off": "Notifications désactivées",
    },
  };

  function getLang() {
    return localStorage.getItem(LANG_KEY) || "en";
  }

  function setLang(code) {
    localStorage.setItem(LANG_KEY, code);
    document.documentElement.lang = code;
    window.dispatchEvent(new CustomEvent("kmm-lang-change", { detail: code }));
  }

  function t(key) {
    const lang = getLang();
    return strings[lang]?.[key] || strings.en[key] || key;
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const val = t(key);
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        if (el.hasAttribute("placeholder")) el.placeholder = val;
      } else {
        el.textContent = val;
      }
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
  }

  return { strings, getLang, setLang, t, apply };
})();
