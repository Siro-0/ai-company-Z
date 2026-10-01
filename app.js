```javascript
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

// 保存データを読み込む
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

// データを保存する
function saveState() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    console.error("データの保存に失敗しました:", error);
    alert("データを保存できませんでした。ブラウザの保存容量を確認してください。");
  }
}

// HTMLへの埋め込み時に文字列を安全にする
function escapeHTML(value) {
  const entities = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  };

  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    return entities[char];
  });
}

// 商品案などの生成結果を表示する
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
              <strong>
                ${index + 1}. ${escapeHTML(item.name || "名称未設定")}
              </strong>

              <p>
                <b>対象顧客：</b>
                ${escapeHTML(item.audience || "未設定")}
              </p>

              <p>
                <b>解決する課題：</b>
                ${escapeHTML(item.problem || "未設定")}
              </p>

              <p>
                <b>解決方法：</b>
                ${escapeHTML(item.solution || "未設定")}
              </p>

              <p>
                <b>販売方法：</b>
                ${escapeHTML(item.sales || "未設定")}
              </p>
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

// タスク一覧を画面に表示する
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

    const department =
      DEPARTMENTS[task.department] || task.department || "未割当";

    return `
      <article class="task-card">
        <div class="task-header">
          <strong>${escapeHTML(task.title)}</strong>
          <span class="task-status">${statusLabel}</span>
        </div>

        <p>${escapeHTML(task.description || "")}</p>

        <div class="task-meta">
          <span>
            部署: ${escapeHTML(department)}
          </span>

          <span>
            優先度: ${escapeHTML(task.priority ?? "通常")}
          </span>
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

// 活動ログを表示する
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

// 統計情報を表示する
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
    elements.cycleCount.textContent = state.cycle ?? 0;
  }
}

// 画面全体を更新する
function render() {
  renderStats();
  renderTasks();
  renderLogs();
}

// 活動ログを追加する
function addLog(message) {
  if (!Array.isArray(state.logs)) {
    state.logs = [];
  }

  state.logs.push({
    at: new Date().toISOString(),
    message
  });

  state.logs = state.logs.slice(-100);
}

// 新しいタスクを登録する
function handleSubmit(event) {
  event.preventDefault();

  const title = elements.ideaInput?.value.trim();

  if (!title) return;

  try {
    const task = makeTask(title);

    if (!Array.isArray(state.tasks)) {
      state.tasks = [];
    }

    state.tasks.push(task);

    addLog(`新しいタスクを登録: ${title}`);

    saveState();
    render();

    elements.ideaInput.value = "";
  } catch (error) {
    console.error("タスク登録エラー:", error);

    addLog("タスクの登録に失敗しました.");

    saveState();
    render();
  }
}

// AI企業の処理サイクルを実行する
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

// データをJSONファイルとして出力する
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

// 保存データをリセットする
function handleReset() {
  const confirmed = window.confirm(
    "保存されているタスクやログをすべて削除しますか？"
  );

  if (!confirmed) return;

  state = initialState();

  saveState();
  render();
}

// イベントを登録する
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

// 初期画面を表示する
render();
```
