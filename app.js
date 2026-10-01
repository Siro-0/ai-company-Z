
import {
  makeTask,
  runCycle,
  initialState,
  migrateState,
  DEPARTMENTS
} from "./core.js";

const KEY = "ai_company_core_v1";

const elements = {
  ideaForm: document.getElementById("ideaForm"),
  ideaInput: document.getElementById("ideaInput"),
  pendingCount: document.getElementById("pendingCount"),
  doneCount: document.getElementById("doneCount"),
  cycleCount: document.getElementById("cycleCount"),
  tasks: document.getElementById("tasks"),
  logs: document.getElementById("logs"),
  runBtn: document.getElementById("runBtn"),
  exportBtn: document.getElementById("exportBtn"),
  resetBtn: document.getElementById("resetBtn")
};

let state = loadState();

function loadState() {
  try {
    const saved = localStorage.getItem(KEY);

    if (!saved) {
      return initialState();
    }

    return migrateState(JSON.parse(saved));
  } catch (error) {
    console.error("保存データの読み込みに失敗しました:", error);
    return initialState();
  }
}

function saveState() {
  localStorage.setItem(KEY, JSON.stringify(state));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}

function renderArtifact(artifact) {
  if (!artifact) return "";

  if (
    artifact.type === "product_ideas" &&
    Array.isArray(artifact.items)
  ) {
    return `
      <section class="artifact">
        <h4>生成された商品アイデア</h4>
        <div class="artifact-list">
          ${artifact.items.map((item, index) => `
            <article class="artifact-item">
              <strong>${index + 1}. ${escapeHTML(item.title)}</strong>
              <p>${escapeHTML(item.description)}</p>
              ${
                item.target
                  ? `<small>対象: ${escapeHTML(item.target)}</small>`
                  : ""
              }
            </article>
          `).join("")}
        </div>
      </section>
    `;
  }

  return `
    <section class="artifact">
      <h4>処理結果</h4>
      <pre>${escapeHTML(JSON.stringify(artifact, null, 2))}</pre>
    </section>
  `;
}

function renderTasks() {
  if (!elements.tasks) return;

  const tasks = Array.isArray(state.tasks) ? state.tasks : [];

  if (tasks.length === 0) {
    elements.tasks.innerHTML = `
      <p class="empty">まだタスクはありません。</p>
    `;
    return;
  }

  elements.tasks.innerHTML = tasks.map((task) => {
    const status = task.status || "pending";
    const statusLabel =
      status === "done" ? "完了" :
      status === "processing" ? "処理中" :
      "待機中";

    return `
      <article class="task-card">
        <div class="task-header">
          <strong>${escapeHTML(task.title)}</strong>
          <span class="task-status">${statusLabel}</span>
        </div>

        <p>${escapeHTML(task.description || "")}</p>

        <div class="task-meta">
          <span>部署: ${escapeHTML(task.department || "未割当")}</span>
          <span>優先度: ${escapeHTML(task.priority ?? "通常")}</span>
        </div>

        ${
          task.result
            ? `<div class="task-result">${escapeHTML(task.result)}</div>`
            : ""
        }

        ${renderArtifact(task.artifact)}
      </article>
    `;
  }).join("");
}

function renderLogs() {
  if (!elements.logs) return;

  const logs = Array.isArray(state.logs) ? state.logs : [];

  if (logs.length === 0) {
    elements.logs.innerHTML = `
      <p class="empty">まだ活動ログはありません。</p>
    `;
    return;
  }

  elements.logs.innerHTML = logs
    .slice()
    .reverse()
    .map((log) => {
      const message =
        typeof log === "string"
          ? log
          : log.message || JSON.stringify(log);

      return `
        <div class="log-item">
          ${escapeHTML(message)}
        </div>
      `;
    })
    .join("");
}

function renderStats() {
  const tasks = Array.isArray(state.tasks) ? state.tasks : [];

  const pending = tasks.filter(
    (task) => task.status !== "done"
  ).length;

  const done = tasks.filter(
    (task) => task.status === "done"
  ).length;

  if (elements.pendingCount) {
    elements.pendingCount.textContent = pending;
  }

  if (elements.doneCount) {
    elements.doneCount.textContent = done;
  }

  if (elements.cycleCount) {
    elements.cycleCount.textContent = state.cycleCount ?? 0;
  }
}

function render() {
  renderStats();
  renderTasks();
  renderLogs();
}

function addLog(message) {
  if (!Array.isArray(state.logs)) {
    state.logs = [];
  }

  state.logs.push({
    message,
    time: new Date().toISOString()
  });
}

function handleSubmit(event) {
  event.preventDefault();

  const title = elements.ideaInput?.value.trim();

  if (!title) return;

  try {
    const task = makeTask(title);
    state.tasks.push(task);

    addLog(`新しいタスクを登録: ${title}`);

    saveState();
    render();

    elements.ideaInput.value = "";
  } catch (error) {
    console.error("タスク登録エラー:", error);
    addLog("タスクの登録に失敗しました。");
    saveState();
    render();
  }
}

function handleRun() {
  if (!Array.isArray(state.tasks) || state.tasks.length === 0) {
    addLog("実行できるタスクがありません。");
    saveState();
    render();
    return;
  }

  try {
    state = runCycle(state);

    addLog("AI企業の処理サイクルを実行しました。");

    saveState();
    render();
  } catch (error) {
    console.error("実行エラー:", error);
    addLog(`処理中にエラーが発生: ${error.message}`);
    saveState();
    render();
  }
}

function handleExport() {
  try {
    const data = JSON.stringify(state, null, 2);
    const blob = new Blob([data], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "ai-company-data.json";

    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("エクスポートエラー:", error);
    alert("データの出力に失敗しました。");
  }
}

function handleReset() {
  const confirmed = window.confirm(
    "保存されているタスクやログをすべて削除しますか？"
  );

  if (!confirmed) return;

  state = initialState();
  saveState();
  render();
}

if (elements.ideaForm) {
  elements.ideaForm.addEventListener("submit", handleSubmit);
}

if (elements.runBtn) {
  elements.runBtn.addEventListener("click", handleRun);
}

if (elements.exportBtn) {
  elements.exportBtn.addEventListener("click", handleExport);
}

if (elements.resetBtn) {
  elements.resetBtn.addEventListener("click", handleReset);
}

render();
