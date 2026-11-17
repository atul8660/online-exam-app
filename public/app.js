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
  startButton.textContent = 'Loading…';
  try {
    questions = await loadQuestions();
    if (!questions.length) throw new Error('There are no questions available.');
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
    showToast(error.message || 'Unable to start the exam.');
  } finally {
    startButton.disabled = false;
    startButton.textContent = 'Start exam';
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
  const time = `${String(Math.floor(secondsRemaining / 60)).padStart(2, '0')}:${String(secondsRemaining % 60).padStart(2, '0')}`;

  examView.innerHTML = `
    <div class="exam-heading">
      <h1>Online Exam</h1>
      <div id="exam-timer" class="timer" aria-label="Time remaining"><span>${time}</span></div>
    </div>
    <div class="progress-track" role="progressbar" aria-label="Questions answered" aria-valuenow="${answeredCount}" aria-valuemin="0" aria-valuemax="${questions.length}"><div class="progress-fill" style="width:${progress}%"></div></div>
    <div class="exam-summary"><span>Question ${currentQuestion + 1} of ${questions.length}</span><span>${answeredCount} answered</span></div>
    <section class="question-card" aria-label="Question ${currentQuestion + 1} of ${questions.length}">
      <h2 class="question-text">${escapeHtml(question.question)}</h2>
      <div class="answer-list" role="radiogroup" aria-label="Answer options">
        ${question.options.map((option, index) => `<button type="button" class="answer-option${answers[question.id] === option ? ' selected' : ''}" data-option-index="${index}" role="radio" aria-checked="${answers[question.id] === option}"><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${escapeHtml(option)}</span></button>`).join('')}
      </div>
      <div class="question-actions">
        <button type="button" class="secondary-button" id="previous-question" ${currentQuestion === 0 ? 'disabled' : ''}>Previous</button>
        ${currentQuestion === questions.length - 1
          ? '<button type="button" class="submit-button" id="submit-exam">Submit exam</button>'
          : '<button type="button" class="submit-button" id="next-question">Next</button>'}
      </div>
    </section>`;

  examView.querySelectorAll('[data-option-index]').forEach((button) => {
    button.addEventListener('click', () => {
      answers[question.id] = question.options[Number(button.dataset.optionIndex)];
      renderExam();
    });
  });

  examView.querySelector('#previous-question').addEventListener('click', () => {
    if (currentQuestion > 0) {
      currentQuestion -= 1;
      renderExam();
    }
  });

  const nextButton = examView.querySelector('#next-question');
  if (nextButton) {
    nextButton.addEventListener('click', () => {
      currentQuestion += 1;
      renderExam();
    });
  }

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
    if (!response.ok) throw new Error(result.error || 'Your exam could not be submitted.');
    showResult(result, isTimedOut);
  } catch (error) {
    submitting = false;
    if (secondsRemaining > 0) timerId = window.setInterval(updateTimer, 1000);
    if (submitButton) submitButton.disabled = false;
    showToast(error.message || 'Submission failed. Please try again.');
  }
}

function showResult(result, isTimedOut) {
  examView.hidden = true;
  resultView.hidden = false;
  resultView.innerHTML = `
    <h1>Exam complete</h1>
    <p>${isTimedOut ? 'Time is up. ' : ''}Your score: <strong>${result.score} out of ${result.total} (${result.percentage}%)</strong></p>
    <button type="button" id="restart-exam" class="primary-button">Take the exam again</button>`;
  resultView.querySelector('#restart-exam').addEventListener('click', () => {
    resultView.hidden = true;
    welcomeView.hidden = false;
    submitting = false;
  });
}
