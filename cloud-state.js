// Only used for the first cloud connection on a device. Later saves use revisions.
export function mergeInitialState(cloud, local) {
  const result = JSON.parse(JSON.stringify(cloud));
  const mergeRows = (server = [], device = []) => {
    const rows = new Map(server.map(row => [row.id, row]));
    device.forEach(row => { if (!rows.has(row.id)) rows.set(row.id, row); });
    return [...rows.values()];
  };
  for (const [year, device] of Object.entries(local.years || {})) {
    const server = result.years[year] || { roiVisits: [], buckets: [], deletedSeedIds: [] };
    const deleted = [...new Set([...(server.deletedSeedIds || []), ...(device.deletedSeedIds || [])])];
    result.years[year] = {
      ...server,
      roiVisits: mergeRows(server.roiVisits, device.roiVisits).filter(row => !deleted.includes(row.id)),
      buckets: mergeRows(server.buckets, device.buckets),
      deletedSeedIds: deleted,
    };
    if (server.membershipCost == null && device.membershipCost != null) result.years[year].membershipCost = device.membershipCost;
  }
  result.practiceLogs = mergeRows(cloud.practiceLogs, local.practiceLogs);
  return result;
}
