const MEMBERSHIP_COST = 920;
const SHORT_GAME_PRICE = 8;
const ROUND_PRICE = 15;
const YELLOW_BASKET_PRICE = 5;
const EIGHTEEN_HOLE_PRICE = ROUND_PRICE * 2;
const BUCKET_OPTIONS = {
  small: { label: "Small", value: 11, balls: 45 },
  medium: { label: "Medium", value: 17, balls: 95 },
  large: { label: "Large", value: 22, balls: 150 },
};
const PRACTICE_DAYS = {
  1: { label: "Day 1", minutes: 90 },
  2: { label: "Day 2", minutes: 90 },
  3: { label: "Day 3", minutes: 85 },
};
const PRACTICE_CATEGORIES = ["Technique", "Driver", "Chipping", "Putting", "Bunker", "Pitching"];
const PRACTICE_DAY_CATEGORY_BLOCKS = {
  1: [
    { category: "Technique", minutes: 30 },
    { category: "Driver", minutes: 30 },
    { category: "Putting", minutes: 15 },
    { category: "Putting", minutes: 15 },
  ],
  2: [
    { category: "Technique", minutes: 30 },
    { category: "Pitching", minutes: 20 },
    { category: "Chipping", minutes: 25 },
    { category: "Bunker", minutes: 15 },
  ],
  3: [
    { category: "Technique", minutes: 30 },
    { category: "Putting", minutes: 20 },
    { category: "Putting", minutes: 20 },
    { category: "Chipping", minutes: 15 },
  ],
};
const DATA_SCHEMA_VERSION = 3;
const APP_STATE_KEY = "mariners-point-roi-state-v2";
const LEGACY_VISITS_KEY = "mariners-point-roi-local-visits";
const LEGACY_DELETED_KEY = "mariners-point-roi-deleted-visits";
const SWING_THOUGHT_KEY = "patrick-grimes-last-swing-thought";
const STORAGE_BACKUP_PREFIX = "marinersData_backup_";

const swingThoughts = [
  "Small swings. Big progress.",
  "The range is where confidence gets built.",
  "Better contact starts before the ball.",
  "One focused session beats a hundred lazy swings.",
  "Short game saves the scorecard.",
  "Every bucket has a lesson hiding in it.",
  "Practice with purpose. Play with freedom.",
  "The next good shot is always available.",
  "Tempo first. Score second.",
  "A quiet mind makes a louder strike.",
  "Build the swing before you trust it.",
  "The work you do alone shows up on the first tee.",
  "Clean contact is a habit, not a wish.",
  "Good golf begins with good attention.",
  "Let the target simplify the swing.",
  "One ball, one plan, one committed motion.",
  "Your best swing likes patience.",
  "Chase rhythm before distance.",
  "Pressure gets easier when practice gets honest.",
  "Every rep should know its job.",
  "A balanced finish tells the truth.",
  "Calm hands. Clear target.",
  "Misses are feedback with grass on them.",
  "The boring reps build the exciting shots.",
  "Commit to the shot before you move.",
  "Good practice makes the course feel familiar.",
  "Control the start line, then trust the rest.",
  "The scorecard notices the quiet work.",
  "Make the simple swing repeatable.",
  "Confidence is earned one focused rep at a time.",
  "Start small. Strike clean. Build up.",
  "The best round starts in practice.",
];

const seededVisitsByYear = {};

const els = {
  tabButtons: document.querySelectorAll("[data-tab-target]"),
  tabPanels: document.querySelectorAll("[data-tab-panel]"),
  yearSelect: document.querySelector("#yearSelect"),
  membershipCostInput: document.querySelector("#membershipCostInput"),
  addYearButton: document.querySelector("#addYearButton"),
  heroStatusLabel: document.querySelector("#heroStatusLabel"),
  heroMessage: document.querySelector("#heroMessage"),
  membershipCostValue: document.querySelector("#membershipCostValue"),
  totalValueHero: document.querySelector("#totalValueHero"),
  visitsLogged: document.querySelector("#visitsLogged"),
  avgCostPerVisit: document.querySelector("#avgCostPerVisit"),
  ballsHitValue: document.querySelector("#ballsHitValue"),
  bucketValueHero: document.querySelector("#bucketValueHero"),
  roiRing: document.querySelector("#roiRing"),
  roiRingPercent: document.querySelector("#roiRingPercent"),
  roiRingCaption: document.querySelector("#roiRingCaption"),
  shortGameValue: document.querySelector("#shortGameValue"),
  shortGameCount: document.querySelector("#shortGameCount"),
  roundValue: document.querySelector("#roundValue"),
  roundCount: document.querySelector("#roundCount"),
  yellowBasketValue: document.querySelector("#yellowBasketValue"),
  yellowBasketCount: document.querySelector("#yellowBasketCount"),
  visitForm: document.querySelector("#visitForm"),
  visitDate: document.querySelector("#visitDate"),
  bucketDate: document.querySelector("#bucketDate"),
  shortGameInput: document.querySelector("#shortGameInput"),
  roundInput: document.querySelector("#roundInput"),
  yellowBasketInput: document.querySelector("#yellowBasketInput"),
  smallBucketCount: document.querySelector("#smallBucketCount"),
  mediumBucketCount: document.querySelector("#mediumBucketCount"),
  largeBucketCount: document.querySelector("#largeBucketCount"),
  bucketSpend: document.querySelector("#bucketSpend"),
  monthlyGrid: document.querySelector("#monthlyGrid"),
  historyList: document.querySelector("#historyList"),
  exportButton: document.querySelector("#exportButton"),
  importText: document.querySelector("#importText"),
  importButton: document.querySelector("#importButton"),
  restoreButton: document.querySelector("#restoreButton"),
  resetDataButton: document.querySelector("#resetDataButton"),
  restoreFile: document.querySelector("#restoreFile"),
  confirmDialog: document.querySelector("#confirmDialog"),
  confirmTitle: document.querySelector("#confirmTitle"),
  confirmMessage: document.querySelector("#confirmMessage"),
  confirmActionButton: document.querySelector("#confirmActionButton"),
  toast: document.querySelector("#toast"),
  swingThoughtText: document.querySelector("#swingThoughtText"),
  newQuoteButton: document.querySelector("#newQuoteButton"),
  practiceWeekCount: document.querySelector("#practiceWeekCount"),
  practiceYearCount: document.querySelector("#practiceYearCount"),
  practiceYtdMinutes: document.querySelector("#practiceYtdMinutes"),
  practiceBreakdownChart: document.querySelector("#practiceBreakdownChart"),
  practiceHistoryList: document.querySelector("#practiceHistoryList"),
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function makeEmptyYear() {
  return { roiVisits: [], deletedSeedIds: [], buckets: [] };
}

let pendingStorageNotice = "";

function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

function createStorageBackup(rawValue, reason = "migration") {
  if (!rawValue) return "";
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const key = `${STORAGE_BACKUP_PREFIX}${timestamp}`;
  try {
    localStorage.setItem(
      key,
      JSON.stringify({
        createdAt: new Date().toISOString(),
        reason,
        sourceKey: APP_STATE_KEY,
        rawValue,
      }),
    );
    return key;
  } catch (error) {
    console.warn("Could not create local backup before storage update.", error);
    return "";
  }
}

function fallbackDateForYear(year = new Date().getFullYear()) {
  const normalized = /^\d{4}$/.test(String(year)) ? String(year) : String(new Date().getFullYear());
  return `${normalized}-01-01`;
}

function normalizeRoiVisit(visit = {}, index = 0, year = new Date().getFullYear()) {
  const round = Boolean(visit.round);
  const holes = round && Number(visit.holes) === 18 ? 18 : round ? 9 : 0;
  return {
    ...visit,
    id: visit.id || `recovered-roi-${Date.now()}-${index}`,
    date: /^\d{4}-\d{2}-\d{2}$/.test(visit.date || "") ? visit.date : fallbackDateForYear(year),
    shortGame: Boolean(visit.shortGame),
    round,
    yellowBasket: Boolean(visit.yellowBasket),
    holes,
    source: visit.source || "local",
  };
}

function normalizeBucket(bucket = {}, index = 0, year = new Date().getFullYear()) {
  const size = BUCKET_OPTIONS[bucket.size] ? bucket.size : "small";
  return {
    ...bucket,
    id: bucket.id || `recovered-bucket-${Date.now()}-${index}`,
    date: /^\d{4}-\d{2}-\d{2}$/.test(bucket.date || "") ? bucket.date : fallbackDateForYear(year),
    size,
    value: bucketValue({ size, value: bucket.value }),
    balls: bucketBalls({ size, balls: bucket.balls }),
  };
}

function normalizePracticeBlock(block) {
  if (typeof block === "object" && block !== null) {
    return {
      ...block,
      label: block.label || "Practice block",
      minutes: Number(block.minutes || practiceBlockMinutes(block.label || "")),
      category: practiceBlockCategory(block),
    };
  }
  const label = String(block || "Practice block");
  return {
    label,
    minutes: practiceBlockMinutes(label),
    category: practiceBlockCategory(label),
  };
}

function normalizePracticeLog(log = {}, index = 0) {
  const day = PRACTICE_DAYS[log.day] ? Number(log.day) : 1;
  const blocks = Array.isArray(log.blocks) ? log.blocks.map(normalizePracticeBlock) : [];
  const minutesFromBlocks = blocks.reduce((total, block) => total + Number(block.minutes || 0), 0);
  return {
    ...log,
    id: log.id || `recovered-practice-${Date.now()}-${index}`,
    date: /^\d{4}-\d{2}-\d{2}$/.test(log.date || "") ? log.date : todayDateString(),
    day,
    minutes: minutesFromBlocks || Number(log.minutes || PRACTICE_DAYS[day].minutes || 0),
    blocks,
    notes: String(log.notes || ""),
    createdAt: log.createdAt || new Date().toISOString(),
  };
}

function normalizeYearData(yearData = {}, year = new Date().getFullYear()) {
  return {
    ...yearData,
    roiVisits: Array.isArray(yearData.roiVisits)
      ? yearData.roiVisits.map((visit, index) => normalizeRoiVisit(visit, index, year))
      : [],
    deletedSeedIds: Array.isArray(yearData.deletedSeedIds) ? [...yearData.deletedSeedIds] : [],
    buckets: Array.isArray(yearData.buckets)
      ? yearData.buckets.map((bucket, index) => normalizeBucket(bucket, index, year))
      : [],
  };
}

function normalizeStateShape(input = {}) {
  const base = defaultState();
  const sourceYears = input.years && typeof input.years === "object" ? input.years : {};
  const years = { ...base.years };
  Object.entries(sourceYears).forEach(([year, yearData]) => {
    years[normalizeYear(year)] = normalizeYearData(yearData, year);
  });
  return {
    ...input,
    version: 2,
    appDataVersion: DATA_SCHEMA_VERSION,
    selectedYear: input.selectedYear ? normalizeYear(input.selectedYear) : base.selectedYear,
    years,
    practiceLogs: Array.isArray(input.practiceLogs) ? input.practiceLogs.map(normalizePracticeLog) : [],
  };
}

function selectSwingThought() {
  const previousIndex = Number(localStorage.getItem(SWING_THOUGHT_KEY));
  let nextIndex = Math.floor(Math.random() * swingThoughts.length);
  if (swingThoughts.length > 1 && nextIndex === previousIndex) {
    nextIndex = (nextIndex + 1) % swingThoughts.length;
  }
  localStorage.setItem(SWING_THOUGHT_KEY, String(nextIndex));
  return swingThoughts[nextIndex];
}

function renderSwingThought() {
  if (els.swingThoughtText) els.swingThoughtText.textContent = selectSwingThought();
}

function seedId(year, visit, index) {
  return `seed-${year}-${index}-${visit.date}-${Number(visit.shortGame)}-${Number(visit.round)}`;
}

function normalizeYear(year) {
  return String(year);
}

function defaultState() {
  const currentYear = String(new Date().getFullYear());
  const years = {};
  ["2026", "2027", "2028", "2029", "2030", currentYear].forEach((year) => {
    years[year] = makeEmptyYear();
  });
  return { version: 2, appDataVersion: DATA_SCHEMA_VERSION, selectedYear: "2026", years, practiceLogs: [] };
}

function blankResetState() {
  const nextState = defaultState();
  Object.keys(seededVisitsByYear).forEach((year) => {
    nextState.years[year] = nextState.years[year] || makeEmptyYear();
    nextState.years[year].deletedSeedIds = seededVisitsByYear[year].map((visit, index) => seedId(year, visit, index));
  });
  return nextState;
}

function migrateLegacyState() {
  const rawExisting = localStorage.getItem(APP_STATE_KEY);
  if (rawExisting) {
    let existing;
    try {
      existing = JSON.parse(rawExisting);
    } catch (error) {
      createStorageBackup(rawExisting, "corrupt-json");
      pendingStorageNotice = "Saved tracker data could not be read, so the app loaded safely without overwriting it.";
      console.warn("Could not parse saved tracker data.", error);
      return defaultState();
    }

    if (existing?.years) {
      const shouldMigrate = existing.appDataVersion !== DATA_SCHEMA_VERSION || existing.version !== 2;
      if (shouldMigrate) createStorageBackup(rawExisting, "schema-migration");
      const normalized = normalizeStateShape(existing);
      if (shouldMigrate || JSON.stringify(existing) !== JSON.stringify(normalized)) {
        saveState(normalized);
        pendingStorageNotice = "We found older saved data and safely upgraded it.";
      }
      return normalized;
    }

    createStorageBackup(rawExisting, "incompatible-shape");
    pendingStorageNotice = "Saved tracker data used an older format, so the app loaded safely without deleting it.";
    return defaultState();
  }

  const state = defaultState();
  const legacyVisits = readJson(LEGACY_VISITS_KEY, []);
  const legacyDeleted = readJson(LEGACY_DELETED_KEY, []);
  if (legacyVisits.length || legacyDeleted.length) {
    createStorageBackup(
      JSON.stringify({
        [LEGACY_VISITS_KEY]: legacyVisits,
        [LEGACY_DELETED_KEY]: legacyDeleted,
      }),
      "legacy-key-migration",
    );
    pendingStorageNotice = "We found older saved data and safely upgraded it.";
  }

  state.years["2026"].roiVisits = legacyVisits.map((visit, index) => ({
    id: visit.id || `local-${index}-${visit.date}-${Number(visit.shortGame)}-${Number(visit.round)}`,
    date: visit.date,
    shortGame: Boolean(visit.shortGame),
    round: Boolean(visit.round),
    holes: visit.round ? 9 : 0,
    source: "local",
  }));
  state.years["2026"].deletedSeedIds = legacyDeleted;
  if (legacyVisits.length || legacyDeleted.length) saveState(state);
  return state;
}

let state = migrateLegacyState();

function saveState(nextState = state) {
  nextState.version = 2;
  nextState.appDataVersion = DATA_SCHEMA_VERSION;
  localStorage.setItem(APP_STATE_KEY, JSON.stringify(nextState));
  window.dispatchEvent(new CustomEvent("roi-state-saved", { detail: JSON.parse(JSON.stringify(nextState)) }));
}

function getSelectedYear() {
  return normalizeYear(state.selectedYear);
}

function ensureYear(year) {
  const normalized = normalizeYear(year);
  if (!state.years || typeof state.years !== "object") state.years = {};
  if (!state.years[normalized]) state.years[normalized] = makeEmptyYear();
  state.years[normalized] = normalizeYearData(state.years[normalized], normalized);
  return state.years[normalized];
}

function getPracticeLogs() {
  if (!Array.isArray(state.practiceLogs)) state.practiceLogs = [];
  return state.practiceLogs;
}

function getMembershipCost(year = getSelectedYear()) {
  const configured = Number(ensureYear(year).membershipCost);
  return Number.isFinite(configured) && configured > 0 ? configured : MEMBERSHIP_COST;
}

function getSeededVisits(year) {
  return (seededVisitsByYear[year] || []).map((visit, index) => ({
    id: seedId(year, visit, index),
    holes: visit.round ? 9 : 0,
    ...visit,
    source: "seed",
    type: "roi",
  }));
}

function getRoiVisits(year) {
  const yearData = ensureYear(year);
  const deletedIds = new Set(yearData.deletedSeedIds || []);
  const seeded = getSeededVisits(year).filter((visit) => !deletedIds.has(visit.id));
  const local = (yearData.roiVisits || []).filter((visit) => !deletedIds.has(visit.id)).map((visit) => ({ ...visit, source: "local", type: "roi" }));
  return [...seeded, ...local].sort((a, b) => b.date.localeCompare(a.date));
}

function getBuckets(year) {
  return (ensureYear(year).buckets || []).map((bucket) => ({ ...bucket, type: "bucket" }));
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatLastLoggedDate(dateString) {
  if (!dateString) return "Not logged yet";
  const [year, month, day] = dateString.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  const selectedYear = Number(getSelectedYear());
  const options = { month: "short", day: "numeric" };
  if (year !== currentYear || year !== selectedYear) options.year = "numeric";
  return `Last logged: ${new Date(year, month - 1, day).toLocaleDateString("en-US", options)}`;
}

function formatPracticeLastDate(dateString) {
  if (!dateString) return "Last: Not yet";
  const [year, month, day] = dateString.split("-").map(Number);
  const currentYear = new Date().getFullYear();
  const options = { month: "short", day: "numeric" };
  if (year !== currentYear) options.year = "numeric";
  return `Last: ${new Date(year, month - 1, day).toLocaleDateString("en-US", options)}`;
}

function monthLabel(dateString) {
  const [year, month] = dateString.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function visitValue(visit) {
  const roundValue = visit.round ? (Number(visit.holes) === 18 ? EIGHTEEN_HOLE_PRICE : ROUND_PRICE) : 0;
  return (visit.shortGame ? SHORT_GAME_PRICE : 0) + roundValue + (visit.yellowBasket ? YELLOW_BASKET_PRICE : 0);
}

function roundUnits(visit) {
  if (!visit.round) return 0;
  return Number(visit.holes) === 18 ? 2 : 1;
}

function bucketValue(bucket) {
  const configured = Number(bucket.value);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return BUCKET_OPTIONS[bucket.size]?.value || 0;
}

function bucketBalls(bucket) {
  const configured = Number(bucket.balls);
  if (Number.isFinite(configured) && configured > 0) return configured;
  return BUCKET_OPTIONS[bucket.size]?.balls || 0;
}

function latestDate(items, predicate) {
  return items.reduce((latest, item) => {
    if (!predicate(item)) return latest;
    return !latest || item.date > latest ? item.date : latest;
  }, "");
}

function updateLastLoggedDates(roiVisits, buckets) {
  const lastDates = {
    range: latestDate(buckets, (bucket) => bucket.size === "small"),
    "small-bucket": latestDate(buckets, (bucket) => bucket.size === "small"),
    "medium-bucket": latestDate(buckets, (bucket) => bucket.size === "medium"),
    "large-bucket": latestDate(buckets, (bucket) => bucket.size === "large"),
    "short-game": latestDate(roiVisits, (visit) => Boolean(visit.shortGame)),
    "nine-holes": latestDate(roiVisits, (visit) => Boolean(visit.round) && Number(visit.holes || 9) === 9),
    "yellow-basket": latestDate(roiVisits, (visit) => Boolean(visit.yellowBasket)),
  };

  document.querySelectorAll("[data-last-logged]").forEach((element) => {
    element.textContent = formatLastLoggedDate(lastDates[element.dataset.lastLogged]);
  });
}

function describeVisit(visit) {
  const roundLabel = Number(visit.holes) === 18 ? "18 holes" : "9 holes";
  const parts = [];
  if (visit.shortGame) parts.push("Short game");
  if (visit.round) parts.push(roundLabel);
  if (visit.yellowBasket) parts.push("Yellow Basket");
  return parts.join(" and ");
}

function describeBucket(bucket) {
  const option = BUCKET_OPTIONS[bucket.size];
  return `${option?.label || bucket.size} bucket`;
}

function calculateRoiTotals(visits, membershipCost = MEMBERSHIP_COST) {
  const shortGameCount = visits.filter((visit) => visit.shortGame).length;
  const roundCount = visits.reduce((total, visit) => total + roundUnits(visit), 0);
  const yellowBasketCount = visits.filter((visit) => visit.yellowBasket).length;
  const shortGameValue = shortGameCount * SHORT_GAME_PRICE;
  const roundValue = visits.reduce(
    (total, visit) => total + (visit.round ? (Number(visit.holes) === 18 ? EIGHTEEN_HOLE_PRICE : ROUND_PRICE) : 0),
    0,
  );
  const yellowBasketValue = yellowBasketCount * YELLOW_BASKET_PRICE;
  const totalUsed = shortGameValue + roundValue + yellowBasketValue;
  const balance = Math.max(membershipCost - totalUsed, 0);
  const visitCount = visits.length;
  const roiPercent = membershipCost > 0 ? (totalUsed / membershipCost) * 100 : 0;
  const breakEvenDate = visits
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date))
    .reduce(
      (result, visit) => {
        if (result.date) return result;
        result.runningTotal += visitValue(visit);
        if (result.runningTotal >= membershipCost) result.date = visit.date;
        return result;
      },
      { runningTotal: 0, date: "" },
    ).date;

  return {
    shortGameCount,
    roundCount,
    yellowBasketCount,
    shortGameValue,
    roundValue,
    yellowBasketValue,
    totalUsed,
    balance,
    visitCount,
    netRoi: totalUsed - membershipCost,
    averageCostPerVisit: visitCount ? membershipCost / visitCount : 0,
    roiPercent,
    breakEvenDate,
    progress: Math.min(roiPercent, 100),
  };
}

function calculateBucketTotals(buckets) {
  return buckets.reduce(
    (totals, bucket) => {
      totals[bucket.size] += 1;
      totals.spend += bucketValue(bucket);
      totals.balls += bucketBalls(bucket);
      return totals;
    },
    { small: 0, medium: 0, large: 0, spend: 0, balls: 0 },
  );
}

function formatSignedMoney(value) {
  const formatted = money.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

function membershipMessage(roiTotals) {
  if (roiTotals.netRoi >= 0) return `${formatSignedMoney(roiTotals.netRoi)} ahead`;
  return `${money.format(roiTotals.balance)} left to break even`;
}

function renderYearOptions() {
  const years = new Set(["2026", "2027", "2028", "2029", "2030", ...Object.keys(state.years)]);
  els.yearSelect.innerHTML = "";
  [...years]
    .sort()
    .forEach((year) => {
      const option = document.createElement("option");
      option.value = year;
      option.textContent = year;
      els.yearSelect.append(option);
    });
  els.yearSelect.value = getSelectedYear();
}

function renderMonthlyTotals(roiVisits, buckets) {
  const months = new Map();

  roiVisits.forEach((visit) => {
    const key = visit.date.slice(0, 7);
    const current = months.get(key) || {
      label: monthLabel(visit.date),
      shortGameValue: 0,
      roundValue: 0,
      yellowBasketValue: 0,
      bucketValue: 0,
      shortGameCount: 0,
      roundCount: 0,
      yellowBasketCount: 0,
      bucketCount: 0,
    };
    current.shortGameValue += visit.shortGame ? SHORT_GAME_PRICE : 0;
    current.roundValue += visit.round ? (Number(visit.holes) === 18 ? EIGHTEEN_HOLE_PRICE : ROUND_PRICE) : 0;
    current.yellowBasketValue += visit.yellowBasket ? YELLOW_BASKET_PRICE : 0;
    current.shortGameCount += visit.shortGame ? 1 : 0;
    current.roundCount += roundUnits(visit);
    current.yellowBasketCount += visit.yellowBasket ? 1 : 0;
    months.set(key, current);
  });

  buckets.forEach((bucket) => {
    const key = bucket.date.slice(0, 7);
    const current = months.get(key) || {
      label: monthLabel(bucket.date),
      shortGameValue: 0,
      roundValue: 0,
      yellowBasketValue: 0,
      bucketValue: 0,
      shortGameCount: 0,
      roundCount: 0,
      yellowBasketCount: 0,
      bucketCount: 0,
    };
    current.bucketValue += bucketValue(bucket);
    current.bucketCount += 1;
    months.set(key, current);
  });

  els.monthlyGrid.innerHTML = "";
  if (!months.size) {
    els.monthlyGrid.innerHTML = '<p class="empty-note">No activity for this year yet.</p>';
    return;
  }

  const sortedMonths = [...months.entries()].sort(([a], [b]) => a.localeCompare(b));
  const maxTotal = Math.max(
    ...sortedMonths.map(([, month]) => month.shortGameValue + month.roundValue + month.yellowBasketValue + month.bucketValue),
    1,
  );

  sortedMonths.forEach(([, month]) => {
      const total = month.shortGameValue + month.roundValue + month.yellowBasketValue + month.bucketValue;
      const shortHeight = (month.shortGameValue / maxTotal) * 100;
      const roundHeight = (month.roundValue / maxTotal) * 100;
      const yellowHeight = (month.yellowBasketValue / maxTotal) * 100;
      const bucketHeight = (month.bucketValue / maxTotal) * 100;
      const segment = (className, value, height) =>
        value > 0
          ? `<span class="bar-segment ${className}" style="height: ${height}%" title="${money.format(value)}"><span>${height >= 14 ? money.format(value) : ""}</span></span>`
          : "";
      const item = document.createElement("article");
      item.className = "month-bar-card";
      item.innerHTML = `
        <strong>${money.format(total)}</strong>
        <div class="bar-shell" aria-label="${month.label} ${money.format(total)} total">
          ${segment("bar-bucket", month.bucketValue, bucketHeight)}
          ${segment("bar-yellow", month.yellowBasketValue, yellowHeight)}
          ${segment("bar-round", month.roundValue, roundHeight)}
          ${segment("bar-short", month.shortGameValue, shortHeight)}
        </div>
        <span>${month.label.replace(" ", " '")}</span>
      `;
      els.monthlyGrid.append(item);
    });
}

function renderHistory(roiVisits, buckets) {
  const activity = [
    ...roiVisits.map((item) => ({ ...item, sortValue: item.date, value: visitValue(item) })),
    ...buckets.map((item) => ({ ...item, sortValue: item.date, value: bucketValue(item) })),
  ].sort((a, b) => b.sortValue.localeCompare(a.sortValue));

  els.historyList.innerHTML = "";
  if (!activity.length) {
    els.historyList.innerHTML = '<p class="empty-note">No visits or buckets logged for this year.</p>';
    return;
  }

  activity.forEach((item) => {
    const row = document.createElement("article");
    row.className = `history-item ${item.type === "bucket" ? "bucket-row" : ""}`;
    const detail = item.type === "bucket" ? `${describeBucket(item)} · ${bucketBalls(item)} balls` : describeVisit(item);
    row.innerHTML = `
      <strong>${formatDate(item.date)}</strong>
      <span>${detail}</span>
      <strong>${money.format(item.value)}</strong>
      <button type="button" class="delete-button" data-delete-type="${item.type}" data-delete-id="${item.id}">
        Delete
      </button>
    `;
    els.historyList.append(row);
  });
}

function weekStart(date = new Date()) {
  const start = new Date(date);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function nextPracticeDay(day) {
  if (Number(day) === 1) return 2;
  if (Number(day) === 2) return 3;
  return 1;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getCheckedPracticeBlocks(day) {
  return [...document.querySelectorAll(`[data-block-day="${day}"]:checked`)].map((input) => ({
    label: input.value,
    minutes: Number(input.dataset.blockMinutes || 0),
    category: input.dataset.blockCategory,
  }));
}

function practiceBlockMinutes(block) {
  if (typeof block === "object" && block !== null) return Number(block.minutes || 0);
  const match = String(block).match(/^(\d+)\s*min/i);
  return match ? Number(match[1]) : 0;
}

function practiceBlockCategory(block) {
  if (typeof block === "object" && block !== null && PRACTICE_CATEGORIES.includes(block.category)) {
    return block.category;
  }
  const label = String(typeof block === "object" && block !== null ? block.label : block || "").toLowerCase();
  if (label.includes("technique")) return "Technique";
  if (label.includes("driver")) return "Driver";
  if (label.includes("bunker")) return "Bunker";
  if (label.includes("chipping") || label.includes("chip")) return "Chipping";
  if (label.includes("putting") || label.includes("4-5-6") || label.includes("lag drill")) return "Putting";
  if (label.includes("wedge") || label.includes("pitching")) return "Pitching";
  return "Technique";
}

function normalizePracticeLabel(label) {
  return String(label || "")
    .toLowerCase()
    .replace(/[·:]/g, " ")
    .replace(/\bwork\b/g, "")
    .replace(/\bpractice\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function practiceBlockMatchesRow(block, rowInput) {
  const blockLabel = normalizePracticeLabel(typeof block === "object" && block !== null ? block.label : block);
  const rowLabel = normalizePracticeLabel(rowInput.value);
  if (blockLabel && rowLabel && blockLabel === rowLabel) return true;
  if (rowLabel.includes("technique") && blockLabel.includes("technique")) return true;
  if (rowLabel.includes("driver accuracy") && blockLabel.includes("driver")) return true;
  if (rowLabel.includes("4-5-6 putting drill") && blockLabel.includes("4-5-6")) return true;
  if (rowLabel.includes("endzone lag putting") && blockLabel.includes("endzone lag")) return true;
  if (rowLabel.includes("pitching") && (blockLabel.includes("pitching") || blockLabel.includes("wedge"))) return true;
  if (rowLabel.includes("chipping") && blockLabel.includes("chipping")) return true;
  if (rowLabel.includes("bunker") && blockLabel.includes("bunker")) return true;
  if (rowLabel.includes("chipping") && blockLabel.includes("chipping and bunker")) return true;
  if (rowLabel.includes("bunker") && blockLabel.includes("chipping and bunker")) return true;
  return false;
}

function practiceBlockBreakdownParts(block) {
  const label = String(typeof block === "object" && block !== null ? block.label : block || "");
  const lowerLabel = label.toLowerCase();
  const minutes = practiceBlockMinutes(block);
  if (lowerLabel.includes("chipping and bunker") && minutes >= 40) {
    return [
      { category: "Chipping", minutes: 25 },
      { category: "Bunker", minutes: 15 },
    ];
  }
  return [{ category: practiceBlockCategory(block), minutes }];
}

function lastPracticeRowDate(rowInput, logs) {
  const rowCategory = rowInput.dataset.blockCategory;
  const rowDay = Number(rowInput.dataset.blockDay);
  const rowMinutes = Number(rowInput.dataset.blockMinutes || 0);
  let fallbackDate = "";

  for (const log of logs) {
    const blocks = Array.isArray(log.blocks) ? log.blocks : [];
    if (!blocks.length) {
      const matchingTemplate = (PRACTICE_DAY_CATEGORY_BLOCKS[log.day] || []).some(
        (block) => block.category === rowCategory && block.minutes === rowMinutes && Number(log.day) === rowDay,
      );
      if (matchingTemplate) fallbackDate ||= log.date;
      continue;
    }

    const exactMatch = blocks.some((block) => practiceBlockMatchesRow(block, rowInput));
    if (exactMatch) return log.date;

    const categoryMatch = blocks.some((block) => {
      const blockLabel = normalizePracticeLabel(typeof block === "object" && block !== null ? block.label : block);
      return !blockLabel && practiceBlockCategory(block) === rowCategory;
    });
    if (categoryMatch) fallbackDate ||= log.date;
  }

  return fallbackDate;
}

function practiceLogMinutes(log) {
  const blocks = Array.isArray(log.blocks) ? log.blocks : [];
  const blockMinutes = blocks.reduce((total, block) => total + practiceBlockMinutes(block), 0);
  return blockMinutes || Number(log.minutes || 0);
}

function practiceBreakdown(logs) {
  const totals = Object.fromEntries(PRACTICE_CATEGORIES.map((category) => [category, 0]));
  logs.forEach((log) => {
    const blocks = Array.isArray(log.blocks) ? log.blocks : [];
    if (!blocks.length) {
      let remainingMinutes = Number(log.minutes || 0);
      (PRACTICE_DAY_CATEGORY_BLOCKS[log.day] || []).forEach((block) => {
        const minutes = Math.min(block.minutes, Math.max(remainingMinutes, 0));
        totals[block.category] += minutes;
        remainingMinutes -= minutes;
      });
      return;
    }
    blocks.forEach((block) => {
      practiceBlockBreakdownParts(block).forEach((part) => {
        if (!PRACTICE_CATEGORIES.includes(part.category)) return;
        totals[part.category] += Number(part.minutes || 0);
      });
    });
  });
  return totals;
}

function renderPracticeBreakdown(logs) {
  const totals = practiceBreakdown(logs);
  const totalMinutes = Object.values(totals).reduce((sum, value) => sum + value, 0);
  if (!totalMinutes) {
    els.practiceBreakdownChart.innerHTML =
      '<p class="empty-note">No practice data yet. Log a session to see your breakdown.</p>';
    return;
  }

  els.practiceBreakdownChart.innerHTML = PRACTICE_CATEGORIES.map((category) => {
    const minutes = totals[category];
    const percent = (minutes / totalMinutes) * 100;
    const percentLabel = percent % 1 === 0 ? `${percent.toFixed(0)}%` : `${percent.toFixed(1)}%`;
    return `
      <div class="practice-breakdown-row" style="--practice-percent: ${minutes ? Math.max(percent, 2) : 0}%; --practice-color: var(--practice-${category.toLowerCase()});">
        <div class="practice-breakdown-label">
          <strong>${category}</strong>
          <span>${minutes.toLocaleString("en-US")} min · ${percentLabel}</span>
        </div>
        <div class="practice-breakdown-track" aria-label="${category}: ${minutes} minutes, ${percentLabel}">
          <span></span>
        </div>
      </div>
    `;
  }).join("");
}

function checkedPracticeMinutes(day) {
  return getCheckedPracticeBlocks(day).reduce((total, block) => total + block.minutes, 0);
}

function updatePracticeCardMinutes(day) {
  const value = document.querySelector(`[data-practice-completed="${day}"]`);
  if (value) value.textContent = checkedPracticeMinutes(day);
}

function updatePracticeCardSummaries() {
  Object.keys(PRACTICE_DAYS).forEach(updatePracticeCardMinutes);
}

function updatePracticeLastDates(logs) {
  document.querySelectorAll("[data-block-day]").forEach((input) => {
    const lastDate = input.closest(".check-row")?.querySelector("[data-practice-last]");
    if (!lastDate) return;
    lastDate.textContent = formatPracticeLastDate(lastPracticeRowDate(input, logs));
  });
}

function renderPractice() {
  const logs = getPracticeLogs()
    .slice()
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
  const start = weekStart();
  const currentYear = new Date().getFullYear();
  const completedThisWeek = logs.filter((log) => {
    const [year, month, day] = log.date.split("-").map(Number);
    return new Date(year, month - 1, day) >= start;
  }).length;
  const currentYearLogs = logs.filter((log) => Number(String(log.date).slice(0, 4)) === currentYear);
  const ytdMinutes = currentYearLogs.reduce((total, log) => total + practiceLogMinutes(log), 0);

  els.practiceWeekCount.textContent = completedThisWeek;
  els.practiceYearCount.textContent = currentYearLogs.length;
  els.practiceYtdMinutes.textContent = `${ytdMinutes.toLocaleString("en-US")} min`;
  renderPracticeBreakdown(currentYearLogs);
  updatePracticeLastDates(logs);

  els.practiceHistoryList.innerHTML = "";
  if (!logs.length) {
    els.practiceHistoryList.innerHTML = '<p class="empty-note">No practice sessions logged yet.</p>';
    updatePracticeCardSummaries();
    return;
  }

  logs.forEach((log) => {
    const item = document.createElement("article");
    item.className = "practice-history-item";
    const blocks = Array.isArray(log.blocks) ? log.blocks : [];
    const blockLabels = blocks.map((block) => (typeof block === "string" ? block : block.label)).filter(Boolean);
    const blockText = blockLabels.length ? blockLabels.join(", ") : "No blocks saved";
    const notes = log.notes ? `<em>${escapeHtml(log.notes)}</em>` : "";
    item.innerHTML = `
      <strong>${formatDate(log.date)}</strong>
      <span>${PRACTICE_DAYS[log.day].label} · ${practiceLogMinutes(log)} min</span>
      <p><b>${escapeHtml(blockText)}</b>${notes}</p>
      <button type="button" class="delete-button" data-delete-practice="${log.id}">Delete</button>
    `;
    els.practiceHistoryList.append(item);
  });
  updatePracticeCardSummaries();
}

function render() {
  const year = getSelectedYear();
  ensureYear(year);
  renderYearOptions();

  const roiVisits = getRoiVisits(year);
  const buckets = getBuckets(year);
  const membershipCost = getMembershipCost(year);
  const roiTotals = calculateRoiTotals(roiVisits, membershipCost);
  const bucketTotals = calculateBucketTotals(buckets);

  if (document.activeElement !== els.membershipCostInput) {
    els.membershipCostInput.value = membershipCost;
  }
  els.shortGameValue.textContent = money.format(roiTotals.shortGameValue);
  els.roundValue.textContent = money.format(roiTotals.roundValue);
  els.yellowBasketValue.textContent = money.format(roiTotals.yellowBasketValue);
  els.shortGameCount.textContent = `${roiTotals.shortGameCount} visits`;
  els.roundCount.textContent = `${roiTotals.roundCount} ${roiTotals.roundCount === 1 ? "round" : "rounds"}`;
  els.yellowBasketCount.textContent = `${roiTotals.yellowBasketCount} logged`;
  els.heroStatusLabel.textContent = roiTotals.netRoi >= 0 ? "Ahead on membership" : "Break-even progress";
  els.heroMessage.textContent = membershipMessage(roiTotals);
  els.membershipCostValue.textContent = money.format(membershipCost);
  els.totalValueHero.textContent = money.format(roiTotals.totalUsed);
  els.visitsLogged.textContent = roiTotals.visitCount;
  els.avgCostPerVisit.textContent = roiTotals.visitCount ? money.format(roiTotals.averageCostPerVisit) : "-";
  els.roiRing.style.setProperty("--progress", `${roiTotals.progress * 3.6}deg`);
  els.roiRingPercent.textContent = `${Math.round(roiTotals.roiPercent)}%`;
  els.roiRingCaption.textContent = roiTotals.roiPercent >= 100 ? "membership paid off" : "toward break-even";
  els.ballsHitValue.textContent = bucketTotals.balls.toLocaleString("en-US");
  els.bucketValueHero.textContent = money.format(bucketTotals.spend);

  els.smallBucketCount.textContent = bucketTotals.small;
  els.mediumBucketCount.textContent = bucketTotals.medium;
  els.largeBucketCount.textContent = bucketTotals.large;
  els.bucketSpend.textContent = money.format(bucketTotals.spend);

  renderMonthlyTotals(roiVisits, buckets);
  renderHistory(roiVisits, buckets);
  updateLastLoggedDates(roiVisits, buckets);
  renderPractice();
}

function selectedYearDate() {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${getSelectedYear()}-${month}-${day}`;
}

function todayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function setDefaultDates() {
  const date = selectedYearDate();
  els.visitDate.value = date;
  els.bucketDate.value = date;
}

function alignDateToSelectedYear(input) {
  const selectedYear = getSelectedYear();
  if (!input.value || input.value.slice(0, 4) === selectedYear) return input.value;
  return `${selectedYear}${input.value.slice(4)}`;
}

function confirmAction({ title, message, actionLabel = "Confirm", destructive = false }) {
  els.confirmTitle.textContent = title;
  els.confirmMessage.textContent = message;
  els.confirmActionButton.textContent = actionLabel;
  els.confirmActionButton.classList.toggle("danger-button", destructive);
  return new Promise((resolve) => {
    const closeHandler = () => {
      els.confirmDialog.removeEventListener("close", closeHandler);
      els.confirmActionButton.classList.remove("danger-button");
      resolve(els.confirmDialog.returnValue === "confirm");
    };
    els.confirmDialog.addEventListener("close", closeHandler);
    els.confirmDialog.showModal();
  });
}

function addRoiVisit({ date, shortGame, round, yellowBasket = false, holes = 9 }) {
  const year = getSelectedYear();
  const yearData = ensureYear(year);
  yearData.roiVisits.push({
    id: `local-roi-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date,
    shortGame,
    round,
    yellowBasket,
    holes: round ? Number(holes) : 0,
    source: "local",
  });
  saveState();
}

function addBucket({ date, size }) {
  const year = getSelectedYear();
  const yearData = ensureYear(year);
  const option = BUCKET_OPTIONS[size] || { value: 0, balls: 0 };
  yearData.buckets.push({
    id: `local-bucket-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date,
    size,
    value: option.value,
    balls: option.balls,
  });
  saveState();
}

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(showToast.timeout);
  showToast.timeout = window.setTimeout(() => els.toast.classList.remove("show"), 1800);
}

function confirmQuickLog(button, message) {
  if (navigator.vibrate) navigator.vibrate(18);
  const label = button.querySelector("span");
  const originalText = button.textContent;
  const originalLabel = label?.textContent;
  button.disabled = true;
  button.classList.add("is-logged");
  if (label) {
    label.textContent = "Logged";
  } else {
    button.textContent = "Logged";
  }
  showToast(message);
  window.setTimeout(() => {
    if (label) {
      label.textContent = originalLabel;
    } else {
      button.textContent = originalText;
    }
    button.classList.remove("is-logged");
    button.disabled = false;
  }, 850);
}

function setActiveTab(tabName) {
  els.tabButtons.forEach((button) => {
    const isActive = button.dataset.tabTarget === tabName;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  els.tabPanels.forEach((panel) => {
    const isActive = panel.dataset.tabPanel === tabName;
    panel.classList.toggle("active", isActive);
    panel.hidden = !isActive;
  });
}

function completePracticeDay(day, button) {
  if (button.disabled) return;
  const notesInput = document.querySelector(`#practiceNotes${day}`);
  const checkedBlocks = getCheckedPracticeBlocks(day);
  if (!checkedBlocks.length) {
    showToast("Select at least one practice block to log.");
    if (navigator.vibrate) navigator.vibrate([12, 24, 12]);
    return;
  }
  const completedMinutes = checkedBlocks.reduce((total, block) => total + block.minutes, 0);
  const today = todayDateString();
  getPracticeLogs().push({
    id: `practice-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    date: today,
    day: Number(day),
    minutes: completedMinutes,
    blocks: checkedBlocks,
    notes: notesInput.value.trim(),
    createdAt: new Date().toISOString(),
  });
  saveState();
  document.querySelectorAll(`[data-block-day="${day}"]`).forEach((input) => {
    input.checked = false;
  });
  notesInput.value = "";
  confirmQuickLog(button, `${PRACTICE_DAYS[day].label} logged.`);
  renderPractice();
}

function exportBackup() {
  const payload = {
    exportedAt: new Date().toISOString(),
    app: "mariners-point-roi-tracker",
    appDataVersion: DATA_SCHEMA_VERSION,
    storageKey: APP_STATE_KEY,
    state,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `mariners-point-roi-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function clearAppStorage() {
  [APP_STATE_KEY, LEGACY_VISITS_KEY, LEGACY_DELETED_KEY, SWING_THOUGHT_KEY].forEach((key) => {
    localStorage.removeItem(key);
  });
  Object.keys(localStorage)
    .filter((key) => key.startsWith(STORAGE_BACKUP_PREFIX))
    .forEach((key) => localStorage.removeItem(key));
}

function parseBool(value) {
  return ["true", "yes", "1", "x"].includes(String(value || "").trim().toLowerCase());
}

function importCsvRows(csvText) {
  const year = getSelectedYear();
  const yearData = ensureYear(year);
  const rows = csvText
    .split(/\n+/)
    .map((row) => row.trim())
    .filter(Boolean);
  let imported = 0;

  rows.forEach((row) => {
    const [date, shortGame, round, small = "0", medium = "0", large = "0", holes = "9", yellowBasket = "false"] = row
      .split(",")
      .map((cell) => cell.trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    if (date.slice(0, 4) !== year) return;

    const hasShortGame = parseBool(shortGame);
    const hasRound = parseBool(round);
    const hasYellowBasket = parseBool(yellowBasket);
    if (hasShortGame || hasRound || hasYellowBasket) {
      yearData.roiVisits.push({
        id: `import-roi-${Date.now()}-${imported}`,
        date,
        shortGame: hasShortGame,
        round: hasRound,
        yellowBasket: hasYellowBasket,
        holes: hasRound && Number(holes) === 18 ? 18 : 9,
        source: "import",
      });
      imported += 1;
    }

    [
      ["small", Number(small) || 0],
      ["medium", Number(medium) || 0],
      ["large", Number(large) || 0],
    ].forEach(([size, count]) => {
      const option = BUCKET_OPTIONS[size] || { value: 0, balls: 0 };
      for (let index = 0; index < count; index += 1) {
        yearData.buckets.push({
          id: `import-bucket-${Date.now()}-${size}-${imported}-${index}`,
          date,
          size,
          value: option.value,
          balls: option.balls,
        });
        imported += 1;
      }
    });
  });

  saveState();
  return imported;
}

els.yearSelect.addEventListener("change", () => {
  state.selectedYear = els.yearSelect.value;
  ensureYear(state.selectedYear);
  const currentMonthDay = els.visitDate.value.slice(4) || "-01-01";
  els.visitDate.value = `${state.selectedYear}${currentMonthDay}`;
  els.bucketDate.value = `${state.selectedYear}${currentMonthDay}`;
  saveState();
  render();
});

els.membershipCostInput.addEventListener("input", () => {
  const rawCost = els.membershipCostInput.value.trim();
  const yearData = ensureYear(getSelectedYear());
  if (!rawCost) {
    delete yearData.membershipCost;
  } else {
    const nextCost = Math.max(Number(rawCost) || 0, 0);
    yearData.membershipCost = nextCost || MEMBERSHIP_COST;
  }
  saveState();
  render();
});

els.membershipCostInput.addEventListener("blur", () => {
  render();
});

els.addYearButton.addEventListener("click", () => {
  const year = window.prompt("Add tracking year", String(new Date().getFullYear() + 1));
  if (!/^\d{4}$/.test(year || "")) return;
  state.selectedYear = year;
  ensureYear(year);
  saveState();
  render();
});

els.visitForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const shortGame = els.shortGameInput.checked;
  const round = els.roundInput.checked;
  const yellowBasket = els.yellowBasketInput.checked;
  if (!shortGame && !round && !yellowBasket) {
    els.shortGameInput.focus();
    return;
  }

  const date = alignDateToSelectedYear(els.visitDate);
  els.visitDate.value = date;
  addRoiVisit({ date, shortGame, round, yellowBasket, holes: 9 });
  els.shortGameInput.checked = false;
  els.roundInput.checked = false;
  els.yellowBasketInput.checked = false;
  render();
});

document.querySelectorAll("[data-quick-action]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.disabled) return;
    const date = selectedYearDate();
    if (button.dataset.quickAction === "range") {
      els.bucketDate.value = date;
      addBucket({ date, size: "small" });
      confirmQuickLog(button, "Small bucket logged: $11 and 45 balls.");
    }
    if (button.dataset.quickAction === "short-game") {
      els.visitDate.value = date;
      addRoiVisit({ date, shortGame: true, round: false });
      confirmQuickLog(button, "Short game logged.");
    }
    if (button.dataset.quickAction === "nine-holes") {
      els.visitDate.value = date;
      addRoiVisit({ date, shortGame: false, round: true, holes: 9 });
      confirmQuickLog(button, "9 holes logged.");
    }
    if (button.dataset.quickAction === "yellow-basket") {
      els.visitDate.value = date;
      addRoiVisit({ date, shortGame: false, round: false, yellowBasket: true });
      confirmQuickLog(button, "Yellow Basket logged.");
    }
    render();
  });
});

document.querySelectorAll("[data-bucket-size]").forEach((button) => {
  button.addEventListener("click", () => {
    const date = alignDateToSelectedYear(els.bucketDate);
    els.bucketDate.value = date;
    addBucket({ date, size: button.dataset.bucketSize });
    render();
  });
});

els.tabButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveTab(button.dataset.tabTarget));
});

els.newQuoteButton?.addEventListener("click", renderSwingThought);

document.querySelectorAll("[data-complete-practice]").forEach((button) => {
  button.addEventListener("click", () => completePracticeDay(button.dataset.completePractice, button));
});

document.querySelectorAll("[data-block-day]").forEach((input) => {
  input.addEventListener("change", () => updatePracticeCardMinutes(input.dataset.blockDay));
});

els.practiceHistoryList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-practice]");
  if (!button) return;
  const confirmed = await confirmAction({
    title: "Delete practice session?",
    message: "This removes the selected practice session only. ROI data is not affected.",
    actionLabel: "Delete",
  });
  if (!confirmed) return;
  state.practiceLogs = getPracticeLogs().filter((log) => log.id !== button.dataset.deletePractice);
  saveState();
  renderPractice();
});

els.historyList.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-delete-id]");
  if (!button) return;

  const id = button.dataset.deleteId;
  const type = button.dataset.deleteType;
  const confirmed = await confirmAction({
    title: "Delete activity?",
    message: "This removes the selected row from this year only. Your backup/export data is not changed.",
    actionLabel: "Delete",
  });
  if (!confirmed) return;

  const yearData = ensureYear(getSelectedYear());
  if (type === "bucket") {
    yearData.buckets = yearData.buckets.filter((bucket) => bucket.id !== id);
  } else if (id.startsWith("seed-")) {
    yearData.deletedSeedIds = [...new Set([...(yearData.deletedSeedIds || []), id])];
  } else {
    yearData.roiVisits = yearData.roiVisits.filter((visit) => visit.id !== id);
  }
  saveState();
  render();
});

els.exportButton.addEventListener("click", exportBackup);

els.importButton.addEventListener("click", async () => {
  const confirmed = await confirmAction({
    title: "Import history?",
    message: `Rows matching ${getSelectedYear()} will be added to that year. Existing data will be preserved.`,
    actionLabel: "Import",
  });
  if (!confirmed) return;
  const imported = importCsvRows(els.importText.value);
  els.importText.value = "";
  render();
  window.alert(`Imported ${imported} item${imported === 1 ? "" : "s"}.`);
});

els.restoreButton.addEventListener("click", () => els.restoreFile.click());

els.resetDataButton.addEventListener("click", async () => {
  const confirmed = await confirmAction({
    title: "Reset all app data?",
    message:
      "Are you sure you want to reset all app data?\n\nThis will permanently remove:\n- ROI activity\n- Practice logs\n- Membership settings\n- Bucket tracking\n- Practice history\n\nThis cannot be undone.",
    actionLabel: "Reset Data",
    destructive: true,
  });
  if (!confirmed) return;
  clearAppStorage();
  state = blankResetState();
  saveState();
  setDefaultDates();
  renderSwingThought();
  render();
  showToast("All app data reset.");
});

els.restoreFile.addEventListener("change", async () => {
  const [file] = els.restoreFile.files;
  if (!file) return;
  const confirmed = await confirmAction({
    title: "Restore backup?",
    message: "This replaces the current local tracker data with the selected backup file.",
    actionLabel: "Restore",
  });
  if (!confirmed) return;

  try {
    const text = await file.text();
    const backup = JSON.parse(text);
    const incomingState = backup?.state?.years ? backup.state : backup?.years ? backup : null;
    if (!incomingState) {
      window.alert("That file does not look like a valid tracker backup.");
      return;
    }
    createStorageBackup(localStorage.getItem(APP_STATE_KEY), "before-restore");
    state = normalizeStateShape(incomingState);
    saveState();
    render();
    window.alert("Backup restored safely.");
  } catch (error) {
    console.warn("Could not restore backup.", error);
    window.alert("That backup could not be restored. Your current saved data was not changed.");
  } finally {
    els.restoreFile.value = "";
  }
});

setDefaultDates();
renderSwingThought();
render();
if (pendingStorageNotice) showToast(pendingStorageNotice);

window.roiTracker = {
  read: () => JSON.parse(JSON.stringify(state)),
  apply: (incoming) => { state = normalizeStateShape(incoming); localStorage.setItem(APP_STATE_KEY, JSON.stringify(state)); setDefaultDates(); render(); },
};
