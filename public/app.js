const welcomeView = document.querySelector('.welcome-view');
const examView = document.querySelector('#exam-view');
const resultView = document.querySelector('#result-view');
const startButton = document.querySelector('#start-exam');
const questionCount = document.querySelector('#question-count');
const toast = document.querySelector('#toast');
const EXAM_DURATION_SECONDS = 10 * 60;

let questions = [];
let answers = {};
let currentQuestion = 0;
let secondsRemaining = EXAM_DURATION_SECONDS;
let timerId;
let toastId;
let submitting = false;

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastId);
  toastId = window.setTimeout(() => { toast.hidden = true; }, 3200);
}

async function loadQuestions() {
  const response = await fetch('/api/questions', { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Questions could not be loaded. Please try again.');
  return response.json();
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  startButton.textContent = 'Loading assessment…';
  try {
    questions = await loadQuestions();
    if (!questions.length) throw new Error('There are no questions available yet.');
    questionCount.textContent = `${questions.length} questions`;
    answers = {};
    currentQuestion = 0;
    secondsRemaining = EXAM_DURATION_SECONDS;
    submitting = false;
    welcomeView.hidden = true;
    resultView.hidden = true;
    examView.hidden = false;
    renderExam();
    timerId = window.setInterval(updateTimer, 1000);
  } catch (error) {
    showToast(error.message || 'Unable to start the assessment.');
  } finally {
    startButton.disabled = false;
    startButton.innerHTML = 'Begin assessment <span aria-hidden="true">→</span>';
  }
});

function updateTimer() {
  secondsRemaining -= 1;
  const timer = document.querySelector('#exam-timer');
  if (timer) {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;
    timer.querySelector('span').textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    if (secondsRemaining <= 60) timer.classList.add('warning');
  }
  if (secondsRemaining <= 0) submitExam(true);
}

function renderExam() {
  const answeredCount = Object.keys(answers).length;
  const question = questions[currentQuestion];
  const progress = (answeredCount / questions.length) * 100;
  examView.innerHTML = `
    <div class="exam-heading">
      <div><span class="exam-kicker">NORTHSTAR ASSESSMENT</span><h1>Knowledge check</h1></div>
      <div id="exam-timer" class="timer" aria-label="Time remaining"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 1.5M9 2h6"></path></svg><span>${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}</span></div>
    </div>
    <div class="progress-track" role="progressbar" aria-label="Questions answered" aria-valuenow="${answeredCount}" aria-valuemin="0" aria-valuemax="${questions.length}"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="exam-layout">
      <section class="question-card" aria-label="Question ${currentQuestion + 1} of ${questions.length}">
        <span class="question-counter">QUESTION ${String(currentQuestion + 1).padStart(2, '0')} <span style="color:#a7afbe;font-weight:500">/ ${String(questions.length).padStart(2, '0')}</span></span>
        <h2 class="question-text">${escapeHtml(question.question)}</h2>
        <div class="answer-list" role="radiogroup" aria-label="Answer options">
          ${question.options.map((option, index) => `<button type="button" class="answer-option${answers[question.id] === option ? ' selected' : ''}" data-option-index="${index}" role="radio" aria-checked="${answers[question.id] === option}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`).join('')}
        </div>
        <div class="question-actions">
          <button type="button" class="secondary-button" id="previous-question" ${currentQuestion === 0 ? 'disabled' : ''}>← &nbsp; Previous</button>
          ${currentQuestion === questions.length - 1
            ? '<button type="button" class="submit-button" id="submit-exam">Finish assessment&nbsp; →</button>'
            : '<button type="button" class="submit-button" id="next-question">Continue&nbsp; →</button>'}
        </div>
      </section>
      <aside class="question-nav" aria-label="Question navigation">
        <h3>Your questions</h3><p class="nav-caption">${answeredCount} of ${questions.length} answered</p>
        <div class="question-grid">${questions.map((item, index) => `<button type="button" class="question-number${index === currentQuestion ? ' current' : ''}${answers[item.id] !== undefined ? ' answered' : ''}" data-question-index="${index}" aria-label="Go to question ${index + 1}${answers[item.id] !== undefined ? ', answered' : ''}" aria-current="${index === currentQuestion ? 'step' : 'false'}">${String(index + 1).padStart(2, '0')}</button>`).join('')}</div>
        <div class="legend"><span><i class="legend-current"></i> Current</span><span><i class="legend-done"></i> Answered</span><span><i></i> Not answered</span></div>
      </aside>
    </div>`;

  examView.querySelectorAll('[data-option-index]').forEach((button) => {
    button.addEventListener('click', () => {
      answers[question.id] = question.options[Number(button.dataset.optionIndex)];
      renderExam();
    });
  });
  examView.querySelectorAll('[data-question-index]').forEach((button) => {
    button.addEventListener('click', () => {
      currentQuestion = Number(button.dataset.questionIndex);
      renderExam();
    });
  });
  examView.querySelector('#previous-question').addEventListener('click', () => {
    if (currentQuestion > 0) { currentQuestion -= 1; renderExam(); }
  });
  const nextButton = examView.querySelector('#next-question');
  if (nextButton) nextButton.addEventListener('click', () => {
    currentQuestion += 1;
    renderExam();
  });
  const submitButton = examView.querySelector('#submit-exam');
  if (submitButton) submitButton.addEventListener('click', () => submitExam(false));
}

async function submitExam(isTimedOut) {
  if (submitting) return;
  if (!isTimedOut && Object.keys(answers).length < questions.length) {
    const unanswered = questions.length - Object.keys(answers).length;
    if (!window.confirm(`You have ${unanswered} unanswered question${unanswered === 1 ? '' : 's'}. Submit anyway?`)) return;
  }
  submitting = true;
  window.clearInterval(timerId);
  const submitButton = examView.querySelector('#submit-exam');
  if (submitButton) submitButton.disabled = true;
  try {
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ answers })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Your assessment could not be submitted.');
    showResult(result, isTimedOut);
  } catch (error) {
    submitting = false;
    timerId = window.setInterval(updateTimer, 1000);
    if (submitButton) submitButton.disabled = false;
    showToast(error.message || 'Submission failed. Please try again.');
  }
}

function showResult(result, isTimedOut) {
  examView.hidden = true;
  resultView.hidden = false;
  resultView.innerHTML = `
    <div class="result-icon" aria-hidden="true">✓</div>
    <span class="exam-kicker">ASSESSMENT COMPLETE</span>
    <h1>${result.percentage >= 80 ? 'Brilliant work.' : result.percentage >= 50 ? 'Nice effort.' : 'Good first step.'}</h1>
    <p>${isTimedOut ? 'Time is up — your answers have been submitted. ' : 'You made it to the finish. '}Here is your result.</p>
    <div class="score-ring"><strong>${result.percentage}%</strong><span>YOUR SCORE</span></div>
    <div class="result-stats"><div><strong>${result.score} / ${result.total}</strong><span>Correct answers</span></div><div><strong>${result.total - result.score}</strong><span>To revisit</span></div></div>
    <button type="button" id="restart-exam" class="primary-button">Back to start <span aria-hidden="true">↗</span></button>`;
  resultView.querySelector('#restart-exam').addEventListener('click', () => {
    resultView.hidden = true;
    welcomeView.hidden = false;
    submitting = false;
  });
}
