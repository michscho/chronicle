// Chronicle — entry point: init(), event binding, global handler exposure, bootstrap.

// ============================================
// INIT
// ============================================
        function init() {
            // Load AI events
            events = [...events, ...aiGeneratedEvents];
            nextEventId = Math.max(...events.map(e => e.id)) + 1;

            buildEpochs();
            buildEvents();
            bindEvents();
            updateApiKeyStatus();
            updateStats();
            update();
            setTimeout(() => loading.classList.add('hidden'), 300);
        }

        // ============================================
        // EVENTS
        // ============================================
        function bindEvents() {
            // Zoom
            document.getElementById('zoomIn').addEventListener('click', zoomIn);
            document.getElementById('zoomOut').addEventListener('click', zoomOut);

            // Search
            document.getElementById('searchBtn').addEventListener('click', openSearch);
            document.getElementById('searchClose').addEventListener('click', closeSearch);
            searchInput.addEventListener('input', (e) => performSearch(e.target.value));
            searchResults.addEventListener('click', handleSearchResultClick);

            // Info panel
            document.getElementById('closeInfo').addEventListener('click', hidePanel);

            // Settings
            document.getElementById('settingsBtn').addEventListener('click', openSettings);
            document.getElementById('closeSettings').addEventListener('click', closeSettings);
            document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
            document.getElementById('clearApiKey').addEventListener('click', clearApiKey);
            document.getElementById('clearAiEvents').addEventListener('click', clearAiEvents);

            // AI
            document.getElementById('aiBtn').addEventListener('click', openAiModal);
            document.getElementById('closeAi').addEventListener('click', closeAiModal);

            // Quiz
            document.getElementById('quizBtn').addEventListener('click', openQuiz);
            document.getElementById('closeQuiz').addEventListener('click', closeQuiz);

            // Navigation buttons
            document.querySelectorAll('.nav-btn').forEach(btn => {
                btn.addEventListener('click', () => goToTime(+btn.dataset.goto));
            });

            // Category filters
            document.querySelectorAll('.cat-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const c = btn.dataset.category;
                    if (categories.has(c)) {
                        categories.delete(c);
                        btn.classList.remove('active');
                    } else {
                        categories.add(c);
                        btn.classList.add('active');
                    }
                    update();
                });
            });

            // Mouse drag
            viewport.addEventListener('mousedown', (e) => {
                if (e.target.closest('.timeline-event') || e.target.closest('.epoch-bar')) return;
                startDrag(e.clientX);
            });
            document.addEventListener('mousemove', (e) => doDrag(e.clientX));
            document.addEventListener('mouseup', endDrag);

            // Touch drag
            viewport.addEventListener('touchstart', (e) => {
                if (e.target.closest('.timeline-event') || e.target.closest('.epoch-bar')) return;
                startDrag(e.touches[0].clientX);
            }, { passive: true });
            viewport.addEventListener('touchmove', (e) => {
                doDrag(e.touches[0].clientX);
            }, { passive: true });
            viewport.addEventListener('touchend', endDrag);

            // Wheel zoom
            viewport.addEventListener('wheel', (e) => {
                e.preventDefault();
                e.deltaY > 0 ? zoomOut() : zoomIn();
            }, { passive: false });

            // Keyboard
            document.addEventListener('keydown', (e) => {
                if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

                if (e.key === 'Escape') {
                    closeSearch();
                    closeSettings();
                    closeAiModal();
                    closeQuiz();
                    hidePanel();
                }
                if (e.key === '+' || e.key === '=') zoomIn();
                if (e.key === '-') zoomOut();
                if (e.key === 'ArrowLeft') {
                    centerTime -= zoomLevels[zoomIndex].halfRange * 0.15;
                    update();
                }
                if (e.key === 'ArrowRight') {
                    centerTime += zoomLevels[zoomIndex].halfRange * 0.15;
                    update();
                }
                if (e.key === '/' || e.key === 'f') {
                    e.preventDefault();
                    openSearch();
                }
            });

            // Click outside modals
            document.querySelectorAll('.modal-overlay').forEach(overlay => {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) {
                        overlay.classList.remove('active');
                    }
                });
            });

            // Click outside info panel
            document.addEventListener('click', (e) => {
                if (infoPanel.classList.contains('visible') &&
                    !e.target.closest('.info-panel') &&
                    !e.target.closest('.timeline-event') &&
                    !e.target.closest('.epoch-bar') &&
                    !e.target.closest('.nav-btn') &&
                    !e.target.closest('.search-result')) {
                    hidePanel();
                }
            });
        }

        // Make functions available globally for onclick handlers
        window.goToTime = goToTime;
        window.closeAiModal = closeAiModal;
        window.getAiFormHtml = getAiFormHtml;
        window.bindAiFormEvents = bindAiFormEvents;
        window.startQuiz = startQuiz;
        window.closeQuiz = closeQuiz;

        // Start
        init();
