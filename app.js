const MEMBERSHIP_COST = 920;
const SHORT_GAME_PRICE = 8;
const ROUND_PRICE = 15;
const STORAGE_KEY = "mariners-point-roi-local-visits";
const DELETED_STORAGE_KEY = "mariners-point-roi-deleted-visits";

const seededVisits = [
  { date: "2026-01-02", shortGame: true, round: true },
  { date: "2026-01-07", shortGame: true, round: false },
  { date: "2026-01-08", shortGame: true, round: false },
  { date: "2026-01-09", shortGame: true, round: true },
  { date: "2026-01-12", shortGame: true, round: false },
  { date: "2026-01-13", shortGame: true, round: true },
  { date: "2026-01-14", shortGame: false, round: true },
  { date: "2026-01-16", shortGame: true, round: false },
  { date: "2026-01-20", shortGame: true, round: false },
  { date: "2026-01-22", shortGame: true, round: true },
  { date: "2026-01-26", shortGame: true, round: false },
  { date: "2026-01-29", shortGame: true, round: false },
  { date: "2026-02-06", shortGame: true, round: true },
  { date: "2026-02-07", shortGame: true, round: true },
  { date: "2026-02-12", shortGame: true, round: false },
  { date: "2026-02-13", shortGame: true, round: true },
  { date: "2026-02-20", shortGame: true, round: true },
  { date: "2026-02-21", shortGame: true, round: true },
  { date: "2026-02-23", shortGame: true, round: false },
  { date: "2026-02-24", shortGame: true, round: true },
  { date: "2026-02-25", shortGame: true, round: false },
  { date: "2026-02-26", shortGame: false, round: true },
  { date: "2026-02-27", shortGame: true, round: true },
  { date: "2026-03-02", shortGame: true, round: false },
  { date: "2026-03-05", shortGame: true, round: false },
  { date: "2026-03-06", shortGame: true, round: false },
  { date: "2026-03-20", shortGame: true, round: true },
  { date: "2026-03-31", shortGame: true, round: false },
  { date: "2026-04-02", shortGame: false, round: true },
  { date: "2026-04-03", shortGame: true, round: false },
  { date: "2026-04-04", shortGame: true, round: false },
  { date: "2026-04-09", shortGame: false, round: true },
  { date: "2026-04-13", shortGame: true, round: false },
  { date: "2026-04-15", shortGame: true, round: false },
  { date: "2026-04-17", shortGame: true, round: true },
  { date: "2026-04-18", shortGame: true, round: false },
  { date: "2026-04-22", shortGame: true, round: false },
  { date: "2026-04-23", shortGame: true, round: true },
  { date: "2026-04-24", shortGame: false, round: true },
  { date: "2026-04-27", shortGame: true, round: false },
  { date: "2026-04-29", shortGame: true, round: true },
  { date: "2026-05-05", shortGame: true, round: false },
  { date: "2026-05-08", shortGame: false, round: true },
  { date: "2026-05-11", shortGame: true, round: false },
  { date: "2026-05-12", shortGame: true, round: false },
];

const els = {
  totalUsed: document.querySelector("#totalUsed"),
  balanceLine: document.querySelector("#balanceLine"),
  progressFill: document.querySelector("#progressFill"),
  progressText: document.querySelector("#progressText"),
  shortGameValue: document.querySelector("#shortGameValue"),
  shortGameCount: document.querySelector("#shortGameCount"),
  roundValue: document.querySelector("#roundValue"),
  roundCount: document.querySelector("#roundCount"),
  balanceValue: document.querySelector("#balanceValue"),
  visitsNeeded: document.querySelector("#visitsNeeded"),
  visitForm: document.querySelector("#visitForm"),
  visitDate: document.querySelector("#visitDate"),
  shortGameInput: document.querySelector("#shortGameInput"),
  roundInput: document.querySelector("#roundInput"),
  monthlyGrid: document.querySelector("#monthlyGrid"),
  historyList: document.querySelector("#historyList"),
  resetButton: document.querySelector("#resetButton"),
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function getLocalVisits() {
  try {
    return (JSON.parse(localStorage.getItem(STORAGE_KEY)) || []).map((visit, index) => ({
      id: visit.id || `local-${index}-${visit.date}-${Number(visit.shortGame)}-${Number(visit.round)}`,
      ...visit,
      source: "local",
    }));
  } catch {
    return [];
  }
}

function saveLocalVisits(visits) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(visits));
}

function getDeletedVisitIds() {
  try {
    return JSON.parse(localStorage.getItem(DELETED_STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveDeletedVisitIds(ids) {
  localStorage.setItem(DELETED_STORAGE_KEY, JSON.stringify(ids));
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function describeVisit(visit) {
  if (visit.shortGame && visit.round) return "Short game and 9 holes";
  if (visit.shortGame) return "Short game";
  return "9-hole round";
}

function visitValue(visit) {
  return (visit.shortGame ? SHORT_GAME_PRICE : 0) + (visit.round ? ROUND_PRICE : 0);
}

function monthLabel(dateString) {
  const [year, month] = dateString.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function calculateTotals(visits) {
  const shortGameCount = visits.filter((visit) => visit.shortGame).length;
  const roundCount = visits.filter((visit) => visit.round).length;
  const shortGameValue = shortGameCount * SHORT_GAME_PRICE;
  const roundValue = roundCount * ROUND_PRICE;
  const totalUsed = shortGameValue + roundValue;
  const balance = Math.max(MEMBERSHIP_COST - totalUsed, 0);

  return {
    shortGameCount,
    roundCount,
    shortGameValue,
    roundValue,
    totalUsed,
    balance,
    progress: Math.min((totalUsed / MEMBERSHIP_COST) * 100, 100),
  };
}

function getVisits() {
  const deletedIds = new Set(getDeletedVisitIds());
  const seeded = seededVisits.map((visit, index) => ({
    id: `seed-${index}-${visit.date}-${Number(visit.shortGame)}-${Number(visit.round)}`,
    ...visit,
    source: "seed",
  }));
  const localVisits = getLocalVisits();

  return [...seeded, ...localVisits]
    .filter((visit) => !deletedIds.has(visit.id))
    .sort((a, b) => b.date.localeCompare(a.date));
}

function renderMonthlyTotals(visits) {
  const months = new Map();

  visits.forEach((visit) => {
    const key = visit.date.slice(0, 7);
    const current = months.get(key) || {
      label: monthLabel(visit.date),
      value: 0,
      shortGameCount: 0,
      roundCount: 0,
    };
    current.value += visitValue(visit);
    current.shortGameCount += visit.shortGame ? 1 : 0;
    current.roundCount += visit.round ? 1 : 0;
    months.set(key, current);
  });

  els.monthlyGrid.innerHTML = "";
  [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([, month]) => {
      const item = document.createElement("article");
      item.className = "month-card";
      item.innerHTML = `
        <span>${month.label}</span>
        <strong>${money.format(month.value)}</strong>
        <small>${month.shortGameCount} SG / ${month.roundCount} rounds</small>
      `;
      els.monthlyGrid.append(item);
    });
}

function render() {
  const visits = getVisits();
  const totals = calculateTotals(visits);
  const overage = Math.max(totals.totalUsed - MEMBERSHIP_COST, 0);

  els.totalUsed.textContent = money.format(totals.totalUsed);
  els.shortGameValue.textContent = money.format(totals.shortGameValue);
  els.roundValue.textContent = money.format(totals.roundValue);
  els.balanceValue.textContent = money.format(totals.balance);
  els.shortGameCount.textContent = `${totals.shortGameCount} visits`;
  els.roundCount.textContent = `${totals.roundCount} rounds`;
  els.progressFill.style.width = `${totals.progress}%`;
  els.progressText.textContent = `${Math.round(totals.progress)}%`;

  if (totals.balance > 0) {
    els.balanceLine.textContent = `${money.format(totals.balance)} left to break even`;
    els.visitsNeeded.textContent = `${Math.ceil(totals.balance / SHORT_GAME_PRICE)} short-game visits or ${Math.ceil(
      totals.balance / ROUND_PRICE,
    )} rounds`;
  } else {
    els.balanceLine.textContent = `${money.format(overage)} ahead of break even`;
    els.visitsNeeded.textContent = "Membership is paid back";
  }

  renderMonthlyTotals(visits);

  els.historyList.innerHTML = "";
  visits.forEach((visit) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.dataset.visitId = visit.id;
    item.innerHTML = `
      <strong>${formatDate(visit.date)}</strong>
      <span>${describeVisit(visit)}</span>
      <strong>${money.format(visitValue(visit))}</strong>
      <button type="button" class="delete-button" data-delete-id="${visit.id}" aria-label="Delete ${formatDate(
        visit.date,
      )} ${describeVisit(visit)}">Delete</button>
    `;
    els.historyList.append(item);
  });

  if (!visits.length) {
    els.historyList.innerHTML = '<p class="history-empty">No visits logged yet.</p>';
  }
}

els.visitDate.valueAsDate = new Date();

els.visitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const shortGame = els.shortGameInput.checked;
  const round = els.roundInput.checked;

  if (!shortGame && !round) {
    els.shortGameInput.focus();
    return;
  }

  const localVisits = getLocalVisits();
  localVisits.push({
    id: `local-${Date.now()}`,
    date: els.visitDate.value,
    shortGame,
    round,
  });
  saveLocalVisits(localVisits);
  els.shortGameInput.checked = false;
  els.roundInput.checked = false;
  render();
});

els.resetButton.addEventListener("click", () => {
  saveLocalVisits([]);
  saveDeletedVisitIds([]);
  render();
});

els.historyList.addEventListener("click", (event) => {
  const deleteButton = event.target.closest("[data-delete-id]");
  if (!deleteButton) return;

  const id = deleteButton.dataset.deleteId;
  const localVisits = getLocalVisits();

  if (id.startsWith("local-")) {
    saveLocalVisits(localVisits.filter((visit) => visit.id !== id));
  } else {
    const deletedIds = new Set(getDeletedVisitIds());
    deletedIds.add(id);
    saveDeletedVisitIds([...deletedIds]);
  }

  render();
});

render();
