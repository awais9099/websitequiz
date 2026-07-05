const NAV_TOGGLE = document.getElementById('navToggle');
const NAV_LINKS = document.getElementById('navLinks');
NAV_TOGGLE.addEventListener('click', () => NAV_LINKS.classList.toggle('active'));
document.querySelectorAll('.nav-links a').forEach(l => l.addEventListener('click', () => NAV_LINKS.classList.remove('active')));

const QUESTIONS_PER_QUIZ = 30;
const TIMER_MINUTES = 20;
const TAB_SIZE = 10;

let allQuizzes = [];
let currentQuizId = null;
let currentQuestions = [];
let currentIndex = 0;
let userAnswers = {};
let timerInterval = null;
let timeLeft = TIMER_MINUTES * 60;
let quizSubmitted = false;
let totalQuestionsInQuiz = 0;

function showStep(step) {
  ['exam-step-select', 'exam-step-quiz'].forEach(id => {
    document.getElementById(id).style.display = 'none';
  });
  if (step === 'select') document.getElementById('exam-step-select').style.display = 'block';
  if (step === 'quiz') document.getElementById('exam-step-quiz').style.display = 'block';
  window.scrollTo(0, 0);
}

function loadQuizList() {
  const container = document.getElementById('examQuizList');
  const noQuizzes = document.getElementById('examNoQuizzes');
  container.innerHTML = '<div style="text-align:center;padding:2rem;color:#999;"><i class="fas fa-spinner fa-spin"></i> Loading quizzes...</div>';
  noQuizzes.style.display = 'none';

  initFirebase().then(() => getAllPatenteQuizzes()).then(quizzes => {
    allQuizzes = quizzes;
    if (quizzes.length === 0) {
      container.innerHTML = '';
      noQuizzes.style.display = 'block';
      return;
    }
    noQuizzes.style.display = 'none';
    container.innerHTML = quizzes.map(q => `
      <div class="quiz-select-card" onclick="startQuiz('${q.id}')">
        <h3><i class="fas fa-car"></i> ${q.title}</h3>
        <p>Blocco: ${q.blockNumber} | ${q.totalQuestions} questions</p>
      </div>
    `).join('');
  }).catch(err => {
    console.warn('Firestore load failed, trying localStorage:', err);
    try {
      const local = JSON.parse(localStorage.getItem('patenteQuizzes') || '[]');
      if (local.length > 0) {
        allQuizzes = local;
        container.innerHTML = local.map(q => `
          <div class="quiz-select-card" onclick="startQuiz('${q.id}')">
            <h3><i class="fas fa-car"></i> ${q.title}</h3>
            <p>Blocco: ${q.blockNumber} | ${q.totalQuestions} questions (offline)</p>
          </div>
        `).join('');
      } else {
        container.innerHTML = '';
        noQuizzes.style.display = 'block';
      }
    } catch(e) {
      container.innerHTML = '';
      noQuizzes.style.display = 'block';
    }
  });
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

  let questions = shuffleArray([...quiz.questions]);
  totalQuestionsInQuiz = questions.length;

  currentQuestions = questions.map((q, i) => ({ ...q, index: i }));
  currentIndex = 0;
  userAnswers = {};
  quizSubmitted = false;

  document.getElementById('examBadge').textContent = quiz.title;
  updateTabs();
  renderGrid();
  renderQuestion();
  startTimer();
  showStep('quiz');
}

function renderGrid() {
  const grids = [document.getElementById('examGrid'), document.getElementById('examFullGrid')];
  grids.forEach(grid => {
    if (!grid) return;
    grid.innerHTML = currentQuestions.map((q, i) => {
      let cls = '';
      if (i === currentIndex) cls = 'current';
      else if (userAnswers[q.index] !== undefined) {
        if (quizSubmitted) {
          cls = userAnswers[q.index] === q.answer ? 'correct' : 'wrong';
        } else {
          cls = 'answered';
        }
      }
      return '<div class="exam-dot ' + cls + '" onclick="goToQuestion(' + i + ')">' + (i + 1) + '</div>';
    }).join('');
  });
}

function updateTabs() {
  const tabs = document.querySelectorAll('.exam-tab');
  const numTabs = Math.ceil(totalQuestionsInQuiz / TAB_SIZE);
  tabs.forEach((t, i) => {
    if (i < numTabs) {
      t.style.display = '';
      const start = i * TAB_SIZE + 1;
      const end = Math.min((i + 1) * TAB_SIZE, totalQuestionsInQuiz);
      t.textContent = 'Domande ' + start + '-' + end;
    } else {
      t.style.display = 'none';
    }
  });
}

function getTabIndex(idx) {
  return Math.floor(idx / TAB_SIZE);
}

function switchTab(tabIdx) {
  const tabs = document.querySelectorAll('.exam-tab');
  tabs.forEach((t, i) => {
    t.classList.toggle('active', i === tabIdx);
  });
  const startIdx = tabIdx * TAB_SIZE;
  if (currentIndex < startIdx || currentIndex >= startIdx + TAB_SIZE) {
    currentIndex = startIdx;
  }
  renderQuestion();
}

function renderQuestion() {
  const q = currentQuestions[currentIndex];
  document.getElementById('examQNum').textContent = currentIndex + 1;
  document.getElementById('examQText').textContent = q.text;
  document.getElementById('examTranslation').style.display = 'none';

  const tabIdx = getTabIndex(currentIndex);
  const tabs = document.querySelectorAll('.exam-tab');
  tabs.forEach((t, i) => t.classList.toggle('active', i === tabIdx));

  const vero = document.getElementById('examBtnVero');
  const falso = document.getElementById('examBtnFalso');
  vero.classList.remove('selected');
  falso.classList.remove('selected');

  if (userAnswers[q.index] !== undefined) {
    if (userAnswers[q.index] === true) vero.classList.add('selected');
    else falso.classList.add('selected');
  }

  document.getElementById('examPrevBtn').disabled = currentIndex === 0;
  document.getElementById('examNextBtn').disabled = currentIndex === totalQuestionsInQuiz - 1;

  const answeredCount = Object.keys(userAnswers).length;
  document.getElementById('examCorreggiBtn').disabled = answeredCount < totalQuestionsInQuiz;

  renderGrid();
}

function selectAnswer(answer) {
  if (quizSubmitted) return;
  const q = currentQuestions[currentIndex];
  userAnswers[q.index] = answer;
  renderQuestion();
}

function goToQuestion(idx) {
  currentIndex = idx;
  renderQuestion();
}

function examPrev() {
  if (currentIndex > 0) { currentIndex--; renderQuestion(); }
}

function examNext() {
  if (currentIndex < totalQuestionsInQuiz - 1) { currentIndex++; renderQuestion(); }
}

function toggleFullGrid() {
  const grid = document.getElementById('examFullGrid');
  grid.style.display = grid.style.display === 'none' ? 'flex' : 'none';
}

function startTimer() {
  clearInterval(timerInterval);
  timeLeft = TIMER_MINUTES * 60;
  updateTimerDisplay();
  timerInterval = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      correggi();
    }
  }, 1000);
}

function updateTimerDisplay() {
  const min = Math.floor(timeLeft / 60);
  const sec = timeLeft % 60;
  const text = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  document.getElementById('examTimerText').textContent = text;
  const timerEl = document.getElementById('examTimer');
  if (timeLeft <= 120) {
    timerEl.classList.add('warning');
  } else {
    timerEl.classList.remove('warning');
  }
}

function correggi() {
  if (quizSubmitted) return;
  quizSubmitted = true;
  clearInterval(timerInterval);

  let score = 0;
  const review = currentQuestions.map((q, i) => {
    const userAns = userAnswers[q.index];
    const isCorrect = userAns === q.answer;
    if (isCorrect) score++;
    return { text: q.text, correct: q.answer, userAnswer: userAns, isCorrect, num: i + 1 };
  });

  const total = totalQuestionsInQuiz;
  const wrong = total - score;
  const passed = wrong <= 3;
  const percent = Math.round(score / total * 100);

  document.getElementById('examResultNum').textContent = score;
  document.getElementById('examResultLabel').textContent = '/ ' + total;

  const scoreEl = document.getElementById('examResultScore');
  scoreEl.className = 'exam-results-score ' + (passed ? 'pass' : 'fail');

  document.getElementById('examResultTitle').textContent = passed ? 'Esame Superato!' : 'Non Superato';
  document.getElementById('examResultMsg').textContent = passed
    ? 'Hai sbagliato solo ' + wrong + (wrong === 1 ? ' domanda' : ' domande') + '. Complimenti!'
    : 'Hai sbagliato ' + wrong + ' domande. Max 3 errori consentiti.';
  document.getElementById('examResultPercent').textContent = percent + '%';

  document.getElementById('examReviewList').innerHTML = review.map(r => {
    const ansText = r.userAnswer === true ? 'Vero' : r.userAnswer === false ? 'Falso' : 'Non risposta';
    const correctText = r.correct ? 'Vero' : 'Falso';
    const checkIcon = r.isCorrect ? ' <i class="fas fa-check" style="color:#27ae60;"></i>' : ' — Corretta: <strong>' + correctText + '</strong> <i class="fas fa-times" style="color:#e74c3c;"></i>';
    return '<div class="review-item ' + (r.isCorrect ? 'correct' : 'wrong') + '">' +
      '<strong>' + r.num + '. ' + r.text + '</strong><br>' +
      '<span style="font-size:0.85rem;">Risposta: <strong>' + ansText + '</strong>' + checkIcon + '</span>' +
    '</div>';
  }).join('');

  document.getElementById('examResultsOverlay').classList.add('active');
}

function closeResults() {
  document.getElementById('examResultsOverlay').classList.remove('active');
}

function retryQuiz() {
  closeResults();
  startQuiz(currentQuizId);
}

const translationCache = {};

async function translateQuestion(lang) {
  const q = currentQuestions[currentIndex];
  const cacheKey = q.text + '_' + lang;
  const el = document.getElementById('examTranslation');
  el.style.display = 'block';
  el.className = 'exam-translation exam-translation-loading';
  el.textContent = 'Translating...';

  if (translationCache[cacheKey]) {
    el.className = 'exam-translation';
    el.textContent = translationCache[cacheKey];
    return;
  }

  try {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=it&tl=' + lang + '&dt=t&q=' + encodeURIComponent(q.text);
    const res = await fetch(url);
    const data = await res.json();
    const translated = data[0].map(s => s[0]).join('');
    translationCache[cacheKey] = translated;
    el.className = 'exam-translation';
    el.textContent = translated;
  } catch (err) {
    el.className = 'exam-translation';
    el.textContent = 'Translation failed. Please try again.';
  }
}

function hideTranslation() {
  document.getElementById('examTranslation').style.display = 'none';
}

function readQuestion() {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const q = currentQuestions[currentIndex];
    const utter = new SpeechSynthesisUtterance(q.text);
    utter.lang = 'it-IT';
    utter.rate = 0.9;
    utter.onstart = () => {
      document.getElementById('examTranslation').style.display = 'block';
      document.getElementById('examTranslation').className = 'exam-translation exam-translation-loading';
      document.getElementById('examTranslation').innerHTML = '<i class="fas fa-volume-up"></i> Reading...';
    };
    utter.onend = () => {
      document.getElementById('examTranslation').className = 'exam-translation';
      document.getElementById('examTranslation').innerHTML = '<i class="fas fa-volume-up"></i> ' + q.text;
    };
    window.speechSynthesis.speak(utter);
  } else {
    alert('Text-to-speech is not supported in your browser.');
  }
}

document.addEventListener('DOMContentLoaded', loadQuizList);
