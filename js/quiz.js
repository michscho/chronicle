// Chronicle — history quiz: question generation, rendering, scoring.

        // ============================================
        // QUIZ
        // ============================================
        function openQuiz() {
            document.getElementById('quizModal').classList.add('active');
            startQuiz();
        }

        function closeQuiz() {
            document.getElementById('quizModal').classList.remove('active');
            quizState.active = false;
        }

        function startQuiz() {
            // Get important events for quiz
            const quizEvents = events.filter(e => e.imp <= 2 && e.time > -10000 && e.time <= 2024);

            // Shuffle and pick 10
            const shuffled = quizEvents.sort(() => Math.random() - 0.5);
            const selected = shuffled.slice(0, 10);

            quizState = {
                active: true,
                questions: selected.map(ev => generateQuestion(ev)),
                currentQuestion: 0,
                score: 0,
                answered: false
            };

            renderQuiz();
        }

        function generateQuestion(event) {
            const types = ['year', 'event', 'category'];
            const type = types[Math.floor(Math.random() * types.length)];

            if (type === 'year') {
                // When did X happen?
                const correctYear = event.time;
                const options = [correctYear];

                while (options.length < 4) {
                    const offset = (Math.random() - 0.5) * Math.abs(correctYear) * 0.3;
                    const wrongYear = Math.round(correctYear + offset);
                    if (!options.includes(wrongYear) && wrongYear <= 2024) {
                        options.push(wrongYear);
                    }
                }

                options.sort((a, b) => a - b);

                return {
                    question: `Wann war "${event.title}"?`,
                    hint: event.subtitle,
                    options: options.map(y => formatTime(y)),
                    correct: options.indexOf(correctYear),
                    event: event
                };
            } else if (type === 'event') {
                // What happened in year X?
                const year = event.time;
                const sameEra = events.filter(e =>
                    Math.abs(e.time - year) < Math.abs(year) * 0.5 &&
                    e.id !== event.id &&
                    e.imp <= 2
                );

                const wrongEvents = sameEra.sort(() => Math.random() - 0.5).slice(0, 3);
                const options = [event, ...wrongEvents].sort(() => Math.random() - 0.5);

                if (options.length < 4) {
                    // Fallback to year question
                    return generateQuestion(event);
                }

                return {
                    question: `Was geschah im Jahr ${formatTime(year)}?`,
                    hint: event.cat ? catName(event.cat) : null,
                    options: options.map(e => e.title),
                    correct: options.indexOf(event),
                    event: event
                };
            } else {
                // What category?
                const cats = ['ereignis', 'wissenschaft', 'kultur', 'politik', 'person'];
                const options = [...cats].sort(() => Math.random() - 0.5);

                return {
                    question: `Zu welcher Kategorie gehört "${event.title}"?`,
                    hint: `${formatTime(event.time)} - ${event.subtitle}`,
                    options: options.map(c => catName(c)),
                    correct: options.indexOf(event.cat),
                    event: event
                };
            }
        }

        function renderQuiz() {
            const body = document.getElementById('quizModalBody');

            if (quizState.currentQuestion >= quizState.questions.length) {
                // Show results
                const percentage = Math.round((quizState.score / quizState.questions.length) * 100);
                let emoji, text;

                if (percentage >= 80) {
                    emoji = '🏆';
                    text = 'Ausgezeichnet! Du bist ein Geschichtsexperte!';
                } else if (percentage >= 60) {
                    emoji = '🎉';
                    text = 'Gut gemacht! Du kennst dich gut aus.';
                } else if (percentage >= 40) {
                    emoji = '📚';
                    text = 'Nicht schlecht! Weiter lernen lohnt sich.';
                } else {
                    emoji = '🤔';
                    text = 'Geschichte kann so spannend sein - probier es nochmal!';
                }

                body.innerHTML = `
                    <div class="quiz-result">
                        <div class="quiz-result-icon">${emoji}</div>
                        <div class="quiz-result-title">Quiz beendet!</div>
                        <div class="quiz-result-score">${quizState.score}/${quizState.questions.length}</div>
                        <div class="quiz-result-text">${text}</div>
                        <button class="btn btn-primary btn-full" onclick="startQuiz()">
                            🔄 Nochmal spielen
                        </button>
                        <button class="btn btn-secondary btn-full" style="margin-top: 8px;" onclick="closeQuiz()">
                            Schließen
                        </button>
                    </div>
                `;
                return;
            }

            const q = quizState.questions[quizState.currentQuestion];
            const progress = ((quizState.currentQuestion) / quizState.questions.length) * 100;

            body.innerHTML = `
                <div class="quiz-container">
                    <div class="quiz-progress">
                        <div class="quiz-progress-bar">
                            <div class="quiz-progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="quiz-progress-text">${quizState.currentQuestion + 1}/${quizState.questions.length}</span>
                        <span class="quiz-score">⭐ ${quizState.score}</span>
                    </div>
                    <div class="quiz-question">${q.question}</div>
                    ${q.hint ? `<div class="quiz-hint">💡 ${q.hint}</div>` : ''}
                    <div class="quiz-options">
                        ${q.options.map((opt, i) => `
                            <button class="quiz-option" data-index="${i}">${opt}</button>
                        `).join('')}
                    </div>
                </div>
            `;

            // Bind option clicks
            body.querySelectorAll('.quiz-option').forEach(btn => {
                btn.addEventListener('click', () => answerQuiz(parseInt(btn.dataset.index)));
            });
        }

        function answerQuiz(index) {
            if (quizState.answered) return;
            quizState.answered = true;

            const q = quizState.questions[quizState.currentQuestion];
            const buttons = document.querySelectorAll('.quiz-option');

            buttons.forEach((btn, i) => {
                btn.disabled = true;
                if (i === q.correct) {
                    btn.classList.add('correct');
                } else if (i === index) {
                    btn.classList.add('wrong');
                }
            });

            if (index === q.correct) {
                quizState.score++;
            }

            // Show next question after delay
            setTimeout(() => {
                quizState.currentQuestion++;
                quizState.answered = false;
                renderQuiz();
            }, 1500);
        }

