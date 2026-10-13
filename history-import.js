export const HISTORY_IMPORT_ID = 'mariners-2025-xlsx-v1';

// The actual dated history is supplied only by the authenticated server endpoint.
export function mergeHistory2025(state, packet) {
  if (state.years?.['2025']?.historyImports?.[HISTORY_IMPORT_ID]) return state;
  if (packet?.id !== HISTORY_IMPORT_ID || packet.year !== '2025' || packet.membershipCost !== 900
      || !/^[a-f0-9]{64}$/.test(packet.sourceHash || '') || !Array.isArray(packet.visits)
      || !packet.visits.length || packet.visits.length > 365) throw new Error('Invalid history package');
  const dates = new Set();
  const visits = packet.visits.map(row => {
    if (!Array.isArray(row) || row.length !== 2) throw new Error('Invalid history row');
    const [date, flags] = row;
    if (!/^2025-\d{2}-\d{2}$/.test(date || '') || ![1, 2, 3].includes(flags)
        || new Date(date + 'T00:00:00Z').toISOString().slice(0, 10) !== date || dates.has(date)) {
      throw new Error('Invalid or duplicate history date');
    }
    dates.add(date);
    return { id: HISTORY_IMPORT_ID + ':' + date, date, shortGame: Boolean(flags & 1),
      round: Boolean(flags & 2), holes: flags & 2 ? 9 : 0, yellowBasket: 0,
      source: HISTORY_IMPORT_ID, type: 'roi' };
  });
  const existing = state.years?.['2025'] || { roiVisits: [], buckets: [], deletedSeedIds: [] };
  // Never guess whether pre-existing records represent the same spreadsheet visits.
  if ((existing.roiVisits || []).length || (existing.deletedSeedIds || []).length) {
    throw new Error('Existing 2025 history needs reconciliation');
  }
  const result = structuredClone(state);
  result.years ||= {};
  result.years['2025'] = { ...existing, membershipCost: 900, roiVisits: visits,
    historyImports: { ...existing.historyImports, [HISTORY_IMPORT_ID]: {
      source: 'Mariners ROI.xlsx / 2025', sourceHash: packet.sourceHash,
      visitDates: visits.length, shortGame: visits.filter(v => v.shortGame).length,
      rounds: visits.filter(v => v.round).length,
    } } };
  return result;
}
