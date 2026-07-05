let questions = JSON.parse(JSON.stringify(window.QUESTIONS_DATA || []));
let editingId = null;

const TABS = document.querySelectorAll('.manage-tab');
const PANELS = document.querySelectorAll('.tab-panel');

TABS.forEach(tab => {
  tab.addEventListener('click', () => {
    TABS.forEach(t => t.classList.remove('active'));
    PANELS.forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');

    if (tab.dataset.tab === 'history') {
      loadHistory();
    }
  });
});

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
        <button class="btn btn-secondary btn-sm" onclick="editQuestion(${q.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteQuestion(${q.id})">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

function openModal(title = 'Add Question') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('questionModal').classList.add('active');
}

function closeModal() {
  document.getElementById('questionModal').classList.remove('active');
  editingId = null;
  document.getElementById('qLevel').value = 'A2';
  document.getElementById('qTopic').value = '';
  document.getElementById('qText').value = '';
  document.getElementById('qOption1').value = '';
  document.getElementById('qOption2').value = '';
  document.getElementById('qOption3').value = '';
  document.getElementById('qOption4').value = '';
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
  if (!confirm('Are you sure you want to delete this question?')) return;
  questions = questions.filter(q => q.id !== id);
  saveQuestionsToStorage();
  renderQuestions(document.getElementById('filterLevel').value);
  showToast('Question deleted');
}

function saveQuestion() {
  const level = document.getElementById('qLevel').value;
  const topic = document.getElementById('qTopic').value.trim();
  const text = document.getElementById('qText').value.trim();
  const opt1 = document.getElementById('qOption1').value.trim();
  const opt2 = document.getElementById('qOption2').value.trim();
  const opt3 = document.getElementById('qOption3').value.trim();
  const opt4 = document.getElementById('qOption4').value.trim();

  if (!text) { showToast('Please enter a question', 'error'); return; }
  if (!opt1 || !opt2 || !opt3 || !opt4) { showToast('Please fill all 4 options', 'error'); return; }
  if (!topic) { showToast('Please enter a topic', 'error'); return; }

  const qData = {
    level,
    question: text,
    options: [opt1, opt2, opt3, opt4],
    answer: opt1,
    topic
  };

  if (editingId) {
    const idx = questions.findIndex(q => q.id === editingId);
    if (idx !== -1) {
      qData.id = editingId;
      questions[idx] = qData;
    }
  } else {
    qData.id = questions.length > 0 ? Math.max(...questions.map(q => q.id)) + 1 : 1;
    questions.push(qData);
  }

  saveQuestionsToStorage();
  renderQuestions(document.getElementById('filterLevel').value);
  closeModal();
  showToast(editingId ? 'Question updated' : 'Question added');
}

function saveQuestionsToStorage() {
  localStorage.setItem('quizQuestions', JSON.stringify(questions));
}

function loadQuestionsFromStorage() {
  const stored = localStorage.getItem('quizQuestions');
  if (stored) {
    questions = JSON.parse(stored);
  }
}

function loadHistory() {
  const sessions = JSON.parse(localStorage.getItem('quizSessions') || '[]');
  const tbody = document.getElementById('historyBody');
  const noHistory = document.getElementById('noHistory');

  if (sessions.length === 0) {
    tbody.innerHTML = '';
    noHistory.style.display = 'block';
    return;
  }

  noHistory.style.display = 'none';

  tbody.innerHTML = sessions.reverse().map(s => `
    <tr>
      <td>${new Date(s.date).toLocaleDateString('en-GB')}</td>
      <td>${s.name}</td>
      <td>${s.phone}</td>
      <td><span class="course-badge badge-${s.level === 'patente' ? 'patente' : s.level.toLowerCase()}">${s.level}</span></td>
      <td><strong>${s.score}/${s.total}</strong> (${Math.round(s.score/s.total*100)}%)</td>
    </tr>
  `).join('');
}

function showToast(message, type = 'success') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

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

document.getElementById('addQuestionBtn').addEventListener('click', () => openModal());
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('saveQuestion').addEventListener('click', saveQuestion);
document.getElementById('filterLevel').addEventListener('change', (e) => renderQuestions(e.target.value));
document.getElementById('saveDates').addEventListener('click', saveSettings);
document.getElementById('saveSocial').addEventListener('click', saveSettings);

document.getElementById('questionModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) closeModal();
});

const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));

loadQuestionsFromStorage();
renderQuestions();
loadSettings();
