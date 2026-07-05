const NAVBAR = document.getElementById('navbar');
const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  NAVBAR.classList.toggle('scrolled', window.scrollY > 10);
});

NAV_TOGGLE.addEventListener('click', () => {
  NAV_LINKS.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => NAV_LINKS.classList.remove('active'));
});

const COURSES = {
  a2: 'Coming Soon',
  b1: 'Coming Soon',
  patente: 'Coming Soon'
};

document.getElementById('date-a2').textContent = COURSES.a2;
document.getElementById('date-b1').textContent = COURSES.b1;
document.getElementById('date-patente').textContent = COURSES.patente;

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.animationPlayState = 'running';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.course-card').forEach(card => {
  card.style.animationPlayState = 'paused';
  observer.observe(card);
});
