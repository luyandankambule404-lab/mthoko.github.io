const POSTS_STORAGE_KEY = "mthokozisi_site_posts";

function ensurePostId(post) {
  if (!post.id) {
    post.id = `p_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  return post;
}

function getDefaultPosts() {
  if (typeof POSTS === "undefined") return [];
  return POSTS.map((p) => ensurePostId({ ...p }));
}

function loadPosts() {
  try {
    const raw = localStorage.getItem(POSTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed.map(ensurePostId);
    }
  } catch {
    /* use defaults */
  }
  const defaults = getDefaultPosts();
  if (defaults.length) savePosts(defaults);
  return defaults;
}

function savePosts(posts) {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(posts));
}

function getSortedPosts() {
  return [...loadPosts()].sort((a, b) => new Date(b.date) - new Date(a.date));
}

function exportPostsJsFile() {
  const posts = loadPosts();
  const blocks = posts.map((p) => {
    const lines = [
      `    date: ${JSON.stringify(p.date)},`,
      `    title: ${JSON.stringify(p.title)},`,
      `    body: ${JSON.stringify(p.body)},`,
    ];
    if (p.tags?.length) lines.push(`    tags: ${JSON.stringify(p.tags)},`);
    return `  {\n${lines.join("\n")}\n  }`;
  });
  return `/**\n * Your posts — uploaded from Dashboard\n */\nconst POSTS = [\n${blocks.join(",\n")}\n];\n`;
}

function downloadPostsJs() {
  const content = exportPostsJsFile();
  const blob = new Blob([content], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "posts.js";
  a.click();
  URL.revokeObjectURL(url);
}

function resetPostsToFileDefaults() {
  localStorage.removeItem(POSTS_STORAGE_KEY);
  return getDefaultPosts();
}
