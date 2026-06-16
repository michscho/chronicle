// Chronicle — timeline rendering: build epochs/events, viewport update, time markers.

        function buildEpochs() {
            const maxRow = Math.max(...epochs.map(e => e.row)) + 1;
            let html = '';
            for (let r = 0; r < maxRow; r++) {
                html += `<div class="epoch-row" data-row="${r}"></div>`;
            }
            epochRows.innerHTML = html;

            epochs.forEach(ep => {
                const bar = document.createElement('div');
                bar.className = 'epoch-bar';
                bar.dataset.id = ep.id;
                bar.dataset.start = ep.start;
                bar.dataset.end = Math.min(ep.end, MAX_TIME);
                bar.style.setProperty('--epoch-color', ep.color);
                bar.innerHTML = `<span class="epoch-bar-text">${ep.title}</span>`;
                bar.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showPanel(ep, 'epoch');
                });
                const rowEl = epochRows.querySelector(`[data-row="${ep.row}"]`);
                if (rowEl) rowEl.appendChild(bar);
            });
        }

        function buildEvents() {
            eventsArea.innerHTML = '';

            // Assign rows based on time proximity
            const sortedEvents = [...events].sort((a, b) => a.time - b.time);
            const rowEndTimes = [0, 0, 0, 0];

            sortedEvents.forEach(ev => {
                let bestRow = 0;
                let minEnd = rowEndTimes[0];
                for (let r = 0; r < rowEndTimes.length; r++) {
                    if (rowEndTimes[r] < ev.time) {
                        bestRow = r;
                        break;
                    }
                    if (rowEndTimes[r] < minEnd) {
                        minEnd = rowEndTimes[r];
                        bestRow = r;
                    }
                }
                ev.row = bestRow;
                rowEndTimes[bestRow] = ev.time + 50;
            });

            events.forEach(ev => {
                const el = document.createElement('div');
                el.className = 'timeline-event';
                if (ev.aiGenerated) el.classList.add('ai-generated');
                el.dataset.id = ev.id;
                el.dataset.time = ev.time;
                el.dataset.category = ev.cat;
                el.dataset.importance = ev.imp;
                el.dataset.row = ev.row;
                el.innerHTML = `
                    <div class="event-node"></div>
                    <div class="event-stem"></div>
                    <div class="event-content">
                        <div class="event-time">${formatTime(ev.time)}</div>
                        <div class="event-title">${ev.title}</div>
                    </div>
                `;
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showPanel(ev, 'event');
                });
                eventsArea.appendChild(el);
            });
        }

        // ============================================
        // FORMAT
        // ============================================
        function formatTime(t) {
            const abs = Math.abs(t);
            if (abs >= 1e9) return `${(t / 1e9).toFixed(1)} Mrd`;
            if (abs >= 1e6) return `${(t / 1e6).toFixed(1)} Mio`;
            if (abs >= 10000) return `${(t / 1000).toFixed(0)}k`;
            if (t < 0) return `${Math.abs(Math.round(t))} v.Chr.`;
            return `${Math.round(t)}`;
        }

        function formatTimeDisplay(t) {
            const abs = Math.abs(t);
            if (abs >= 1e9) return `${(t / 1e9).toFixed(1)} Mrd`;
            if (abs >= 1e6) return `${(t / 1e6).toFixed(1)} Mio`;
            if (abs >= 10000) return `${Math.round(t / 1000)}k`;
            if (t < 0) return `${Math.abs(Math.round(t))} v.Chr.`;
            return `${Math.round(t)}`;
        }

        // ============================================
        // UPDATE
        // ============================================
        function update() {
            const z = zoomLevels[zoomIndex];

            const minCenter = -13800000000 + z.halfRange;
            const maxCenter = MAX_TIME - z.halfRange;
            centerTime = Math.max(minCenter, Math.min(maxCenter, centerTime));

            const viewStart = centerTime - z.halfRange;
            const viewEnd = Math.min(centerTime + z.halfRange, MAX_TIME);
            const viewRange = viewEnd - viewStart;

            document.getElementById('currentTime').textContent = formatTimeDisplay(centerTime);
            document.getElementById('zoomInfo').textContent = `±${formatTime(z.halfRange)} sichtbar`;
            document.getElementById('zoomIn').disabled = zoomIndex >= zoomLevels.length - 1;
            document.getElementById('zoomOut').disabled = zoomIndex <= 0;

            // Update epochs
            document.querySelectorAll('.epoch-bar').forEach(bar => {
                const st = +bar.dataset.start;
                const en = +bar.dataset.end;
                const inRange = en > viewStart && st < viewEnd;
                const catOk = categories.has('epoche');

                if (inRange && catOk) {
                    bar.classList.add('visible');
                    const clampSt = Math.max(st, viewStart);
                    const clampEn = Math.min(en, viewEnd);
                    const left = ((clampSt - viewStart) / viewRange) * 100;
                    const width = Math.max(0.5, ((clampEn - clampSt) / viewRange) * 100);
                    bar.style.left = `${left}%`;
                    bar.style.width = `${width}%`;
                } else {
                    bar.classList.remove('visible');
                }
            });

            // Update events
            document.querySelectorAll('.timeline-event').forEach(el => {
                const time = +el.dataset.time;
                const imp = +el.dataset.importance;
                const cat = el.dataset.category;
                const id = +el.dataset.id;
                const inRange = time >= viewStart && time <= viewEnd;
                const impOk = imp <= z.maxImp;
                const catOk = categories.has(cat);
                const isHighlighted = id === highlightedEventId;
                const left = ((time - viewStart) / viewRange) * 100;

                el.style.left = `${left}%`;
                el.classList.toggle('highlight', isHighlighted);

                if ((inRange && impOk && catOk) || isHighlighted) {
                    el.classList.add('visible');
                } else {
                    el.classList.remove('visible');
                }
            });

            updateMarkers(viewStart, viewEnd, viewRange);
        }

        function updateMarkers(start, end, range) {
            timeMarkers.innerHTML = '';

            let interval;
            if (range > 1e10) interval = 2e9;
            else if (range > 1e9) interval = 2e8;
            else if (range > 1e8) interval = 1e7;
            else if (range > 1e7) interval = 1e6;
            else if (range > 1e6) interval = 1e5;
            else if (range > 100000) interval = 10000;
            else if (range > 10000) interval = 1000;
            else if (range > 2000) interval = 500;
            else if (range > 500) interval = 100;
            else if (range > 100) interval = 20;
            else if (range > 30) interval = 5;
            else interval = 2;

            const startM = Math.ceil(start / interval) * interval;

            for (let t = startM; t <= end; t += interval) {
                if (t > MAX_TIME) break;
                const pos = ((t - start) / range) * 100;
                if (pos < 2 || pos > 98) continue;

                const m = document.createElement('div');
                const isMajor = Math.abs(t % (interval * 5)) < 0.001;
                m.className = `time-marker ${isMajor ? 'major' : ''}`;
                m.style.left = `${pos}%`;
                m.innerHTML = `
                    <div class="time-marker-tick"></div>
                    <span class="time-marker-label">${formatTime(t)}</span>
                `;
                timeMarkers.appendChild(m);
            }
        }

