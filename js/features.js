/* ==========================================================================
   Дополнительные интерактивные возможности:
   - переключатель озвучки маршрутов
   - викторина «Кто совершил это открытие?»
   ========================================================================== */

const shuffleArr = (a) =>
    a.map((v) => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map((p) => p[1]);

/* ---------- Переключатель озвучки ---------- */
window.voiceEnabled = true;
(function initVoiceToggle() {
    const t = document.getElementById("voiceToggle");
    if (!t) return;
    window.voiceEnabled = t.checked;
    t.addEventListener("change", () => {
        window.voiceEnabled = t.checked;
        if (!t.checked && typeof clearVoyage === "function") clearVoyage();
    });
})();

/* ---------- Викторина ---------- */
const QUIZ_TOTAL = 8;
let quiz = null;
const uniqueExplorers = [...new Set(discoveries.map((d) => d.explorer))];

const quizEl = document.getElementById("quiz");
const quizProgress = document.getElementById("quizProgress");
const quizQuestion = document.getElementById("quizQuestion");
const quizOptions = document.getElementById("quizOptions");
const quizFeedback = document.getElementById("quizFeedback");
const quizNext = document.getElementById("quizNext");

function startQuiz() {
    if (typeof clearActiveRoute === "function") clearActiveRoute();
    quiz = { idx: 0, score: 0, order: shuffleArr(discoveries).slice(0, QUIZ_TOTAL) };
    quizEl.classList.remove("hidden");
    showQuizQuestion();
}

function closeQuiz() {
    quiz = null;
    quizEl.classList.add("hidden");
}

function showQuizQuestion() {
    const q = quiz.order[quiz.idx];
    const others = shuffleArr(uniqueExplorers.filter((n) => n !== q.explorer)).slice(0, 3);
    const options = shuffleArr([q.explorer, ...others]);

    quizProgress.textContent = `Вопрос ${quiz.idx + 1} из ${quiz.order.length} · Счёт: ${quiz.score}`;
    quizQuestion.innerHTML = `
        <div class="quiz-q-title">${q.title}</div>
        <div class="quiz-q-meta">${q.year} год · ${q.location}</div>
        <div class="quiz-q-desc">${q.description}</div>
        <div class="quiz-q-ask">Кто совершил это открытие?</div>
    `;
    quizFeedback.textContent = "";
    quizFeedback.className = "quiz-feedback";
    quizNext.hidden = true;

    quizOptions.innerHTML = "";
    options.forEach((name) => {
        const b = document.createElement("button");
        b.className = "quiz-opt";
        b.textContent = name;
        b.addEventListener("click", () => answerQuiz(name, q.explorer, b));
        quizOptions.appendChild(b);
    });
}

function answerQuiz(chosen, correct, btnEl) {
    [...quizOptions.children].forEach((b) => {
        b.disabled = true;
        if (b.textContent === correct) b.classList.add("correct");
    });
    if (chosen === correct) {
        quiz.score++;
        quizFeedback.textContent = "✓ Верно!";
        quizFeedback.className = "quiz-feedback ok";
    } else {
        btnEl.classList.add("wrong");
        quizFeedback.textContent = `✗ Правильный ответ: ${correct}`;
        quizFeedback.className = "quiz-feedback no";
    }
    quizProgress.textContent = `Вопрос ${quiz.idx + 1} из ${quiz.order.length} · Счёт: ${quiz.score}`;
    quizNext.hidden = false;
    quizNext.textContent = quiz.idx + 1 >= quiz.order.length ? "Показать результат" : "Дальше →";
}

function nextQuizQuestion() {
    quiz.idx++;
    if (quiz.idx >= quiz.order.length) showQuizResult();
    else showQuizQuestion();
}

function showQuizResult() {
    const n = quiz.order.length;
    const s = quiz.score;
    let verdict = "Есть куда расти — попробуйте ещё раз!";
    if (s === n) verdict = "Идеально! Вы знаток истории открытий! ⚓";
    else if (s >= n * 0.75) verdict = "Отличный результат! 🧭";
    else if (s >= n * 0.5) verdict = "Неплохо, но можно лучше.";

    quizProgress.textContent = "Викторина завершена";
    quizQuestion.innerHTML = `<div class="quiz-result">Правильных ответов:
        <span class="score">${s} / ${n}</span>${verdict}</div>`;
    quizOptions.innerHTML = "";
    quizFeedback.textContent = "";
    quizFeedback.className = "quiz-feedback";
    quizNext.hidden = false;
    quizNext.textContent = "🔁 Играть снова";
}

(function initQuiz() {
    const btn = document.getElementById("quizBtn");
    if (!btn || !quizEl) return;
    btn.addEventListener("click", startQuiz);
    document.getElementById("quizClose").addEventListener("click", closeQuiz);
    quizNext.addEventListener("click", () => {
        if (quizNext.textContent.includes("снова")) startQuiz();
        else nextQuizQuestion();
    });
    quizEl.addEventListener("click", (e) => { if (e.target === quizEl) closeQuiz(); });
})();
