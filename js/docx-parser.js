function parsePatenteText(text) {
  const lines = text.split('\n');
  const quizzes = [];
  let currentQuiz = null;
  let currentSection = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const blockMatch = trimmed.match(/^(.+?)\s+Blocco:\s*(\d+)/i);
    if (blockMatch) {
      currentQuiz = {
        title: blockMatch[1].trim(),
        blockNumber: blockMatch[2].trim(),
        questions: []
      };
      quizzes.push(currentQuiz);
      currentSection = null;
      continue;
    }

    if (/^DOMANDE VERE/i.test(trimmed)) {
      currentSection = 'vere';
      continue;
    }
    if (/^DOMANDE FALSE/i.test(trimmed)) {
      currentSection = 'false';
      continue;
    }

    const qMatch = trimmed.match(/^(\d+)\s*[•·]\s*(.+)/);
    if (qMatch && currentQuiz && currentSection) {
      currentQuiz.questions.push({
        text: qMatch[2].trim(),
        answer: currentSection === 'vere',
        order: currentQuiz.questions.length + 1
      });
    }
  }

  return quizzes.map(q => ({
    ...q,
    totalQuestions: q.questions.length,
    createdAt: new Date().toISOString()
  }));
}
