import {
  makeTask, runCycle, initialState, migrateState, DEPARTMENTS
} from "./core.js";

const KEY = "ai-company-core-v1";
const $ = id => document.getElementById(id);
let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return initialState();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.logs)) return initialState();
    return migrateState(parsed);
  } catch {
    return initialState();
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    alert("ブラウザへの保存に失敗しました。JSONを書き出してバックアップしてください。");
    console.error(error);
  }
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function render() {
  $("pendingCount").textContent = state.tasks.filter(t => t.status === "pending").length;
  $("doneCount").textContent = state.tasks.filter(t => t.status === "done").length;
  $("cycleCount").textContent = state.cycle;

  const tasks = [...state.tasks].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  $("tasks").innerHTML = tasks.length ? tasks.map(t => `
    <article class="task">
      <div class="tasktop">
        <span class="tasktitle">${esc(t.title)}</span>
        <span class="pill">${t.status === "pending" ? "保留中" : "完了"}</span>
      </div>
      <div class="meta">
        ${esc(DEPARTMENTS[t.department] ?? "未分類")} ・ 優先度 ${Number(t.priority) || 3}
        ${t.parentId ? " ・ 社長の計画から作成" : ""}
        ・ ${new Date(t.createdAt).toLocaleString("ja-JP")}
      </div>
      ${t.result ? `<div class="taskresult">${esc(t.result)}</div>` : ""}
    </article>`).join("") : '<p class="empty">まだタスクはありません。</p>';

  $("logs").innerHTML = state.logs.length
    ? state.logs.map(l => `<li><time>${new Date(l.at).toLocaleString("ja-JP")}</time> — ${esc(l.message)}</li>`).join("")
    : '<li class="empty">ログはまだありません。</li>';
}

$("ideaForm").addEventListener("submit", e => {
  e.preventDefault();
  const title = $("ideaInput").value.trim();
  if (!title) return;
  try {
    state.tasks.push(makeTask(title));
    state.logs.unshift({
      at: new Date().toISOString(),
      message: `新しいタスクを登録：「${title}」`
    });
    state.logs = state.logs.slice(0, 100);
    $("ideaInput").value = "";
    save();
    render();
  } catch (error) {
    alert(error.message || "タスクを登録できませんでした。");
  }
});

$("runBtn").addEventListener("click", () => {
  state = runCycle(state);
  save();
  render();
});

$("exportBtn").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "ai-company-state.json";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

$("resetBtn").addEventListener("click", () => {
  if (!confirm("保存したタスクとログをすべて削除します。先にJSONを書き出しましたか？")) return;
  state = initialState();
  save();
  render();
});

render();
