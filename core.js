```javascript
// 会社の基本ロジック。外部通信・外部APIは使用しない。
// ルールベースの初期版。自由な推論を行うAIモデルではありません。

export const DEPARTMENTS = {
  ceo: "AI社長",
  market: "市場調査",
  product: "商品開発",
  finance: "財務",
  tech: "技術保守",
  audit: "監査"
};

const MAX_TASKS_PER_PLAN = 5;

export function makeTask(title, source = "human", extra = {}) {
  const cleanTitle = String(title ?? "").trim();
  if (!cleanTitle) throw new Error("タスク名を入力してください。");

  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: cleanTitle,
    source,
    status: "pending",
    department: extra.department ?? chooseDepartment(cleanTitle),
    priority: extra.priority ?? scorePriority(cleanTitle),
    parentId: extra.parentId ?? null,
    createdAt: now,
    updatedAt: now,
    result: null
  };
}

function chooseDepartment(title) {
  const s = title.toLowerCase();
  if (/売上|費用|予算|利益|価格|財務|収益|コスト/.test(s)) return "finance";
  if (/コード|修正|不具合|保守|システム|実装|技術|テスト/.test(s)) return "tech";
  if (/商品|製品|作成|開発|制作|試作|仕様/.test(s)) return "product";
  if (/市場|競合|顧客|需要|調査|アイデア|案|利用者/.test(s)) return "market";
  if (/監査|安全|リスク|確認|検証/.test(s)) return "audit";
  return "ceo";
}

function scorePriority(title) {
  if (/緊急|障害|停止|安全|セキュリティ/.test(title)) return 1;
  if (/収益|売上|顧客|商品|販売/.test(title)) return 2;
  return 3;
}

// 大きな仕事を小タスクに分解する
export function createPlan(title) {
  const s = String(title ?? "").trim();
  if (!s) return [];

  let plan;
  if (/商品|製品|開発|制作|収益化|販売|サービス/.test(s)) {
    plan = [
      { department: "market", title: `想定顧客と解決する課題を整理する：${s}` },
      { department: "product", title: `最小試作品の内容と完成条件を決める：${s}` },
      { department: "finance", title: `費用・価格・収益の仮説を整理する：${s}` },
      { department: "audit", title: `計画の前提と主なリスクを確認する：${s}` }
    ];
  } else if (/市場|競合|顧客|需要|調査/.test(s)) {
    plan = [
      { department: "market", title: `調査対象と確認したい仮説を定義する：${s}` },
      { department: "audit", title: `調査結果の根拠と不足情報を確認する：${s}` }
    ];
  } else if (/改善|修正|不具合|保守|システム|コード/.test(s)) {
    plan = [
      { department: "tech", title: `対象・再現条件・完了条件を整理する：${s}` },
      { department: "audit", title: `変更時のリスクと復旧方法を確認する：${s}` }
    ];
  } else {
    plan = [
      { department: chooseDepartment(s), title: `目的と完了条件を具体化する：${s}` },
      { department: "audit", title: `実行前に前提・リスク・不足情報を確認する：${s}` }
    ];
  }

  return plan.slice(0, MAX_TASKS_PER_PLAN);
}

// 商品案を作る。外部調査や市場データに基づくものではない。
function generateProductIdeas(title) {
  const ideas = [
    {
      name: "AIプロンプト整理テンプレート",
      audience: "AIを使い始めた個人や小規模事業者",
      problem: "便利な指示文を保存・再利用しにくい",
      solution: "用途別に整理できるデジタルテンプレート",
      sales: "テンプレートのダウンロード販売"
    },
    {
      name: "小規模事業者向け業務管理シート",
      audience: "個人事業主や少人数のチーム",
      problem: "日々の作業や進捗を一元管理しにくい",
      solution: "タスク・期限・進捗をまとめる管理シート",
      sales: "買い切り型のデジタル商品"
    },
    {
      name: "初心者向けAI活用ガイド",
      audience: "AIの使い方を学びたい初心者",
      problem: "何から始めればよいか分からない",
      solution: "具体例付きの入門ガイドと実践課題",
      sales: "PDF教材として販売"
    }
  ];

  return ideas.map((idea, index) => ({
    ...idea,
    number: index + 1,
    basedOn: title
  }));
}

function processTask(task) {
  // 商品案を考えるタスクなら、実際に案を生成する
  if (
    task.department === "product" &&
    /案|アイデア|考え|企画/.test(task.title)
  ) {
    const ideas = generateProductIdeas(task.title);
    return {
      status: "done",
      message: `商品案を${ideas.length}件生成しました。テンプレートに基づく仮案です。`,
      artifact: {
        type: "product_ideas",
        title: "商品案",
        items: ideas
      }
    };
  }

  const templates = {
    ceo: "目的を整理し、ルールに基づく作業計画を作成しました。実際の調査や制作はまだ行っていません。",
    market: "調査の対象・仮説を整理しました。外部データの取得や市場の事実確認は行っていません。",
    product: "商品開発の作業項目を整理しました。試作品そのものはまだ制作していません。",
    finance: "費用・価格・収益の検討項目を整理しました。金銭取引や実際の会計処理は行っていません。",
    tech: "技術作業の対象と完了条件を整理しました。コード変更やシステム操作は行っていません。",
    audit: "確認項目を整理しました。独立した証拠の検証や安全性の保証は行っていません。"
  };

  return {
    status: "done",
    message: templates[task.department] ?? templates.ceo,
    artifact: null
  };
}

export function runCycle(state) {
  const next = structuredClone(state);
  next.cycle = (Number(next.cycle) || 0) + 1;

  const task = next.tasks
    .filter(t => t.status === "pending")
    .sort((a, b) =>
      (a.priority ?? 3) - (b.priority ?? 3) ||
      String(a.createdAt).localeCompare(String(b.createdAt))
    )[0];

  if (!task) {
    addLog(next, `実行サイクル ${next.cycle}：実行できるタスクはありません。`);
    return next;
  }

  const result = processTask(task);
  task.status = result.status;
  task.result = result.message;
  task.artifact = result.artifact ?? null;
  task.updatedAt = new Date().toISOString();

  addLog(
    next,
    `${DEPARTMENTS[task.department] ?? DEPARTMENTS.ceo}が「${task.title}」を処理：${result.message}`
  );

  if (task.department === "ceo" && !task.planCreated) {
    const children = createPlan(task.title);
    task.planCreated = true;
    task.result += `（作業計画 ${children.length} 件を作成）`;

    for (const item of children) {
      const child = makeTask(item.title, "ceo-plan", {
        department: item.department,
        parentId: task.id
      });
      next.tasks.push(child);
    }

    if (children.length) {
      addLog(next, `AI社長が「${task.title}」を ${children.length} 件の作業に分解しました。`);
    }
  }

  return next;
}

function addLog(state, message) {
  state.logs.unshift({
    at: new Date().toISOString(),
    message
  });
  state.logs = state.logs.slice(0, 100);
}

export function initialState() {
  return {
    version: 3,
    cycle: 0,
    tasks: [],
    logs: []
  };
}

export function migrateState(oldState) {
  if (!oldState || !Array.isArray(oldState.tasks) || !Array.isArray(oldState.logs)) {
    return initialState();
  }

  return {
    version: 3,
    cycle: Number(oldState.cycle) || 0,
    tasks: oldState.tasks.map(t => ({
      ...t,
      parentId: t.parentId ?? null,
      planCreated: Boolean(t.planCreated),
      artifact: t.artifact ?? null
    })),
    logs: oldState.logs.slice(0, 100)
  };
}
```
