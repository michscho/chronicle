// Chronicle — info panel and category label/color helpers.

        // ============================================
        // INFO PANEL
        // ============================================
        function showPanel(item, type) {
            if (type === 'epoch') {
                document.getElementById('infoTime').textContent = `${formatTime(item.start)} – ${formatTime(Math.min(item.end, MAX_TIME))}`;
                document.getElementById('infoTitle').textContent = item.title;
                document.getElementById('infoSubtitle').textContent = '';
                document.getElementById('infoDescription').textContent = item.desc || '';
                const cat = document.getElementById('infoCategory');
                cat.textContent = 'Epoche';
                cat.style.background = item.color;
            } else {
                document.getElementById('infoTime').innerHTML = formatTime(item.time) +
                    (item.aiGenerated ? '<span class="info-ai-badge">✨ KI</span>' : '');
                document.getElementById('infoTitle').textContent = item.title;
                document.getElementById('infoSubtitle').textContent = item.subtitle || '';
                document.getElementById('infoDescription').textContent = item.desc || '';
                const cat = document.getElementById('infoCategory');
                cat.textContent = catName(item.cat);
                cat.style.background = catColor(item.cat);
            }
            infoPanel.classList.add('visible');
        }

        function hidePanel() {
            infoPanel.classList.remove('visible');
            highlightedEventId = null;
            update();
        }

        function catName(c) {
            return {
                ereignis: 'Ereignis',
                wissenschaft: 'Wissenschaft',
                kultur: 'Kultur',
                politik: 'Politik',
                person: 'Person'
            }[c] || c;
        }

        function catColor(c) {
            return {
                ereignis: '#f43f5e',
                wissenschaft: '#3b82f6',
                kultur: '#f59e0b',
                politik: '#10b981',
                person: '#ec4899'
            }[c] || '#6366f1';
        }

