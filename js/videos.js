const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));

let currentUser = null;
let currentProfile = null;

function getEmbedUrl(url) {
  if (!url) return null;
  if (url.includes('mediadelivery.net') || url.includes('bunny.net') || url.includes('b-cdn.net')) {
    return url;
  }
  let videoId = '';
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('youtube.com/watch')) {
    videoId = new URLSearchParams(new URL(url).search).get('v');
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('youtube.com/embed/')[1].split('?')[0];
  } else {
    const parts = url.split('/');
    videoId = parts[parts.length - 1].split('?')[0];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function showSection(section) {
  ['loadingState', 'notLoggedIn', 'notActive', 'videosContent'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  document.getElementById(section).style.display = 'block';
  if (section === 'videosContent') {
    document.getElementById('footer').style.display = 'block';
  }
}

async function renderGroupVideos(groupId) {
  const container = document.getElementById('sectionsContainer');
  const empty = document.getElementById('videosEmpty');
  try {
    const sections = await getSections(groupId);
    if (sections.length === 0) {
      container.innerHTML = '';
      empty.style.display = 'block';
      return;
    }
    empty.style.display = 'none';
    const sorted = sections.sort((a, b) => (a.order || 0) - (b.order || 0));
    container.innerHTML = '';
    for (const sec of sorted) {
      const videos = await getVideos(sec.id);
      const sortedVideos = videos.sort((a, b) => (a.order || 0) - (b.order || 0));
      const videosHtml = sortedVideos.map(v => {
        const embedUrl = getEmbedUrl(v.url);
        const topicsHtml = v.topics ? `<div class="video-viewer-topics"><i class="fas fa-tags"></i> ${v.topics}</div>` : '';
        const notesHtml = v.notesUrl ? `<a href="${v.notesUrl}" target="_blank" class="video-notes-btn"><i class="fas fa-file-pdf"></i> Notes</a>` : '';
        return `
          <div class="video-viewer-card">
            ${v.thumbnail ? `<img src="${v.thumbnail}" class="video-viewer-thumb" onerror="this.style.display='none'">` : ''}
            <div class="video-viewer-info">
              <h4>${v.title}</h4>
              ${topicsHtml}
              ${v.description ? `<p class="video-viewer-desc">${v.description}</p>` : ''}
              <div class="video-viewer-actions">
                ${embedUrl ? `<button class="btn btn-primary btn-sm" onclick="playVideo('${embedUrl}','${v.title.replace(/'/g, "\\'")}')"><i class="fas fa-play"></i> Watch</button>` : ''}
                ${notesHtml}
              </div>
            </div>
          </div>
        `;
      }).join('');
      container.innerHTML += `
        <div class="video-section-card">
          <div class="video-section-header">
            <h3><i class="fas fa-book-open"></i> ${sec.title}</h3>
          </div>
          <div class="video-section-body">
            ${sortedVideos.length === 0 ? '<p style="color:var(--text-light);text-align:center;padding:1rem;">No videos yet</p>' : videosHtml}
          </div>
        </div>
      `;
    }
  } catch (err) {
    container.innerHTML = `<p style="color:var(--danger);text-align:center;padding:2rem;">Error loading videos: ${err.message}</p>`;
  }
}

function playVideo(embedUrl, title) {
  const existing = document.querySelector('.video-player-overlay');
  if (existing) existing.remove();
  const overlay = document.createElement('div');
  overlay.className = 'video-player-overlay';
  overlay.innerHTML = `
    <div class="video-player-modal">
      <div class="video-player-header">
        <h3>${title}</h3>
        <button class="video-player-close" onclick="this.closest('.video-player-overlay').remove()">&times;</button>
      </div>
      <div class="video-player-frame">
        <iframe src="${embedUrl}" title="${title}" frameborder="0" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;" allowfullscreen></iframe>
      </div>
    </div>
  `;
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

async function handleLogout() {
  await signOut();
  currentUser = null;
  window.location.href = 'index.html';
}

document.getElementById('logoutBtn').addEventListener('click', handleLogout);
document.getElementById('logoutBtnTop').addEventListener('click', handleLogout);

// Change Password Modal
const changePwModal = document.getElementById('changePwModal');
const changePwBtnTop = document.getElementById('changePwBtnTop');
const closeChangePwModal = document.getElementById('closeChangePwModal');
const cancelChangePw = document.getElementById('cancelChangePw');
const saveChangePw = document.getElementById('saveChangePw');
const changePwError = document.getElementById('changePwError');

changePwBtnTop.addEventListener('click', () => {
  changePwError.style.display = 'none';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
  changePwModal.classList.add('active');
});

closeChangePwModal.addEventListener('click', () => changePwModal.classList.remove('active'));
cancelChangePw.addEventListener('click', () => changePwModal.classList.remove('active'));
changePwModal.addEventListener('click', (e) => { if (e.target === changePwModal) changePwModal.classList.remove('active'); });

saveChangePw.addEventListener('click', async () => {
  const newPw = document.getElementById('newPassword').value;
  const confirmPw = document.getElementById('confirmPassword').value;
  changePwError.style.display = 'none';

  if (newPw.length < 6) { changePwError.textContent = 'Password must be at least 6 characters.'; changePwError.style.display = 'block'; return; }
  if (newPw !== confirmPw) { changePwError.textContent = 'Passwords do not match.'; changePwError.style.display = 'block'; return; }

  try {
    await changePassword(newPw);
    changePwModal.classList.remove('active');
    alert('Password changed successfully!');
  } catch (err) {
    let msg = 'Could not change password.';
    if (err.code === 'auth/requires-recent-login') msg = 'Please log out and log in again, then try changing your password.';
    changePwError.textContent = msg;
    changePwError.style.display = 'block';
  }
});

// AUTH
initFirebase().then(() => {
  onAuthStateChanged(async (user) => {
    if (!user) {
      showSection('notLoggedIn');
      return;
    }
    currentUser = user;
    const profile = await getStudentProfile(user.uid);

    if (profile && profile.role === 'teacher') {
      document.getElementById('navQuizLink').style.display = 'block';
      document.getElementById('navManageLink').style.display = 'block';
      document.getElementById('studentNameDisplay').textContent = profile.name || 'Teacher';
      document.getElementById('pendingNameDisplay').textContent = profile.name || 'Teacher';
      showSection('videosContent');
      const group = await getGroups();
      if (group.length > 0) {
        document.getElementById('groupNameDisplay').textContent = 'All Groups';
        document.getElementById('groupLevelDisplay').textContent = 'Showing all available videos';
        const container = document.getElementById('sectionsContainer');
        container.innerHTML = '';
        for (const g of group) {
          const sections = await getSections(g.id);
          if (sections.length === 0) continue;
          const sorted = sections.sort((a, b) => (a.order || 0) - (b.order || 0));
          let sectionsHtml = '';
          for (const sec of sorted) {
            const videos = await getVideos(sec.id);
            const sortedVideos = videos.sort((a, b) => (a.order || 0) - (b.order || 0));
            sectionsHtml += `
              <div class="video-section-card">
                <div class="video-section-header"><h3><i class="fas fa-book-open"></i> ${sec.title}</h3></div>
                <div class="video-section-body">
                  ${sortedVideos.map(v => {
                    const embedUrl = getEmbedUrl(v.url);
                    const topicsHtml = v.topics ? `<div class="video-viewer-topics"><i class="fas fa-tags"></i> ${v.topics}</div>` : '';
                    const notesHtml = v.notesUrl ? `<a href="${v.notesUrl}" target="_blank" class="video-notes-btn"><i class="fas fa-file-pdf"></i> Notes</a>` : '';
                    return `
                      <div class="video-viewer-card">
                        ${v.thumbnail ? `<img src="${v.thumbnail}" class="video-viewer-thumb" onerror="this.style.display='none'">` : ''}
                        <div class="video-viewer-info">
                          <h4>${v.title}</h4>
                          ${topicsHtml}
                          ${v.description ? `<p class="video-viewer-desc">${v.description}</p>` : ''}
                          <div class="video-viewer-actions">
                            ${embedUrl ? `<button class="btn btn-primary btn-sm" onclick="playVideo('${embedUrl}','${v.title.replace(/'/g, "\\'")}')"><i class="fas fa-play"></i> Watch</button>` : ''}
                            ${notesHtml}
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            `;
          }
          const badgeClass = g.level === 'patente' ? 'badge-patente' : `badge-${g.level.toLowerCase()}`;
          container.innerHTML += `
            <div class="video-group-section">
              <h2 style="margin-bottom:1rem;"><span class="course-badge ${badgeClass}">${g.level}</span> ${g.name}</h2>
              ${sectionsHtml}
            </div>
          `;
        }
      }
      return;
    }

    if (!profile || !profile.isActive) {
      document.getElementById('pendingNameDisplay').textContent = profile ? (profile.name || user.email) : user.email;
      showSection('notActive');
      return;
    }

    document.getElementById('studentNameDisplay').textContent = profile.name || user.email;
    document.getElementById('pendingNameDisplay').textContent = profile.name || user.email;

    if (profile.groupId) {
      const group = await getGroup(profile.groupId);
      if (group) {
        document.getElementById('groupNameDisplay').textContent = group.name;
        document.getElementById('groupLevelDisplay').textContent = `${group.level} Course`;
        document.title = `${group.name} - Video Lessons`;
      }
      showSection('videosContent');
      await renderGroupVideos(profile.groupId);
    } else {
      document.getElementById('groupNameDisplay').textContent = 'Video Lessons';
      document.getElementById('groupLevelDisplay').textContent = 'No group assigned. Please contact your teacher.';
      showSection('videosContent');
      document.getElementById('videosEmpty').style.display = 'block';
    }
  });
});
