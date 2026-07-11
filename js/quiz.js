// Chronicle — history quiz: question generation, rendering, scoring.

import { categories, catName } from './data.js';
import { state } from './store.js';
import { formatTime } from './time.js';
import { escapeHtml, shuffle, openModal, closeModal } from './ui.js';

const QUESTIONS_PER_ROUND = 10;

let quiz = null;

const body = () => document.getElementById('quizModalBody');

export function initQuiz() {
    document.getElementById('quizBtn').addEventListener('click', () => {
        openModal('quizModal');
        startQuiz();
    });
    document.getElementById('closeQuiz').addEventListener('click', closeQuiz);
}

export function closeQuiz() {
    closeModal('quizModal');
    quiz = null;
}

function startQuiz() {
    const pool = state.events.filter(e => e.imp <= 2 && e.time > -10000 && e.time <= 2025);
    const selected = shuffle(pool).slice(0, QUESTIONS_PER_ROUND);
    quiz = {
        questions: selected.map(makeQuestion),
        current: 0,
        score: 0,
        answered: false
    };
    render();
}

function makeQuestion(event, _i, _arr, depth = 0) {
    const type = ['year', 'event', 'category'][Math.floor(Math.random() * 3)];

    if (type === 'year' || depth > 2) {
        const correct = event.time;
        const options = new Set([correct]);
        // era-scaled wrong answers with a floor so year 0/small years terminate
        const scale = Math.max(10, Math.abs(correct) * 0.3);
        let guard = 0;
        while (options.size < 4 && guard++ < 100) {
            const wrong = Math.round(correct + (Math.random() - 0.5) * 2 * scale);
            if (wrong <= 2025) options.add(wrong);
        }
        const sorted = [...options].sort((a, b) => a - b);
        return {
            question: `Wann war „${event.title}"?`,
            hint: event.subtitle,
            options: sorted.map(formatTime),
            correct: sorted.indexOf(correct)
        };
    }

    if (type === 'event') {
        const sameEra = state.events.filter(e =>
            e.id !== event.id && e.imp <= 2 &&
            Math.abs(e.time - event.time) < Math.max(50, Math.abs(event.time) * 0.5)
        );
        if (sameEra.length < 3) return makeQuestion(event, _i, _arr, depth + 1);
        const options = shuffle([event, ...shuffle(sameEra).slice(0, 3)]);
        return {
            question: `Was geschah im Jahr ${formatTime(event.time)}?`,
            hint: catName(event.cat),
            options: options.map(e => e.title),
            correct: options.indexOf(event)
        };
    }

    const options = shuffle(Object.keys(categories));
    return {
        question: `Zu welcher Kategorie gehört „${event.title}"?`,
        hint: `${formatTime(event.time)} – ${event.subtitle || ''}`,
        options: options.map(catName),
        correct: options.indexOf(event.cat)
    };
}

function render() {
    if (!quiz) return;

    if (quiz.current >= quiz.questions.length) {
        renderResult();
        return;
    }

    const q = quiz.questions[quiz.current];
    const progress = (quiz.current / quiz.questions.length) * 100;

    body().innerHTML = `
        <div class="quiz-progress">
            <div class="quiz-progress-bar"><div class="quiz-progress-fill" style="width:${progress}%"></div></div>
            <span class="quiz-progress-text">${quiz.current + 1}/${quiz.questions.length}</span>
            <span class="quiz-score">⭐ ${quiz.score}</span>
        </div>
        <div class="quiz-question">${escapeHtml(q.question)}</div>
        ${q.hint ? `<div class="quiz-hint">💡 ${escapeHtml(q.hint)}</div>` : ''}
        <div class="quiz-options">
            ${q.options.map((opt, i) => `<button class="quiz-option" data-index="${i}">${escapeHtml(opt)}</button>`).join('')}
        </div>`;

    body().querySelectorAll('.quiz-option').forEach(btn =>
        btn.addEventListener('click', () => answer(+btn.dataset.index)));
}

function answer(index) {
    if (!quiz || quiz.answered) return;
    quiz.answered = true;

    const q = quiz.questions[quiz.current];
    body().querySelectorAll('.quiz-option').forEach((btn, i) => {
        btn.disabled = true;
        if (i === q.correct) btn.classList.add('correct');
        else if (i === index) btn.classList.add('wrong');
    });
    if (index === q.correct) quiz.score++;

    setTimeout(() => {
        if (!quiz) return;
        quiz.current++;
        quiz.answered = false;
        render();
    }, 1400);
}

function renderResult() {
    const pct = Math.round((quiz.score / quiz.questions.length) * 100);
    const [emoji, text] =
        pct >= 80 ? ['🏆', 'Ausgezeichnet! Du bist ein Geschichtsexperte!'] :
        pct >= 60 ? ['🎉', 'Gut gemacht! Du kennst dich gut aus.'] :
        pct >= 40 ? ['📚', 'Nicht schlecht! Weiter lernen lohnt sich.'] :
                    ['🤔', 'Geschichte kann so spannend sein – probier es nochmal!'];

    body().innerHTML = `
        <div class="quiz-result">
            <div class="quiz-result-icon">${emoji}</div>
            <div class="quiz-result-title">Quiz beendet!</div>
            <div class="quiz-result-score">${quiz.score}/${quiz.questions.length}</div>
            <div class="quiz-result-text">${text}</div>
            <button class="btn btn-primary btn-full" id="quizAgain">🔄 Nochmal spielen</button>
            <button class="btn btn-secondary btn-full" id="quizClose">Schließen</button>
        </div>`;
    body().querySelector('#quizAgain').addEventListener('click', startQuiz);
    body().querySelector('#quizClose').addEventListener('click', closeQuiz);
}
