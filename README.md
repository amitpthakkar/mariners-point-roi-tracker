# Mariners Point ROI Tracker

Existing Netlify tracker with Google sign-in and private Cloud Firestore storage.

- Live site: https://mariners-point-roi-tracker.netlify.app
- Firebase project: `mariners-point-roi-tracker`, Spark plan
- Only the configured verified Google owner can read or update `trackers/amit`.
- Historical activity is in Firestore, never bundled in public client assets.
- The original ROI calculations, practice tracking, backup export and restore remain available.
- Local storage retains a device copy. Pending writes are retried when connectivity returns.
- Saves require a matching cloud revision, so stale devices cannot overwrite newer records.
- First connection merges additional device records by their stable IDs. Conflicting versions with the same ID retain the cloud record.
- On a conflict, export the device backup and load the cloud version before editing.

Deployment uses the existing Netlify Git integration. `node scripts/build.mjs` copies only public assets into `dist`.
Firebase web configuration is public; authorization is enforced by Firestore rules.
Firestore rules are versioned in `firestore.rules`.

An approved 2025 spreadsheet import is served by `history-2025` only after Firestore
authorizes the signed-in owner's token. The dated source data is held in the private
server setting `ROI_HISTORY_2025_PACKET_V3`, never in this repository
or the static publish directory. On authenticated load, the app adds the year using
its normal revision-checked save queue. The import marker prevents repeated imports
and preserves subsequent edits/deletions. Existing 2025 ROI entries require
reconciliation rather than being guessed or overwritten. Other years, buckets and
practice logs are retained. A device recovery snapshot is stored before import.
