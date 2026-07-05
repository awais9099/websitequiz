let questions = JSON.parse(JSON.stringify(window.QUESTIONS_DATA || []));
let editingId = null;
let editingStudentUid = null;
let editingGroupId = null;
let editingSectionId = null;
let editingVideoId = null;
let currentGroupId = null;
let allGroups = [];
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
    if (tab.dataset.tab === 'groups') loadGroups();
    if (tab.dataset.tab === 'tricks') loadTricks();
  });
});

// ===== STUDENTS =====
async function loadStudents() {
  const tbody = document.getElementById('studentsBody');
  const noStudents = document.getElementById('noStudents');
  try {
    allGroups = await getGroups();
    populateGroupSelect();
    const students = await getAllStudents();
    const studentList = students.filter(s => s.role !== 'teacher');
    if (studentList.length === 0) {
      tbody.innerHTML = '';
      noStudents.style.display = 'block';
      return;
    }
    noStudents.style.display = 'none';
    tbody.innerHTML = studentList.map(s => {
      const groupIds = s.groupIds || (s.groupId ? [s.groupId] : []);
      const groupNames = groupIds.map(gid => {
        const g = allGroups.find(gr => gr.id === gid);
        return g ? g.name : null;
      }).filter(Boolean);
      return `
      <tr>
        <td><strong>${s.name || 'N/A'}</strong></td>
        <td>${s.email || 'N/A'}</td>
        <td>${s.phone || 'N/A'}</td>
        <td>${s.level ? `<span class="course-badge badge-${s.level === 'patente' ? 'patente' : s.level.toLowerCase()}">${s.level}</span>` : '<span style="color:var(--text-light);">Not set</span>'}</td>
        <td>${groupNames.length > 0 ? groupNames.map(n => `<span style="font-size:0.8rem;font-weight:600;color:var(--primary);display:block;">${n}</span>`).join('') : '<span style="color:var(--text-light);font-size:0.8rem;">No group</span>'}</td>
        <td>${s.isActive ? '<span style="color:var(--accent);font-weight:600;">Active</span>' : '<span style="color:var(--warning);font-weight:600;">Inactive</span>'}</td>
        <td class="actions">
          <button class="btn btn-secondary btn-sm" onclick="editStudent('${s.uid}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-sm" style="background:${s.isActive ? 'var(--warning)' : 'var(--accent)'};color:white;" onclick="toggleStudentActive('${s.uid}', ${!s.isActive})">
            <i class="fas fa-${s.isActive ? 'ban' : 'check'}"></i>
          </button>
          <button class="btn btn-sm" style="background:var(--primary-light);color:white;" onclick="resetStudentPassword('${s.email}')" title="Send password reset email">
            <i class="fas fa-key"></i>
          </button>
          <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.uid}')"><i class="fas fa-trash"></i></button>
        </td>
      </tr>`;
    }).join('');
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:2rem;">Error loading students: ${err.message}</td></tr>`;
  }
}

function populateGroupSelect() {
  const select = document.getElementById('sGroup');
  select.innerHTML = '';
  allGroups.forEach(g => {
    select.innerHTML += `<option value="${g.id}">${g.name}</option>`;
  });
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
  document.getElementById('sGroup').selectedIndex = -1;
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
  const groupIds = profile.groupIds || (profile.groupId ? [profile.groupId] : []);
  const groupSelect = document.getElementById('sGroup');
  for (const opt of groupSelect.options) {
    opt.selected = groupIds.includes(opt.value);
  }
  openStudentModal('Edit Student');
}

async function saveStudent() {
  const name = document.getElementById('sName').value.trim();
  const email = document.getElementById('sEmail').value.trim();
  const phone = document.getElementById('sPhone').value.trim();
  const level = document.getElementById('sLevel').value;
  const groupSelect = document.getElementById('sGroup');
  const groupIds = Array.from(groupSelect.selectedOptions).map(opt => opt.value);
  const isActive = document.getElementById('sActive').value === 'true';

  if (!name) { showToast('Enter a name', 'error'); return; }

  if (editingStudentUid) {
    const updateData = { name, phone, level, groupIds, isActive };
    await updateStudentProfile(editingStudentUid, updateData);
    showToast('Student updated');
  } else {
    if (!email) { showToast('Enter an email', 'error'); return; }
    try {
      const docId = 'pending_' + email.replace(/[@.]/g, '_');
      await createStudentProfile(docId, {
        name, email, phone, level, groupIds, isActive,
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

async function resetStudentPassword(email) {
  if (!confirm(`Send password reset email to ${email}?`)) return;
  try {
    await sendPasswordReset(email);
    showToast('Password reset email sent to ' + email);
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ===== GROUPS =====
async function loadGroups() {
  const container = document.getElementById('groupsContainer');
  const noGroups = document.getElementById('noGroups');
  try {
    allGroups = await getGroups();
    if (allGroups.length === 0) {
      container.innerHTML = '';
      noGroups.style.display = 'block';
      return;
    }
    noGroups.style.display = 'none';
    const sorted = allGroups.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    container.innerHTML = '';
    for (const group of sorted) {
      const sections = await getSections(group.id);
      const sortedSections = sections.sort((a, b) => (a.order || 0) - (b.order || 0));
      let sectionsHtml = '';
      for (const sec of sortedSections) {
        const videos = await getVideos(sec.id);
        const sortedVideos = videos.sort((a, b) => (a.order || 0) - (b.order || 0));
        const videosHtml = sortedVideos.map(v => `
          <div class="video-item">
            <div class="video-item-info">
              ${v.thumbnail ? `<img src="${v.thumbnail}" class="video-thumb" onerror="this.style.display='none'">` : '<div class="video-thumb"></div>'}
              <div class="video-item-details">
                <strong>${v.title}</strong>
                <span class="video-topics">${v.topics || ''}</span>
              </div>
            </div>
            <div class="group-actions">
              <button class="btn btn-secondary btn-sm" onclick="editVideo('${v.id}','${group.id}','${sec.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-sm" onclick="deleteVideoConfirm('${v.id}','${group.id}')"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `).join('');
        sectionsHtml += `
          <div class="section-card">
            <div class="section-header">
              <h4><i class="fas fa-list"></i> ${sec.title}</h4>
              <div class="group-actions">
                <button class="btn btn-primary btn-xs" onclick="openVideoModal('${group.id}','${sec.id}')"><i class="fas fa-plus"></i> Video</button>
                <button class="btn btn-secondary btn-xs" onclick="editSection('${sec.id}','${group.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn btn-danger btn-xs" onclick="deleteSectionConfirm('${sec.id}','${group.id}')"><i class="fas fa-trash"></i></button>
              </div>
            </div>
            <div class="section-body">
              ${sortedVideos.length === 0 ? '<p style="color:var(--text-light);font-size:0.85rem;text-align:center;padding:0.5rem;">No videos yet</p>' : videosHtml}
            </div>
          </div>
        `;
      }
      const badgeClass = group.level === 'patente' ? 'badge-patente' : `badge-${group.level.toLowerCase()}`;
      container.innerHTML += `
        <div class="group-card">
          <div class="group-header" onclick="toggleGroupBody(this)">
            <h3>
              <i class="fas fa-layer-group"></i> ${group.name}
              <span class="group-level course-badge ${badgeClass}">${group.level}</span>
            </h3>
            <div class="group-actions">
              <button class="btn btn-primary btn-xs" onclick="event.stopPropagation();openSectionModal('${group.id}')"><i class="fas fa-plus"></i> Section</button>
              <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation();editGroup('${group.id}')"><i class="fas fa-edit"></i></button>
              <button class="btn btn-danger btn-xs" onclick="event.stopPropagation();deleteGroupConfirm('${group.id}')"><i class="fas fa-trash"></i></button>
              <i class="fas fa-chevron-down" style="color:var(--text-light);transition:transform 0.3s;"></i>
            </div>
          </div>
          <div class="group-body" style="display:none;">
            ${sortedSections.length === 0 ? '<p style="color:var(--text-light);text-align:center;padding:1rem;">No sections yet. Add a section to organize videos.</p>' : sectionsHtml}
          </div>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem;">Error loading groups: ${err.message}</p>`;
  }
}

function toggleGroupBody(header) {
  const body = header.nextElementSibling;
  const icon = header.querySelector('.fa-chevron-down');
  if (body.style.display === 'none') {
    body.style.display = 'block';
    if (icon) icon.style.transform = 'rotate(180deg)';
  } else {
    body.style.display = 'none';
    if (icon) icon.style.transform = '';
  }
}

function openGroupModal(title) {
  document.getElementById('groupModalTitle').textContent = title || 'Add Group';
  document.getElementById('groupModal').classList.add('active');
}

function closeGroupModal() {
  document.getElementById('groupModal').classList.remove('active');
  editingGroupId = null;
  document.getElementById('gName').value = '';
  document.getElementById('gLevel').selectedIndex = 0;
}

async function editGroup(groupId) {
  const group = await getGroup(groupId);
  if (!group) return;
  editingGroupId = groupId;
  document.getElementById('gName').value = group.name || '';
  document.getElementById('gLevel').value = group.level || 'A2';
  openGroupModal('Edit Group');
}

async function saveGroup() {
  const name = document.getElementById('gName').value.trim();
  const level = document.getElementById('gLevel').value;
  if (!name) { showToast('Enter a group name', 'error'); return; }
  if (editingGroupId) {
    await updateGroup(editingGroupId, { name, level });
    showToast('Group updated');
  } else {
    await createGroup({ name, level, createdAt: new Date().toISOString() });
    showToast('Group created');
  }
  closeGroupModal();
  loadGroups();
}

async function deleteGroupConfirm(groupId) {
  if (!confirm('Delete this group and ALL its sections and videos? This cannot be undone.')) return;
  await deleteGroup(groupId);
  showToast('Group deleted');
  loadGroups();
}

// ===== SECTIONS =====
function openSectionModal(groupId, title) {
  editingSectionId = null;
  currentGroupId = groupId;
  document.getElementById('sectionModalTitle').textContent = title || 'Add Section';
  document.getElementById('secTitle').value = '';
  document.getElementById('secOrder').value = 1;
  document.getElementById('sectionModal').classList.add('active');
}

function closeSectionModal() {
  document.getElementById('sectionModal').classList.remove('active');
  editingSectionId = null;
  currentGroupId = null;
}

async function editSection(sectionId, groupId) {
  const sections = await getSections(groupId);
  const sec = sections.find(s => s.id === sectionId);
  if (!sec) return;
  editingSectionId = sectionId;
  currentGroupId = groupId;
  document.getElementById('secTitle').value = sec.title || '';
  document.getElementById('secOrder').value = sec.order || 1;
  document.getElementById('sectionModalTitle').textContent = 'Edit Section';
  document.getElementById('sectionModal').classList.add('active');
}

async function saveSection() {
  const title = document.getElementById('secTitle').value.trim();
  const order = parseInt(document.getElementById('secOrder').value) || 1;
  if (!title) { showToast('Enter a section title', 'error'); return; }
  if (editingSectionId) {
    await updateSection(editingSectionId, { title, order });
    showToast('Section updated');
  } else {
    await createSection({ groupId: currentGroupId, title, order, createdAt: new Date().toISOString() });
    showToast('Section added');
  }
  closeSectionModal();
  loadGroups();
}

async function deleteSectionConfirm(sectionId, groupId) {
  if (!confirm('Delete this section and ALL its videos? This cannot be undone.')) return;
  await deleteSection(sectionId);
  showToast('Section deleted');
  loadGroups();
}

// ===== VIDEOS =====
function openVideoModal(groupId, sectionId, title) {
  editingVideoId = null;
  currentGroupId = groupId;
  editingSectionId = sectionId;
  document.getElementById('videoModalTitle').textContent = title || 'Add Video';
  ['vTitle','vTopics','vDescription','vUrl','vThumbnail','vNotesUrl'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('videoModal').classList.add('active');
}

function closeVideoModal() {
  document.getElementById('videoModal').classList.remove('active');
  editingVideoId = null;
  editingSectionId = null;
  currentGroupId = null;
}

async function editVideo(videoId, groupId, sectionId) {
  const videos = await getVideos(sectionId);
  const video = videos.find(v => v.id === videoId);
  if (!video) return;
  editingVideoId = videoId;
  currentGroupId = groupId;
  editingSectionId = sectionId;
  document.getElementById('vTitle').value = video.title || '';
  document.getElementById('vTopics').value = video.topics || '';
  document.getElementById('vDescription').value = video.description || '';
  document.getElementById('vUrl').value = video.url || '';
  document.getElementById('vThumbnail').value = video.thumbnail || '';
  document.getElementById('vNotesUrl').value = video.notesUrl || '';
  document.getElementById('videoModalTitle').textContent = 'Edit Video';
  document.getElementById('videoModal').classList.add('active');
}

async function saveVideo() {
  const title = document.getElementById('vTitle').value.trim();
  const topics = document.getElementById('vTopics').value.trim();
  const description = document.getElementById('vDescription').value.trim();
  const url = document.getElementById('vUrl').value.trim();
  const thumbnail = document.getElementById('vThumbnail').value.trim();
  const notesUrl = document.getElementById('vNotesUrl').value.trim();
  if (!title) { showToast('Enter a video title', 'error'); return; }
  if (!url) { showToast('Enter a video URL', 'error'); return; }
  const data = { title, topics, description, url, thumbnail, notesUrl, sectionId: editingSectionId, groupId: currentGroupId };
  if (editingVideoId) {
    await updateVideo(editingVideoId, data);
    showToast('Video updated');
  } else {
    data.order = Date.now();
    await createVideo(data);
    showToast('Video added');
  }
  closeVideoModal();
  loadGroups();
}

async function deleteVideoConfirm(videoId, groupId) {
  if (!confirm('Delete this video?')) return;
  await deleteVideo(videoId);
  showToast('Video deleted');
  loadGroups();
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

// ===== PATENTE TRICKS =====
let editingTrickId = null;

async function loadTricks(filter = '') {
  const container = document.getElementById('tricksContainer');
  const noTricks = document.getElementById('noTricks');
  try {
    let tricks = await getAllTricks();
    if (filter) {
      tricks = tricks.filter(t => t.word.toLowerCase().includes(filter.toLowerCase()));
    }
    if (tricks.length === 0) {
      container.innerHTML = '';
      noTricks.style.display = 'block';
      return;
    }
    noTricks.style.display = 'none';
    container.innerHTML = tricks.map(t => `
      <div class="video-item" style="align-items:flex-start;">
        <div class="video-item-info" style="gap:0.5rem;">
          ${t.imageUrl ? `<img src="${t.imageUrl}" style="width:100%;max-width:300px;border-radius:var(--radius-sm);margin-bottom:0.5rem;" onerror="this.style.display='none'">` : ''}
          <div>
            <strong style="color:var(--primary);font-size:1rem;">${t.word}</strong>
            <p style="margin:0.3rem 0 0;font-size:0.85rem;color:var(--text);line-height:1.5;">${t.description}</p>
          </div>
        </div>
        <div class="group-actions" style="flex-shrink:0;">
          <button class="btn btn-secondary btn-sm" onclick="editTrick('${t.id}')"><i class="fas fa-edit"></i></button>
          <button class="btn btn-danger btn-sm" onclick="deleteTrickConfirm('${t.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem;">Error loading tricks: ${err.message}</p>`;
  }
}

function openTrickModal(title) {
  document.getElementById('trickModalTitle').textContent = title || 'Add Trick';
  document.getElementById('trickModal').classList.add('active');
}

function closeTrickModal() {
  document.getElementById('trickModal').classList.remove('active');
  editingTrickId = null;
  document.getElementById('tWord').value = '';
  document.getElementById('tDescription').value = '';
  document.getElementById('tImageUrl').value = '';
}

async function editTrick(trickId) {
  const tricks = await getAllTricks();
  const trick = tricks.find(t => t.id === trickId);
  if (!trick) return;
  editingTrickId = trickId;
  document.getElementById('tWord').value = trick.word || '';
  document.getElementById('tDescription').value = trick.description || '';
  document.getElementById('tImageUrl').value = trick.imageUrl || '';
  openTrickModal('Edit Trick');
}

async function saveTrick() {
  const word = document.getElementById('tWord').value.trim();
  const description = document.getElementById('tDescription').value.trim();
  const imageUrl = document.getElementById('tImageUrl').value.trim();
  if (!word) { showToast('Enter a word', 'error'); return; }
  if (!description) { showToast('Enter a description', 'error'); return; }
  const data = { word, description, imageUrl, updatedAt: new Date().toISOString() };
  if (editingTrickId) {
    await updateTrick(editingTrickId, data);
    showToast('Trick updated');
  } else {
    data.createdAt = new Date().toISOString();
    await createTrick(data);
    showToast('Trick added');
  }
  closeTrickModal();
  loadTricks(document.getElementById('trickSearch').value);
}

async function deleteTrickConfirm(trickId) {
  if (!confirm('Delete this trick?')) return;
  await deleteTrick(trickId);
  showToast('Trick deleted');
  loadTricks(document.getElementById('trickSearch').value);
}

// ===== EVENTS =====
document.getElementById('addStudentBtn').addEventListener('click', () => {
  document.getElementById('sEmail').disabled = false;
  openStudentModal();
});
document.getElementById('cancelStudentModal').addEventListener('click', closeStudentModal);
document.getElementById('saveStudent').addEventListener('click', saveStudent);
document.getElementById('studentModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeStudentModal(); });

document.getElementById('addGroupBtn').addEventListener('click', () => openGroupModal());
document.getElementById('cancelGroupModal').addEventListener('click', closeGroupModal);
document.getElementById('saveGroup').addEventListener('click', saveGroup);
document.getElementById('groupModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeGroupModal(); });

document.getElementById('cancelSectionModal').addEventListener('click', closeSectionModal);
document.getElementById('saveSection').addEventListener('click', saveSection);
document.getElementById('sectionModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeSectionModal(); });

document.getElementById('cancelVideoModal').addEventListener('click', closeVideoModal);
document.getElementById('saveVideo').addEventListener('click', saveVideo);
document.getElementById('videoModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeVideoModal(); });

document.getElementById('addQuestionBtn').addEventListener('click', () => openModal());
document.getElementById('cancelModal').addEventListener('click', closeModal);
document.getElementById('saveQuestion').addEventListener('click', saveQuestion);
document.getElementById('filterLevel').addEventListener('change', (e) => renderQuestions(e.target.value));
document.getElementById('saveDates').addEventListener('click', saveSettings);
document.getElementById('saveSocial').addEventListener('click', saveSettings);
document.getElementById('questionModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeModal(); });

document.getElementById('addTrickBtn').addEventListener('click', () => openTrickModal());
document.getElementById('cancelTrickModal').addEventListener('click', closeTrickModal);
document.getElementById('saveTrick').addEventListener('click', saveTrick);
document.getElementById('trickModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) closeTrickModal(); });
document.getElementById('trickSearch').addEventListener('input', (e) => loadTricks(e.target.value));

const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));

loadQuestionsFromStorage();
renderQuestions();
loadSettings();
