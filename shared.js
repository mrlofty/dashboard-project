// Shared dashboard layout, sidebar, and status widgets

(() => {
    const STORAGE_KEYS = {
        sidebarCollapsed: 'qa.sidebar.collapsed',
        sections: 'qa.sidebar.sections'
    };

    const stateConfig = {
        available: { color: 'status-available', label: 'Available' },
        thinking: { color: 'status-thinking', label: 'Thinking' },
        creating: { color: 'status-creating', label: 'Creating' },
        learning: { color: 'status-learning', label: 'Learning' },
        frustrated: { color: 'status-frustrated', label: 'Frustrated' },
        partnership: { color: 'status-partnership', label: 'Partnership' }
    };

    const sectionConfig = [
        {
            id: 'dashboard',
            icon: '📊',
            label: 'Dashboard',
            links: [
                { id: 'index', label: 'Home', href: 'index.html', icon: '🏠' }
            ]
        },
        {
            id: 'command-centre',
            icon: '🛰️',
            label: 'Command Centre',
            links: [
                { id: 'command', label: 'Command Centre', href: 'command.html', icon: '🛰️' },
                { id: 'playbook', label: 'Playbook', href: 'playbook.html', icon: '📖' },
                { id: 'models', label: 'AI Models', href: 'models.html', icon: '🤖' },
                { id: 'task-analytics', label: 'Task Analytics', href: 'task-analytics.html', icon: '📈' },
                { id: 'command-cyberpunk', label: 'Cyberpunk', href: 'command-cyberpunk.html', icon: '🌆' },
                { id: 'command-clean', label: 'Clean', href: 'command-clean.html', icon: '✨' },
                { id: 'command-synthwave', label: 'Synthwave', href: 'command-synthwave.html', icon: '🌅' }
            ]
        },
        {
            id: 'quinn',
            icon: '🔮',
            label: 'Quinn',
            links: [
                { id: 'quinn', label: 'Quinn', href: 'quinn.html', icon: '🔮' },
                { id: 'memory', label: 'Memory', href: 'memory.html', icon: '🧠' },
                { id: 'inbox', label: 'Inbox', href: 'inbox.html', icon: '📥' },
                { id: 'editor', label: 'Editor', href: 'editor.html', icon: '📝' }
            ]
        },
        {
            id: 'forge',
            icon: '⚒️',
            label: 'Forge',
            links: [
                { id: 'forge', label: 'Workshop', href: 'forge.html', icon: '🔨' }
            ]
        },
        {
            id: 'projects',
            icon: '📋',
            label: 'Projects',
            links: [
                { id: 'goals', label: 'Goals / Kanban', href: 'goals.html', icon: '🎯' },
                { id: 'workgraph', label: 'Work Graph', href: 'workgraph.html', icon: '🌳' },
                { id: 'shoots', label: 'Shoots Pipeline', href: 'shoots.html', icon: '🎬' }
            ]
        },
        {
            id: 'deployments',
            icon: '🚀',
            label: 'Deployments',
            links: [
                { id: 'deployments', label: 'Sites & Services', href: 'deployments.html', icon: '🌐' }
            ]
        },
        {
            id: 'portfolio',
            icon: '📈',
            label: 'Portfolio',
            links: [
                { id: 'watchlist', label: 'Watchlist', href: 'watchlist.html', icon: '💹' },
                { id: 'portfolio', label: 'Portfolio', href: 'portfolio.html', icon: '📊' }
            ]
        },
        {
            id: 'trading',
            icon: '⚡',
            label: 'Trading',
            links: [
                { id: 'trading', label: 'Paper Trading', href: 'trading.html', icon: '📊' }
            ]
        },
        {
            id: 'music',
            icon: '🎧',
            label: 'Music',
            links: [
                { id: 'dj', label: 'DJ Quinn', href: 'dj.html', icon: '🎧' }
            ]
        },
        {
            id: 'photography',
            icon: '📷',
            label: 'Photography',
            links: [
                { id: 'shoots', label: 'Shoots', href: 'shoots.html', icon: '📸' },
                { id: 'locations', label: 'Locations', href: 'locations.html', icon: '📍' }
            ]
        },
        {
            id: 'knowledge',
            icon: '🧠',
            label: 'Knowledge',
            links: [
                { id: 'topics', label: 'Topics', href: 'topics.html', icon: '🗂️' },
                { id: 'knowledge-web', label: 'Knowledge Web', href: 'knowledge-web.html', icon: '🕸️' },
                { id: 'research-threads', label: 'Research Threads', href: 'research.html', icon: '🧵' }
            ]
        },
        {
            id: 'people',
            icon: '👥',
            label: 'People',
            links: [
                { id: 'crm', label: 'CRM', href: 'crm.html', icon: '🤝' }
            ]
        },
        {
            id: 'analytics',
            icon: '📈',
            label: 'Analytics',
            links: [
                { id: 'analytics', label: 'Site Analytics', href: 'analytics.html', icon: '📊' }
            ]
        },
        {
            id: 'system',
            icon: '⚙️',
            label: 'System',
            links: [
                { id: 'playbook', label: 'Playbook', href: 'playbook.html', icon: '📖' },
                { id: 'schedule', label: 'Schedule', href: 'schedule.html', icon: '🗓️' },
                { id: 'system', label: 'System Health', href: 'system.html', icon: '🩺' },
                { id: 'agents', label: 'Agents', href: 'agents.html', icon: '🤖' },
                { id: 'about', label: 'About', href: 'about.html', icon: 'ℹ️' }
            ]
        }
    ];

    const agentEmoji = {
        quinn: '🔮',
        forge: '🔨',
        cron: '⏱️'
    };

    function addFavicon() {
        const existing = document.querySelector('link[data-shared-favicon]');
        if (existing) return;

        const favicon = document.createElement('link');
        favicon.rel = 'icon';
        favicon.dataset.sharedFavicon = '1';
        favicon.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔮</text></svg>';
        document.head.appendChild(favicon);
    }

    function getCurrentPageId() {
        const file = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
        const clean = file.replace(/\.html$/, '');

        if (!clean || clean === 'index') return 'index';
        if (clean === 'notes') return 'inbox';
        return clean;
    }

    function getSectionForPage(pageId) {
        for (const section of sectionConfig) {
            if (section.links.some((link) => link.id === pageId)) {
                return section.id;
            }
        }
        return null;
    }

    function readStoredSections() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.sections);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function saveStoredSections(state) {
        localStorage.setItem(STORAGE_KEYS.sections, JSON.stringify(state));
    }

    function setSectionExpanded(sectionEl, expanded) {
        const content = sectionEl.querySelector('.sidebar-section-content');
        const toggle = sectionEl.querySelector('.sidebar-section-toggle');

        sectionEl.classList.toggle('expanded', expanded);
        toggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');

        if (expanded) {
            content.style.maxHeight = `${content.scrollHeight}px`;
        } else {
            content.style.maxHeight = '0px';
        }
    }

    function renderSidebar(pageId) {
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) return;

        const expandedState = readStoredSections();
        const activeSection = getSectionForPage(pageId);
        if (activeSection) {
            expandedState[activeSection] = true;
        }

        const sectionsHtml = sectionConfig.map((section) => {
            const links = section.links.map((link) => {
                const activeClass = link.id === pageId ? 'active' : '';
                return `
                    <a href="${link.href}" class="sidebar-link ${activeClass}" data-page-id="${link.id}" title="${link.label}">
                        <span class="sidebar-link-icon">${link.icon}</span>
                        <span class="sidebar-link-label">${link.label}</span>
                    </a>
                `;
            }).join('');

            return `
                <section class="sidebar-section" data-section-id="${section.id}">
                    <button class="sidebar-section-toggle" type="button" data-section-toggle="${section.id}" aria-expanded="false">
                        <span class="sidebar-section-title-wrap">
                            <span class="sidebar-section-icon">${section.icon}</span>
                            <span class="sidebar-section-title">${section.label}</span>
                        </span>
                        <span class="sidebar-section-chevron">▾</span>
                    </button>
                    <div class="sidebar-section-content">${links}</div>
                </section>
            `;
        }).join('');

        sidebar.innerHTML = `
            <div class="sidebar-top">
                <button id="sidebar-collapse-toggle" class="sidebar-collapse-toggle" type="button" aria-label="Toggle sidebar" title="Toggle sidebar">☰</button>
            </div>
            <div class="sidebar-divider"></div>
            <div class="sidebar-expand-all-wrap">
                <button id="sidebar-expand-all" class="sidebar-expand-all" type="button" title="Expand / Collapse all sections">⊞</button>
            </div>
            <nav class="sidebar-nav">${sectionsHtml}</nav>
        `;

        sidebar.querySelectorAll('.sidebar-section').forEach((sectionEl) => {
            const sectionId = sectionEl.dataset.sectionId;
            const shouldExpand = Boolean(expandedState[sectionId]);
            setSectionExpanded(sectionEl, shouldExpand);
        });

        sidebar.querySelectorAll('[data-section-toggle]').forEach((button) => {
            button.addEventListener('click', () => {
                const sectionEl = button.closest('.sidebar-section');
                const sectionId = sectionEl.dataset.sectionId;
                const nextExpanded = !sectionEl.classList.contains('expanded');

                setSectionExpanded(sectionEl, nextExpanded);
                expandedState[sectionId] = nextExpanded;
                saveStoredSections(expandedState);
            });
        });

        // Expand / Collapse all sections toggle
        const expandAllBtn = document.getElementById('sidebar-expand-all');
        expandAllBtn.addEventListener('click', () => {
            const sections = sidebar.querySelectorAll('.sidebar-section');
            const allExpanded = Array.from(sections).every(s => s.classList.contains('expanded'));
            const nextState = !allExpanded;

            sections.forEach((sectionEl) => {
                const sectionId = sectionEl.dataset.sectionId;
                setSectionExpanded(sectionEl, nextState);
                expandedState[sectionId] = nextState;
            });
            saveStoredSections(expandedState);
            expandAllBtn.textContent = nextState ? '⊟' : '⊞';
            expandAllBtn.title = nextState ? 'Collapse all sections' : 'Expand all sections';
        });

        // Set initial icon based on current state
        const allCurrentlyExpanded = Array.from(sidebar.querySelectorAll('.sidebar-section')).every(s => s.classList.contains('expanded'));
        expandAllBtn.textContent = allCurrentlyExpanded ? '⊟' : '⊞';

        sidebar.querySelectorAll('.sidebar-link').forEach((link) => {
            link.addEventListener('click', () => {
                document.body.classList.remove('sidebar-mobile-open');
            });
        });

        const collapseToggle = document.getElementById('sidebar-collapse-toggle');
        collapseToggle.addEventListener('click', () => {
            const collapsed = !document.body.classList.contains('sidebar-collapsed');
            document.body.classList.toggle('sidebar-collapsed', collapsed);
            localStorage.setItem(STORAGE_KEYS.sidebarCollapsed, collapsed ? '1' : '0');
        });

        const isCollapsed = localStorage.getItem(STORAGE_KEYS.sidebarCollapsed) === '1';
        document.body.classList.toggle('sidebar-collapsed', isCollapsed);
    }

    function renderStatusBar() {
        const statusBar = document.getElementById('status-bar');
        if (!statusBar) return;

        statusBar.className = 'status-bar';
        statusBar.innerHTML = `
            <div class="status-bar-inner">
                <div class="status-bar-left">
                    <button id="mobile-sidebar-toggle" class="mobile-sidebar-toggle" type="button" aria-label="Open sidebar">☰</button>
                    <a href="index.html" class="status-brand">
                        <span class="status-brand-icon">🔮</span>
                        <span class="status-brand-text">Quinn & Adam</span>
                    </a>
                </div>

                <div class="status-bar-center">
                    <div class="status-pill" title="Quinn Status">
                        <span class="status-dot status-available" id="header-status-dot"></span>
                        <span id="header-status-text">Available</span>
                    </div>
                    <div class="status-pill team-focus-pill" id="header-team-focus" title="Team Focus">
                        <select id="header-focus-select" class="focus-select" aria-label="Team Focus">
                            <option value="auto" selected>⚡ Auto</option>
                            <option value="research-sprint">🔬 Research Sprint</option>
                            <option value="hackathon">🔨 Hackathon</option>
                            <option value="war-room">🚨 War Room</option>
                            <option value="all-hands">📢 All Hands</option>
                            <option value="daily-standup">📋 Daily Standup</option>
                            <option value="freestyle">🎯 Freestyle</option>
                            <option value="content-pipeline">📊 Content Pipeline</option>
                            <option value="overnight-operations">🔄 Overnight Ops</option>
                            <option value="moving-day-ops">📦 Moving Day Ops</option>
                        </select>
                    </div>
                    <div class="status-pill activity-pill" id="header-activity" title="Last Activity">🔨 Activity unavailable</div>
                </div>

                <div class="status-bar-right">
                    <div class="context-pill" title="Context Window">
                        <span id="header-context-emoji">🟩</span>
                        <div class="context-bar">
                            <div class="context-fill context-healthy" id="header-context-fill" style="width: 5%;"></div>
                        </div>
                        <span id="header-context-percent">5%</span>
                    </div>
                </div>
            </div>
        `;

        const mobileToggle = document.getElementById('mobile-sidebar-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                document.body.classList.toggle('sidebar-mobile-open');
            });
        }
    }

    function renderFooter() {
        const container = document.getElementById('shared-footer');
        if (!container) return;

        container.innerHTML = `
            <footer class="shared-footer">
                <div class="footer-inner">
                    <span class="footer-text">Quinn & Adam • 2026 💜</span>
                    <div class="footer-links">
                        <a href="schedule.html">Schedule</a>
                        <a href="about.html">About</a>
                        <a href="https://quinn.adamdunstan.com" target="_blank" rel="noopener">Quinn's Blog</a>
                        <a href="https://shoots.adamdunstan.com" target="_blank" rel="noopener">Shoots</a>
                        <a href="https://immaculatevibes.art" target="_blank" rel="noopener">Immaculate Vibes</a>
                    </div>
                </div>
            </footer>
        `;
    }

    function updateHeaderContext(percent) {
        const safePercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0;
        const emoji = document.getElementById('header-context-emoji');
        const fill = document.getElementById('header-context-fill');
        const percentText = document.getElementById('header-context-percent');

        if (!emoji || !fill || !percentText) return;

        percentText.textContent = `${safePercent}%`;
        fill.style.width = `${safePercent}%`;
        fill.classList.remove('context-healthy', 'context-moderate', 'context-warning', 'context-critical');

        if (safePercent < 50) {
            emoji.textContent = '🟩';
            fill.classList.add('context-healthy');
        } else if (safePercent < 80) {
            emoji.textContent = '🟨';
            fill.classList.add('context-moderate');
        } else if (safePercent < 90) {
            emoji.textContent = '🟧';
            fill.classList.add('context-warning');
        } else {
            emoji.textContent = '🟥';
            fill.classList.add('context-critical');
        }
    }

    function formatRelativeTime(timestamp) {
        const value = Date.parse(timestamp);
        if (Number.isNaN(value)) return 'just now';

        const deltaMs = Date.now() - value;
        const deltaSec = Math.max(1, Math.floor(deltaMs / 1000));

        if (deltaSec < 60) return `${deltaSec}s ago`;
        const mins = Math.floor(deltaSec / 60);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    function truncate(text, maxLen) {
        if (!text) return '';
        if (text.length <= maxLen) return text;
        return `${text.slice(0, maxLen - 1)}…`;
    }

    async function loadHeaderStatus() {
        try {
            const response = await fetch(`data/status.json?t=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) return;

            const data = await response.json();
            if (data.state && stateConfig[data.state]) {
                const config = stateConfig[data.state];
                const dot = document.getElementById('header-status-dot');
                const text = document.getElementById('header-status-text');
                if (dot) dot.className = `status-dot ${config.color}`;
                if (text) text.textContent = config.label;
            }

            if (typeof data.context === 'number') {
                updateHeaderContext(data.context);
            }
        } catch (error) {
            console.log('Status data not available');
        }
    }

    async function loadLastActivity() {
        const node = document.getElementById('header-activity');
        if (!node) return;

        try {
            const response = await fetch(`data/agent-activity.json?t=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) return;

            const data = await response.json();
            const events = Array.isArray(data) ? data : (Array.isArray(data.events) ? data.events : []);
            if (!events.length) {
                node.textContent = '🔨 No recent activity';
                return;
            }

            const latest = events
                .filter((evt) => evt && evt.timestamp)
                .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))[0];

            if (!latest) {
                node.textContent = '🔨 No recent activity';
                return;
            }

            const agentName = latest.agent || 'Agent';
            const agentKey = String(agentName).toLowerCase();
            const icon = agentEmoji[agentKey] || '⚙️';
            const relative = formatRelativeTime(latest.timestamp);
            const headline = truncate(latest.headline || 'Updated dashboard', 40);
            const text = `${icon} ${agentName}: ${headline} (${relative})`;

            node.textContent = text;
            node.title = `${latest.headline || ''} • ${new Date(latest.timestamp).toLocaleString()}`;
        } catch (error) {
            node.textContent = '🔨 Activity unavailable';
        }
    }

    const focusPatterns = {
        'auto': { icon: '⚡', name: 'Auto' },
        'research-sprint': { icon: '🔬', name: 'Research Sprint' },
        'hackathon': { icon: '🔨', name: 'Hackathon' },
        'war-room': { icon: '🚨', name: 'War Room' },
        'all-hands': { icon: '📢', name: 'All Hands' },
        'daily-standup': { icon: '📋', name: 'Daily Standup' },
        'freestyle': { icon: '🎯', name: 'Freestyle' },
        'content-pipeline': { icon: '📊', name: 'Content Pipeline' },
        'overnight-operations': { icon: '🔄', name: 'Overnight Ops' },
        'moving-day-ops': { icon: '📦', name: 'Moving Day Ops' }
    };

    async function loadTeamFocus() {
        const select = document.getElementById('header-focus-select');
        if (!select) return;

        try {
            const response = await fetch(`data/team-focus.json?t=${Date.now()}`, { cache: 'no-store' });
            if (!response.ok) return;

            const data = await response.json();
            if (data.activePatternId && focusPatterns[data.activePatternId]) {
                select.value = data.activePatternId;
            }
        } catch (error) {
            console.log('Team focus data not available');
        }
    }

    function bindTeamFocusSelect() {
        const select = document.getElementById('header-focus-select');
        if (!select) return;

        select.addEventListener('change', async () => {
            const patternId = select.value;
            const pattern = focusPatterns[patternId];
            if (!pattern) return;

            // Save to team-focus.json via API
            try {
                await fetch('api/team-focus', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        activePatternId: patternId,
                        activePatternName: pattern.name,
                        activePatternIcon: pattern.icon,
                        source: 'nav-select',
                        updated: new Date().toISOString()
                    })
                });
            } catch (error) {
                // Fallback: write to localStorage for playbook page sync
                console.log('API save failed, using localStorage fallback');
            }

            // Sync with playbook page localStorage
            try {
                localStorage.setItem('qa.activePatternOverride', patternId);
            } catch (error) {
                // ignore
            }
        });
    }

    function setupMobileHandlers() {
        const backdrop = document.getElementById('sidebar-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => {
                document.body.classList.remove('sidebar-mobile-open');
            });
        }

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                document.body.classList.remove('sidebar-mobile-open');
            }
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                document.body.classList.remove('sidebar-mobile-open');
            }
        });
    }

    function buildAppLayout() {
        const headerAnchor = document.getElementById('shared-header');
        if (!headerAnchor) return false;

        const body = document.body;
        const footer = document.getElementById('shared-footer');

        const statusBar = document.createElement('div');
        statusBar.id = 'status-bar';

        const appLayout = document.createElement('div');
        appLayout.className = 'app-layout';
        appLayout.innerHTML = `
            <aside id="sidebar" class="app-sidebar"></aside>
            <main class="page-content"></main>
        `;

        const backdrop = document.createElement('div');
        backdrop.id = 'sidebar-backdrop';
        backdrop.className = 'sidebar-backdrop';

        headerAnchor.replaceWith(statusBar);

        const main = appLayout.querySelector('.page-content');
        const preserve = new Set([statusBar, appLayout, backdrop, footer]);
        const nodesToMove = [];

        for (const child of Array.from(body.children)) {
            if (preserve.has(child)) continue;
            if (child.tagName === 'SCRIPT') continue;
            nodesToMove.push(child);
        }

        nodesToMove.forEach((node) => {
            main.appendChild(node);
        });

        body.insertBefore(backdrop, footer || null);
        body.insertBefore(appLayout, footer || null);

        return true;
    }

    function initShared() {
        addFavicon();

        const enabled = buildAppLayout();
        if (!enabled) {
            renderFooter();
            return;
        }

        const pageId = getCurrentPageId();
        renderStatusBar();
        renderSidebar(pageId);
        renderFooter();
        setupMobileHandlers();
        loadHeaderStatus();
        loadLastActivity();
        loadTeamFocus();
        bindTeamFocusSelect();

        setInterval(loadHeaderStatus, 30000);
        setInterval(loadLastActivity, 45000);
        setInterval(loadTeamFocus, 60000);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShared);
    } else {
        initShared();
    }
})();
