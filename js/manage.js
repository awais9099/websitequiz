let questions = JSON.parse(JSON.stringify(window.QUESTIONS_DATA || []));
let editingId = null;
let editingVideoIdx = null;
let editingStudentUid = null;
let isTeacher = false;

// ===== AUTH CHECK =====
initFirebase().then(() => {
  onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = 'login.html';
      return;
    }
    const profile = await getStudentProfile(user.uid);
    if (!profile || profile.role !== 'teacher') {
      window.location.href = 'videos.html';
      return;
    }
    isTeacher = true;
    document.getElementById('manageLoading').style.display = 'none';
    document.getElementById('manageContent').style.display = 'block';
    loadStudents();
  });
});

document.getElementById('manageLogoutBtn').addEventListener('click', async () => {
  await signOut();
  window.location.href = 'index.html';
});

// ===== TABS =====
const TABS = document.querySelectorAll('.manage-tab');
const PANELS = document.querySelectorAll('.tab-panel');

TABS.forEach(tab => {
  tab.addEventListener('click', () => {
    TABS.forEach(t => t.classList.remove('active'));
    PANELS.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
    if (tab.dataset.tab === 'history') loadHistory();
    if (tab.dataset.tab === 'students') loadStudents();
  });
});

// ===== STUDENTS =====
async function loadStudents() {
  const tbody = document.getElementById('studentsBody');
  const noStudents = document.getElementById('noStudents');
  try {
    const students = await getAllStudents();
    const studentList = students.filter(s => s.role !== 'teacher');
    if (studentList.length === 0) {
      tbody.innerHTML = '';
      noStudents.style.display = 'block';
      return;
    }
    noStudents.style.display = 'none';
    tbody.innerHTML = studentList.map(s => `
      <tr>
        <td><strong>${s.name || 'N/A'}</strong></td>
        <td>${s.email || 'N/A'}</td>
        <td>${s.phone || 'N/A'}</td>
        <td>${s.level ? `<span class="course-badge badge-${s.level === 'patente' ? 'patente' : s.level.toLowerCase()}">${s.level}</span>` : '<span style="color:var(--text-light);">Not set</span>'}</td>
        <td>${s.isActive ? '<span style="color:var(--accent);font-weight:600;">Active</span>' : '<span style="color:var(--warning);font-weight:600;">Inactive</span>'}</td>
        <td class="actions">
          <button class="btn btn-secondary btn-sm" onclick="editStudent('${s.uid}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm" style="background:${s.isActive ? 'var(--warning)' : 'var(--accent)'};color:white;" onclick="toggleStudentActive('${s.uid}', ${!s.isActive})">
            <i class="fas fa-${s.isActive ? 'ban' : 'check'}"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.uid}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--danger);padding:2rem;">Error loading students: ${err.message}</td></tr>`;
  }
}

function openStudentModal(title) {
  document.getElementById('studentModalTitle').textContent = title || 'Add Student';
  document.getElementById('studentModal').classList.add('active');
}

function closeStudentModal() {
  document.getElementById('studentModal').classList.remove('active');
  editingStudentUid = null;
  ['sName','sEmail','sPhone','sLevel','sActive'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    }
  });
  document.getElementById('sEmail').disabled = false;
}

async function editStudent(uid) {
  const profile = await getStudentProfile(uid);
  if (!profile) return;
  editingStudentUid = uid;
  document.getElementById('sName').value = profile.name || '';
  document.getElementById('sEmail').value = profile.email || '';
  document.getElementById('sEmail').disabled = true;
  document.getElementById('sPhone').value = profile.phone || '';
  document.getElementById('sLevel').value = profile.level || '';
  document.getElementById('sActive').value = profile.isActive ? 'true' : 'false';
  openStudentModal('Edit Student');
}

async function saveStudent() {
  const name = document.getElementById('sName').value.trim();
  const email = document.getElementById('sEmail').value.trim();
  const phone = document.getElementById('sPhone').value.trim();
  const level = document.getElementById('sLevel').value;
  const isActive = document.getElementById('sActive').value === 'true';

  if (!name) { showToast('Enter a name', 'error'); return; }

  if (editingStudentUid) {
    const updateData = { name, phone, level, isActive };
    await updateStudentProfile(editingStudentUid, updateData);
    showToast('Student updated');
  } else {
    if (!email) { showToast('Enter an email', 'error'); return; }
    try {
      const docId = 'pending_' + email.replace(/[@.]/g, '_');
      await createStudentProfile(docId, {
        name, email, phone, level, isActive,
        role: 'student',
        isPending: true,
        createdAt: new Date().toISOString()
      });
      showToast('Student added! They need to register on login page to activate.');
    } catch (err) {
      showToast('Error adding student: ' + err.message, 'error');
      return;
    }
  }
  closeStudentModal();
  loadStudents();
}

async function toggleStudentActive(uid, newActive) {
  await updateStudentProfile(uid, { isActive: newActive });
  showToast(`Student ${newActive ? 'activated' : 'deactivated'}`);
  loadStudents();
}

async function deleteStudent(uid) {
  if (!confirm('Delete this student account? This cannot be undone.')) return;
  await deleteStudentProfile(uid);
  showToast('Student deleted');
  loadStudents();
}

// ===== QUESTIONS =====
function renderQuestions(filter = 'all') {
  const tbody = document.getElementById('questionsBody');
  const filtered = filter === 'all' ? questions : questions.filter(q => q.level === filter);
  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-light);padding:2rem;">No questions found.</td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((q, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><span class="course-badge badge-${q.level === 'patente' ? 'patente' : q.level.toLowerCase()}">${q.level}</span></td>
      <td style="max-width:300px;">${q.question.substring(0, 60)}${q.question.length > 60 ? '...' : ''}</td>
      <td>${q.topic}</td>
      <td>${q.answer}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editQuestion(${q.id})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})"><i class="fas fa-trash"></i></button>
      </td>
    </tr>
  `).join('');
}

function openModal(title) {
  document.getElementById('modalTitle').textContent = title || 'Add Question';
  document.getElementById('questionModal').classList.add('active');
}

function closeModal() {
  document.getElementById('questionModal').classList.remove('active');
  editingId = null;
  ['qLevel','qTopic','qText','qOption1','qOption2','qOption3','qOption4'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
  });
}

function editQuestion(id) {
  const q = questions.find(q => q.id === id);
  if (!q) return;
  editingId = id;
  document.getElementById('qLevel').value = q.level;
  document.getElementById('qTopic').value = q.topic;
  document.getElementById('qText').value = q.question;
  document.getElementById('qOption1').value = q.options[0] || '';
  document.getElementById('qOption2').value = q.options[1] || '';
  document.getElementById('qOption3').value = q.options[2] || '';
  document.getElementById('qOption4').value = q.options[3] || '';
  openModal('Edit Question');
}

function deleteQuestion(id) {
  if (!confirm('Delete this question?')) return;
  questions = questions.filter(q => q.id !== id);
  saveQuestionsToStorage();
  renderQuestions(document.getElementById('filterLevel').value);
  showToast('Question deleted');
}

function saveQuestion() {
  const level = document.getElementById('qLevel').value;
  const topic = document.getElementById('qTopic').value.trim();
  const text = document.getElementById('qText').value.trim();
  const opts = ['qOption1','qOption2','qOption3','qOption4'].map(id => document.getElementById(id).value.trim());

  if (!text) { showToast('Enter a question', 'error'); return; }
  if (opts.some(o => !o)) { showToast('Fill all 4 options', 'error'); return; }
  if (!topic) { showToast('Enter a topic', 'error'); return; }

  const qData = { level, question: text, options: opts, answer: opts[0], topic };
  if (editingId) {
    const idx = questions.findIndex(q => q.id === editingId);
    if (idx !== -1) { qData.id = editingId; questions[idx] = qData; }
  } else {
    qData.id = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    questions.push(qData);
  }
  saveQuestionsToStorage();
  renderQuestions(document.getElementById('filterLevel').value);
  closeModal();
  showToast(editingId ? 'Question updated' : 'Question added');
}

function saveQuestionsToStorage() { localStorage.setItem('quizQuestions', JSON.stringify(questions)); }
function loadQuestionsFromStorage() { const s = localStorage.getItem('quizQuestions'); if (s) questions = JSON.parse(s); }

// ===== VIDEOS =====
function getVideos() { const settings = JSON.parse(localStorage.getItem('siteSettings') || '{}'); return settings.videos || []; }
function saveVideosList(videos) { const settings = JSON.parse(localStorage.getItem('siteSettings') || '{}'); settings.videos = videos; localStorage.setItem('siteSettings', JSON.stringify(settings)); }

function renderVideoAdmin() {
  const videos = getVideos();
  const container = document.getElementById('videoListAdmin');
  if (!container) return;
  if (videos.length === 0) { container.innerHTML = '<p style="text-align:center;color:var(--text-light);padding:2rem;">No videos added yet.</p>'; return; }
  container.innerHTML = videos.map((v, i) => `
    <div class="video-admin-item">
      <div class="video-admin-info">
        <strong>${v.title}</strong>
        <span style="color:var(--text-light);font-size:0.85rem;">
          <span class="course-badge badge-${v.level === 'patente' ? 'patente' : v.level.toLowerCase()}" style="font-size:0.7rem;">${v.level}</span>
          ${v.label ? ` - ${v.label}` : ''}
          ${v.notesUrl ? ' <i class="fas fa-file-pdf" style="color:var(--danger);"></i>' : ''}
        </span>
      </div>
      <div class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editVideo(${i})"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteVideo(${i})"><i class="fas fa-trash"></i></button>
      </div>
    </div>
  `).join('');
}

function openVideoModal(title) {
  document.getElementById('videoModalTitle').textContent = title || 'Add Video';
  document.getElementById('videoModal').classList.add('active');
}

function closeVideoModal() {
  document.getElementById('videoModal').classList.remove('active');
  editingVideoIdx = null;
  ['vTitle','vLevel','vLabel','vDescription','vUrl','vNotesUrl'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = el.tagName === 'SELECT' ? el.options[0].value : '';
  });
}

function editVideo(idx) {
  const videos = getVideos();
  const v = videos[idx];
  if (!v) return;
  editingVideoIdx = idx;
  document.getElementById('vTitle').value = v.title || '';
  document.getElementById('vLevel').value = v.level || 'A2';
  document.getElementById('vLabel').value = v.label || '';
  document.getElementById('vDescription').value = v.description || '';
  document.getElementById('vUrl').value = v.url || '';
  document.getElementById('vNotesUrl').value = v.notesUrl || '';
  openVideoModal('Edit Video');
}

function deleteVideo(idx) {
  if (!confirm('Delete this video?')) return;
  const videos = getVideos();
  videos.splice(idx, 1);
  saveVideosList(videos);
  renderVideoAdmin();
  showToast('Video deleted');
}

function saveVideo() {
  const title = document.getElementById('vTitle').value.trim();
  const level = document.getElementById('vLevel').value;
  const label = document.getElementById('vLabel').value.trim();
  const description = document.getElementById('vDescription').value.trim();
  const url = document.getElementById('vUrl').value.trim();
  const notesUrl = document.getElementById('vNotesUrl').value.trim();

  if (!title) { showToast('Enter a title', 'error'); return; }
  if (!url) { showToast('Enter a video URL', 'error'); return; }

  const videoData = { title, level, label, description, url, notesUrl };
  const videos = getVideos();
  if (editingVideoIdx !== null) { videos[editingVideoIdx] = videoData; }
  else { videos.push(videoData); }
  saveVideosList(videos);
  renderVideoAdmin();
  closeVideoModal();
  showToast(editingVideoIdx !== null ? 'Video updated' : 'Video added');
}

// ===== HISTORY =====
function loadHistory() {
  const sessions = JSON.parse(localStorage.getItem('quizSessions') || '[]');
  const tbody = document.getElementById('historyBody');
  const noHistory = document.getElementById('noHistory');
  if (sessions.length === 0) { tbody.innerHTML = ''; noHistory.style.display = 'block'; return; }
  noHistory.style.display = 'none';
  tbody.innerHTML = sessions.slice().reverse().map(s => `
    <tr>
      <td>${new Date(s.date).toLocaleDateString('en-GB')}</td>
      <td>${s.name}</td>
      <td>${s.phone}</td>
      <td><span class="course-badge badge-${s.level === 'patente' ? 'patente' : s.level.toLowerCase()}">${s.level}</span></td>
      <td><strong>${s.score}/${s.total}</strong> (${Math.round(s.score/s.total*100)}%)</td>
    </tr>
  `).join('');
}

// ===== SETTINGS =====
function loadSettings() {
  const settings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
  document.getElementById('dateA2').value = settings.dateA2 || '';
  document.getElementById('dateB1').value = settings.dateB1 || '';
  document.getElementById('datePatente').value = settings.datePatente || '';
  document.getElementById('whatsappLink').value = settings.whatsappLink || '';
  document.getElementById('tiktokLink').value = settings.tiktokLink || '';
  document.getElementById('youtubeLink').value = settings.youtubeLink || '';
}

function saveSettings() {
  const settings = {
    dateA2: document.getElementById('dateA2').value,
    dateB1: document.getElementById('dateB1').value,
    datePatente: document.getElementById('datePatente').value,
    whatsappLink: document.getElementById('whatsappLink').value,
    tiktokLink: document.getElementById('tiktokLink').value,
    youtubeLink: document.getElementById('youtubeLink').value
  };
  localStorage.setItem('siteSettings', JSON.stringify(settings));
  showToast('Settings saved');
}

// ===== TOAST =====
function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
}

// ===== EVENTS =====
document.getElementById('addStudentBtn').addEventListener('click', () => {
  document.getElementById('sEmail').disabled = false;
  openStudentModal();
});
document.getElementById('cancelStudentModal').addEventListener('click', closeStudentModal);
document.getElementById('saveStudent').addEventListener('click', saveStudent);
document.getElementById('studentModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeStudentModal(); });

document.getElementById('addQuestionBtn').addEventListener('click', () => openModal());
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('saveQuestion').addEventListener('click', saveQuestion);
document.getElementById('filterLevel').addEventListener('change', (e) => renderQuestions(e.target.value));
document.getElementById('saveDates').addEventListener('click', saveSettings);
document.getElementById('saveSocial').addEventListener('click', saveSettings);
document.getElementById('addVideoBtn').addEventListener('click', () => openVideoModal());
document.getElementById('cancelVideoModal').addEventListener('click', closeVideoModal);
document.getElementById('saveVideo').addEventListener('click', saveVideo);
document.getElementById('questionModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });
document.getElementById('videoModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeVideoModal(); });

const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));

loadQuestionsFromStorage();
renderQuestions();
loadSettings();
renderVideoAdmin();
