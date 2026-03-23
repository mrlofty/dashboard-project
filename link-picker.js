(function () {
    const FILE_SPECS = [
        { type: 'goal', url: 'data/goals.json', listKey: 'goals', label: 'Goal', page: 'goals.html' },
        { type: 'inbox', url: 'data/inbox.json', listKey: null, label: 'Inbox', page: 'inbox.html' },
        { type: 'topic', url: 'data/topics.json', listKey: 'topics', label: 'Topic', page: 'topics.html' },
        { type: 'task', url: 'data/workboard.json', listKey: 'tasks', label: 'Task', page: 'workboard.html' },
        { type: 'research', url: 'data/research.json', listKey: 'threads', label: 'Research', page: 'research.html' }
    ];

    const TYPE_STYLES = {
        goal: { label: 'Goal', className: 'goal', icon: '🎯', page: 'goals.html' },
        inbox: { label: 'Inbox', className: 'inbox', icon: '✉️', page: 'inbox.html' },
        topic: { label: 'Topic', className: 'topic', icon: '🔍', page: 'topics.html' },
        task: { label: 'Task', className: 'task', icon: '🧩', page: 'workboard.html' },
        research: { label: 'Research', className: 'research', icon: '📚', page: 'research.html' }
    };

    let cache = null;
    let modalState = null;

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getTypeFromId(itemId) {
        const match = String(itemId || '').match(/^([a-z]+):/);
        return match ? match[1] : null;
    }

    function stripType(itemId) {
        return String(itemId || '').replace(/^[a-z]+:/, '');
    }

    function ensureTypedId(itemId, fallbackType) {
        if (!itemId) return '';
        if (String(itemId).includes(':')) return String(itemId);
        return fallbackType ? `${fallbackType}:${itemId}` : String(itemId);
    }

    function normalizeLinkedItems(list) {
        return Array.isArray(list) ? list.filter(Boolean) : [];
    }

    function inferTitle(item) {
        return item.title || item.name || item.label || item.work || stripType(item.id);
    }

    function inferSearchText(item) {
        const fields = [
            item.title,
            item.name,
            item.label,
            item.summary,
            item.overview,
            item.description,
            item.body,
            Array.isArray(item.tags) ? item.tags.join(' ') : '',
            item.status,
            item.category
        ];
        return fields.filter(Boolean).join(' ').toLowerCase();
    }

    function normalizeItem(raw, type) {
        const id = ensureTypedId(raw.id, type);
        const normalizedType = getTypeFromId(id) || type;
        return {
            ...raw,
            id,
            type: normalizedType,
            title: inferTitle(raw),
            linkedItems: normalizeLinkedItems(raw.linkedItems),
            searchText: inferSearchText(raw)
        };
    }

    async function fetchSpec(spec) {
        try {
            const response = await fetch(`${spec.url}?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const payload = await response.json();
            const rows = spec.listKey ? (payload[spec.listKey] || []) : payload;
            if (!Array.isArray(rows)) return [];
            return rows.map(item => normalizeItem(item, spec.type));
        } catch (error) {
            console.warn(`LinkedItems: failed to load ${spec.url}`, error);
            return [];
        }
    }

    async function loadAllLinkableItems(force = false) {
        if (cache && !force) return cache;
        const lists = await Promise.all(FILE_SPECS.map(fetchSpec));
        const items = lists.flat();
        const byId = Object.fromEntries(items.map(item => [item.id, item]));
        cache = {
            items,
            byId,
            byType: items.reduce((acc, item) => {
                (acc[item.type] ||= []).push(item);
                return acc;
            }, {})
        };
        return cache;
    }

    function invalidateCache() {
        cache = null;
    }

    function findReverseLinks(targetId, allItems) {
        return allItems.filter(item => normalizeLinkedItems(item.linkedItems).includes(targetId));
    }

    function getTypeMeta(type) {
        return TYPE_STYLES[type] || { label: type || 'Item', className: '', icon: '•', page: 'index.html' };
    }

    function navigateToItem(itemId) {
        const typedId = ensureTypedId(itemId);
        const type = getTypeFromId(typedId);
        const page = getTypeMeta(type).page || 'index.html';
        window.location.href = `/${page}#${encodeURIComponent(stripType(typedId))}`;
    }

    function renderTypeBadge(type) {
        const meta = getTypeMeta(type);
        return `<span class="link-type-badge ${meta.className}">${escapeHtml(meta.label)}</span>`;
    }

    function renderLinkChip(item, options = {}) {
        const meta = getTypeMeta(item.type);
        const removable = options.removable ? ` <button type="button" class="link-chip-remove" data-remove-id="${escapeHtml(item.id)}" aria-label="Remove link">×</button>` : '';
        const icon = options.showIcon === false ? '' : `<span class="link-chip-icon">${escapeHtml(meta.icon)}</span>`;
        return `
            <span class="link-chip ${meta.className}" data-id="${escapeHtml(item.id)}">
                <button type="button" class="link-chip-button" data-nav-id="${escapeHtml(item.id)}">
                    ${icon}
                    <span class="link-chip-text">${escapeHtml(item.title)}</span>
                </button>${removable}
            </span>
        `;
    }

    function renderLinkedItems(ids, byId, options = {}) {
        const items = normalizeLinkedItems(ids)
            .map(id => byId[id])
            .filter(Boolean);
        if (!items.length) {
            return `<div class="linked-items-empty">${escapeHtml(options.emptyText || 'No linked items yet.')}</div>`;
        }
        return `<div class="linked-items">${items.map(item => renderLinkChip(item, options)).join('')}</div>`;
    }

    function renderReverseLinks(targetId, allItems) {
        const reverse = findReverseLinks(targetId, allItems);
        if (!reverse.length) {
            return '<div class="reverse-links">Nothing links here yet.</div>';
        }
        return `
            <div class="reverse-links">
                <div class="linked-section-meta">Linked from ${reverse.length} item${reverse.length === 1 ? '' : 's'}</div>
                <div class="linked-items">
                    ${reverse.map(item => renderLinkChip(item)).join('')}
                </div>
            </div>
        `;
    }

    function ensureModal() {
        let overlay = document.getElementById('link-picker-overlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'link-picker-overlay';
        overlay.className = 'link-picker-overlay';
        overlay.innerHTML = `
            <div class="link-picker-modal" role="dialog" aria-modal="true" aria-labelledby="link-picker-title">
                <div class="link-picker-header">
                    <div>
                        <div class="link-picker-eyebrow">Cross-file linking</div>
                        <h2 id="link-picker-title">Link an item</h2>
                    </div>
                    <button type="button" class="link-picker-close" aria-label="Close">×</button>
                </div>
                <div class="link-picker-toolbar">
                    <input type="search" id="link-picker-search" class="link-picker-search" placeholder="Search goals, inbox items, topics...">
                    <div class="link-picker-filters">
                        <button type="button" class="link-picker-filter active" data-filter="all">All</button>
                        <button type="button" class="link-picker-filter" data-filter="goal">Goals</button>
                        <button type="button" class="link-picker-filter" data-filter="inbox">Inbox</button>
                        <button type="button" class="link-picker-filter" data-filter="topic">Topics</button>
                    </div>
                </div>
                <div id="link-picker-results" class="link-picker-results"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.addEventListener('click', event => {
            if (event.target === overlay || event.target.closest('.link-picker-close')) {
                closePicker();
            }
        });

        overlay.querySelector('#link-picker-search').addEventListener('input', renderPickerResults);
        overlay.querySelectorAll('.link-picker-filter').forEach(button => {
            button.addEventListener('click', () => {
                overlay.querySelectorAll('.link-picker-filter').forEach(node => node.classList.remove('active'));
                button.classList.add('active');
                modalState.filter = button.dataset.filter;
                renderPickerResults();
            });
        });

        return overlay;
    }

    function renderPickerResults() {
        if (!modalState) return;
        const overlay = document.getElementById('link-picker-overlay');
        if (!overlay) return;

        const query = overlay.querySelector('#link-picker-search').value.trim().toLowerCase();
        const results = overlay.querySelector('#link-picker-results');
        const filter = modalState.filter || 'all';

        const visible = modalState.items
            .filter(item => item.id !== modalState.currentId)
            .filter(item => !modalState.selectedIds.has(item.id))
            .filter(item => filter === 'all' || item.type === filter)
            .filter(item => !query || item.searchText.includes(query));

        if (!visible.length) {
            results.innerHTML = '<div class="link-picker-empty">No matching items.</div>';
            return;
        }

        results.innerHTML = visible.map(item => `
            <button type="button" class="link-picker-item" data-pick-id="${escapeHtml(item.id)}">
                <div class="link-picker-item-copy">
                    <div class="link-picker-item-title">${escapeHtml(item.title)}</div>
                    <div class="link-picker-item-meta">${renderTypeBadge(item.type)} <span>${escapeHtml(stripType(item.id))}</span></div>
                </div>
            </button>
        `).join('');

        results.querySelectorAll('[data-pick-id]').forEach(button => {
            button.addEventListener('click', () => {
                const item = modalState.byId[button.dataset.pickId];
                if (!item) return;
                modalState.onPick(item);
                closePicker();
            });
        });
    }

    async function openPicker(options) {
        const dataset = await loadAllLinkableItems(options.forceRefresh);
        const overlay = ensureModal();
        modalState = {
            currentId: ensureTypedId(options.currentId, options.currentType),
            items: dataset.items,
            byId: dataset.byId,
            selectedIds: new Set(normalizeLinkedItems(options.selectedIds)),
            filter: options.initialFilter || 'all',
            onPick: options.onPick
        };

        overlay.classList.add('active');
        overlay.querySelector('#link-picker-search').value = '';
        overlay.querySelectorAll('.link-picker-filter').forEach(node => {
            node.classList.toggle('active', node.dataset.filter === modalState.filter);
        });
        renderPickerResults();
        overlay.querySelector('#link-picker-search').focus();
    }

    function closePicker() {
        const overlay = document.getElementById('link-picker-overlay');
        if (overlay) overlay.classList.remove('active');
        modalState = null;
    }

    window.LinkedItems = {
        FILE_SPECS,
        TYPE_STYLES,
        escapeHtml,
        ensureTypedId,
        getTypeFromId,
        stripType,
        normalizeLinkedItems,
        loadAllLinkableItems,
        invalidateCache,
        findReverseLinks,
        navigateToItem,
        renderLinkedItems,
        renderReverseLinks,
        renderTypeBadge,
        openPicker,
        closePicker
    };

    document.addEventListener('click', event => {
        const navButton = event.target.closest('[data-nav-id]');
        if (navButton) {
            navigateToItem(navButton.dataset.navId);
        }
    });
})();
