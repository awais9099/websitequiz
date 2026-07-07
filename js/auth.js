const FIREBASE_SCRIPTS = [
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore-compat.js',
  'https://www.gstatic.com/firebasejs/11.0.1/firebase-storage-compat.js'
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
let firebaseStorage = null;

async function initFirebase() {
  if (firebaseApp) return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
  await loadFirebaseScripts();
  firebaseApp = firebase.initializeApp(firebaseConfig);
  firebaseAuth = firebase.auth();
  firebaseDb = firebase.firestore();
  firebaseStorage = firebase.storage();
  return { app: firebaseApp, auth: firebaseAuth, db: firebaseDb, storage: firebaseStorage };
}

function getCurrentUser() {
  return firebaseAuth ? firebaseAuth.currentUser : null;
}

function onAuthStateChanged(callback) {
  if (firebaseAuth) {
    firebaseAuth.onAuthStateChanged(callback);
  }
}

// ===== SECURITY HELPERS =====
function sanitizeInput(str) {
  if (typeof str !== 'string') return str;
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function sanitizeObject(obj) {
  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      clean[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      clean[key] = value.map(v => typeof v === 'string' ? sanitizeInput(v) : v);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
  if (!phone) return true;
  return /^[\d\s\+\-\(\)]{7,20}$/.test(phone);
}

function validateName(name) {
  return name && name.length >= 2 && name.length <= 100;
}

function validateUrl(url) {
  if (!url) return true;
  try { new URL(url); return true; } catch { return false; }
}

function validateDate(date) {
  if (!date) return true;
  return !isNaN(Date.parse(date));
}

let cachedTeacherStatus = null;
let teacherStatusTime = 0;

async function isTeacher() {
  const now = Date.now();
  if (cachedTeacherStatus !== null && now - teacherStatusTime < 300000) {
    return cachedTeacherStatus;
  }
  const user = getCurrentUser();
  if (!user) { cachedTeacherStatus = false; return false; }
  try {
    const profile = await getStudentProfile(user.uid);
    cachedTeacherStatus = profile && profile.role === 'teacher';
    teacherStatusTime = now;
    return cachedTeacherStatus;
  } catch {
    return false;
  }
}

async function requireTeacher() {
  const teacher = await isTeacher();
  if (!teacher) throw new Error('Unauthorized: Teacher access required');
  return true;
}

function checkRateLimit(key, maxAttempts, windowMs) {
  const now = Date.now();
  const storageKey = 'rateLimit_' + key;
  let attempts = JSON.parse(localStorage.getItem(storageKey) || '[]');
  attempts = attempts.filter(t => now - t < windowMs);
  if (attempts.length >= maxAttempts) return false;
  attempts.push(now);
  localStorage.setItem(storageKey, JSON.stringify(attempts));
  return true;
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

// ===== GROUPS =====
async function createGroup(data) {
  const ref = await firebaseDb.collection('groups').add(data);
  return ref.id;
}

async function getGroups(level) {
  let query = firebaseDb.collection('groups');
  if (level) query = query.where('level', '==', level);
  const snapshot = await query.get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getGroup(groupId) {
  const doc = await firebaseDb.collection('groups').doc(groupId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function updateGroup(groupId, data) {
  return firebaseDb.collection('groups').doc(groupId).update(data);
}

async function deleteGroup(groupId) {
  const sections = await getSections(groupId);
  for (const section of sections) {
    const videos = await getVideos(section.id);
    for (const video of videos) {
      await firebaseDb.collection('videos').doc(video.id).delete();
    }
    await firebaseDb.collection('sections').doc(section.id).delete();
  }
  return firebaseDb.collection('groups').doc(groupId).delete();
}

// ===== SECTIONS =====
async function createSection(data) {
  const ref = await firebaseDb.collection('sections').add(data);
  return ref.id;
}

async function getSections(groupId) {
  const snapshot = await firebaseDb.collection('sections')
    .where('groupId', '==', groupId)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateSection(sectionId, data) {
  return firebaseDb.collection('sections').doc(sectionId).update(data);
}

async function deleteSection(sectionId) {
  const videos = await getVideos(sectionId);
  for (const video of videos) {
    await firebaseDb.collection('videos').doc(video.id).delete();
  }
  return firebaseDb.collection('sections').doc(sectionId).delete();
}

// ===== VIDEOS =====
async function createVideo(data) {
  const ref = await firebaseDb.collection('videos').add(data);
  return ref.id;
}

async function getVideos(sectionId) {
  const snapshot = await firebaseDb.collection('videos')
    .where('sectionId', '==', sectionId)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getVideosByGroup(groupId) {
  const snapshot = await firebaseDb.collection('videos')
    .where('groupId', '==', groupId)
    .get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateVideo(videoId, data) {
  return firebaseDb.collection('videos').doc(videoId).update(data);
}

async function deleteVideo(videoId) {
  return firebaseDb.collection('videos').doc(videoId).delete();
}

// ===== PATENTE TRICKS =====
async function createTrick(data) {
  const ref = await firebaseDb.collection('patenteTricks').add(data);
  return ref.id;
}

async function getAllTricks() {
  const snapshot = await firebaseDb.collection('patenteTricks').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateTrick(trickId, data) {
  return firebaseDb.collection('patenteTricks').doc(trickId).update(data);
}

async function deleteTrick(trickId) {
  return firebaseDb.collection('patenteTricks').doc(trickId).delete();
}

// ===== PATENTE QUIZZES =====
async function createPatenteQuiz(data) {
  const ref = await firebaseDb.collection('patenteQuizzes').add(data);
  return ref.id;
}

async function getAllPatenteQuizzes() {
  const snapshot = await firebaseDb.collection('patenteQuizzes').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getPatenteQuiz(quizId) {
  const doc = await firebaseDb.collection('patenteQuizzes').doc(quizId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function deletePatenteQuiz(quizId) {
  return firebaseDb.collection('patenteQuizzes').doc(quizId).delete();
}

// ===== PATENTE QUIZZES TEST COLLECTION =====
async function createPatenteQuizTest(data) {
  const ref = await firebaseDb.collection('patenteQuizzesTest').add(data);
  return ref.id;
}

async function getAllPatenteQuizzesTest() {
  const snapshot = await firebaseDb.collection('patenteQuizzesTest').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getPatenteQuizTest(quizId) {
  const doc = await firebaseDb.collection('patenteQuizzesTest').doc(quizId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function deletePatenteQuizTest(quizId) {
  return firebaseDb.collection('patenteQuizzesTest').doc(quizId).delete();
}

async function deleteAllPatenteQuizzesTest() {
  const snapshot = await firebaseDb.collection('patenteQuizzesTest').get();
  const batch = firebaseDb.batch();
  snapshot.docs.forEach(doc => batch.delete(doc.ref));
  return batch.commit();
}

async function bulkImportPatenteQuizzesTest(quizzes) {
  const batch = firebaseDb.batch();
  quizzes.forEach(quiz => {
    const ref = firebaseDb.collection('patenteQuizzesTest').doc();
    batch.set(ref, quiz);
  });
  return batch.commit();
}

// ===== COURSE CARDS =====
async function createCourseCard(data) {
  const ref = await firebaseDb.collection('courseCards').add(data);
  return ref.id;
}

async function getAllCourseCards() {
  const snapshot = await firebaseDb.collection('courseCards').orderBy('createdAt', 'desc').get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function getActiveCourseCards() {
  const snapshot = await firebaseDb.collection('courseCards').where('isActive', '==', true).get();
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

async function updateCourseCard(cardId, data) {
  return firebaseDb.collection('courseCards').doc(cardId).update(data);
}

async function deleteCourseCard(cardId) {
  return firebaseDb.collection('courseCards').doc(cardId).delete();
}

// ===== IMAGE UPLOAD =====
async function uploadCourseCardImage(file) {
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) throw new Error('Image must be less than 5MB');
  if (!file.type.startsWith('image/')) throw new Error('File must be an image');
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) throw new Error('Only JPEG, PNG, GIF, WebP allowed');
  const fileName = 'course-cards/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9.]/g, '_').substring(0, 50);
  const ref = firebaseStorage.ref(fileName);
  await ref.put(file);
  return ref.getDownloadURL();
}

async function deleteCourseCardImage(imageUrl) {
  if (!imageUrl || !imageUrl.includes('firebasestorage')) return;
  try {
    const ref = firebaseStorage.refFromURL(imageUrl);
    await ref.delete();
  } catch (e) {}
}
