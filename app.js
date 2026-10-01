```javascript
import {
  makeTask,
  runCycle,
  initialState,
  migrateState,
  DEPARTMENTS
} from "./core.js";

const KEY = "ai-company-core-v1";
const $ = id => document.getElementById(id);

let state = load();

// 保存データを読み込む
function load() {
  try {
    const raw = localStorage.getItem(KEY);

    if (!raw) {
      return initialState();
    }

    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed.tasks) || !Array.isArray(parsed.logs)) {
      return initialState();
    }

    return migrateState(parsed);
  } catch (error) {
    console.error("データの読み込みに失敗しました:", error);
    return initialState();
  }
}

// データを保存する
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    alert("ブラウザへの保存に失敗しました。JSONを書き出してバックアップしてください。");
    console.error(error);
  }
}

// HTMLに安全に表示するための変換
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

// 商品案の詳細を表示する
function renderArtifact(artifact) {
  if (!artifact) return "";

  if (artifact.type === "product_ideas" && Array.isArray(artifact.items)) {
    return `
      <section class="artifact">
        <h4>${esc(artifact.title || "生成された商品案")}</h4>
        ${artifact.items.map(item => `
          <article class="idea-card">
            <h5>${esc(item.number)}. ${esc(item.name)}</h5>
            <p><strong>対象ユーザー：</strong>${esc(item.audience)}</p>
            <p><strong>解決する問題：</strong>${esc(item.problem)}</p>
            <p><strong>解決方法：</strong>${esc(item.solution)}</p>
            <p><strong>販売方法：</strong>${esc(item.sales)}</p>
          </article>
        `).join("")}
        <p class="artifact-note">
          ※ ルールベースで作成した仮案です。市場調査や需要の検証は行っていません。
        </p>
      </section>
    `;
  }

  return "";
}

// 画面を更新する
function render() {
  $("pendingCount").textContent =
    state.tasks.filter(t => t.status === "pending").length;

  $("doneCount").textContent =
    state.tasks.filter(t => t.status === "done").length;

  $("cycleCount").textContent = state.cycle;

  const tasks = [...state.tasks].sort((a, b) =>
    String(b.createdAt).localeCompare(String(a.createdAt))
  );

  $("tasks").innerHTML = tasks.length
    ? tasks.map(t => `
      <article class="task">
        <div class="tasktop">
          <span class="tasktitle">${esc(t.title)}</span>
          <span class="pill">
            ${t.status === "pending" ? "保留中" : "完了"}
          </span>
        </div>

        <div class="meta">
          ${esc(DEPARTMENTS[t.department] ?? "未分類")}
          ・ 優先度 ${Number(t.priority) || 3}
          ${t.parentId ? " ・ 社長の計画から作成" : ""}
          ・ ${new Date(t.createdAt).toLocaleString("ja-JP")}
        </div>

        ${t.result
          ? `<div class="taskresult">${esc(t.result)}</div>`
          : ""}

        ${renderArtifact(t.artifact)}
      </article>
    `).join("")
    : '<p class="empty">まだタスクはありません。</p>';

  $("logs").innerHTML = state.logs.length
    ? state.logs.map(l => `
      <li>
        <time>${new Date(l.at).toLocaleString("ja-JP")}</time>
        — ${esc(l.message)}
      </li>
    `).join("")
    : '<li class="empty">ログはまだありません。</li>';
}

// タスク登録
$("ideaForm").addEventListener("submit", event => {
  event.preventDefault();

  const title = $("ideaInput").value.trim();
  if (!title) return;

  try {
    const task = makeTask(title);
    state.tasks.push(task);

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

// 1サイクル実行
$("runBtn").addEventListener("click", () => {
  try {
    state = runCycle(state);
    save();
    render();
  } catch (error) {
    console.error("実行エラー:", error);
    alert("タスクの実行中にエラーが発生しました。");
  }
});

// JSONバックアップの書き出し
$("exportBtn").addEventListener("click", () => {
  const blob = new Blob(
    [JSON.stringify(state, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");

  a.href = url;
  a.download = "ai-company-state.json";
  a.click();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

// データのリセット
$("resetBtn").addEventListener("click", () => {
  const confirmed = confirm(
    "保存したタスクとログをすべて削除します。先にJSONを書き出しましたか？"
  );

  if (!confirmed) return;

  state = initialState();
  save();
  render();
});

// 初期表示
render();
```
