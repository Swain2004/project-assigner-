import { useState, useRef } from 'react';
import api from '../api/axios';

const AVATAR_COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500',
  'bg-orange-500', 'bg-pink-500', 'bg-teal-500', 'bg-red-500',
];
function avatarColor(name) {
  return AVATAR_COLORS[(name?.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export function renderMentions(text) {
  if (!text) return null;
  const regex = /@([\w][^\s@,.:;!?\n]*(?:\s+[\w][^\s@,.:;!?\n]*)*)/g;
  const parts = [];
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    parts.push(
      <span key={match.index} className="inline-flex items-center text-blue-600 font-semibold bg-blue-50 rounded px-1 py-0.5 text-[inherit] leading-none">
        @{match[1]}
      </span>
    );
    last = regex.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length ? parts : text;
}

export default function MentionTextarea({
  value = '',
  onChange,
  placeholder = 'Add a description… Type @ to mention someone',
  rows = 3,
  users: passedUsers,
  className = '',
  disabled = false,
}) {
  const [dropdown, setDropdown] = useState([]);
  const [mentionStart, setMentionStart] = useState(-1);
  const [activeIdx, setActiveIdx] = useState(0);
  const [fetching, setFetching] = useState(false);
  const textareaRef = useRef(null);
  const fetchTimer = useRef(null);

  function getDropdownUsers(query) {
    if (passedUsers?.length) {
      return passedUsers.filter((u) =>
        u.name.toLowerCase().startsWith(query) ||
        u.name.split(' ').some((w) => w.toLowerCase().startsWith(query))
      ).slice(0, 8);
    }
    return null;
  }

  function handleChange(e) {
    const text = e.target.value;
    const cursor = e.target.selectionStart;
    onChange(text);

    const before = text.slice(0, cursor);
    const mentionMatch = before.match(/@([\w\s]*)$/);

    if (mentionMatch !== null) {
      const raw = mentionMatch[1];
      const query = raw.toLowerCase();
      const start = cursor - mentionMatch[0].length;
      setMentionStart(start);
      setActiveIdx(0);

      const local = getDropdownUsers(query);
      if (local !== null) {
        setDropdown(local);
      } else {
        if (!query) { setDropdown([]); return; }
        clearTimeout(fetchTimer.current);
        setFetching(true);
        fetchTimer.current = setTimeout(async () => {
          try {
            const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
            setDropdown((res.data.users || []).slice(0, 8));
          } catch {
            setDropdown([]);
          } finally {
            setFetching(false);
          }
        }, 200);
      }
    } else {
      setDropdown([]);
      setMentionStart(-1);
      clearTimeout(fetchTimer.current);
    }
  }

  function insertMention(user) {
    const cursor = textareaRef.current?.selectionStart ?? value.length;
    const before = value.slice(0, mentionStart);
    const after = value.slice(cursor);
    const inserted = `${before}@${user.name} ${after}`;
    onChange(inserted);
    setDropdown([]);
    setMentionStart(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        const pos = mentionStart + user.name.length + 2;
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(pos, pos);
      }
    }, 0);
  }

  function handleKeyDown(e) {
    if (!dropdown.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, dropdown.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (dropdown[activeIdx]) { e.preventDefault(); insertMention(dropdown[activeIdx]); }
    } else if (e.key === 'Escape') {
      setDropdown([]);
      setMentionStart(-1);
    }
  }

  function handleBlur() {
    setTimeout(() => { setDropdown([]); setMentionStart(-1); }, 150);
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className={`input-field resize-none ${className}`}
      />

      {(dropdown.length > 0 || fetching) && (
        <div className="absolute left-0 z-50 mt-1 w-72 bg-white border border-gray-200 rounded-ios-md shadow-apple-lg overflow-hidden"
          style={{ bottom: 'auto', top: '100%' }}
        >
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-100">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Mention a team member</p>
            {fetching && <div className="w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
          </div>

          {dropdown.length === 0 && fetching && (
            <div className="px-4 py-3 text-sm text-gray-400 text-center">Searching...</div>
          )}

          {dropdown.map((u, i) => (
            <button
              key={u.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); insertMention(u); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                i === activeIdx ? 'bg-blue-50' : 'hover:bg-gray-50'
              }`}
            >
              <div className={`w-8 h-8 ${avatarColor(u.name)} rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden`}>
                {u.avatar_url
                  ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" />
                  : u.name.charAt(0).toUpperCase()
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{u.name}</p>
                <p className="text-xs text-gray-400 truncate">{u.email}</p>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                u.role === 'admin' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
              }`}>
                {u.role}
              </span>
            </button>
          ))}

          {dropdown.length > 0 && (
            <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100">
              <p className="text-[10px] text-gray-400">
                <kbd className="font-semibold">↑↓</kbd> navigate &nbsp;
                <kbd className="font-semibold">Enter</kbd> select &nbsp;
                <kbd className="font-semibold">Esc</kbd> close
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
