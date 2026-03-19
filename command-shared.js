const AGENTS = {
    'quinn': {
        callsign: 'FLIGHT', name: 'Quinn', icon: '🔮',
        role: 'Flight Director', row: 'back', director: true,
        tagClass: 'tag-quinn', feedTag: 'Quinn',
        desc: 'Opus model. Primary orchestrator and flight director. All strategic and creative decisions flow through FLIGHT. Manages agent fleet, maintains full context with Adam.'
    },
    'forge': {
        callsign: 'FORGE', name: 'Forge', icon: '⚒️',
        role: 'Builder', row: 'front', director: false,
        tagClass: 'tag-forge', feedTag: 'Forge',
        desc: 'Sonnet model. Developer and builder. Takes designs and specs, turns them into working code. First agent to join the team.'
    },
    'standby-1': {
        callsign: 'STANDBY', name: 'Scout', icon: '🔍',
        role: 'Research', row: 'front', director: false,
        empty: true,
        tagClass: 'tag-scout', feedTag: 'Scout',
        desc: 'Future agent station. Reserved for Scout — research and analysis specialist.'
    },
    'standby-2': {
        callsign: 'STANDBY', name: 'Reserve', icon: '◌',
        role: 'Unassigned', row: 'front', director: false,
        empty: true,
        tagClass: 'tag-sys', feedTag: 'SYS',
        desc: 'Future agent station. Awaiting assignment.'
    }
};

let data = {};
let selected = null;
let activityFeed = [];

// Clock
function tick() {
    const n = new Date();
    document.getElementById('clock').textContent = n.toLocaleTimeString('en-AU', {hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false});
}
setInterval(tick, 1000); tick();

// Load data
async function loadData() {
    try {
        const dataPath = window.location.pathname.includes('/mission-control-themes/') 
            ? '../data/' 
            : 'data/';
        
        const [agentsRes, activityRes] = await Promise.all([
            fetch(dataPath + 'agents.json'),
            fetch(dataPath + 'agent-activity.json')
        ]);
        
        const agentsData = await agentsRes.json();
        const activityData = await activityRes.json();

        // Map agent data
        agentsData.agents.forEach(ag => {
            const agentConfig = AGENTS[ag.id];
            if (agentConfig) {
                data[ag.id] = { ...agentConfig, ...ag };
            }
        });

        // Add standby seats
        data['standby-1'] = AGENTS['standby-1'];
        data['standby-2'] = AGENTS['standby-2'];

        // Load activity feed
        activityFeed = activityData.events || [];

        // Update screen op status
        const quinnTask = data.quinn?.currentTask || 'Nominal operations';
        const quinnModel = (data.quinn?.model || 'opus').split('/').pop();
        document.getElementById('screenOp').textContent = 
            `OP: ${quinnTask} | ${quinnModel}`;

        renderPills();
        renderDesks();
        renderFeed();
        renderAgentLearnings();
        renderTeamLearnings();
        renderTokenBudget();
        
        if (selected) showDetail(selected);
    } catch (e) { 
        console.error('Load error:', e); 
    }
}

// GO pills
function renderPills() {
    const el = document.getElementById('goPills');
    const activeAgents = Object.entries(data).filter(([id, ag]) => !ag.empty);
    
    el.innerHTML = activeAgents.map(([id, ag]) => {
        const on = ag.status === 'available' || ag.status === 'active' || ag.status === 'running';
        return `<div class="go-pill" onclick="selectSeat('${id}')">
            <span class="dot ${on?'on':'off'}"></span>
            <span class="label">${ag.callsign}</span>
            <span class="val ${on?'go':'stby'}">${on?'GO':'STBY'}</span>
        </div>`;
    }).join('');

    const active = activeAgents.filter(([_,a]) => a.status==='available'||a.status==='active'||a.status==='running').length;
    const badge = document.getElementById('overallBadge');
    badge.textContent = active > 0 ? '▲ GO FOR LAUNCH' : '◼ HOLD';
    badge.className = 'overall-badge ' + (active > 0 ? 'go' : '');
}

// Render desk seats
function renderDesks() {
    const front = Object.entries(data).filter(([_,a]) => a.row === 'front');
    const back = Object.entries(data).filter(([_,a]) => a.row === 'back');

    document.getElementById('frontDesk').innerHTML = front.map(([id,a]) => seatHTML(id,a)).join('');
    document.getElementById('backDesk').innerHTML = back.map(([id,a]) => seatHTML(id,a)).join('');
}

function seatHTML(id, ag) {
    if (ag.empty) {
        return `<div class="seat empty ${ag.director?'director':''}">
            <div class="mini-monitor">
                <div class="monitor-task idle">Awaiting assignment</div>
            </div>
            <div class="seat-agent">
                <div class="agent-avatar">
                    <div class="avatar-face" style="opacity: 0.3">${ag.icon}</div>
                </div>
                <div class="agent-info">
                    <div class="agent-callsign" style="opacity: 0.5">${ag.callsign}</div>
                    <div class="agent-name">${ag.name} · ${ag.role}</div>
                    <div class="agent-go-tag stby">○ STANDBY</div>
                </div>
            </div>
        </div>`;
    }

    const on = ag.status === 'available' || ag.status === 'active' || ag.status === 'running';
    const dir = ag.director ? 'director' : '';
    const sel = selected === id ? 'selected' : '';
    const act = on ? 'active' : '';
    const badge = on ? 'go' : 'stby';
    const task = ag.currentTask || (on ? 'Nominal' : 'Offline');
    const taskCls = on && !ag.currentTask ? 'idle' : '';

    return `<div class="seat ${dir} ${sel} ${act}" onclick="selectSeat('${id}')">
        <div class="mini-monitor">
            <div class="monitor-task ${taskCls}">${task}</div>
        </div>
        <div class="seat-agent">
            <div class="agent-avatar">
                <div class="avatar-face">${ag.icon}</div>
                <div class="status-badge ${badge}"></div>
            </div>
            <div class="agent-info">
                <div class="agent-callsign">${ag.callsign}</div>
                <div class="agent-name">${ag.name} · ${ag.role}</div>
                <div class="agent-go-tag ${on?'go':'stby'}">${on?'● GO':'○ STANDBY'}</div>
            </div>
        </div>
    </div>`;
}

// Selection
function selectSeat(id) {
    if (data[id]?.empty) return;
    if (selected === id) { closeDetail(); return; }
    selected = id;
    renderDesks();
    showDetail(id);
}

function showDetail(id) {
    const ag = data[id];
    if (!ag || ag.empty) return;
    
    const on = ag.status === 'available' || ag.status === 'active' || ag.status === 'running';

    document.getElementById('detailContent').innerHTML = `
        <div class="detail-head">
            <div class="detail-face">${ag.icon}</div>
            <div class="detail-title">
                <h3>${ag.name}</h3>
                <div class="sub">${ag.callsign} — ${ag.role}</div>
            </div>
        </div>
        <p class="detail-desc">${ag.desc}</p>
        <div class="detail-sect">
            <div class="detail-sect-title">Status</div>
            <div class="detail-kv"><span class="k">State</span><span class="v ${on?'green':''}">${(ag.status||'standby').toUpperCase()}</span></div>
            ${ag.model?`<div class="detail-kv"><span class="k">Model</span><span class="v">${ag.model}</span></div>`:''}
            ${ag.currentTask?`<div class="detail-kv"><span class="k">Task</span><span class="v">${ag.currentTask}</span></div>`:''}
            ${ag.lastTask?`<div class="detail-kv"><span class="k">Last Task</span><span class="v">${ag.lastTask}</span></div>`:''}
            ${ag.lastActive?`<div class="detail-kv"><span class="k">Last Active</span><span class="v">${new Date(ag.lastActive).toLocaleString('en-AU',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}</span></div>`:''}
            ${ag.tasksCompleted !== undefined?`<div class="detail-kv"><span class="k">Tasks Done</span><span class="v green">${ag.tasksCompleted}</span></div>`:''}
        </div>
        ${ag.notes?`<div class="detail-sect">
            <div class="detail-sect-title">Notes</div>
            <p style="font-size:0.7rem; color:var(--text-secondary); line-height:1.6">${ag.notes}</p>
        </div>`:''}`;
    
    document.getElementById('detailPanel').classList.add('open');
}

function closeDetail() {
    selected = null;
    document.getElementById('detailPanel').classList.remove('open');
    renderDesks();
}

// Activity Feed
function renderFeed() {
    const el = document.getElementById('screenFeed');
    if (!activityFeed || activityFeed.length === 0) {
        el.innerHTML = '<div class="feed-row"><span class="time">--:--</span><span class="agent-tag tag-sys">SYS</span><span class="msg" style="color: var(--text-dim);">No activity recorded</span></div>';
        return;
    }

    const recent = activityFeed.slice(0, 30);
    el.innerHTML = recent.map(evt => {
        const t = new Date(evt.timestamp);
        const time = t.toLocaleTimeString('en-AU', {hour:'2-digit', minute:'2-digit', hour12:false});
        const agentConfig = Object.values(AGENTS).find(a => a.feedTag === evt.agent) || AGENTS['quinn'];
        
        return `<div class="feed-row">
            <span class="time">${time}</span>
            <span class="agent-tag ${agentConfig.tagClass}">${evt.agent}</span>
            <span class="msg">${evt.headline}</span>
        </div>`;
    }).join('');
}

// Agent Learnings
function renderAgentLearnings() {
    const el = document.getElementById('agentLearnings');
    const learnings = [];
    
    Object.values(data).forEach(ag => {
        if (ag.learnings && ag.learnings.length > 0) {
            ag.learnings.forEach(l => {
                learnings.push({ ...l, agent: ag.name, emoji: ag.icon });
            });
        }
    });

    if (learnings.length === 0) {
        el.innerHTML = '<div class="empty-state">No learnings recorded yet</div>';
        return;
    }

    el.innerHTML = learnings.map(l => `
        <div class="learning-entry">
            <div class="learning-title">${l.title || l.lesson}</div>
            ${l.description ? `<div class="learning-body">${l.description}</div>` : ''}
            <div class="learning-meta">${l.emoji} ${l.agent}</div>
        </div>
    `).join('');
}

// Team Learnings (from TEAM-LEARNING.md parsed as JSON)
async function renderTeamLearnings() {
    const el = document.getElementById('teamLearnings');
    
    const teamLearnings = [
        {
            category: '🔴 Critical',
            title: 'NAS Backup Mount Goes Stale',
            body: 'SMB mount gets stale handles. Fix: sudo umount -l /mnt/nas-backup then remount.'
        },
        {
            category: '🔴 Critical',
            title: 'Never Hardcode IPs in Frontend',
            body: 'LAN IPs break on Tailscale/external networks. Use window.location.hostname or relative paths.'
        },
        {
            category: '🟡 Design',
            title: 'CSS object-position: top',
            body: 'Portrait photos crop badly at center. Default to top for photo grids.'
        },
        {
            category: '🟢 Token',
            title: 'Heartbeats NEVER Use Opus',
            body: 'Routine checks use Sonnet at 1/15th the cost. Opus is for conversation and complex reasoning only.'
        }
    ];

    el.innerHTML = teamLearnings.map(l => `
        <div class="learning-entry">
            <div class="learning-meta">${l.category}</div>
            <div class="learning-title">${l.title}</div>
            <div class="learning-body">${l.body}</div>
        </div>
    `).join('');
}

// Token Budget
function renderTokenBudget() {
    const el = document.getElementById('tokenBudget');
    
    const budget = {
        anthropic: {
            plan: '$300/mo',
            weeklyReset: 'Friday 11:00 AEDT'
        },
        codex: {
            plan: 'ChatGPT Plus ($30/mo)',
            budget: '~96% remaining'
        }
    };

    el.innerHTML = `
        <div class="budget-item">
            <div class="budget-label">Anthropic (Opus + Sonnet)</div>
            <div class="budget-value">${budget.anthropic.plan}</div>
            <div class="budget-meta">Weekly reset: ${budget.anthropic.weeklyReset}</div>
        </div>
        <div class="budget-item">
            <div class="budget-label">Codex (Codex + Spark)</div>
            <div class="budget-value">${budget.codex.budget}</div>
            <div class="budget-meta">${budget.codex.plan}</div>
        </div>
    `;
}

// Task Queues — parse TASK-QUEUE.md live
async function renderTaskQueues() {
    const el = document.getElementById('taskQueues');
    const priorityColors = {
        high: 'var(--red)',
        medium: 'var(--amber)',
        low: 'var(--text-dim)'
    };
    const statusColors = {
        pending: { bg: 'var(--amber)', color: '#000', label: 'PENDING' },
        'in-progress': { bg: 'var(--blue)', color: '#fff', label: 'ACTIVE' },
        done: { bg: 'var(--green-dim)', color: 'var(--green)', label: 'DONE' }
    };

    // Parse tasks from markdown
    function parseTasks(md) {
        const tasks = [];
        const taskBlocks = md.split(/^### /m).filter(b => b.trim().startsWith('TASK-'));
        taskBlocks.forEach(block => {
            const lines = block.split('\n');
            const titleMatch = lines[0].match(/TASK-(\d+):\s*(.+)/);
            if (!titleMatch) return;
            const id = titleMatch[1];
            const title = titleMatch[2].trim();
            const fromMatch = block.match(/\*\*From:\*\*\s*(.+)/);
            const priorityMatch = block.match(/\*\*Priority:\*\*\s*(.+)/);
            const statusMatch = block.match(/\*\*Status:\*\*\s*(\S+)/);
            tasks.push({
                id, title,
                from: fromMatch ? fromMatch[1].trim() : '?',
                priority: priorityMatch ? priorityMatch[1].trim() : 'medium',
                status: statusMatch ? statusMatch[1].trim() : 'pending'
            });
        });
        return tasks;
    }

    let forgeTasks = [];
    try {
        const basePath = window.location.pathname.includes('/mission-control-themes/') ? '../' : '';
        const res = await fetch(`${basePath}http://${window.location.hostname}:8081/api/file?path=agents/builder/TASK-QUEUE.md&t=${Date.now()}`);
        if (res.ok) {
            const md = await res.text();
            forgeTasks = parseTasks(md);
        }
    } catch(e) {
        // Fallback: try direct fetch
        try {
            const res = await fetch(`/api/file?path=agents/builder/TASK-QUEUE.md&t=${Date.now()}`);
            if (res.ok) forgeTasks = parseTasks(await res.text());
        } catch(e2) {}
    }

    const pending = forgeTasks.filter(t => t.status === 'pending');
    const inProgress = forgeTasks.filter(t => t.status === 'in-progress');
    const done = forgeTasks.filter(t => t.status === 'done');

    let html = '';

    // Quinn — orchestrator
    html += `
        <div style="margin-bottom: 1rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border);">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
                <span style="font-size: 0.9rem;">🔮</span>
                <span style="font-weight: 500; color: var(--cyan);">Quinn</span>
                <span style="margin-left: auto; font-size: 0.65rem; color: var(--text-dim); text-transform: uppercase; letter-spacing: 0.05em;">Orchestrator</span>
            </div>
            <div style="font-size: 0.7rem; color: var(--text-secondary); margin-left: 1.4rem;">Assigns & reviews — no task queue</div>
        </div>
    `;

    // Forge
    html += `
        <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;">
                <span style="font-size: 0.9rem;">⚒️</span>
                <span style="font-weight: 500; color: var(--green);">Forge</span>
                <div style="display: flex; gap: 0.4rem; margin-left: auto; font-size: 0.65rem;">
                    ${pending.length > 0 ? `<span style="background: var(--amber); color: #000; padding: 0.1rem 0.4rem; border-radius: 3px;">${pending.length} pending</span>` : ''}
                    ${inProgress.length > 0 ? `<span style="background: var(--blue); color: #fff; padding: 0.1rem 0.4rem; border-radius: 3px;">${inProgress.length} active</span>` : ''}
                    ${done.length > 0 ? `<span style="background: var(--green-dim); color: var(--green); padding: 0.1rem 0.4rem; border-radius: 3px;">${done.length} done</span>` : ''}
                    ${pending.length === 0 && inProgress.length === 0 ? '<span style="color: var(--green);">✓ Queue clear</span>' : ''}
                </div>
            </div>
    `;

    // In-progress first, then pending
    [...inProgress, ...pending].forEach(task => {
        const isActive = task.status === 'in-progress';
        const pColor = priorityColors[task.priority] || 'var(--text-dim)';
        html += `
            <div style="margin: 0.4rem 0 0 1.4rem; padding: 0.5rem 0.6rem; background: ${isActive ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.02)'}; border-left: 2px solid ${isActive ? 'var(--blue)' : pColor}; border-radius: 2px;">
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span style="font-size: 0.6rem; font-weight: 700; padding: 0.1rem 0.3rem; border-radius: 2px; background: ${(statusColors[task.status]||statusColors.pending).bg}; color: ${(statusColors[task.status]||statusColors.pending).color};">${(statusColors[task.status]||statusColors.pending).label}</span>
                    <span style="font-size: 0.7rem; font-weight: 600; color: ${pColor}; text-transform: uppercase;">TASK-${task.id}</span>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-primary); line-height: 1.4; margin-top: 0.25rem;">${task.title}</div>
                <div style="font-size: 0.6rem; color: var(--text-dim); margin-top: 0.2rem;">
                    <span style="color: ${pColor}; text-transform: uppercase;">${task.priority}</span>
                    <span style="margin: 0 0.3rem;">•</span>
                    From ${task.from}
                </div>
            </div>
        `;
    });

    // Completed tasks — collapsed summary
    if (done.length > 0) {
        html += `
            <div style="margin: 0.75rem 0 0 1.4rem; font-size: 0.65rem; color: var(--text-dim);">
                ✓ Completed: ${done.map(t => `TASK-${t.id}`).join(', ')}
            </div>
        `;
    }

    html += '</div>';
    el.innerHTML = html;
}

// Activity Panel — recent events in panel form
function renderActivityPanel() {
    const el = document.getElementById('activityPanel');
    if (!activityFeed || activityFeed.length === 0) {
        el.innerHTML = '<div class="empty-state">No activity recorded</div>';
        return;
    }

    const recent = activityFeed.slice(-15).reverse();
    el.innerHTML = recent.map(evt => {
        const t = new Date(evt.timestamp);
        const time = t.toLocaleString('en-AU', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false});
        const agentConfig = Object.values(AGENTS).find(a => a.feedTag === evt.agent) || AGENTS['quinn'];
        return `
            <div style="display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.4rem 0.3rem; border-bottom: 1px solid var(--border); font-size: 0.7rem;">
                <span style="flex-shrink: 0;">${agentConfig.icon}</span>
                <div style="flex: 1; min-width: 0;">
                    <div style="color: var(--text-primary); line-height: 1.3;">${evt.headline}</div>
                    <div style="color: var(--text-dim); font-size: 0.6rem; margin-top: 0.15rem;">${time} • ${evt.category || ''}</div>
                </div>
            </div>
        `;
    }).join('');
}

// Init
async function init() {
    await loadData();
    renderTaskQueues();
    renderActivityPanel();
    setInterval(async () => { await loadData(); renderActivityPanel(); }, 15000);
    setInterval(renderTaskQueues, 30000);
}
init();
