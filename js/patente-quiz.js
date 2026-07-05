const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));

let allQuizzes = [];
let currentQuizId = null;
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = {};

function showStep(step) {
  ['pq-step-select', 'pq-step-quiz', 'pq-step-results'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  if (step === 'select') document.getElementById('pq-step-select').style.display = 'block';
  if (step === 'quiz') document.getElementById('pq-step-quiz').style.display = 'block';
  if (step === 'results') document.getElementById('pq-step-results').style.display = 'block';
  window.scrollTo(0, 0);
}

function loadQuizList() {
  allQuizzes = getPatenteQuizzes();
  const container = document.getElementById('pqQuizList');
  const noQuizzes = document.getElementById('pqNoQuizzes');
  if (allQuizzes.length === 0) {
    container.innerHTML = '';
    noQuizzes.style.display = 'block';
    return;
  }
  noQuizzes.style.display = 'none';
  container.innerHTML = allQuizzes.map(q => `
    <div class="pq-quiz-card" onclick="startQuiz('${q.id}')">
      <h3><i class="fas fa-car"></i> ${q.title}</h3>
      <p>Blocco: ${q.blockNumber} | ${q.totalQuestions} questions</p>
    </div>
  `).join('');
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startQuiz(quizId) {
  const quiz = allQuizzes.find(q => q.id === quizId);
  if (!quiz) return;
  currentQuizId = quizId;
  currentQuestions = shuffleArray(quiz.questions).map((q, i) => ({ ...q, index: i }));
  currentIndex = 0;
  userAnswers = {};
  document.getElementById('pqQuizTitle').textContent = quiz.title;
  document.getElementById('pqQuizInfo').textContent = `Blocco: ${quiz.blockNumber} | ${currentQuestions.length} questions`;
  renderProgress();
  renderQuestion();
  showStep('quiz');
}

function renderProgress() {
  const container = document.getElementById('pqProgress');
  container.innerHTML = currentQuestions.map((q, i) => {
    let cls = '';
    if (i === currentIndex) cls = 'current';
    else if (userAnswers[q.index] !== undefined) cls = userAnswers[q.index] === q.answer ? 'answered' : 'wrong';
    return `<div class="q-dot ${cls}" onclick="goToQuestion(${i})">${i + 1}</div>`;
  }).join('');
}

function renderQuestion() {
  const q = currentQuestions[currentIndex];
  const total = currentQuestions.length;
  document.getElementById('pqQuestionNum').textContent = `Question ${currentIndex + 1} of ${total}`;
  document.getElementById('pqQuestionText').textContent = q.text;
  document.getElementById('pqPageInfo').textContent = `${currentIndex + 1} / ${total}`;

  const vero = document.getElementById('pqOptVero');
  const falso = document.getElementById('pqOptFalso');
  vero.className = 'pq-option';
  falso.className = 'pq-option';

  if (userAnswers[q.index] !== undefined) {
    if (userAnswers[q.index] === true) vero.classList.add('selected-vero');
    else falso.classList.add('selected-falso');
  }

  document.getElementById('pqPrevBtn').disabled = currentIndex === 0;
  document.getElementById('pqPrevBtn').style.opacity = currentIndex === 0 ? '0.5' : '1';

  const answeredCount = Object.keys(userAnswers).length;
  const submitBtn = document.getElementById('pqSubmitBtn');
  if (answeredCount === total) {
    submitBtn.style.display = 'inline-flex';
    document.getElementById('pqNextBtn').style.display = 'none';
  } else {
    submitBtn.style.display = 'none';
    document.getElementById('pqNextBtn').style.display = 'inline-flex';
    document.getElementById('pqNextBtn').disabled = currentIndex === total - 1;
    document.getElementById('pqNextBtn').style.opacity = currentIndex === total - 1 ? '0.5' : '1';
  }

  renderProgress();
}

function selectAnswer(answer) {
  const q = currentQuestions[currentIndex];
  userAnswers[q.index] = answer;
  renderQuestion();
}

function goToQuestion(idx) {
  currentIndex = idx;
  renderQuestion();
}

function pqPrev() {
  if (currentIndex > 0) { currentIndex--; renderQuestion(); }
}

function pqNext() {
  if (currentIndex < currentQuestions.length - 1) { currentIndex++; renderQuestion(); }
}

function submitQuiz() {
  let score = 0;
  const review = currentQuestions.map(q => {
    const userAns = userAnswers[q.index];
    const isCorrect = userAns === q.answer;
    if (isCorrect) score++;
    return { text: q.text, correct: q.answer, userAnswer: userAns, isCorrect };
  });

  const total = currentQuestions.length;
  const percent = Math.round(score / total * 100);

  document.getElementById('pqScoreNum').textContent = score;
  document.getElementById('pqScoreLabel').textContent = `out of ${total}`;
  document.getElementById('pqResultPercent').textContent = `${percent}%`;

  const circle = document.getElementById('pqScoreCircle');
  circle.className = 'pq-score-circle';
  if (percent >= 90) {
    circle.classList.add('excellent');
    document.getElementById('pqResultTitle').textContent = 'Ottimo!';
    document.getElementById('pqResultMsg').textContent = 'Excellent! You passed with flying colors!';
  } else if (percent >= 70) {
    circle.classList.add('good');
    document.getElementById('pqResultTitle').textContent = 'Ben fatto!';
    document.getElementById('pqResultMsg').textContent = 'Good job! Keep practicing to improve.';
  } else if (percent >= 50) {
    circle.classList.add('average');
    document.getElementById('pqResultTitle').textContent = 'Non male';
    document.getElementById('pqResultMsg').textContent = 'Not bad, but you need more practice.';
  } else {
    circle.classList.add('poor');
    document.getElementById('pqResultTitle').textContent = 'Da riprovare';
    document.getElementById('pqResultMsg').textContent = 'Keep studying and try again!';
  }

  const reviewContainer = document.getElementById('pqReview');
  reviewContainer.innerHTML = `
    <h3 style="margin-bottom:1rem;"><i class="fas fa-list-check"></i> Review Answers</h3>
    ${review.map((r, i) => `
      <div class="pq-review-item ${r.isCorrect ? 'correct' : 'wrong'}">
        <strong>${i + 1}. ${r.text}</strong><br>
        <span style="font-size:0.85rem;">
          Your answer: <strong>${r.userAnswer === true ? 'VERO' : 'FALSO'}</strong>
          ${r.isCorrect ? '<i class="fas fa-check" style="color:var(--accent);"></i>' : ` — Correct: <strong>${r.correct ? 'VERO' : 'FALSO'}</strong> <i class="fas fa-times" style="color:var(--danger);"></i>`}
        </span>
      </div>
    `).join('')}
  `;

  showStep('results');
}

document.addEventListener('DOMContentLoaded', loadQuizList);
