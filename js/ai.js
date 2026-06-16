// Chronicle — AI event generator (OpenAI chat completions).

        // ============================================
        // AI GENERATOR
        // ============================================
        function openAiModal() {
            if (!apiKey) {
                showToast('Bitte zuerst API-Key in den Einstellungen hinzufügen', 'error');
                openSettings();
                return;
            }
            document.getElementById('aiModal').classList.add('active');
            document.getElementById('aiPrompt').value = '';
            document.getElementById('aiModalBody').innerHTML = getAiFormHtml();
            bindAiFormEvents();
        }

        function closeAiModal() {
            document.getElementById('aiModal').classList.remove('active');
        }

        function getAiFormHtml() {
            return `
                <div class="ai-prompt-area">
                    <div class="form-group">
                        <label class="form-label">Beschreibe das Ereignis, das du hinzufügen möchtest</label>
                        <textarea class="form-textarea" id="aiPrompt" placeholder="z.B. 'Die Erfindung des Telefons' oder 'Leben von Marie Curie' oder 'Wichtige Ereignisse der Französischen Revolution'"></textarea>
                    </div>
                    <div class="ai-suggestions">
                        <button class="ai-suggestion" data-prompt="Die wichtigsten Erfindungen des 20. Jahrhunderts">Erfindungen 20. Jh.</button>
                        <button class="ai-suggestion" data-prompt="Berühmte Wissenschaftlerinnen der Geschichte">Wissenschaftlerinnen</button>
                        <button class="ai-suggestion" data-prompt="Die Geschichte der Raumfahrt">Raumfahrt</button>
                        <button class="ai-suggestion" data-prompt="Wichtige Kunstbewegungen">Kunstbewegungen</button>
                        <button class="ai-suggestion" data-prompt="Die Geschichte des Internets">Internet</button>
                    </div>
                </div>
                <div class="form-group">
                    <label class="form-label">Anzahl Ereignisse</label>
                    <select class="form-select" id="aiCount">
                        <option value="1">1 Ereignis</option>
                        <option value="3" selected>3 Ereignisse</option>
                        <option value="5">5 Ereignisse</option>
                        <option value="10">10 Ereignisse</option>
                    </select>
                </div>
                <button class="btn btn-primary btn-full" id="generateAi">
                    ✨ Mit KI generieren
                </button>
                <p class="form-hint" style="margin-top: 8px; text-align: center;">
                    Verwendet OpenAI GPT-4o-mini für die Generierung.
                </p>
            `;
        }

        function bindAiFormEvents() {
            document.getElementById('generateAi')?.addEventListener('click', generateWithAi);
            document.querySelectorAll('.ai-suggestion').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.getElementById('aiPrompt').value = btn.dataset.prompt;
                });
            });
        }

        async function generateWithAi() {
            const prompt = document.getElementById('aiPrompt').value.trim();
            const count = document.getElementById('aiCount').value;

            if (!prompt) {
                showToast('Bitte Beschreibung eingeben', 'error');
                return;
            }

            document.getElementById('aiModalBody').innerHTML = `
                <div class="ai-loading">
                    <div class="ai-loading-spinner"></div>
                    <div class="ai-loading-text">Generiere ${count} Ereignis(se)...</div>
                </div>
            `;

            try {
                const response = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{
                            role: 'system',
                            content: `Du bist ein Historiker, der präzise historische Ereignisse im JSON-Format liefert. Antworte NUR mit validem JSON ohne Markdown-Formatierung.`
                        }, {
                            role: 'user',
                            content: `Erstelle ${count} historische(s) Ereignis(se) zum Thema: "${prompt}".

Format für JEDES Ereignis:
{
  "time": <Jahr als Zahl, negative Werte für v.Chr.>,
  "title": "<Kurzer Titel, max 30 Zeichen>",
  "subtitle": "<Untertitel, max 25 Zeichen>",
  "desc": "<Beschreibung, 50-150 Zeichen>",
  "cat": "<ereignis|wissenschaft|kultur|politik|person>",
  "imp": <1=sehr wichtig, 2=wichtig, 3=interessant>
}

Antworte mit einem JSON-Array: [...]`
                        }],
                        temperature: 0.7,
                        max_tokens: 2000
                    })
                });

                if (!response.ok) {
                    throw new Error(`API Fehler: ${response.status}`);
                }

                const data = await response.json();
                let content = data.choices[0].message.content;

                // Clean up response
                content = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

                const newEvents = JSON.parse(content);

                if (!Array.isArray(newEvents) || newEvents.length === 0) {
                    throw new Error('Ungültige Antwort');
                }

                // Add events
                const addedEvents = [];
                newEvents.forEach(ev => {
                    const newEvent = {
                        id: nextEventId++,
                        time: ev.time,
                        title: ev.title,
                        subtitle: ev.subtitle,
                        desc: ev.desc,
                        cat: ev.cat || 'ereignis',
                        imp: ev.imp || 2,
                        aiGenerated: true
                    };
                    events.push(newEvent);
                    aiGeneratedEvents.push(newEvent);
                    addedEvents.push(newEvent);
                });

                localStorage.setItem('ai_events', JSON.stringify(aiGeneratedEvents));
                buildEvents();
                updateStats();
                update();

                // Show results
                document.getElementById('aiModalBody').innerHTML = `
                    <div style="text-align: center; margin-bottom: 16px;">
                        <div style="font-size: 2rem; margin-bottom: 8px;">✨</div>
                        <div style="font-size: 1rem; font-weight: 600;">${addedEvents.length} Ereignis(se) hinzugefügt!</div>
                    </div>
                    ${addedEvents.map(ev => `
                        <div class="ai-result">
                            <div class="ai-result-title">${ev.title}</div>
                            <div class="ai-result-meta">${formatTime(ev.time)} • ${catName(ev.cat)}</div>
                            <div class="ai-result-desc">${ev.desc}</div>
                        </div>
                    `).join('')}
                    <button class="btn btn-primary btn-full" onclick="goToTime(${addedEvents[0].time}); closeAiModal();">
                        Zum ersten Ereignis
                    </button>
                    <button class="btn btn-secondary btn-full" style="margin-top: 8px;" onclick="document.getElementById('aiModalBody').innerHTML = getAiFormHtml(); bindAiFormEvents();">
                        Weitere generieren
                    </button>
                `;

                showToast(`${addedEvents.length} Ereignis(se) hinzugefügt`);

            } catch (error) {
                console.error('AI Error:', error);
                document.getElementById('aiModalBody').innerHTML = `
                    <div style="text-align: center; padding: 20px;">
                        <div style="font-size: 2rem; margin-bottom: 12px;">⚠️</div>
                        <div style="font-size: 0.85rem; color: var(--error); margin-bottom: 16px;">
                            Fehler: ${error.message}
                        </div>
                        <button class="btn btn-secondary" onclick="document.getElementById('aiModalBody').innerHTML = getAiFormHtml(); bindAiFormEvents();">
                            Erneut versuchen
                        </button>
                    </div>
                `;
                showToast('Generierung fehlgeschlagen', 'error');
            }
        }

