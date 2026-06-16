// Chronicle — mutable runtime state and cached DOM references.

        // ============================================
        // STATE
        // ============================================
        const MAX_TIME = 2025;
        let centerTime = 1900;
        let zoomIndex = 7;
        let categories = new Set(['epoche', 'ereignis', 'wissenschaft', 'kultur', 'politik', 'person']);
        let isDragging = false;
        let dragStartX = 0;
        let dragStartTime = 0;
        let velocity = 0;
        let lastDragX = 0;
        let lastDragTime = 0;
        let animationFrame = null;
        let highlightedEventId = null;
        let apiKey = localStorage.getItem('openai_api_key') || '';
        let aiGeneratedEvents = JSON.parse(localStorage.getItem('ai_events') || '[]');
        let nextEventId = 1000;

        // Quiz state
        let quizState = {
            active: false,
            questions: [],
            currentQuestion: 0,
            score: 0,
            answered: false
        };

        // ============================================
        // DOM
        // ============================================
        const viewport = document.getElementById('viewport');
        const epochRows = document.getElementById('epochRows');
        const eventsArea = document.getElementById('eventsArea');
        const timeMarkers = document.getElementById('timeMarkers');
        const infoPanel = document.getElementById('infoPanel');
        const loading = document.getElementById('loading');
        const searchContainer = document.getElementById('searchContainer');
        const searchInput = document.getElementById('searchInput');
        const searchResults = document.getElementById('searchResults');
        const toast = document.getElementById('toast');
