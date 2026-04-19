import { useState, useEffect, useRef, useCallback } from "react";

// ─── ユーティリティ ───────────────────────────────────────────
const generateId = () => `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
const today = () => new Date().toISOString().split("T")[0];

const formatDate = (dateStr) => {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return `${m}/${day}`;
};

const getDueSeverity = (task) => {
  if (task.completed) return "done";
  if (!task.endDate) return "none";
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(task.endDate + "T00:00:00");
  const diff = Math.ceil((end - now) / 86400000);
  if (diff < 0) return "overdue";
  if (diff === 0) return "today";
  if (diff <= 2) return "soon";
  return "none";
};

// ─── ローカルストレージ ───────────────────────────────────────
const STORAGE_KEY = "taskapp_v1";
const loadTasks = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
};
const saveTasks = (tasks) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
};

// ─── スタイル ─────────────────────────────────────────────────
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #F2F2F7;
    --surface: #FFFFFF;
    --surface2: #F2F2F7;
    --accent: #007AFF;
    --accent-light: #E3F0FF;
    --red: #FF3B30;
    --green: #34C759;
    --orange: #FF9500;
    --text-primary: #1C1C1E;
    --text-secondary: #6C6C70;
    --text-tertiary: #AEAEB2;
    --separator: rgba(60,60,67,0.12);
    --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
    --shadow-md: 0 4px 16px rgba(0,0,0,0.10), 0 2px 4px rgba(0,0,0,0.06);
    --shadow-lg: 0 12px 40px rgba(0,0,0,0.14);
    --radius-sm: 10px;
    --radius-md: 14px;
    --radius-lg: 20px;
    --font: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
    --spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
    --ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    --safe-bottom: env(safe-area-inset-bottom, 0px);
  }

  html { height: 100%; -webkit-text-size-adjust: 100%; }

  body {
    font-family: var(--font);
    background: var(--bg);
    color: var(--text-primary);
    height: 100%;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: none;
    user-select: none;
  }

  #root { height: 100%; }

  /* ── APP SHELL ── */
  .app {
    display: flex;
    flex-direction: column;
    height: 100svh;
    max-width: 430px;
    margin: 0 auto;
    background: var(--bg);
    position: relative;
  }

  /* ── HEADER ── */
  .header {
    flex-shrink: 0;
    padding: 56px 20px 0;
    background: var(--bg);
    position: relative;
    z-index: 10;
  }

  .header-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .header-title {
    font-size: 32px;
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1;
  }

  .header-count {
    font-size: 14px;
    color: var(--text-secondary);
    font-weight: 400;
    margin-bottom: 3px;
  }

  .filter-bar {
    display: flex;
    gap: 8px;
    padding: 12px 0 0;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .filter-bar::-webkit-scrollbar { display: none; }

  .filter-chip {
    flex-shrink: 0;
    padding: 6px 14px;
    border-radius: 100px;
    font-size: 13px;
    font-weight: 500;
    border: none;
    cursor: pointer;
    transition: all 0.18s var(--ease-out);
    background: var(--surface);
    color: var(--text-secondary);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .filter-chip.active {
    background: var(--text-primary);
    color: #fff;
  }
  .filter-chip:active { transform: scale(0.94); }

  /* ── TASK LIST ── */
  .task-list-wrap {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    padding: 12px 16px 0;
    scrollbar-width: none;
  }
  .task-list-wrap::-webkit-scrollbar { display: none; }

  .task-list {
    display: flex;
    flex-direction: column;
    gap: 0;
    padding-bottom: calc(120px + var(--safe-bottom));
  }

  .section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    padding: 16px 4px 8px;
  }

  /* ── TASK ITEM ── */
  .task-row {
    position: relative;
    overflow: hidden;
    border-radius: var(--radius-md);
    margin-bottom: 2px;
    touch-action: pan-y;
  }

  .task-row.dragging {
    z-index: 100;
    opacity: 0.95;
    box-shadow: var(--shadow-lg);
    border-radius: var(--radius-md);
  }

  .swipe-bg {
    position: absolute;
    inset: 0;
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    padding: 0 24px;
  }
  .swipe-bg-check { background: var(--green); justify-content: flex-start; }
  .swipe-bg-delete { background: var(--red); justify-content: flex-end; }
  .swipe-bg svg { width: 22px; height: 22px; fill: white; opacity: 0; transition: opacity 0.15s; }
  .swipe-bg svg.visible { opacity: 1; }

  .task-card {
    position: relative;
    background: var(--surface);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 14px 14px 16px;
    cursor: pointer;
    transition: transform 0.05s linear, box-shadow 0.2s;
    will-change: transform;
    touch-action: pan-y;
  }
  .task-card:active { box-shadow: var(--shadow-sm); }

  .task-card.completed-card {
    opacity: 0.55;
  }

  /* checkmark */
  .check-btn {
    flex-shrink: 0;
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 2px solid var(--separator);
    background: transparent;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.22s var(--spring);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .check-btn.checked {
    background: var(--green);
    border-color: var(--green);
  }
  .check-btn:active { transform: scale(0.84); }
  .check-icon {
    opacity: 0;
    transform: scale(0.4);
    transition: all 0.2s var(--spring);
  }
  .check-btn.checked .check-icon {
    opacity: 1;
    transform: scale(1);
  }

  .task-body {
    flex: 1;
    min-width: 0;
  }

  .task-title {
    font-size: 15px;
    font-weight: 500;
    line-height: 1.35;
    color: var(--text-primary);
    word-break: break-word;
    transition: all 0.2s;
  }
  .task-title.done-text {
    text-decoration: line-through;
    color: var(--text-tertiary);
  }

  .task-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    flex-wrap: wrap;
  }

  .date-badge {
    font-size: 11.5px;
    font-weight: 500;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 3px;
  }
  .date-badge.overdue { color: var(--red); }
  .date-badge.today-due { color: var(--orange); }
  .date-badge.soon-due { color: var(--accent); }

  .dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-tertiary); }

  .drag-handle {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: grab;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    opacity: 0.3;
  }
  .drag-handle:active { cursor: grabbing; opacity: 0.6; }

  /* ── EMPTY STATE ── */
  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 80px 32px;
    gap: 12px;
    animation: fadeIn 0.3s var(--ease-out);
  }
  .empty-icon { font-size: 56px; filter: grayscale(0.3); }
  .empty-text { font-size: 17px; font-weight: 600; color: var(--text-secondary); }
  .empty-sub { font-size: 14px; color: var(--text-tertiary); text-align: center; }

  /* ── FAB ── */
  .fab-wrap {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 100%;
    max-width: 430px;
    padding: 16px 20px calc(20px + var(--safe-bottom));
    background: linear-gradient(to top, var(--bg) 70%, transparent);
    display: flex;
    justify-content: center;
    z-index: 20;
    pointer-events: none;
  }

  .fab {
    pointer-events: all;
    width: 58px;
    height: 58px;
    border-radius: 50%;
    background: var(--accent);
    color: white;
    border: none;
    font-size: 28px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 4px 20px rgba(0,122,255,0.40), 0 2px 6px rgba(0,122,255,0.2);
    transition: transform 0.2s var(--spring), box-shadow 0.2s;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .fab:active {
    transform: scale(0.88);
    box-shadow: 0 2px 8px rgba(0,122,255,0.3);
  }

  /* ── MODAL ── */
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.35);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 50;
    display: flex;
    align-items: flex-end;
    animation: backdropIn 0.25s var(--ease-out);
  }
  @keyframes backdropIn { from { opacity: 0; } to { opacity: 1; } }
  .modal-backdrop.closing { animation: backdropOut 0.2s var(--ease-out) forwards; }
  @keyframes backdropOut { to { opacity: 0; } }

  .modal-sheet {
    width: 100%;
    max-width: 430px;
    margin: 0 auto;
    background: var(--surface);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    padding: 8px 20px calc(28px + var(--safe-bottom));
    animation: sheetUp 0.32s var(--spring);
  }
  .modal-sheet.closing { animation: sheetDown 0.22s var(--ease-out) forwards; }
  @keyframes sheetUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
  @keyframes sheetDown { to { transform: translateY(100%); } }

  .sheet-handle {
    width: 36px;
    height: 4px;
    border-radius: 2px;
    background: var(--text-tertiary);
    margin: 6px auto 20px;
    opacity: 0.4;
  }

  .sheet-title {
    font-size: 18px;
    font-weight: 700;
    margin-bottom: 20px;
  }

  .field-group {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 20px;
  }

  .field-label {
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text-tertiary);
    margin-bottom: 6px;
  }

  .task-input {
    width: 100%;
    font-family: var(--font);
    font-size: 16px;
    font-weight: 400;
    background: var(--surface2);
    border: none;
    border-radius: var(--radius-sm);
    padding: 13px 14px;
    color: var(--text-primary);
    outline: none;
    transition: box-shadow 0.18s;
    resize: none;
  }
  .task-input:focus {
    box-shadow: 0 0 0 2.5px var(--accent);
  }
  .task-input::placeholder { color: var(--text-tertiary); }

  .date-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }

  .date-field {
    display: flex;
    flex-direction: column;
  }

  .date-input {
    font-family: var(--font);
    font-size: 14px;
    background: var(--surface2);
    border: none;
    border-radius: var(--radius-sm);
    padding: 11px 12px;
    color: var(--text-primary);
    outline: none;
    transition: box-shadow 0.18s;
    width: 100%;
    -webkit-appearance: none;
    appearance: none;
  }
  .date-input:focus { box-shadow: 0 0 0 2.5px var(--accent); }
  .date-input::-webkit-calendar-picker-indicator {
    opacity: 0.4;
    cursor: pointer;
  }

  .btn-row {
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 10px;
  }

  .btn {
    font-family: var(--font);
    font-size: 15px;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-sm);
    padding: 15px;
    cursor: pointer;
    transition: all 0.18s var(--spring);
    touch-action: manipulation;
    -webkit-tap-highlight-color: transparent;
  }
  .btn:active { transform: scale(0.95); }
  .btn-ghost { background: var(--surface2); color: var(--text-secondary); }
  .btn-primary { background: var(--accent); color: white; }
  .btn-danger { background: var(--red); color: white; }

  /* ── TASK DETAIL SHEET ── */
  .detail-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 0;
    border-bottom: 1px solid var(--separator);
  }
  .detail-label { font-size: 14px; color: var(--text-secondary); }
  .detail-value { font-size: 14px; font-weight: 500; }
  .detail-title {
    font-size: 20px;
    font-weight: 700;
    line-height: 1.3;
    margin-bottom: 20px;
    padding-bottom: 20px;
    border-bottom: 1px solid var(--separator);
  }

  .action-btn-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    margin-top: 20px;
  }

  /* ── ANIMATIONS ── */
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

  .task-enter {
    animation: taskIn 0.3s var(--spring);
  }
  @keyframes taskIn {
    from { opacity: 0; transform: translateX(-12px) scale(0.97); }
    to { opacity: 1; transform: translateX(0) scale(1); }
  }

  .task-exit {
    animation: taskOut 0.22s var(--ease-out) forwards;
  }
  @keyframes taskOut {
    to { opacity: 0; transform: scale(0.94); max-height: 0; margin-bottom: 0; }
  }

  /* drag ghost */
  .drag-over-above { box-shadow: 0 -2px 0 var(--accent) !important; border-radius: 0 !important; }
  .drag-over-below { box-shadow: 0 2px 0 var(--accent) !important; border-radius: 0 !important; }

  /* ── HAPTIC-like feedback ── */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
`;

// ─── ICONS ───────────────────────────────────────────────────
const CheckIcon = () => (
  <svg className="check-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
    <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DragIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="5" cy="4" r="1.2" fill="currentColor"/>
    <circle cx="11" cy="4" r="1.2" fill="currentColor"/>
    <circle cx="5" cy="8" r="1.2" fill="currentColor"/>
    <circle cx="11" cy="8" r="1.2" fill="currentColor"/>
    <circle cx="5" cy="12" r="1.2" fill="currentColor"/>
    <circle cx="11" cy="12" r="1.2" fill="currentColor"/>
  </svg>
);

const CalIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
    <rect x="1" y="2" width="10" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4 1V3M8 1V3M1 5H11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3 6H21M8 6V4H16V6M19 6L18.1 19.1C18 20.2 17.1 21 16 21H8C6.9 21 6 20.2 5.9 19.1L5 6" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CheckBigIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M5 12L10 17L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ─── SWIPE TASK ROW ───────────────────────────────────────────
const SWIPE_THRESHOLD = 72;

function TaskRow({ task, onToggle, onDelete, onOpen, dragHandleProps, isDragging }) {
  const cardRef = useRef(null);
  const startX = useRef(null);
  const currentX = useRef(0);
  const animFrame = useRef(null);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    currentX.current = 0;
  };

  const handleTouchMove = (e) => {
    if (startX.current === null) return;
    const dx = e.touches[0].clientX - startX.current;
    currentX.current = dx;

    if (Math.abs(dx) < 8) return;

    if (animFrame.current) cancelAnimationFrame(animFrame.current);
    animFrame.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const clamped = Math.max(-SWIPE_THRESHOLD * 1.4, Math.min(SWIPE_THRESHOLD * 1.4, dx));
      cardRef.current.style.transform = `translateX(${clamped}px)`;

      const leftBg = cardRef.current.parentElement?.querySelector(".swipe-bg-check");
      const rightBg = cardRef.current.parentElement?.querySelector(".swipe-bg-delete");
      if (leftBg) leftBg.querySelector("svg")?.classList.toggle("visible", dx > SWIPE_THRESHOLD * 0.6);
      if (rightBg) rightBg.querySelector("svg")?.classList.toggle("visible", dx < -SWIPE_THRESHOLD * 0.6);
    });
  };

  const handleTouchEnd = () => {
    if (!cardRef.current) return;
    const dx = currentX.current;

    cardRef.current.style.transition = "transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)";
    cardRef.current.style.transform = "translateX(0)";

    const reset = () => {
      if (cardRef.current) cardRef.current.style.transition = "";
    };

    if (dx > SWIPE_THRESHOLD) {
      onToggle(task.id);
    } else if (dx < -SWIPE_THRESHOLD) {
      onDelete(task.id);
    }

    setTimeout(reset, 350);
    startX.current = null;
    currentX.current = 0;
  };

  const severity = getDueSeverity(task);

  const dateLabel = () => {
    if (task.completed && task.completedDate) {
      return <span className="date-badge">✓ {formatDate(task.completedDate)}</span>;
    }
    const parts = [];
    if (task.startDate) parts.push(formatDate(task.startDate));
    if (task.endDate) {
      const badge = task.startDate ? `→ ${formatDate(task.endDate)}` : formatDate(task.endDate);
      const cls = `date-badge ${severity === "overdue" ? "overdue" : severity === "today" ? "today-due" : severity === "soon" ? "soon-due" : ""}`;
      parts.push(<span key="end" className={cls}>{severity === "overdue" ? "⚠ " : ""}{badge}</span>);
    }
    if (parts.length === 0) return null;
    return parts.map((p, i) => (
      <span key={i} style={{display:"flex",alignItems:"center",gap:3}}>
        <CalIcon />{p}
      </span>
    ));
  };

  return (
    <div
      className={`task-row ${isDragging ? "dragging" : ""}`}
      style={{ transition: isDragging ? "none" : undefined }}
    >
      <div className="swipe-bg swipe-bg-check"><CheckBigIcon /></div>
      <div className="swipe-bg swipe-bg-delete"><TrashIcon /></div>

      <div
        ref={cardRef}
        className={`task-card ${task.completed ? "completed-card" : ""}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => onOpen(task)}
      >
        <button
          className={`check-btn ${task.completed ? "checked" : ""}`}
          onClick={(e) => { e.stopPropagation(); onToggle(task.id); }}
        >
          <CheckIcon />
        </button>

        <div className="task-body">
          <div className={`task-title ${task.completed ? "done-text" : ""}`}>{task.title}</div>
          <div className="task-meta">{dateLabel()}</div>
        </div>

        <div className="drag-handle" {...dragHandleProps} onClick={(e) => e.stopPropagation()}>
          <DragIcon />
        </div>
      </div>
    </div>
  );
}

// ─── ADD / EDIT MODAL ─────────────────────────────────────────
function TaskModal({ task, onSave, onClose, onDelete }) {
  const [title, setTitle] = useState(task?.title || "");
  const [startDate, setStartDate] = useState(task?.startDate || "");
  const [endDate, setEndDate] = useState(task?.endDate || "");
  const [closing, setClosing] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 220);
  };

  const save = () => {
    if (!title.trim()) return;
    onSave({ title: title.trim(), startDate, endDate });
    close();
  };

  const handleDelete = () => {
    onDelete(task.id);
    close();
  };

  const isEdit = !!task;

  return (
    <div className={`modal-backdrop ${closing ? "closing" : ""}`} onClick={close}>
      <div className={`modal-sheet ${closing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="sheet-title">{isEdit ? "タスクを編集" : "新しいタスク"}</div>

        <div className="field-group">
          <div>
            <div className="field-label">タイトル</div>
            <textarea
              ref={inputRef}
              className="task-input"
              rows={2}
              placeholder="タスクを入力..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); save(); } }}
            />
          </div>

          <div>
            <div className="field-label">期間</div>
            <div className="date-row">
              <div className="date-field">
                <input
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  placeholder="開始日"
                />
              </div>
              <div className="date-field">
                <input
                  type="date"
                  className="date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  placeholder="終了日"
                  min={startDate}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="btn-row">
          {isEdit
            ? <button className="btn btn-danger" onClick={handleDelete}>削除</button>
            : <button className="btn btn-ghost" onClick={close}>キャンセル</button>
          }
          <button
            className="btn btn-primary"
            onClick={save}
            disabled={!title.trim()}
            style={{ opacity: title.trim() ? 1 : 0.5 }}
          >
            {isEdit ? "保存" : "追加"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DETAIL SHEET ─────────────────────────────────────────────
function DetailSheet({ task, onEdit, onClose, onToggle }) {
  const [closing, setClosing] = useState(false);

  const close = () => {
    setClosing(true);
    setTimeout(onClose, 220);
  };

  const severity = getDueSeverity(task);
  const dueCls = severity === "overdue" ? "overdue" : severity === "today" ? "today-due" : severity === "soon" ? "soon-due" : "";

  return (
    <div className={`modal-backdrop ${closing ? "closing" : ""}`} onClick={close}>
      <div className={`modal-sheet ${closing ? "closing" : ""}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className={`detail-title ${task.completed ? "done-text" : ""}`}>{task.title}</div>

        {task.startDate && (
          <div className="detail-row">
            <span className="detail-label">開始日</span>
            <span className="detail-value">{task.startDate}</span>
          </div>
        )}
        {task.endDate && (
          <div className="detail-row">
            <span className="detail-label">終了日</span>
            <span className={`detail-value date-badge ${dueCls}`}>
              {severity === "overdue" ? "⚠ 期限切れ " : ""}{task.endDate}
            </span>
          </div>
        )}
        {task.completedDate && (
          <div className="detail-row">
            <span className="detail-label">完了日</span>
            <span className="detail-value" style={{color: "var(--green)"}}>✓ {task.completedDate}</span>
          </div>
        )}
        <div className="detail-row">
          <span className="detail-label">追加日</span>
          <span className="detail-value">{task.createdAt}</span>
        </div>

        <div className="action-btn-row">
          <button
            className="btn btn-ghost"
            onClick={() => { onToggle(task.id); close(); }}
          >
            {task.completed ? "未完了に戻す" : "完了にする"}
          </button>
          <button className="btn btn-primary" onClick={() => { close(); setTimeout(() => onEdit(task), 250); }}>
            編集
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DRAG & DROP HOOK ─────────────────────────────────────────
function useDragSort(items, setItems, filterKey) {
  const dragging = useRef(null);
  const dragOver = useRef(null);

  const handleDragStart = useCallback((id) => {
    dragging.current = id;
  }, []);

  const handleDragEnter = useCallback((id) => {
    dragOver.current = id;
  }, []);

  const handleDragEnd = useCallback(() => {
    if (!dragging.current || !dragOver.current || dragging.current === dragOver.current) {
      dragging.current = null;
      dragOver.current = null;
      return;
    }
    setItems(prev => {
      const arr = [...prev];
      const fromIdx = arr.findIndex(t => t.id === dragging.current);
      const toIdx = arr.findIndex(t => t.id === dragOver.current);
      if (fromIdx === -1 || toIdx === -1) return prev;
      const [item] = arr.splice(fromIdx, 1);
      arr.splice(toIdx, 0, item);
      return arr;
    });
    dragging.current = null;
    dragOver.current = null;
  }, [setItems]);

  return { handleDragStart, handleDragEnter, handleDragEnd, draggingId: dragging.current };
}

// ─── TOUCH DRAG (mobile) ──────────────────────────────────────
function useTouchSort(items, setItems) {
  const ghost = useRef(null);
  const draggingId = useRef(null);
  const startY = useRef(0);
  const startScrollTop = useRef(0);
  const listRef = useRef(null);

  const onHandleTouchStart = useCallback((e, id) => {
    e.stopPropagation();
    draggingId.current = id;
    startY.current = e.touches[0].clientY;

    const row = e.currentTarget.closest(".task-row");
    if (!row) return;

    const rect = row.getBoundingClientRect();
    ghost.current = row.cloneNode(true);
    Object.assign(ghost.current.style, {
      position: "fixed",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      zIndex: 999,
      pointerEvents: "none",
      opacity: "0.92",
      boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
      transition: "none",
      borderRadius: "14px",
    });
    document.body.appendChild(ghost.current);
    row.style.opacity = "0.3";
  }, []);

  const onHandleTouchMove = useCallback((e) => {
    if (!draggingId.current || !ghost.current) return;
    const dy = e.touches[0].clientY - startY.current;
    const ghostTop = parseFloat(ghost.current.style.top) + dy;
    ghost.current.style.top = ghostTop + "px";
    startY.current = e.touches[0].clientY;

    // find which row we're over
    const rows = document.querySelectorAll(".task-row");
    rows.forEach(r => r.classList.remove("drag-over-above", "drag-over-below"));

    const midY = e.touches[0].clientY;
    let closest = null, closestDist = Infinity;
    rows.forEach(r => {
      const rect = r.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      const dist = Math.abs(midY - centerY);
      if (dist < closestDist) { closestDist = dist; closest = r; }
    });
    if (closest) {
      const rect = closest.getBoundingClientRect();
      const half = rect.top + rect.height / 2;
      closest.classList.add(midY < half ? "drag-over-above" : "drag-over-below");
    }
  }, []);

  const onHandleTouchEnd = useCallback((e) => {
    if (!draggingId.current) return;

    const rows = document.querySelectorAll(".task-row");
    let targetId = null;
    let insertBefore = true;
    rows.forEach(r => {
      if (r.classList.contains("drag-over-above")) { targetId = r.dataset.id; insertBefore = true; }
      if (r.classList.contains("drag-over-below")) { targetId = r.dataset.id; insertBefore = false; }
      r.classList.remove("drag-over-above", "drag-over-below");
      r.style.opacity = "";
    });

    if (targetId && targetId !== draggingId.current) {
      setItems(prev => {
        const arr = [...prev];
        const fromIdx = arr.findIndex(t => t.id === draggingId.current);
        let toIdx = arr.findIndex(t => t.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const [item] = arr.splice(fromIdx, 1);
        toIdx = arr.findIndex(t => t.id === targetId);
        arr.splice(insertBefore ? toIdx : toIdx + 1, 0, item);
        return arr;
      });
    }

    if (ghost.current) { ghost.current.remove(); ghost.current = null; }
    draggingId.current = null;
  }, [setItems]);

  return { onHandleTouchStart, onHandleTouchMove, onHandleTouchEnd };
}

// ─── MAIN APP ─────────────────────────────────────────────────
const FILTERS = [
  { key: "all", label: "すべて" },
  { key: "active", label: "未完了" },
  { key: "today", label: "今日" },
  { key: "done", label: "完了" },
];

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [filter, setFilter] = useState("all");
  const [modal, setModal] = useState(null); // null | "add" | {task}
  const [detail, setDetail] = useState(null);

  useEffect(() => { saveTasks(tasks); }, [tasks]);

  const { onHandleTouchStart, onHandleTouchMove, onHandleTouchEnd } = useTouchSort(tasks, setTasks);

  // filtered view
  const visibleTasks = tasks.filter(t => {
    if (filter === "all") return true;
    if (filter === "active") return !t.completed;
    if (filter === "done") return t.completed;
    if (filter === "today") {
      const td = today();
      return !t.completed && (t.endDate === td || t.startDate === td);
    }
    return true;
  });

  const activeTasks = visibleTasks.filter(t => !t.completed);
  const doneTasks = visibleTasks.filter(t => t.completed);

  const handleAdd = (data) => {
    const newTask = {
      id: generateId(),
      title: data.title,
      startDate: data.startDate,
      endDate: data.endDate,
      completed: false,
      completedDate: null,
      createdAt: today(),
    };
    setTasks(prev => [newTask, ...prev]);
  };

  const handleEdit = (data) => {
    setTasks(prev => prev.map(t =>
      t.id === modal.id ? { ...t, ...data } : t
    ));
  };

  const handleToggle = (id) => {
    setTasks(prev => prev.map(t =>
      t.id === id
        ? { ...t, completed: !t.completed, completedDate: !t.completed ? today() : null }
        : t
    ));
  };

  const handleDelete = (id) => {
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const incompleteCount = tasks.filter(t => !t.completed).length;

  return (
    <>
      <style>{styles}</style>
      <div
        className="app"
        onTouchMove={onHandleTouchMove}
        onTouchEnd={onHandleTouchEnd}
      >
        {/* Header */}
        <div className="header">
          <div className="header-top">
            <div className="header-title">タスク</div>
            <div className="header-count">{incompleteCount > 0 ? `${incompleteCount}件` : "完了 🎉"}</div>
          </div>
          <div className="filter-bar">
            {FILTERS.map(f => (
              <button
                key={f.key}
                className={`filter-chip ${filter === f.key ? "active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Task List */}
        <div className="task-list-wrap">
          <div className="task-list">
            {activeTasks.length === 0 && doneTasks.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">✅</div>
                <div className="empty-text">タスクがありません</div>
                <div className="empty-sub">＋ボタンで追加してみましょう</div>
              </div>
            )}

            {activeTasks.map((task) => (
              <div key={task.id} data-id={task.id} className="task-enter">
                <TaskRow
                  task={task}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                  onOpen={(t) => setDetail(t)}
                  dragHandleProps={{
                    onTouchStart: (e) => onHandleTouchStart(e, task.id),
                  }}
                />
              </div>
            ))}

            {doneTasks.length > 0 && (
              <>
                <div className="section-label">完了済み — {doneTasks.length}件</div>
                {doneTasks.map((task) => (
                  <div key={task.id} data-id={task.id}>
                    <TaskRow
                      task={task}
                      onToggle={handleToggle}
                      onDelete={handleDelete}
                      onOpen={(t) => setDetail(t)}
                      dragHandleProps={{
                        onTouchStart: (e) => onHandleTouchStart(e, task.id),
                      }}
                    />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>

        {/* FAB */}
        <div className="fab-wrap">
          <button className="fab" onClick={() => setModal("add")}>＋</button>
        </div>
      </div>

      {/* Add Modal */}
      {modal === "add" && (
        <TaskModal
          onSave={handleAdd}
          onClose={() => setModal(null)}
          onDelete={() => {}}
        />
      )}

      {/* Edit Modal */}
      {modal && modal !== "add" && (
        <TaskModal
          task={modal}
          onSave={handleEdit}
          onClose={() => setModal(null)}
          onDelete={handleDelete}
        />
      )}

      {/* Detail Sheet */}
      {detail && (
        <DetailSheet
          task={detail}
          onClose={() => setDetail(null)}
          onToggle={handleToggle}
          onEdit={(t) => { setDetail(null); setTimeout(() => setModal(t), 260); }}
        />
      )}
    </>
  );
}
