// Chronicle — settings panel: API key + AI-event persistence and stats.

        // ============================================
        // SETTINGS
        // ============================================
        function openSettings() {
            document.getElementById('settingsModal').classList.add('active');
            document.getElementById('apiKeyInput').value = apiKey ? '••••••••••••••••' : '';
        }

        function closeSettings() {
            document.getElementById('settingsModal').classList.remove('active');
        }

        function updateApiKeyStatus() {
            const statusDot = document.getElementById('statusDot');
            const statusText = document.getElementById('apiKeyText');
            const statusContainer = document.getElementById('apiKeyStatus');

            if (apiKey) {
                statusDot.className = 'status-dot connected';
                statusText.textContent = 'API-Key konfiguriert';
                statusContainer.className = 'api-key-status connected';
            } else {
                statusDot.className = 'status-dot disconnected';
                statusText.textContent = 'Kein API-Key konfiguriert';
                statusContainer.className = 'api-key-status disconnected';
            }
        }

        function updateStats() {
            document.getElementById('eventCount').textContent = events.length;
            document.getElementById('aiEventCount').textContent = aiGeneratedEvents.length;
        }

        function saveApiKey() {
            const input = document.getElementById('apiKeyInput');
            const newKey = input.value.trim();

            if (newKey && !newKey.startsWith('••')) {
                apiKey = newKey;
                localStorage.setItem('openai_api_key', apiKey);
                updateApiKeyStatus();
                showToast('API-Key gespeichert');
            }
        }

        function clearApiKey() {
            apiKey = '';
            localStorage.removeItem('openai_api_key');
            document.getElementById('apiKeyInput').value = '';
            updateApiKeyStatus();
            showToast('API-Key gelöscht');
        }

        function clearAiEvents() {
            aiGeneratedEvents = [];
            localStorage.setItem('ai_events', '[]');
            events = events.filter(e => !e.aiGenerated);
            buildEvents();
            updateStats();
            update();
            showToast('KI-Ereignisse gelöscht');
        }

