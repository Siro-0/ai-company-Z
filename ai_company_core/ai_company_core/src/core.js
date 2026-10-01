// 会社の基本ロジック。外部通信・外部APIは使用しない。
export const DEPARTMENTS = {
  ceo: "AI社長",
  market: "市場調査",
  product: "商品開発",
  finance: "財務",
  tech: "技術保守",
  audit: "監査"
};

export function makeTask(title, source = "human") {
  return {
    id: crypto.randomUUID(),
    title: title.trim(),
    source,
    status: "pending",
    department: chooseDepartment(title),
    priority: scorePriority(title),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    result: null
  };
}

function chooseDepartment(title) {
  const s = title.toLowerCase();
  if (/売上|費用|予算|利益|価格|財務|収益/.test(s)) return "finance";
  if (/コード|修正|不具合|保守|システム|実装|技術/.test(s)) return "tech";
  if (/商品|製品|作成|開発|制作|試作/.test(s)) return "product";
  if (/市場|競合|顧客|需要|調査|アイデア|案/.test(s)) return "market";
  return "ceo";
}

function scorePriority(title) {
  if (/緊急|障害|停止|安全/.test(title)) return 1;
  if (/収益|売上|顧客|商品/.test(title)) return 2;
  return 3;
}

export function runCycle(state) {
  const next = structuredClone(state);
  next.cycle += 1;
  const task = next.tasks
    .filter(t => t.status === "pending")
    .sort((a,b) => a.priority - b.priority || a.createdAt.localeCompare(b.createdAt))[0];

  if (!task) {
    addLog(next, "実行サイクル " + next.cycle + "：実行できるタスクはありません。");
    return next;
  }

  const dept = DEPARTMENTS[task.department] ?? DEPARTMENTS.ceo;
  const result = processTask(task);
  task.status = result.status;
  task.result = result.message;
  task.updatedAt = new Date().toISOString();
  addLog(next, `${dept}が「${task.title}」を処理：${result.message}`);
  return next;
}

// 初期版では安全のため、実際の外部操作や金銭取引は行わず、処理案を返す。
function processTask(task) {
  const templates = {
    ceo: "内容を整理しました。具体的な調査・制作タスクに分解する必要があります。",
    market: "市場調査タスクとして登録しました。次段階では、調査対象・仮説・検証方法を定義します。",
    product: "商品開発タスクとして整理しました。次段階では最小試作品と完了条件を定義します。",
    finance: "財務タスクとして整理しました。金額や取引を伴う処理はまだ実行しません。",
    tech: "技術タスクとして整理しました。変更前に対象ファイル、テスト、復旧手順を指定する必要があります。",
    audit: "監査タスクとして整理しました。根拠と確認項目を記録する設計です。"
  };
  return {status:"done", message:templates[task.department] ?? templates.ceo};
}

function addLog(state, message) {
  state.logs.unshift({at:new Date().toISOString(), message});
  state.logs = state.logs.slice(0,100);
}

export function initialState() {
  return {version:1, cycle:0, tasks:[], logs:[]};
}
