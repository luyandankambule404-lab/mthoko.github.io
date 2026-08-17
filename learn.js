const LEARN_PROGRESS_KEY = "mthokozisi_learn_progress";
const LEARN_NAME_KEY = "mthokozisi_learn_name";

const LEARN_COURSES = [
  {
    id: "revise-well",
    level: "Skills",
    subject: "How to revise",
    icon: "🎯",
    papers: "papers.html",
    summary: "A simple weekly plan so you cover notes, past papers, and weak topics before exam day.",
    lessons: [
      {
        id: "plan",
        title: "Make a 4-week plan",
        minutes: 8,
        body: [
          "Write your exam dates, then work backwards. Give each subject at least three short sessions a week rather than one long cram.",
          "Each session should have one job: notes, practice questions, or marking a past paper. Mixing all three in one sitting usually feels busy but teaches less.",
          "Keep a list of topics you get wrong. Those topics become the next session. Do not only revise what already feels easy.",
        ],
      },
      {
        id: "papers",
        title: "Use past papers properly",
        minutes: 10,
        body: [
          "First attempt a paper in exam time, in silence, with no notes. Then mark it and write the mark next to each question.",
          "For every lost mark, write one sentence: what the question wanted, and what you will do next time. That list is more valuable than rewriting full notes.",
          "A few days later, retry only the questions you missed. When those scores rise, move to a newer year.",
        ],
      },
      {
        id: "exam-day",
        title: "Exam-day habits",
        minutes: 6,
        body: [
          "Read the whole paper once. Start with questions you can score quickly, then return to longer ones.",
          "Show working in Mathematics and Science even if you are unsure of the final answer. Method marks are real marks.",
          "Leave 5–10 minutes to check units, names, and whether you answered the actual command word: explain, calculate, compare, or state.",
        ],
      },
    ],
  },
  {
    id: "jc-maths",
    level: "JC",
    subject: "Mathematics",
    icon: "➗",
    papers: "papers.html?level=JC&q=Mathematics",
    summary: "Number, algebra, graphs, and measurement — with a clear order to practise.",
    lessons: [
      {
        id: "number",
        title: "Number and fractions",
        minutes: 12,
        body: [
          "Be fluent with factors, multiples, percentages, and converting between fractions, decimals, and percentages.",
          "When a word problem mentions 'of', think multiply. When it mentions 'out of' or 'per 100', think percentage.",
          "Check answers with a rough estimate. If 18% of 250 cannot be near 4 or near 400, the place value is wrong.",
        ],
      },
      {
        id: "algebra",
        title: "Algebra basics",
        minutes: 12,
        body: [
          "Collect like terms first, then expand brackets, then solve. Do not skip the tidy-up step.",
          "Whatever you do to one side, do to the other. Write that line every time until it is automatic.",
          "Substitute your answer back into the original equation. If it does not work, the error is in the algebra, not the story.",
        ],
      },
      {
        id: "graphs",
        title: "Graphs and measurement",
        minutes: 10,
        body: [
          "Plot points carefully: x across, y up. Label axes and units so the graph can earn communication marks.",
          "For area and volume, write the formula, substitute, then calculate. Missing units often cost a mark.",
          "Practise converting mm, cm, m, and km before the paper. Measurement questions are usually quick marks.",
        ],
      },
    ],
  },
  {
    id: "jc-english",
    level: "JC",
    subject: "English Language",
    icon: "📘",
    papers: "papers.html?level=JC&q=English",
    summary: "Comprehension, directed writing, and language accuracy for JC English.",
    lessons: [
      {
        id: "comprehension",
        title: "Comprehension",
        minutes: 10,
        body: [
          "Underline the question word first: what, why, how, in your own words. That tells you whether to copy a phrase or rephrase it.",
          "Lift short evidence from the passage, then add your own sentence. Long copied paragraphs rarely score full marks.",
          "If the question says 'in your own words', change both vocabulary and sentence shape, not just one synonym.",
        ],
      },
      {
        id: "writing",
        title: "Directed writing",
        minutes: 12,
        body: [
          "Identify audience, purpose, and format before you write: letter, article, speech, or report each has a different opening.",
          "Plan three clear points. One developed paragraph per point beats a long story that misses the task.",
          "Leave two minutes to fix tense, capital letters, and whether you answered every bullet in the question.",
        ],
      },
    ],
  },
  {
    id: "jc-science",
    level: "JC",
    subject: "Science",
    icon: "🔬",
    papers: "papers.html?level=JC&q=Science",
    summary: "Life, matter, and energy topics with a focus on keywords and experiments.",
    lessons: [
      {
        id: "life",
        title: "Living things",
        minutes: 10,
        body: [
          "Learn life processes with a memory phrase, then be able to give one example for each process in humans and plants.",
          "In food chains, arrows show energy flow, not 'who eats whom' in the opposite direction. Check arrow direction every time.",
          "Label diagrams in pencil first: cell wall, membrane, nucleus, chloroplast are frequent easy marks.",
        ],
      },
      {
        id: "matter",
        title: "Matter and energy",
        minutes: 10,
        body: [
          "Solids, liquids, and gases differ by particle arrangement and movement. Describe both, not only one.",
          "For circuits, current is the flow; voltage is the push. Mixing those words loses physics marks.",
          "Safety and fair tests appear often: name the independent variable, the dependent variable, and one thing you keep the same.",
        ],
      },
    ],
  },
  {
    id: "jc-siswati",
    level: "JC",
    subject: "siSwati",
    icon: "🗣️",
    papers: "papers.html?level=JC&q=siSwati",
    summary: "Reading, language structure, and writing practice for JC siSwati papers.",
    lessons: [
      {
        id: "read",
        title: "Reading and meaning",
        minutes: 10,
        body: [
          "Read the passage twice: first for the story, second for the exact words the questions ask for.",
          "Answer in siSwati unless the paper asks otherwise. Keep sentences short and correct rather than long and mixed.",
          "Build a personal list of idioms and everyday vocabulary from past papers. Recite five items each revision session.",
        ],
      },
      {
        id: "write",
        title: "Language and composition",
        minutes: 10,
        body: [
          "Check noun classes and concords before you submit. Agreement errors are common and expensive.",
          "For composition, plan umngeni, umgogodla, and siphetho so the writing has a beginning, middle, and end.",
          "After writing, read aloud quietly. Your ear often catches a missing word that your eye missed.",
        ],
      },
    ],
  },
  {
    id: "egcse-maths",
    level: "EGCSE",
    subject: "Mathematics",
    icon: "📐",
    papers: "papers.html?level=EGCSE&q=Mathematics",
    summary: "Core EGCSE skills: algebra, geometry, statistics, and exam-paper timing.",
    lessons: [
      {
        id: "algebra",
        title: "Algebra and equations",
        minutes: 14,
        body: [
          "Factorise, expand, and change the subject of a formula until those three feel routine. They unlock later topics.",
          "Quadratic questions often want factorising first. If that fails, use the formula and write it down before substituting.",
          "Keep an errors book: sign errors, dropped negatives, and calculator mode (degrees) are the usual leaks.",
        ],
      },
      {
        id: "geometry",
        title: "Shape, space, and measure",
        minutes: 12,
        body: [
          "Write the circle, triangle, or trigonometry ratio you need before punching numbers. The formula line scores.",
          "In angle questions, mark the diagram: corresponding, alternate, co-interior. Examiners reward clear reasoning.",
          "Give answers to the accuracy asked: 3 significant figures is common. Do not round too early in the working.",
        ],
      },
      {
        id: "stats",
        title: "Statistics and probability",
        minutes: 10,
        body: [
          "Mean, median, mode, and range measure different things. Name the one the question actually asks for.",
          "For probability, list the sample space when the numbers are small. A table prevents double-counting.",
          "On cumulative frequency and histograms, read the scale twice. Axis misreads cost several marks at once.",
        ],
      },
    ],
  },
  {
    id: "egcse-english",
    level: "EGCSE",
    subject: "English Language",
    icon: "📝",
    papers: "papers.html?level=EGCSE&q=English",
    summary: "Reading papers, summary skills, and extended writing for EGCSE English.",
    lessons: [
      {
        id: "reading",
        title: "Reading paper skills",
        minutes: 12,
        body: [
          "Scan for names, dates, and contrast words such as however and although. Those often hide the answer.",
          "For summary, collect points first as a numbered list, then write them in your own words within the word limit.",
          "Do not add ideas that are not in the text. Extra opinion is not extra marks on a reading paper.",
        ],
      },
      {
        id: "writing",
        title: "Extended writing",
        minutes: 12,
        body: [
          "Spend 5 minutes planning: purpose, audience, three ideas, and a punchy opening line.",
          "Vary sentence openings. Starting every sentence with 'I' or 'The' makes the writing feel younger than it is.",
          "Proofread for paragraphing and punctuation. A clear structure can lift a mid paper into a stronger band.",
        ],
      },
    ],
  },
  {
    id: "egcse-science",
    level: "EGCSE",
    subject: "Physical Science",
    icon: "⚗️",
    papers: "papers.html?level=EGCSE&q=Physical",
    summary: "Physics and chemistry together: particles, reactions, forces, and electricity.",
    lessons: [
      {
        id: "chem",
        title: "Chemistry core",
        minutes: 14,
        body: [
          "Atomic structure, bonding, and the periodic table sit under almost every later topic. Revise them first.",
          "Balance equations by counting atoms, not by guessing coefficients. Write a tally if you need to.",
          "Acids, bases, and salts questions want observations and names. Practise the colour-change language from practicals.",
        ],
      },
      {
        id: "phys",
        title: "Physics core",
        minutes: 14,
        body: [
          "Write the formula, substitute with units, then calculate. This pattern is worth marks even when arithmetic slips.",
          "Forces, energy, and electricity diagrams must be labelled. An arrow without a name is a weak answer.",
          "Learn SI units: N, J, W, V, A, Ω. Unit errors are common on otherwise correct working.",
        ],
      },
    ],
  },
  {
    id: "egcse-biology",
    level: "EGCSE",
    subject: "Biology",
    icon: "🧬",
    papers: "papers.html?level=EGCSE&q=Biology",
    summary: "Cells, systems, ecology, and the command words used in biology papers.",
    lessons: [
      {
        id: "cells",
        title: "Cells and systems",
        minutes: 12,
        body: [
          "Compare plant and animal cells with a two-column list: wall, chloroplast, vacuole versus centrioles and glycogen.",
          "For systems (digestive, respiratory, circulatory), know organ, function, and one adaptation. That trio answers most 'explain' items.",
          "Use biology words precisely: absorb is not digest, and respire is not breathe.",
        ],
      },
      {
        id: "eco",
        title: "Ecology and graphs",
        minutes: 10,
        body: [
          "Describe a graph in three steps: trend, a data quote with units, then a reason linked to the biology.",
          "Photosynthesis and respiration are not opposites in every way. Learn the word equations and when each happens.",
          "Practical questions want a control, a repeat, and a safety point. Keep those three ready.",
        ],
      },
    ],
  },
  {
    id: "egcse-business",
    level: "EGCSE",
    subject: "Business Studies",
    icon: "💼",
    papers: "papers.html?level=EGCSE&q=Business",
    summary: "Enterprise, marketing, finance, and how to write application answers.",
    lessons: [
      {
        id: "terms",
        title: "Key terms and application",
        minutes: 12,
        body: [
          "Define the term, then apply it to the business in the case study. A definition alone is only half the answer.",
          "Stakeholders, limited liability, and cash flow appear often. Be able to give one advantage and one disadvantage.",
          "When the paper says 'justify', pick one option, give two reasons, and close with a decision sentence.",
        ],
      },
      {
        id: "finance",
        title: "Marketing and finance",
        minutes: 12,
        body: [
          "The marketing mix is product, price, place, promotion. Link each one to the target customer in the scenario.",
          "Revenue, costs, profit, and cash are not the same. A profitable business can still run out of cash.",
          "Show formula and working for break-even and margin questions. Layout matters as much as the final number.",
        ],
      },
    ],
  },
];

function loadLearnProgress() {
  try {
    const raw = localStorage.getItem(LEARN_PROGRESS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveLearnProgress(progress) {
  localStorage.setItem(LEARN_PROGRESS_KEY, JSON.stringify(progress));
}

function lessonKey(courseId, lessonId) {
  return `${courseId}:${lessonId}`;
}

function isLessonDone(progress, courseId, lessonId) {
  return !!progress[lessonKey(courseId, lessonId)];
}

function countDone(progress, course) {
  return course.lessons.filter((lesson) => isLessonDone(progress, course.id, lesson.id)).length;
}

function totalLessons() {
  return LEARN_COURSES.reduce((sum, course) => sum + course.lessons.length, 0);
}

function totalDone(progress) {
  return LEARN_COURSES.reduce((sum, course) => sum + countDone(progress, course), 0);
}

function renderLearnHome() {
  const grid = document.getElementById("learn-grid");
  if (!grid) return;

  const progress = loadLearnProgress();
  const query = (document.getElementById("learn-search")?.value || "").trim().toLowerCase();
  const level = document.querySelector(".learn-tab.is-active")?.dataset.level || "all";
  const name = (localStorage.getItem(LEARN_NAME_KEY) || "").trim();

  const greeting = document.getElementById("learn-greeting");
  if (greeting) {
    greeting.textContent = name
      ? `Welcome back, ${name}. Continue where you left off.`
      : "Welcome. Save your name to keep progress on this device.";
  }

  const done = totalDone(progress);
  const all = totalLessons();
  const percent = all ? Math.round((done / all) * 100) : 0;
  const stats = document.getElementById("learn-stats");
  if (stats) {
    stats.innerHTML = `
      <div class="learn-stat"><strong>${LEARN_COURSES.length}</strong><span>courses</span></div>
      <div class="learn-stat"><strong>${done}/${all}</strong><span>lessons done</span></div>
      <div class="learn-stat"><strong>${percent}%</strong><span>complete</span></div>
    `;
  }
  const bar = document.getElementById("learn-progress-bar");
  if (bar) bar.style.width = `${percent}%`;

  const matches = LEARN_COURSES.filter((course) => {
    const levelOk = level === "all" || course.level === level;
    const haystack = `${course.subject} ${course.level} ${course.summary}`.toLowerCase();
    return levelOk && (!query || haystack.includes(query));
  });

  const empty = document.getElementById("learn-empty");
  if (!matches.length) {
    grid.innerHTML = "";
    if (empty) empty.hidden = false;
    return;
  }
  if (empty) empty.hidden = true;

  grid.innerHTML = matches
    .map((course) => {
      const finished = countDone(progress, course);
      const total = course.lessons.length;
      return `
        <article class="learn-card">
          <div class="paper-card-top">
            <span class="paper-card-icon" aria-hidden="true">${course.icon}</span>
            <span class="paper-level">${escapeHtml(course.level)}</span>
          </div>
          <h3>${escapeHtml(course.subject)}</h3>
          <p>${escapeHtml(course.summary)}</p>
          <p class="learn-card-meta">${finished} of ${total} lessons complete</p>
          <div class="learn-card-actions">
            <a class="btn btn-primary" href="learn.html?course=${encodeURIComponent(course.id)}">Open course</a>
            <a class="btn btn-secondary" href="${course.papers}">Past papers</a>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderLearnCourse(courseId) {
  const course = LEARN_COURSES.find((item) => item.id === courseId);
  const panel = document.getElementById("learn-course");
  const home = document.getElementById("learn-home");
  if (!course || !panel) {
    renderLearnHome();
    return;
  }

  if (home) home.hidden = true;
  panel.hidden = false;

  const progress = loadLearnProgress();
  const finished = countDone(progress, course);

  document.getElementById("learn-course-title").textContent = course.subject;
  document.getElementById("learn-course-lead").textContent =
    `${course.level} · ${finished} of ${course.lessons.length} lessons complete`;
  document.getElementById("learn-course-papers").href = course.papers;

  const list = document.getElementById("learn-lessons");
  list.innerHTML = course.lessons
    .map((lesson) => {
      const done = isLessonDone(progress, course.id, lesson.id);
      return `
        <article class="learn-lesson${done ? " is-done" : ""}" id="lesson-${escapeHtml(lesson.id)}">
          <div class="learn-lesson-head">
            <h3>${escapeHtml(lesson.title)}</h3>
            <span>${lesson.minutes} min</span>
          </div>
          ${lesson.body.map((para) => `<p>${escapeHtml(para)}</p>`).join("")}
          <button
            type="button"
            class="btn ${done ? "btn-secondary" : "btn-primary"}"
            data-toggle-lesson="${escapeHtml(course.id)}:${escapeHtml(lesson.id)}"
          >${done ? "Mark as not done" : "Mark as complete"}</button>
        </article>
      `;
    })
    .join("");
}

function currentCourseId() {
  return new URLSearchParams(location.search).get("course") || "";
}

function renderLearnPage() {
  const courseId = currentCourseId();
  const home = document.getElementById("learn-home");
  const panel = document.getElementById("learn-course");
  if (courseId) {
    renderLearnCourse(courseId);
    return;
  }
  if (panel) panel.hidden = true;
  if (home) home.hidden = false;
  renderLearnHome();
}

function initLearnPage() {
  if (!document.body || document.body.dataset.page !== "learn") return;

  const nameInput = document.getElementById("learn-name");
  if (nameInput) nameInput.value = localStorage.getItem(LEARN_NAME_KEY) || "";

  document.getElementById("learn-name-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const value = String(new FormData(e.target).get("name") || "").trim();
    if (value) localStorage.setItem(LEARN_NAME_KEY, value);
    else localStorage.removeItem(LEARN_NAME_KEY);
    renderLearnPage();
  });

  document.getElementById("learn-search")?.addEventListener("input", renderLearnHome);

  document.querySelectorAll(".learn-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".learn-tab").forEach((btn) => btn.classList.remove("is-active"));
      tab.classList.add("is-active");
      renderLearnHome();
    });
  });

  document.getElementById("learn-lessons")?.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-toggle-lesson]");
    if (!btn) return;
    const [courseId, lessonId] = btn.dataset.toggleLesson.split(":");
    const progress = loadLearnProgress();
    const key = lessonKey(courseId, lessonId);
    if (progress[key]) delete progress[key];
    else progress[key] = new Date().toISOString();
    saveLearnProgress(progress);
    renderLearnCourse(courseId);
  });

  renderLearnPage();
}

document.addEventListener("DOMContentLoaded", initLearnPage);
