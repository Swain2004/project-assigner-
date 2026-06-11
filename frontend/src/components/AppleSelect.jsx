import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function AppleSelect({ value, onChange, options, className = '', placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({});
  const containerRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClose(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClose);
    return () => document.removeEventListener('mousedown', handleClose);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    function handleScroll(e) {
      if (containerRef.current && containerRef.current.contains(e.target)) return;
      setIsOpen(false);
    }
    function handleResize() { setIsOpen(false); }
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
    };
  }, [isOpen]);

  function handleToggle() {
    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 240 && rect.top > spaceBelow) {
        setDropdownPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left, width: rect.width });
      } else {
        setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
      }
    }
    setIsOpen((o) => !o);
  }

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[14px] font-medium text-gray-900 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-300"
      >
        <span className={`${!selectedOption ? 'text-gray-400' : ''} whitespace-nowrap`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          style={{ position: 'fixed', zIndex: 9999, ...dropdownPos }}
          className="bg-white/90 backdrop-blur-xl border border-gray-100 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden animate-scale-in origin-top"
        >
          <ul className="max-h-60 overflow-y-auto p-1.5" data-lenis-prevent>
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => { onChange({ target: { value: option.value } }); setIsOpen(false); }}
                className={`flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg cursor-pointer transition-colors ${
                  value === option.value ? 'bg-blue-500 text-white' : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <span className="whitespace-nowrap">{option.label}</span>
                {value === option.value && <Check size={14} className="text-white" strokeWidth={3} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
