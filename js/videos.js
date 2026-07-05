const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));

const settings = JSON.parse(localStorage.getItem('siteSettings') || '{}');
const videos = settings.videos || [];
let currentFilter = 'all';

function getBunnyEmbed(url) {
  if (!url) return null;
  return url;
}

function getYouTubeEmbed(url) {
  if (!url) return null;
  let videoId = '';
  if (url.includes('youtu.be/')) {
    videoId = url.split('youtu.be/')[1].split('?')[0];
  } else if (url.includes('youtube.com/watch')) {
    videoId = new URLSearchParams(new URL(url).search).get('v');
  } else if (url.includes('youtube.com/embed/')) {
    videoId = url.split('youtube.com/embed/')[1].split('?')[0];
  } else if (url.includes('bunny.net') || url.includes('b-cdn.net')) {
    return url;
  } else {
    const parts = url.split('/');
    videoId = parts[parts.length - 1].split('?')[0];
  }
  return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
}

function getEmbedUrl(url) {
  if (!url) return null;
  if (url.includes('mediadelivery.net') || url.includes('bunny.net') || url.includes('b-cdn.net')) {
    return url;
  }
  return getYouTubeEmbed(url);
}

function renderVideos() {
  const list = document.getElementById('videosList');
  const empty = document.getElementById('videosEmpty');

  const filtered = currentFilter === 'all'
    ? videos
    : videos.filter(v => v.level === currentFilter);

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';

  list.innerHTML = filtered.map((v, i) => {
    const embedUrl = getEmbedUrl(v.url);
    const levelBadge = v.level ? `<span class="course-badge badge-${v.level === 'patente' ? 'patente' : v.level.toLowerCase()}">${v.level}</span>` : '';
    const notesHtml = v.notesUrl
      ? `<a href="${v.notesUrl}" target="_blank" class="video-notes-btn"><i class="fas fa-file-pdf"></i> Download Notes</a>`
      : '';

    return `
      <div class="video-list-item" data-level="${v.level || ''}">
        <div class="video-list-player">
          ${embedUrl
            ? `<iframe src="${embedUrl}" title="${v.title}" frameborder="0" allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;" allowfullscreen loading="lazy"></iframe>`
            : `<div class="video-placeholder"><i class="fas fa-play-circle"></i></div>`
          }
        </div>
        <div class="video-list-info">
          <div class="video-list-meta">
            ${levelBadge}
            ${v.label ? `<span class="video-label-tag"><i class="fas fa-tag"></i> ${v.label}</span>` : ''}
          </div>
          <h3>${v.title}</h3>
          ${v.description ? `<p class="video-list-desc">${v.description}</p>` : ''}
          <div class="video-list-actions">
            ${notesHtml}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    renderVideos();
  });
});

renderVideos();
