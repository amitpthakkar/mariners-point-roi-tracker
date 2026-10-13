import { mergeInitialState } from './cloud-state.js';
import { HISTORY_IMPORT_ID, mergeHistory2025 } from './history-import.js';

const OWNER = 'amitpthakkar@gmail.com';
const gate = document.querySelector('#cloudGate');
const main = document.querySelector('main');
const bar = document.querySelector('#cloudBar');
const message = document.querySelector('#cloudGateMessage');
const login = document.querySelector('#googleSignIn');
const status = document.querySelector('#cloudStatus');
const retry = document.querySelector('#cloudRetry');
const reload = document.querySelector('#cloudReload');
const META = 'roi-cloud-meta-v1';
const PENDING = 'roi-cloud-pending-v1';
const ORIGINAL = 'roi-cloud-before-migration-v1';
let auth, authSdk, db, fs, ref, revision = 0, ready = false, pending = null;
let saving = false, conflict = false, stopListening = null, timer, session = 0;
let importingHistory = false;

function setStatus(text, error = false) {
  status.textContent = text;
  status.dataset.error = String(error);
  retry.hidden = !error || conflict;
  reload.hidden = !conflict;
}
function lock(text) {
  ready = false;
  main.hidden = true; main.inert = true; bar.hidden = true;
  gate.hidden = false; message.textContent = text;
}
function unlock() {
  gate.hidden = true; main.hidden = false; main.inert = false; bar.hidden = false;
  document.querySelector('#cloudAccount').textContent = OWNER;
  ready = true;
}
function storeMeta() {
  localStorage.setItem(META, JSON.stringify({ uid: auth.currentUser.uid, revision, migrated: true }));
}
function acceptSnapshot(snapshot) {
  const doc = snapshot.data();
  if (!doc || typeof doc.stateJson !== 'string' || !Number.isInteger(doc.revision)) throw new Error('Invalid tracker data');
  revision = doc.revision;
  window.roiTracker.apply(JSON.parse(doc.stateJson));
  storeMeta();
  setStatus('Cloud saved');
}
function keepPending(state) {
  pending = { uid: auth.currentUser.uid, revision, state };
  localStorage.setItem(PENDING, JSON.stringify(pending));
}
async function flush() {
  if (!ready || !pending || saving || conflict) return;
  if (!navigator.onLine) { setStatus('Saved on device. Syncs when online.', true); return; }
  saving = true;
  const sending = pending;
  const thisSession = session;
  setStatus('Saving to cloud...');
  try {
    const nextRevision = await fs.runTransaction(db, async transaction => {
      const snapshot = await transaction.get(ref);
      if (!snapshot.exists() || snapshot.data().revision !== sending.revision) {
        const error = new Error('Another device has newer changes'); error.code = 'roi/conflict'; throw error;
      }
      const next = sending.revision + 1;
      transaction.update(ref, { stateJson: JSON.stringify(sending.state), revision: next, updatedAt: new Date().toISOString() });
      return next;
    });
    if (thisSession !== session) return;
    revision = nextRevision;
    storeMeta();
    if (pending === sending) { pending = null; localStorage.removeItem(PENDING); }
    else { pending.revision = revision; localStorage.setItem(PENDING, JSON.stringify(pending)); }
    setStatus(pending ? 'Saving to cloud...' : 'Cloud saved');
  } catch (error) {
    if (thisSession !== session) return;
    if (error.code === 'roi/conflict') {
      conflict = true;
      main.inert = true;
      setStatus('Another device has newer data. Export this device before loading the cloud version.', true);
      // Export remains available while edits are paused.
      main.inert = false;
      main.addEventListener('click', pauseEdits, true);
      main.addEventListener('input', pauseEdits, true);
      main.addEventListener('change', pauseEdits, true);
      main.addEventListener('submit', pauseEdits, true);
    } else setStatus('Saved on device. Cloud sync needs a retry.', true);
    console.warn('Cloud save paused:', error.code || error.message);
  } finally {
    saving = false;
    if (pending && pending !== sending && !conflict && thisSession === session) timer = setTimeout(flush, 400);
  }
}
function pauseEdits(event) {
  if (event.target.closest('#exportButton, [data-tab-target]')) return;
  event.preventDefault(); event.stopImmediatePropagation();
}
function resumeEdits() {
  for (const type of ['click', 'input', 'change', 'submit']) main.removeEventListener(type, pauseEdits, true);
}
async function importApprovedHistory() {
  if (!ready || conflict || importingHistory || window.roiTracker.read().years?.['2025']?.historyImports?.[HISTORY_IMPORT_ID]) return;
  const thisSession = session;
  importingHistory = true;
  try {
    const token = await auth.currentUser.getIdToken();
    const response = await fetch('/.netlify/functions/history-2025', {
      method: 'POST', headers: { Authorization: 'Bearer ' + token }, cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      throw new Error(failure.error || 'Private history could not load');
    }
    const packet = await response.json();
    if (thisSession !== session || !ready || conflict) return;
    const current = window.roiTracker.read();
    const merged = mergeHistory2025(current, packet);
    if (merged !== current) {
      localStorage.setItem('roi-cloud-before-history-2025-v1', JSON.stringify(current));
      window.roiTracker.apply(merged);
      keepPending(window.roiTracker.read());
      await flush();
    }
  } catch (error) {
    if (thisSession === session && ready && !conflict) {
      setStatus('2025 history: ' + error.message + '. Tap Retry.', true);
      console.warn('History import:', error.message);
    }
  } finally {
    if (thisSession === session) importingHistory = false;
  }
}
window.addEventListener('roi-state-saved', event => {
  if (!ready || conflict) return;
  keepPending(event.detail);
  setStatus(navigator.onLine ? 'Saving to cloud...' : 'Saved on device. Syncs when online.');
  clearTimeout(timer); timer = setTimeout(flush, 400);
});
window.addEventListener('online', flush);
window.addEventListener('beforeunload', event => {
  if (pending) { event.preventDefault(); event.returnValue = ''; }
});
retry.addEventListener('click', async () => { await flush(); await importApprovedHistory(); });
reload.addEventListener('click', async () => {
  if (!window.confirm('Load the newer cloud version? Your unsynced device version will be kept in a recovery backup. Export it first if you want a separate file.')) return;
  try {
    const snapshot = await fs.getDocFromServer(ref);
    localStorage.setItem('roi-cloud-conflict-backup-' + Date.now(), JSON.stringify(window.roiTracker.read()));
    acceptSnapshot(snapshot);
    pending = null; localStorage.removeItem(PENDING); conflict = false;
    resumeEdits(); setStatus('Cloud saved');
    await importApprovedHistory();
  } catch { setStatus('Cloud could not be loaded. Your device data is safe.', true); }
});
document.querySelector('#googleSignOut').addEventListener('click', async () => {
  if (pending) { await flush(); if (pending) { setStatus('Finish syncing or export your backup before signing out.', true); return; } }
  await authSdk.signOut(auth);
});
login.addEventListener('click', async () => {
  if (!auth || auth.currentUser) { location.reload(); return; }
  login.disabled = true; message.textContent = 'Opening Google sign-in...';
  try {
    const provider = new authSdk.GoogleAuthProvider();
    provider.setCustomParameters({ login_hint: OWNER, prompt: 'select_account' });
    await authSdk.signInWithPopup(auth, provider);
  } catch (error) {
    message.textContent = error.code === 'auth/popup-blocked'
      ? 'Allow the Google sign-in popup, then try again. On iPhone, try signing in from Safari if needed.'
      : 'Sign-in did not finish. Please try again.';
    console.warn('Sign-in:', error.code);
  } finally { login.disabled = false; }
});

try {
  const base = 'https://www.gstatic.com/firebasejs/12.4.0/';
  const modules = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-firestore.js')]);
  const [appSdk, a, f] = modules; authSdk = a; fs = f;
  const app = appSdk.initializeApp({
    apiKey: 'AIzaSyC9ec1PpIUO1EcW78Kmv0japjcogODzqcc',
    authDomain: 'mariners-point-roi-tracker.firebaseapp.com',
    projectId: 'mariners-point-roi-tracker',
    storageBucket: 'mariners-point-roi-tracker.firebasestorage.app',
    messagingSenderId: '129185222359',
    appId: '1:129185222359:web:2aba420234955843a52a92',
  });
  auth = a.getAuth(app); db = f.getFirestore(app); ref = f.doc(db, 'trackers', 'amit');
  await a.setPersistence(auth, a.browserLocalPersistence);
  login.disabled = false;
  a.onAuthStateChanged(auth, async user => {
    const thisSession = ++session;
    if (stopListening) { stopListening(); stopListening = null; }
    clearTimeout(timer); resumeEdits(); conflict = false; importingHistory = false;
    lock(user ? 'Loading your saved tracker...' : 'Use your approved Google account to continue.');
    if (!user) { login.textContent = 'Continue with Google'; login.disabled = false; return; }
    if (user.email?.toLowerCase() !== OWNER || !user.emailVerified) {
      await a.signOut(auth); message.textContent = 'This private tracker is available to ' + OWNER + '.'; return;
    }
    try {
      const snapshot = await f.getDocFromServer(ref);
      if (thisSession !== session) return;
      if (!snapshot.exists()) throw new Error('Tracker migration is not ready');
      let meta = {}; let storedPending;
      try { meta = JSON.parse(localStorage.getItem(META) || '{}'); storedPending = JSON.parse(localStorage.getItem(PENDING) || 'null'); } catch { /* Keep existing tracker state. */ }
      if (storedPending?.uid === user.uid) {
        pending = storedPending; revision = storedPending.revision;
        window.roiTracker.apply(storedPending.state);
        unlock(); await flush();
      } else if (meta.uid !== user.uid || !meta.migrated) {
        const local = window.roiTracker.read();
        localStorage.setItem(ORIGINAL, JSON.stringify(local));
        const server = JSON.parse(snapshot.data().stateJson);
        const merged = mergeInitialState(server, local);
        revision = snapshot.data().revision;
        window.roiTracker.apply(merged);
        unlock();
        if (JSON.stringify(merged) !== JSON.stringify(server)) { keepPending(merged); await flush(); }
        else { storeMeta(); setStatus('Cloud saved'); }
      } else { pending = null; acceptSnapshot(snapshot); unlock(); }
      if (thisSession !== session) return;
      stopListening = f.onSnapshot(ref, newer => {
        if (!ready || saving || pending || conflict || newer.metadata.hasPendingWrites || newer.metadata.fromCache) return;
        if (newer.exists() && newer.data().revision > revision) acceptSnapshot(newer);
      }, () => setStatus('Cloud connection interrupted. Device backup retained.', true));
      await importApprovedHistory();
    } catch (error) {
      lock('Could not load your cloud tracker. Check your connection, then reload. Your existing device data is safe.');
      console.warn('Cloud load:', error.code || error.message);
      login.textContent = 'Retry'; login.disabled = false;
    }
  });
} catch (error) {
  message.textContent = 'Secure sign-in could not load. Check your connection and tap Retry.';
  login.textContent = 'Retry'; login.disabled = false;
  console.warn('Cloud startup:', error.message);
}
