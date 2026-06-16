// Chronicle — search overlay: query scoring and result navigation.

        // ============================================
        // SEARCH
        // ============================================
        function openSearch() {
            searchContainer.classList.add('active');
            searchInput.focus();
        }

        function closeSearch() {
            searchContainer.classList.remove('active');
            searchResults.classList.remove('active');
            searchInput.value = '';
        }

        function performSearch(query) {
            if (!query.trim()) {
                searchResults.classList.remove('active');
                return;
            }

            const q = query.toLowerCase();
            const results = [];

            events.forEach(ev => {
                const score = calculateSearchScore(ev, q);
                if (score > 0) {
                    results.push({ type: 'event', item: ev, score });
                }
            });

            epochs.forEach(ep => {
                if (ep.title.toLowerCase().includes(q)) {
                    results.push({ type: 'epoch', item: ep, score: 10 });
                }
            });

            results.sort((a, b) => b.score - a.score);

            if (results.length === 0) {
                searchResults.innerHTML = '<div class="search-no-results">Keine Ergebnisse gefunden</div>';
            } else {
                searchResults.innerHTML = results.slice(0, 20).map(r => {
                    const item = r.item;
                    const time = r.type === 'epoch'
                        ? `${formatTime(item.start)} - ${formatTime(item.end)}`
                        : formatTime(item.time);
                    const cat = r.type === 'epoch' ? 'Epoche' : catName(item.cat);
                    const aiIcon = item.aiGenerated ? ' ✨' : '';
                    return `
                        <div class="search-result" data-type="${r.type}" data-id="${item.id}">
                            <div class="search-result-title">${item.title}${aiIcon}</div>
                            <div class="search-result-meta">
                                <span>${time}</span>
                                <span class="search-result-cat">${cat}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            searchResults.classList.add('active');
        }

        function calculateSearchScore(ev, query) {
            let score = 0;
            const q = query.toLowerCase();

            if (ev.title.toLowerCase().includes(q)) score += 20;
            if (ev.title.toLowerCase().startsWith(q)) score += 10;
            if (ev.subtitle && ev.subtitle.toLowerCase().includes(q)) score += 10;
            if (ev.desc && ev.desc.toLowerCase().includes(q)) score += 5;

            // Boost important events
            if (score > 0) score += (4 - ev.imp) * 2;

            return score;
        }

        function handleSearchResultClick(e) {
            const result = e.target.closest('.search-result');
            if (!result) return;

            const type = result.dataset.type;
            const id = result.dataset.id;
            closeSearch();

            if (type === 'event') {
                const ev = events.find(e => e.id == id);
                if (ev) {
                    highlightedEventId = ev.id;
                    goToTime(ev.time);
                    setTimeout(() => showPanel(ev, 'event'), 700);
                }
            } else {
                const ep = epochs.find(e => e.id == id);
                if (ep) {
                    const midTime = (ep.start + Math.min(ep.end, MAX_TIME)) / 2;
                    goToTime(midTime);
                    setTimeout(() => showPanel(ep, 'epoch'), 700);
                }
            }
        }

