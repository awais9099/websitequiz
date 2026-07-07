const NAVBAR = document.getElementById('navbar');
const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
const TICKER_BAR = document.getElementById('tickerBar');

// Load saved settings
const settings = JSON.parse(localStorage.getItem('siteSettings') || '{}');

// Update course dates
document.getElementById('date-a2').textContent = settings.dateA2 || 'Coming Soon';
document.getElementById('date-b1').textContent = settings.dateB1 || 'Coming Soon';
document.getElementById('date-patente').textContent = settings.datePatente || 'Coming Soon';

// Update ticker content with saved dates
const tickerContent = document.getElementById('tickerContent');
if (settings.dateA2 && settings.dateA2 !== '') {
  const a2Item = tickerContent.querySelector('.fa-star').closest('.ticker-item');
  if (a2Item) a2Item.innerHTML = `<i class="fas fa-star"></i> Italian A2 - Starting ${settings.dateA2}`;
}
if (settings.dateB1 && settings.dateB1 !== '') {
  const b1Items = tickerContent.querySelectorAll('.fa-star');
  if (b1Items[1]) {
    const b1Item = b1Items[1].closest('.ticker-item');
    if (b1Item) b1Item.innerHTML = `<i class="fas fa-star"></i> Italian B1 - Starting ${settings.dateB1}`;
  }
}
if (settings.datePatente && settings.datePatente !== '') {
  const patenteItem = tickerContent.querySelector('.fa-car').closest('.ticker-item');
  if (patenteItem) patenteItem.innerHTML = `<i class="fas fa-car"></i> Patente Course - Starting ${settings.datePatente}`;
}

// Update social links
if (settings.whatsappLink) {
  document.querySelectorAll('a[href*="wa.me"]').forEach(a => {
    a.href = settings.whatsappLink;
  });
}
if (settings.tiktokLink) {
  document.querySelectorAll('a[href*="tiktok.com"]').forEach(a => {
    a.href = settings.tiktokLink;
  });
}
if (settings.youtubeLink) {
  document.querySelectorAll('a[href*="youtube.com/@"]').forEach(a => {
    a.href = settings.youtubeLink;
  });
}

// Navbar scroll
window.addEventListener('scroll', () => {
  NAVBAR.classList.toggle('scrolled', window.scrollY > 20);
});

// Mobile menu toggle
NAV_TOGGLE.addEventListener('click', () => {
  NAV_LINKS.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => NAV_LINKS.classList.remove('active'));
});

// Intersection observer for scroll animations
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
      entry.target.classList.add('visible');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.course-card, .feature-card, .testimonial-card').forEach(card => {
  observer.observe(card);
});

// Parallax effect on hero shapes
window.addEventListener('scroll', () => {
  const scrolled = window.scrollY;
  document.querySelectorAll('.shape').forEach((shape, i) => {
    const speed = (i + 1) * 0.02;
    shape.style.transform = `translateY(${scrolled * speed}px)`;
  });
});

// Animate stat numbers on scroll
const statObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      animateStats();
      statObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.5 });

const statsSection = document.querySelector('.hero-stats');
if (statsSection) {
  statObserver.observe(statsSection);
}

function animateStats() {
  document.querySelectorAll('.stat-number').forEach(stat => {
    const target = stat.textContent;
    const num = parseInt(target);
    if (isNaN(num)) return;

    const suffix = target.replace(num, '');
    let current = 0;
    const increment = Math.ceil(num / 40);
    const timer = setInterval(() => {
      current += increment;
      if (current >= num) {
        current = num;
        clearInterval(timer);
      }
      stat.textContent = current + suffix;
    }, 30);
  });
}

// Auth state - update navbar
const navLoginLink = document.getElementById('navLoginLink');
const navUserMenu = document.getElementById('navUserMenu');
const navUserName = document.getElementById('navUserName');
const navLogoutBtn = document.getElementById('navLogoutBtn');
const navPatenteQuizLink = document.getElementById('navPatenteQuizLink');
const navQuizToolLink = document.getElementById('navQuizToolLink');

initFirebase().then(() => {
  onAuthStateChanged(async (user) => {
    if (user) {
      const profile = await getStudentProfile(user.uid);
      const displayName = profile ? profile.name : user.email;
      navUserName.textContent = displayName || user.email;
      navLoginLink.style.display = 'none';
      navUserMenu.style.display = 'block';
      navQuizToolLink.style.display = 'block';

      if (profile && profile.role === 'teacher') {
        navPatenteQuizLink.style.display = 'block';
      } else if (profile) {
        const groupIds = profile.groupIds || (profile.groupId ? [profile.groupId] : []);
        let isPatente = false;
        if (profile.level === 'patente') {
          isPatente = true;
        } else {
          for (const gid of groupIds) {
            const group = await getGroup(gid);
            if (group && group.level === 'patente') {
              isPatente = true;
              break;
            }
          }
        }
        navPatenteQuizLink.style.display = isPatente ? 'block' : 'none';
      } else {
        navPatenteQuizLink.style.display = 'none';
      }
    } else {
      navLoginLink.style.display = 'block';
      navUserMenu.style.display = 'none';
      navPatenteQuizLink.style.display = 'none';
      navQuizToolLink.style.display = 'none';
    }
  });
});

navLogoutBtn.addEventListener('click', async () => {
  await signOut();
  window.location.reload();
});

// Change Password Modal
const changePwModal = document.getElementById('changePwModal');
const navChangePwBtn = document.getElementById('navChangePwBtn');
const closeChangePwModal = document.getElementById('closeChangePwModal');
const cancelChangePw = document.getElementById('cancelChangePw');
const saveChangePw = document.getElementById('saveChangePw');
const changePwError = document.getElementById('changePwError');

navChangePwBtn.addEventListener('click', () => {
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
