/**
 * Past papers for Examinations Council of Eswatini (ECESWA).
 * Download buttons open the official subject page, where question papers,
 * specimen papers, and examiner reports can be downloaded.
 *
 * Optional: add a local PDF under papers/ and set `file` on an item to
 * host that file on this website as well.
 */
const PAST_PAPERS = [
  {
    level: "EGCSE",
    subject: "Mathematics",
    icon: "📐",
    id: 60,
    years: [2024, 2023, 2022, 2020],
    note: "Question papers 1–4 plus specimen papers and examiner reports",
  },
  {
    level: "EGCSE",
    subject: "English Language",
    icon: "📝",
    id: 45,
    years: [2024, 2023, 2022, 2020],
    note: "Question papers, oral assessment, specimen papers, and reports",
  },
  {
    level: "EGCSE",
    subject: "Physical Science",
    icon: "⚗️",
    id: 50,
    years: [2024, 2023, 2022, 2020],
    note: "Physics and Chemistry papers, including additional Paper 3",
  },
  {
    level: "EGCSE",
    subject: "Biology",
    icon: "🧬",
    id: 49,
    years: [2024, 2023, 2022, 2020],
    note: "Question papers 1–4, specimen papers, and examiner reports",
  },
  {
    level: "EGCSE",
    subject: "Geography",
    icon: "🌍",
    id: 51,
    years: [2024, 2023, 2022, 2020],
    note: "Question papers, specimen papers, and examiner reports",
  },
  {
    level: "EGCSE",
    subject: "Business Studies",
    icon: "💼",
    id: 55,
    years: [2024, 2023, 2022, 2020],
    note: "Question papers 1–2 plus specimen papers and reports",
  },
  {
    level: "EGCSE",
    subject: "Economics",
    icon: "📊",
    id: 56,
    years: [2024, 2023, 2022, 2020],
    note: "Question papers 1–2 plus specimen papers and reports",
  },
  {
    level: "EGCSE",
    subject: "History",
    icon: "📜",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose History under EGCSE",
  },
  {
    level: "EGCSE",
    subject: "Accounting",
    icon: "📒",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose Accounting under EGCSE",
  },
  {
    level: "EGCSE",
    subject: "Agriculture",
    icon: "🌱",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose Agriculture under EGCSE",
  },
  {
    level: "EGCSE",
    subject: "ICT",
    icon: "💻",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose ICT under EGCSE",
  },
  {
    level: "EGCSE",
    subject: "siSwati",
    icon: "🗣️",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose siSwati under EGCSE",
  },
  {
    level: "JC",
    subject: "siSwati",
    icon: "🗣️",
    id: 29,
    years: [2024, 2023, 2022, 2021, 2020],
    note: "Question papers 1–3, specimen papers, and examiner reports",
  },
  {
    level: "JC",
    subject: "Science",
    icon: "🔬",
    id: 31,
    years: [2024, 2023, 2022, 2021, 2020],
    note: "Question papers 1–2 plus examiner reports",
  },
  {
    level: "JC",
    subject: "Geography",
    icon: "🗺️",
    id: 37,
    years: [2024, 2023, 2022, 2021, 2020],
    note: "Question papers, specimen papers, and examiner reports",
  },
  {
    level: "JC",
    subject: "Mathematics",
    icon: "➗",
    years: [2024, 2023, 2022, 2021, 2020],
    note: "Open ECESWA and choose Mathematics under JC",
  },
  {
    level: "JC",
    subject: "English Language",
    icon: "📘",
    years: [2024, 2023, 2022, 2021, 2020],
    note: "Open ECESWA and choose English Language under JC",
  },
  {
    level: "JC",
    subject: "History",
    icon: "🏛️",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose History under JC",
  },
  {
    level: "JC",
    subject: "Bookkeeping & Accounting",
    icon: "🧮",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose Bookkeeping under JC",
  },
  {
    level: "JC",
    subject: "Agriculture",
    icon: "🌾",
    years: [2024, 2023, 2022],
    note: "Open ECESWA and choose Agriculture under JC",
  },
];

function eceswaSubjectUrl(item) {
  if (item.id) {
    return `https://www.examscouncil.org.sz/programmes/subject.php?id=${item.id}&programme=${encodeURIComponent(item.level)}`;
  }
  return `https://www.examscouncil.org.sz/programmes/subject.php?programme=${encodeURIComponent(item.level)}`;
}

function renderPapers() {
  const grid = document.getElementById("papers-grid");
  const empty = document.getElementById("papers-empty");
  const countEl = document.getElementById("papers-count");
  if (!grid) return;

  const query = (document.getElementById("papers-search")?.value || "").trim().toLowerCase();
  const level = document.querySelector(".papers-tab.is-active")?.dataset.level || "all";

  const matches = PAST_PAPERS.filter((item) => {
    const levelOk = level === "all" || item.level === level;
    const haystack = `${item.subject} ${item.level} ${item.note || ""}`.toLowerCase();
    const queryOk = !query || haystack.includes(query);
    return levelOk && queryOk;
  });

  if (countEl) {
    countEl.textContent = matches.length
      ? `${matches.length} subject${matches.length === 1 ? "" : "s"}`
      : "No subjects found";
  }

  if (!matches.length) {
    grid.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }

  if (empty) empty.hidden = true;
  grid.innerHTML = matches
    .map(
      (item) => `
    <article class="paper-card">
      <div class="paper-card-top">
        <span class="paper-card-icon" aria-hidden="true">${item.icon}</span>
        <span class="paper-level">${escapeHtml(item.level)}</span>
      </div>
      <h3>${escapeHtml(item.subject)}</h3>
      <p>${escapeHtml(item.note || "Past exam papers from ECESWA")}</p>
      <ul class="paper-years" aria-label="Available years">
        ${(item.years || [])
          .map((year) => `<li>${year}</li>`)
          .join("")}
      </ul>
      <a
        class="btn btn-primary"
        href="${eceswaSubjectUrl(item)}"
        target="_blank"
        rel="noopener noreferrer"
      >Download papers</a>
    </article>
  `
    )
    .join("");
}

function initPapersPage() {
  if (!document.getElementById("papers-grid")) return;

  const params = new URLSearchParams(location.search);
  const query = params.get("q");
  const level = params.get("level");
  const search = document.getElementById("papers-search");
  if (query && search) search.value = query;
  if (level) {
    document.querySelectorAll(".papers-tab").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.level === level);
    });
  }

  search?.addEventListener("input", renderPapers);

  document.querySelectorAll(".papers-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".papers-tab").forEach((btn) => btn.classList.remove("is-active"));
      tab.classList.add("is-active");
      renderPapers();
    });
  });

  renderPapers();
}

document.addEventListener("DOMContentLoaded", initPapersPage);
