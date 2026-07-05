const FIREBASE_SCRIPTS = [
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js'
];

function loadFirebaseScripts() {
  return new Promise((resolve, reject) => {
    let loaded = 0;
    FIREBASE_SCRIPTS.forEach(src => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => { loaded++; if (loaded === FIREBASE_SCRIPTS.length) resolve(); };
      script.onerror = reject;
      document.head.appendChild(script);
    });
  });
}

let firebaseApp = null;
let firebaseAuth = null;
let firebaseDb = null;

async function initFirebase() {
  await loadFirebaseScripts();
  firebaseApp = firebase.initializeApp(firebaseConfig);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.firestore();
  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb };
}

function getCurrentUser() {
  return firebaseAuth ? firebaseAuth.currentUser : null;
}

function onAuthStateChanged(callback) {
  if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged(callback);
  }
}

async function signUpWithEmail(email, password) {
  return firebaseAuth.createUserWithEmailAndPassword(email, password);
}

async function signInWithEmail(email, password) {
  return firebaseAuth.signInWithEmailAndPassword(email, password);
}

async function signOut() {
  return firebaseAuth.signOut();
}

async function createStudentProfile(uid, data) {
  return firebaseDb.collection('students').doc(uid).set(data);
}

async function getStudentProfile(uid) {
  const doc = await firebaseDb.collection('students').doc(uid).get();
  return doc.exists ? doc.data() : null;
}

async function updateStudentProfile(uid, data) {
  return firebaseDb.collection('students').doc(uid).update(data);
}

async function deleteStudentProfile(uid) {
  return firebaseDb.collection('students').doc(uid).delete();
}

async function getAllStudents() {
  const snapshot = await firebaseDb.collection('students').get();
  return snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

async function isAdmin(uid) {
  const profile = await getStudentProfile(uid);
  return profile && profile.role === 'teacher';
}

async function sendPasswordReset(email) {
  return firebaseAuth.sendPasswordResetEmail(email);
}

async function changePassword(newPassword) {
  const user = firebaseAuth.currentUser;
  if (!user) throw new Error('No user logged in');
  return user.updatePassword(newPassword);
}

async function findPendingProfile(email) {
  const snapshot = await firebaseDb.collection('students')
    .where('email', '==', email)
    .where('isPending', '==', true)
    .get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { docId: doc.id, ...doc.data() };
}

async function linkPendingProfile(docId, uid) {
  const doc = await firebaseDb.collection('students').doc(docId).get();
  if (!doc.exists) return;
  const data = doc.data();
  delete data.isPending;
  await firebaseDb.collection('students').doc(uid).set({ ...data, uid });
  await firebaseDb.collection('students').doc(docId).delete();
}
