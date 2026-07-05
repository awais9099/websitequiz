const QUESTIONS = window.QUESTIONS_DATA || [];
const STEP_STUDENT = document.getElementById('step-student');
const STEP_QUIZ = document.getElementById('step-quiz');
const STEP_RESULTS = document.getElementById('step-results');

let currentQuiz = {
  student: {},
  questions: [],
  results: [],
  currentIndex: 0,
  score: 0
};

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

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function startQuiz() {
  const name = document.getElementById('studentName').value.trim();
  const phone = document.getElementById('studentPhone').value.trim();
  const level = document.getElementById('quizLevel').value;
  const count = parseInt(document.getElementById('questionCount').value);

  if (!name) {
    showToast('Please enter student name', 'error');
    return;
  }
  if (!phone) {
    showToast('Please enter phone number', 'error');
    return;
  }

  const levelQuestions = QUESTIONS.filter(q => q.level === level);

  if (levelQuestions.length < count) {
    showToast(`Not enough questions for ${level}. Only ${levelQuestions.length} available.`, 'error');
    return;
  }

  currentQuiz = {
    student: { name, phone, level },
    questions: shuffleArray(levelQuestions).slice(0, count),
    results: [],
    currentIndex: 0,
    score: 0
  };

  STEP_STUDENT.style.display = 'none';
  STEP_QUIZ.style.display = 'block';
  STEP_RESULTS.style.display = 'none';

  renderQuestion();
}

function renderQuestion() {
  const q = currentQuiz.questions[currentQuiz.currentIndex];
  const total = currentQuiz.questions.length;
  const idx = currentQuiz.currentIndex + 1;

  document.getElementById('progressText').textContent = `Question ${idx} of ${total}`;

  const container = document.getElementById('questionContainer');
  container.innerHTML = `
    <div class="quiz-card">
      <div class="question-box">
        <div class="question-number">Question ${idx} of ${total}</div>
        <div class="question-text">${q.question}</div>
        <div class="options-list">
          ${q.options.map(opt => `
            <div class="option-item" data-option="${opt}">${opt}</div>
          `).join('')}
        </div>
      </div>
      <div class="result-buttons">
        <button class="result-btn correct-btn" data-result="correct">
          <i class="fas fa-check"></i> Correct
        </button>
        <button class="result-btn wrong-btn" data-result="wrong">
          <i class="fas fa-times"></i> Wrong
        </button>
      </div>
    </div>
  `;

  document.querySelectorAll('.option-item').forEach(item => {
    if (item.dataset.option === q.answer) {
      item.classList.add('correct');
    }
  });

  document.querySelectorAll('.result-btn').forEach(btn => {
    btn.addEventListener('click', () => handleAnswer(btn.dataset.result));
  });
}

function handleAnswer(result) {
  const q = currentQuiz.questions[currentQuiz.currentIndex];

  currentQuiz.results.push({
    question: q.question,
    correctAnswer: q.answer,
    result: result,
    topic: q.topic
  });

  if (result === 'correct') {
    currentQuiz.score++;
  }

  document.querySelectorAll('.option-item').forEach(item => {
    item.classList.remove('correct', 'wrong');
    if (item.dataset.option === q.answer) {
      item.classList.add('correct');
    }
  });

  document.querySelectorAll('.result-btn').forEach(btn => {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    if (btn.dataset.result === result) {
      btn.classList.add('selected');
    }
  });

  setTimeout(() => {
    currentQuiz.currentIndex++;
    if (currentQuiz.currentIndex < currentQuiz.questions.length) {
      renderQuestion();
    } else {
      showResults();
    }
  }, 800);
}

function showResults() {
  STEP_QUIZ.style.display = 'none';
  STEP_RESULTS.style.display = 'block';

  const { student, results, score } = currentQuiz;
  const total = results.length;
  const percent = Math.round(score / total * 100);

  document.getElementById('scoreValue').textContent = score;
  document.getElementById('scoreLabel').textContent = `out of ${total}`;
  document.getElementById('studentInfo').textContent = `${student.name} (${student.phone}) - ${student.level}`;

  const circle = document.getElementById('scoreCircle');
  circle.className = 'score-circle';
  if (percent >= 80) {
    circle.classList.add('excellent');
    document.getElementById('resultTitle').textContent = 'Excellent!';
    document.getElementById('resultMessage').textContent = 'Outstanding performance!';
  } else if (percent >= 60) {
    circle.classList.add('good');
    document.getElementById('resultTitle').textContent = 'Good Job!';
    document.getElementById('resultMessage').textContent = 'Solid performance, keep it up!';
  } else if (percent >= 40) {
    circle.classList.add('average');
    document.getElementById('resultTitle').textContent = 'Keep Practicing!';
    document.getElementById('resultMessage').textContent = 'More practice will help improve.';
  } else {
    circle.classList.add('poor');
    document.getElementById('resultTitle').textContent = 'Needs Improvement';
    document.getElementById('resultMessage').textContent = 'Review the material and try again.';
  }

  const detailed = document.getElementById('detailedResults');
  detailed.innerHTML = results.map((r, i) => `
    <div class="question-box" style="border-color: ${r.result === 'correct' ? 'var(--accent)' : 'var(--danger)'}; background: ${r.result === 'correct' ? '#eafaf1' : '#fdedec'};">
      <div class="question-number" style="color: ${r.result === 'correct' ? 'var(--accent)' : 'var(--danger)'};">
        Q${i + 1} - ${r.result === 'correct' ? 'CORRECT' : 'WRONG'}
      </div>
      <div class="question-text">${r.question}</div>
      ${r.result === 'wrong' ? `<p style="color:var(--text-light);font-size:0.9rem;">Correct answer: <strong>${r.correctAnswer}</strong></p>` : ''}
    </div>
  `).join('');

  saveQuizSession();
}

function saveQuizSession() {
  const sessionData = {
    ...currentQuiz.student,
    questions: currentQuiz.results,
    score: currentQuiz.score,
    total: currentQuiz.questions.length,
    date: new Date().toISOString()
  };

  const sessions = JSON.parse(localStorage.getItem('quizSessions') || '[]');
  sessions.push(sessionData);
  localStorage.setItem('quizSessions', JSON.stringify(sessions));
}

function downloadPDF() {
  const doc = generatePDFReport(
    currentQuiz.student,
    currentQuiz.results,
    currentQuiz.score,
    currentQuiz.questions.length
  );
  doc.save(`quiz-report-${currentQuiz.student.name.replace(/\s+/g, '-')}.pdf`);
}

function shareWhatsApp() {
  const { student, results, score } = currentQuiz;
  const total = results.length;
  const percent = Math.round(score / total * 100);

  let msg = `*Learn Italian with Iqra*\n`;
  msg += `Student Assessment Report\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Name: ${student.name}\n`;
  msg += `Phone: ${student.phone}\n`;
  msg += `Level: ${student.level}\n`;
  msg += `Date: ${new Date().toLocaleDateString('en-GB')}\n`;
  msg += `Score: ${score}/${total} (${percent}%)\n`;
  msg += `━━━━━━━━━━━━━━━━━━━━━\n\n`;

  results.forEach((r, i) => {
    const icon = r.result === 'correct' ? '✅' : '❌';
    msg += `${icon} Q${i + 1}: ${r.question}\n`;
    if (r.result === 'wrong') {
      msg += `   Correct: ${r.correctAnswer}\n`;
    }
  });

  msg += `\n━━━━━━━━━━━━━━━━━━━━━\n`;
  msg += `Generated by Learn Italian with Iqra`;

  const encoded = encodeURIComponent(msg);
  window.open(`https://wa.me/?text=${encoded}`, '_blank');
}

function resetQuiz() {
  currentQuiz = {
    student: {},
    questions: [],
    results: [],
    currentIndex: 0,
    score: 0
  };

  document.getElementById('studentName').value = '';
  document.getElementById('studentPhone').value = '';

  STEP_STUDENT.style.display = 'block';
  STEP_QUIZ.style.display = 'none';
  STEP_RESULTS.style.display = 'none';
}

document.getElementById('startQuiz').addEventListener('click', startQuiz);
document.getElementById('downloadPdf').addEventListener('click', downloadPDF);
document.getElementById('shareWhatsApp').addEventListener('click', shareWhatsApp);
document.getElementById('newQuiz').addEventListener('click', resetQuiz);

const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));
