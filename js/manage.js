let questions = JSON.parse(JSON.stringify(window.QUESTIONS_DATA || []));
let editingId = null;
let editingStudentUid = null;
let editingGroupId = null;
let editingSectionId = null;
let editingVideoId = null;
let currentGroupId = null;
let allGroups = [];
let allStudents = [];
let isTeacher = false;

function getExpiryCell(expiryDate) {
  if (!expiryDate) return '<span style="color:var(--text-light);font-size:0.8rem;">No expiry</span>';
  const today = new Date();
  today.setHours(0,0,0,0);
  const expiry = new Date(expiryDate + 'T00:00:00');
  const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '<span style="color:#e74c3c;font-weight:600;font-size:0.8rem;"><i class="fas fa-times-circle"></i> Expired ' + expiryDate + '</span>';
  if (diffDays <= 7) return '<span style="color:var(--warning);font-weight:600;font-size:0.8rem;"><i class="fas fa-clock"></i> ' + expiryDate + ' (' + diffDays + ' days left)</span>';
  return '<span style="color:var(--accent);font-size:0.8rem;"><i class="fas fa-calendar-check"></i> ' + expiryDate + '</span>';
}

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
    if (tab.dataset.tab === 'patenteQuiz') {
      loadPatenteQuizzes();
      loadTestQuizzes();
    }
    if (tab.dataset.tab === 'courseCards') loadCourseCards();
  });
});

// ===== STUDENTS =====
let currentStudentFilter = 'all';

function filterStudents(filter, btn) {
  currentStudentFilter = filter;
  document.querySelectorAll('.student-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderFilteredStudents();
}

function renderFilteredStudents() {
  const tbody = document.getElementById('studentsBody');
  const noStudents = document.getElementById('noStudents');
  const students = allStudents.filter(s => s.role !== 'teacher');

  const filtered = students.filter(s => {
    const groupIds = s.groupIds || (s.groupId ? [s.groupId] : []);
    const groups = groupIds.map(gid => allGroups.find(gr => gr.id === gid)).filter(Boolean);
    const levels = [...new Set(groups.map(g => g.level))].filter(Boolean);

    if (currentStudentFilter === 'all') return true;
    if (currentStudentFilter === 'all-courses') return levels.length >= 2;
    if (currentStudentFilter.includes('+')) {
      const required = currentStudentFilter.split('+');
      return required.every(r => levels.includes(r));
    }
    return levels.includes(currentStudentFilter);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '';
    noStudents.style.display = 'block';
    return;
  }
  noStudents.style.display = 'none';
  tbody.innerHTML = filtered.map(s => {
    const groupIds = s.groupIds || (s.groupId ? [s.groupId] : []);
    const groups = groupIds.map(gid => allGroups.find(gr => gr.id === gid)).filter(Boolean);
    const groupNames = groups.map(g => g.name);
    const levels = [...new Set(groups.map(g => g.level))].filter(Boolean);
    return `
    <tr>
      <td><strong>${s.name || 'N/A'}</strong></td>
      <td>${s.email || 'N/A'}</td>
      <td>${s.phone || 'N/A'}</td>
      <td>${levels.length > 0 ? levels.map(l => `<span class="course-badge badge-${l === 'patente' ? 'patente' : l.toLowerCase()}">${l}</span>`).join(' ') : '<span style="color:var(--text-light);">Not set</span>'}</td>
      <td>${groupNames.length > 0 ? groupNames.map(n => `<span style="font-size:0.8rem;font-weight:600;color:var(--primary);display:block;">${n}</span>`).join('') : '<span style="color:var(--text-light);font-size:0.8rem;">No group</span>'}</td>
      <td>${getExpiryCell(s.expiryDate)}</td>
      <td>${s.isActive ? '<span style="color:var(--accent);font-weight:600;">Active</span>' : '<span style="color:var(--warning);font-weight:600;">Inactive</span>'}</td>
      <td class="actions">
        <button class="btn btn-secondary btn-sm" onclick="editStudent('${s.uid}')"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm" style="background:${s.isActive ? 'var(--warning)' : 'var(--accent)'};color:white;" onclick="toggleStudentActive('${s.uid}', ${!s.isActive})">
          <i class="fas fa-${s.isActive ? 'ban' : 'check'}"></i>
        </button>
        <button class="btn btn-sm" style="background:var(--primary-light);color:white;" onclick="resetStudentPassword('${s.email}')" title="Send password reset email">
          <i class="fas fa-key"></i>
        </button>
        <button class="btn btn-sm" style="background:#8e44ad;color:white;" onclick="viewAsStudent('${s.uid}')" title="View as student">
          <i class="fas fa-eye"></i>
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteStudent('${s.uid}')"><i class="fas fa-trash"></i></button>
      </td>
    </tr>`;
  }).join('');
}

async function loadStudents() {
  const tbody = document.getElementById('studentsBody');
  const noStudents = document.getElementById('noStudents');
  try {
    allGroups = await getGroups();
    populateGroupCheckboxes();
    allStudents = await getAllStudents();
    renderFilteredStudents();
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--danger);padding:2rem;">Error loading students: ${err.message}</td></tr>`;
  }
}

function populateGroupCheckboxes() {
  const container = document.getElementById('sGroupCheckboxes');
  if (allGroups.length === 0) {
    container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">No groups created yet. Create groups first.</p>';
    return;
  }
  const levels = ['A2', 'B1', 'patente'];
  const levelLabels = { A2: 'Italian A2', B1: 'Italian B1', patente: 'Patente' };
  let html = '';
  for (const level of levels) {
    const levelGroups = allGroups.filter(g => g.level === level);
    if (levelGroups.length === 0) continue;
    const badgeClass = level === 'patente' ? 'badge-patente' : `badge-${level.toLowerCase()}`;
    html += `<div style="margin-bottom:0.5rem;">`;
    html += `<div style="font-size:0.8rem;font-weight:600;color:var(--primary);margin-bottom:0.3rem;padding-bottom:0.3rem;border-bottom:1px solid var(--border);"><span class="course-badge ${badgeClass}" style="font-size:0.7rem;">${level}</span> ${levelLabels[level]}</div>`;
    for (const g of levelGroups) {
      html += `<label style="display:flex;align-items:center;gap:0.5rem;padding:0.35rem 0.4rem;cursor:pointer;font-size:0.85rem;border-radius:4px;margin-bottom:2px;"><input type="checkbox" value="${g.id}" class="group-checkbox" style="margin:0;"> ${g.name}</label>`;
    }
    html += '</div>';
  }
  container.innerHTML = html;
}

function getSelectedGroupIds() {
  return Array.from(document.querySelectorAll('.group-checkbox:checked')).map(cb => cb.value);
}

function setSelectedGroups(groupIds) {
  document.querySelectorAll('.group-checkbox').forEach(cb => {
    cb.checked = groupIds.includes(cb.value);
  });
}

function openStudentModal(title) {
  document.getElementById('studentModalTitle').textContent = title || 'Add Student';
  document.getElementById('studentModal').classList.add('active');
}

function closeStudentModal() {
  document.getElementById('studentModal').classList.remove('active');
  editingStudentUid = null;
  ['sName','sEmail','sPhone','sActive','sExpiry'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (el.tagName === 'SELECT') el.selectedIndex = 0;
      else el.value = '';
    }
  });
  document.querySelectorAll('.group-checkbox').forEach(cb => cb.checked = false);
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
  document.getElementById('sActive').value = profile.isActive ? 'true' : 'false';
  document.getElementById('sExpiry').value = profile.expiryDate || '';
  const groupIds = profile.groupIds || (profile.groupId ? [profile.groupId] : []);
  setSelectedGroups(groupIds);
  openStudentModal('Edit Student');
}

async function saveStudent() {
  const name = document.getElementById('sName').value.trim();
  const email = document.getElementById('sEmail').value.trim();
  const phone = document.getElementById('sPhone').value.trim();
  const groupIds = getSelectedGroupIds();
  const isActive = document.getElementById('sActive').value === 'true';
  const expiryDate = document.getElementById('sExpiry').value || null;

  if (!name) { showToast('Enter a name', 'error'); return; }

  let level = '';
  if (groupIds.length > 0) {
    const firstGroup = allGroups.find(g => g.id === groupIds[0]);
    if (firstGroup) level = firstGroup.level;
  }

  if (editingStudentUid) {
    const updateData = { name, phone, level, groupIds, isActive, expiryDate };
    await updateStudentProfile(editingStudentUid, updateData);
    showToast('Student updated');
  } else {
    if (!email) { showToast('Enter an email', 'error'); return; }
    try {
      const docId = 'pending_' + email.replace(/[@.]/g, '_');
      await createStudentProfile(docId, {
        name, email, phone, level, groupIds, isActive, expiryDate,
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
let currentGroupFilter = 'active';

function toggleGroupFilter(filter, btn) {
  currentGroupFilter = filter;
  document.querySelectorAll('#tab-groups .student-filter').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderGroups();
}

async function renderGroups() {
  const container = document.getElementById('groupsContainer');
  const noGroups = document.getElementById('noGroups');
  container.innerHTML = '';

  const filtered = allGroups.filter(g => {
    if (currentGroupFilter === 'active') return !g.isArchived;
    if (currentGroupFilter === 'archived') return g.isArchived;
    return true;
  });

  if (filtered.length === 0) {
    noGroups.style.display = 'block';
    return;
  }

  noGroups.style.display = 'none';
  const sorted = filtered.sort((a, b) => (a.name || '').localeCompare(b.name || ''));

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
    const isArchived = group.isArchived || false;
    const groupStudents = allStudents.filter(s => {
      const gIds = s.groupIds || (s.groupId ? [s.groupId] : []);
      return gIds.includes(group.id);
    });
    const hasInactive = groupStudents.some(s => !s.isActive);
    const archivedClass = isArchived ? 'group-archived' : '';
    const inactiveClass = hasInactive && !isArchived ? 'group-has-inactive' : '';
    container.innerHTML += `
      <div class="group-card ${archivedClass} ${inactiveClass}">
        <div class="group-header" onclick="toggleGroupBody(this)">
          <h3>
            <i class="fas fa-layer-group"></i> ${group.name}
            <span class="group-level course-badge ${badgeClass}">${group.level}</span>
            ${isArchived ? '<span class="group-status-badge archived"><i class="fas fa-archive"></i> Archived</span>' : ''}
            ${hasInactive && !isArchived ? '<span class="group-status-badge inactive"><i class="fas fa-user-slash"></i> Has inactive students</span>' : ''}
          </h3>
          <div class="group-actions">
            <button class="btn btn-primary btn-xs" onclick="event.stopPropagation();openSectionModal('${group.id}')"><i class="fas fa-plus"></i> Section</button>
            <button class="btn btn-secondary btn-xs" onclick="event.stopPropagation();editGroup('${group.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-xs" style="background:#e67e22;color:white;" onclick="event.stopPropagation();deactivateGroup('${group.id}')" title="Deactivate all students in this group"><i class="fas fa-user-slash"></i></button>
            <button class="btn btn-xs" style="background:${isArchived ? '#27ae60' : '#7f8c8d'};color:white;" onclick="event.stopPropagation();toggleArchiveGroup('${group.id}', ${!isArchived})" title="${isArchived ? 'Unarchive' : 'Archive'} group"><i class="fas fa-${isArchived ? 'undo' : 'archive'}"></i></button>
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
}

async function loadGroups() {
  try {
    allGroups = await getGroups();
    renderGroups();
  } catch (err) {
    document.getElementById('groupsContainer').innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem;">Error loading groups: ${err.message}</p>`;
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

async function deactivateGroup(groupId) {
  const group = allGroups.find(g => g.id === groupId);
  if (!group) return;
  if (!confirm('Deactivate ALL students in "' + group.name + '"? They won\'t be able to access videos.')) return;

  try {
    const students = await getAllStudents();
    const groupStudents = students.filter(s => {
      const groupIds = s.groupIds || (s.groupId ? [s.groupId] : []);
      return groupIds.includes(groupId);
    });

    for (const student of groupStudents) {
      await updateStudentProfile(student.uid, { isActive: false });
    }

    showToast(groupStudents.length + ' students deactivated in ' + group.name, 'success');
    loadStudents();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function toggleArchiveGroup(groupId, archive) {
  const group = allGroups.find(g => g.id === groupId);
  if (!group) return;
  const action = archive ? 'archive' : 'unarchive';
  if (!confirm(action.charAt(0).toUpperCase() + action.slice(1) + ' "' + group.name + '"?')) return;

  try {
    await firebaseDb.collection('groups').doc(groupId).update({ isArchived: archive });
    group.isArchived = archive;
    showToast('Group ' + action + 'd', 'success');
    renderGroups();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
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

function viewAsStudent(uid) {
  window.open(`videos.html?viewAs=${uid}`, '_blank');
}

// ===== EVENTS =====
document.getElementById('addStudentBtn').addEventListener('click', () => {
  document.getElementById('sEmail').disabled = false;
  populateGroupCheckboxes();
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

// ===== PATENTE QUIZ IMPORT =====
let parsedQuizzes = [];

function parseAndPreview() {
  const text = document.getElementById('docxPasteArea').value.trim();
  if (!text) {
    showToast('Please paste the DOCX content first', 'error');
    return;
  }
  parsedQuizzes = parsePatenteText(text);
  if (parsedQuizzes.length === 0) {
    showToast('No quizzes found. Check the format.', 'error');
    return;
  }
  const totalQ = parsedQuizzes.reduce((sum, q) => sum + q.questions.length, 0);
  document.getElementById('previewCount').textContent = totalQ;
  document.getElementById('previewQuizCount').textContent = parsedQuizzes.length;
  const container = document.getElementById('importPreviewContent');
  container.innerHTML = parsedQuizzes.map(q => `
    <div style="margin-bottom:1.5rem;padding:1rem;background:var(--bg);border-radius:var(--radius-sm);border:1px solid var(--border);">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem;">
        <strong style="color:var(--primary);">${q.title}</strong>
        <span style="font-size:0.8rem;color:var(--text-light);">Blocco: ${q.blockNumber} | ${q.totalQuestions} questions</span>
      </div>
      <div style="font-size:0.85rem;">
        <div style="margin-bottom:0.5rem;"><span style="color:var(--accent);font-weight:600;">VERE (${q.questions.filter(x => x.answer).length}):</span></div>
        ${q.questions.filter(x => x.answer).map(x => '<div style="padding:0.2rem 0;color:var(--text);">• ' + x.text + '</div>').join('')}
        <div style="margin:0.5rem 0 0.5rem;"><span style="color:var(--danger);font-weight:600;">FALSE (${q.questions.filter(x => !x.answer).length}):</span></div>
        ${q.questions.filter(x => !x.answer).map(x => '<div style="padding:0.2rem 0;color:var(--text);">• ' + x.text + '</div>').join('')}
      </div>
    </div>
  `).join('');
  document.getElementById('importPreview').style.display = 'block';
}

async function saveImportedQuizzes() {
  if (parsedQuizzes.length === 0) return;
  const btn = document.getElementById('saveImportBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
  let savedCount = 0;
  try {
    for (const q of parsedQuizzes) {
      await createPatenteQuiz(q);
      savedCount++;
    }
    const total = parsedQuizzes.reduce((s, q) => s + q.questions.length, 0);
    showToast('Saved ' + savedCount + ' quizzes (' + total + ' questions) to cloud', 'success');
    parsedQuizzes = [];
    document.getElementById('importPreview').style.display = 'none';
    document.getElementById('docxPasteArea').value = '';
    loadPatenteQuizzes();
  } catch (err) {
    showToast('Error saving: ' + err.message, 'error');
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-save"></i> Save All to Database';
}

async function loadPatenteQuizzes() {
  const container = document.getElementById('importedQuizzesList');
  const noQuizzes = document.getElementById('noImportedQuizzes');
  try {
    const quizzes = await getAllPatenteQuizzes();
    document.getElementById('importedQuizCount').textContent = quizzes.length;
    if (quizzes.length === 0) {
      container.innerHTML = '';
      noQuizzes.style.display = 'block';
      return;
    }
    noQuizzes.style.display = 'none';
    container.innerHTML = quizzes.map(q => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border-bottom:1px solid var(--border);">
        <div>
          <strong style="color:var(--primary);">${q.title}</strong>
          <span style="font-size:0.8rem;color:var(--text-light);margin-left:0.5rem;">Blocco: ${q.blockNumber}</span>
          <span style="font-size:0.8rem;color:var(--text-light);margin-left:0.5rem;">| ${q.totalQuestions} questions</span>
        </div>
        <button class="btn btn-danger btn-sm" onclick="deletePatenteQuizConfirm('${q.id}')"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);text-align:center;padding:1rem;">Error loading: ' + err.message + '</p>';
    noQuizzes.style.display = 'none';
  }
}

async function deletePatenteQuizConfirm(quizId) {
  if (!confirm('Delete this quiz?')) return;
  try {
    await deletePatenteQuiz(quizId);
    showToast('Quiz deleted', 'success');
    loadPatenteQuizzes();
  } catch (err) {
    showToast('Error deleting: ' + err.message, 'error');
  }
}

async function clearAllPatenteQuizzesConfirm() {
  if (!confirm('Delete ALL patente quizzes? This cannot be undone.')) return;
  try {
    const quizzes = await getAllPatenteQuizzes();
    for (const q of quizzes) {
      await deletePatenteQuiz(q.id);
    }
    showToast('All quizzes deleted', 'success');
    loadPatenteQuizzes();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ===== OPEN SOURCE IMPORT (Test Collection) =====
const TOPIC_MAP = {
  'definizioni-generali-doveri-strada': { title: 'Definizioni generali e doveri nell\'uso della strada', blockNumber: 1 },
  'segnali-pericolo': { title: 'Segnali di pericolo', blockNumber: 2 },
  'segnali-divieto': { title: 'Segnali di divieto', blockNumber: 3 },
  'segnali-obbligo': { title: 'Segnali d\'obbligo', blockNumber: 4 },
  'segnali-precedenza': { title: 'Segnali di precedenza', blockNumber: 5 },
  'segnaletica-orizzontale-ostacoli': { title: 'Segnaletica orizzontale e segni sugli ostacoli', blockNumber: 6 },
  'semafori-vigili': { title: 'Segnalazioni semaforiche e degli agenti del traffico', blockNumber: 7 },
  'segnali-indicazione': { title: 'Segnali di indicazione', blockNumber: 8 },
  'segnali-complementari-cantiere': { title: 'Segnali complementari, segnali temporanei e di cantiere', blockNumber: 9 },
  'pannelli-integrativi': { title: 'Pannelli integrativi dei segnali', blockNumber: 10 },
  'limiti-di-velocita': { title: 'Limiti di velocità, pericolo e intralcio alla circolazione', blockNumber: 11 },
  'distanza-di-sicurezza': { title: 'Distanza di sicurezza', blockNumber: 12 },
  'norme-di-circolazione': { title: 'Norme sulla circolazione dei veicoli', blockNumber: 13 },
  'precedenza-incroci': { title: 'Esempi di precedenza', blockNumber: 14 },
  'sorpasso': { title: 'Norme sul sorpasso', blockNumber: 15 },
  'fermata-sosta-arresto': { title: 'Fermata, sosta, arresto e partenza', blockNumber: 16 },
  'norme-varie-autostrade-pannelli': { title: 'Norme varie (ingombro della carreggiata, circolazione su autostrade e strade extraurbane principali, trasporto di persone, pannelli sui veicoli, etc.)', blockNumber: 17 },
  'luci-dispositivi-acustici': { title: 'Uso delle luci e dei dispositivi acustici, spie e simboli', blockNumber: 18 },
  'cinture-casco-sicurezza': { title: 'Cinture di sicurezza, sistemi di ritenuta per bambini, casco protettivo e abbigliamento di sicurezza', blockNumber: 19 },
  'patente-punti-documenti': { title: 'Patenti di guida, sistema sanzionatorio, documenti di circolazione, obblighi verso agenti, uso di lenti e altri apparecchi', blockNumber: 20 },
  'incidenti-stradali-comportamenti': { title: 'Incidenti stradali e comportamenti in caso di incidente', blockNumber: 21 },
  'alcool-droga-primo-soccorso': { title: 'Guida in relazione alle qualità e condizioni fisiche e psichiche, alcool, droga, farmaci e primo soccorso', blockNumber: 22 },
  'responsabilita-civile-penale-e-assicurazione': { title: 'Responsabilità civile, penale e amministrativa, assicurazione r.c.a. e altre forme assicurative legate al veicolo', blockNumber: 23 },
  'consumi-ambiente-inquinamento': { title: 'Limitazione dei consumi, rispetto dell\'ambiente e inquinamento', blockNumber: 24 },
  'elementi-veicolo-manutenzione-comportamenti': { title: 'Elementi costitutivi del veicolo, manutenzione ed uso, stabilità e tenuta di strada, comportamenti e cautele di guida', blockNumber: 25 }
};

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/Ed0ardo/QuizPatenteB/main';

async function importOpenSourceQuizzes() {
  const btn = document.getElementById('importOpenSourceBtn');
  const status = document.getElementById('importOpenSourceStatus');
  if (!btn || !status) return;

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Downloading...';
  status.textContent = 'Fetching questions from GitHub...';
  status.style.color = 'var(--primary)';

  try {
    const res = await fetch('https://raw.githubusercontent.com/Ed0ardo/QuizPatenteB/main/quizPatenteB2023.json');
    if (!res.ok) throw new Error('Failed to fetch JSON');
    const data = await res.json();

    status.textContent = 'Processing questions...';

    const quizzes = [];
    let totalQ = 0;

    for (const [topicKey, subTopics] of Object.entries(data)) {
      const mapping = TOPIC_MAP[topicKey] || { title: topicKey, blockNumber: 99 };

      const questions = [];
      for (const [subKey, qList] of Object.entries(subTopics)) {
        for (const q of qList) {
          questions.push({
            text: q.q,
            answer: q.a,
            image: q.img ? GITHUB_RAW_BASE + q.img : null,
            order: questions.length
          });
        }
      }

      if (questions.length > 0) {
        quizzes.push({
          title: mapping.title,
          blockNumber: mapping.blockNumber,
          questions,
          totalQuestions: questions.length,
          source: 'github',
          createdAt: new Date().toISOString()
        });
        totalQ += questions.length;
      }
    }

    status.textContent = `Importing ${quizzes.length} quizzes (${totalQ} questions) to Firestore...`;

    await bulkImportPatenteQuizzesTest(quizzes);

    status.textContent = `Done! ${quizzes.length} quizzes imported with ${totalQ} questions.`;
    status.style.color = 'var(--success)';
    btn.innerHTML = '<i class="fas fa-check"></i> Import Complete';
    showToast(`Imported ${quizzes.length} quizzes (${totalQ} questions)`, 'success');
  } catch (err) {
    status.textContent = 'Error: ' + err.message;
    status.style.color = 'var(--danger)';
    btn.innerHTML = '<i class="fas fa-download"></i> Import from GitHub';
    showToast('Import failed: ' + err.message, 'error');
  }
  btn.disabled = false;
}

async function loadTestQuizzes() {
  const container = document.getElementById('testQuizzesList');
  const noQuizzes = document.getElementById('noTestQuizzes');
  if (!container) return;

  try {
    const quizzes = await getAllPatenteQuizzesTest();
    document.getElementById('testQuizCount').textContent = quizzes.length;
    if (quizzes.length === 0) {
      container.innerHTML = '';
      if (noQuizzes) noQuizzes.style.display = 'block';
      return;
    }
    if (noQuizzes) noQuizzes.style.display = 'none';
    container.innerHTML = quizzes.map(q => `
      <div style="display:flex;justify-content:space-between;align-items:center;padding:0.75rem;border-bottom:1px solid var(--border);">
        <div>
          <strong style="color:var(--primary);">${q.title}</strong>
          <span style="font-size:0.8rem;color:var(--text-light);margin-left:0.5rem;">Blocco: ${q.blockNumber}</span>
          <span style="font-size:0.8rem;color:var(--text-light);margin-left:0.5rem;">| ${q.totalQuestions} questions</span>
          ${q.source ? '<span style="font-size:0.7rem;color:#9c27b0;margin-left:0.5rem;">[' + q.source + ']</span>' : ''}
        </div>
        <button class="btn btn-danger btn-sm" onclick="deleteTestQuizConfirm('${q.id}')"><i class="fas fa-trash"></i></button>
      </div>
    `).join('');
  } catch (err) {
    container.innerHTML = '<p style="color:var(--danger);text-align:center;padding:1rem;">Error: ' + err.message + '</p>';
  }
}

async function deleteTestQuizConfirm(quizId) {
  if (!confirm('Delete this test quiz?')) return;
  try {
    await deletePatenteQuizTest(quizId);
    showToast('Deleted', 'success');
    loadTestQuizzes();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function clearAllTestQuizzesConfirm() {
  if (!confirm('Delete ALL test quizzes? This cannot be undone.')) return;
  try {
    await deleteAllPatenteQuizzesTest();
    showToast('All test quizzes deleted', 'success');
    loadTestQuizzes();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

// ===== COURSE CARDS =====
let allCourseCards = [];
let editingCourseCardId = null;
let ccSelectedFile = null;
let ccCurrentImageUrl = null;

async function loadCourseCards() {
  try {
    allCourseCards = await getAllCourseCards();
    renderCourseCards();
  } catch (err) {
    showToast('Error loading course cards: ' + err.message, 'error');
  }
}

function renderCourseCards() {
  const container = document.getElementById('courseCardsList');
  const noCards = document.getElementById('noCourseCards');
  if (allCourseCards.length === 0) {
    container.innerHTML = '';
    noCards.style.display = 'block';
    return;
  }
  noCards.style.display = 'none';
  container.innerHTML = allCourseCards.map(card => {
    const imageHtml = card.imageUrl
      ? `<img src="${card.imageUrl}" style="width:100%;max-height:150px;object-fit:cover;border-radius:var(--radius-sm);margin-bottom:0.75rem;">`
      : `<div style="background:var(--primary-light);color:var(--primary);padding:1rem;border-radius:var(--radius-sm);text-align:center;margin-bottom:0.75rem;"><i class="fas fa-info-circle" style="font-size:1.5rem;display:block;margin-bottom:0.3rem;"></i>Info Card</div>`;
    return `
      <div class="quiz-card" style="margin-bottom:1rem;${card.isActive ? '' : 'opacity:0.5;'}">
        ${imageHtml}
        <div style="display:flex;justify-content:space-between;align-items:start;">
          <div>
            <h3 style="font-size:1rem;margin-bottom:0.25rem;">${card.title}</h3>
            ${card.description ? `<p style="font-size:0.85rem;color:var(--text-light);margin-bottom:0.25rem;">${card.description}</p>` : ''}
            ${card.startDate ? `<p style="font-size:0.8rem;"><i class="fas fa-calendar"></i> ${card.startDate}</p>` : ''}
            ${card.schedule ? `<p style="font-size:0.8rem;"><i class="fas fa-clock"></i> ${card.schedule}</p>` : ''}
            ${card.price ? `<p style="font-size:0.8rem;font-weight:600;color:var(--primary);">${card.price}</p>` : ''}
            <span style="font-size:0.75rem;color:${card.isActive ? 'var(--accent)' : 'var(--warning)'};">${card.isActive ? 'Active' : 'Inactive'}</span>
          </div>
          <div style="display:flex;gap:0.5rem;">
            <button class="btn btn-secondary btn-sm" onclick="editCourseCard('${card.id}')"><i class="fas fa-edit"></i></button>
            <button class="btn btn-sm" style="background:${card.isActive ? 'var(--warning)' : 'var(--accent)'};color:white;" onclick="toggleCourseCardActive('${card.id}', ${!card.isActive})">
              <i class="fas fa-${card.isActive ? 'eye-slash' : 'eye'}"></i>
            </button>
            <button class="btn btn-danger btn-sm" onclick="deleteCourseCardConfirm('${card.id}')"><i class="fas fa-trash"></i></button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function openCourseCardModal(card) {
  editingCourseCardId = card ? card.id : null;
  ccSelectedFile = null;
  ccCurrentImageUrl = card ? (card.imageUrl || null) : null;
  document.getElementById('courseCardModalTitle').textContent = card ? 'Edit Course Card' : 'Add Course Card';
  document.getElementById('ccTitle').value = card ? card.title : '';
  document.getElementById('ccDescription').value = card ? (card.description || '') : '';
  document.getElementById('ccStartDate').value = card ? (card.startDate || '') : '';
  document.getElementById('ccSchedule').value = card ? (card.schedule || '') : '';
  document.getElementById('ccPrice').value = card ? (card.price || '') : '';
  document.getElementById('ccActive').value = card ? (card.isActive ? 'true' : 'false') : 'true';
  const preview = document.getElementById('ccImagePreview');
  const uploadArea = document.getElementById('ccImageUploadArea');
  if (card && card.imageUrl) {
    document.getElementById('ccPreviewImg').src = card.imageUrl;
    preview.style.display = 'block';
    uploadArea.style.display = 'none';
  } else {
    preview.style.display = 'none';
    uploadArea.style.display = 'block';
  }
  document.getElementById('courseCardModal').classList.add('active');
}

function closeCourseCardModal() {
  document.getElementById('courseCardModal').classList.remove('active');
  editingCourseCardId = null;
  ccSelectedFile = null;
  ccCurrentImageUrl = null;
}

document.getElementById('ccImageFile').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  ccSelectedFile = file;
  const reader = new FileReader();
  reader.onload = (ev) => {
    document.getElementById('ccPreviewImg').src = ev.target.result;
    document.getElementById('ccImagePreview').style.display = 'block';
    document.getElementById('ccImageUploadArea').style.display = 'none';
  };
  reader.readAsDataURL(file);
});

function removeCourseCardImage() {
  ccSelectedFile = null;
  ccCurrentImageUrl = null;
  document.getElementById('ccImagePreview').style.display = 'none';
  document.getElementById('ccImageUploadArea').style.display = 'block';
  document.getElementById('ccImageFile').value = '';
}

async function saveCourseCard() {
  const title = document.getElementById('ccTitle').value.trim();
  if (!title) { showToast('Enter a course title', 'error'); return; }
  const description = document.getElementById('ccDescription').value.trim();
  const startDate = document.getElementById('ccStartDate').value;
  const schedule = document.getElementById('ccSchedule').value.trim();
  const price = document.getElementById('ccPrice').value.trim();
  const isActive = document.getElementById('ccActive').value === 'true';

  const saveBtn = document.getElementById('saveCourseCardBtn');
  saveBtn.disabled = true;
  saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

  try {
    let imageUrl = ccCurrentImageUrl;

    if (ccSelectedFile) {
      if (ccCurrentImageUrl) await deleteCourseCardImage(ccCurrentImageUrl);
      imageUrl = await uploadCourseCardImage(ccSelectedFile);
    }

    const data = { title, description, startDate, schedule, price, imageUrl, isActive };

    if (editingCourseCardId) {
      await updateCourseCard(editingCourseCardId, data);
      showToast('Course card updated');
    } else {
      data.createdAt = new Date().toISOString();
      await createCourseCard(data);
      showToast('Course card created');
    }
    closeCourseCardModal();
    loadCourseCards();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fas fa-save"></i> Save';
  }
}

async function editCourseCard(cardId) {
  const card = allCourseCards.find(c => c.id === cardId);
  if (card) openCourseCardModal(card);
}

async function toggleCourseCardActive(cardId, newActive) {
  try {
    await updateCourseCard(cardId, { isActive: newActive });
    showToast('Card ' + (newActive ? 'activated' : 'deactivated'));
    loadCourseCards();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}

async function deleteCourseCardConfirm(cardId) {
  if (!confirm('Delete this course card? This cannot be undone.')) return;
  try {
    const card = allCourseCards.find(c => c.id === cardId);
    if (card && card.imageUrl) await deleteCourseCardImage(card.imageUrl);
    await deleteCourseCard(cardId);
    showToast('Course card deleted');
    loadCourseCards();
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
