import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function AppleSelect({ value, onChange, options, className = '', placeholder = 'Select...' }) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-[14px] font-medium text-gray-900 flex items-center justify-between shadow-sm transition-all focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 hover:border-gray-300"
      >
        <span className={!selectedOption ? 'text-gray-400' : ''}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white/90 backdrop-blur-xl border border-gray-100 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden animate-scale-in origin-top">
          <ul className="max-h-60 overflow-y-auto p-1.5" data-lenis-prevent>
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => {
                  onChange({ target: { value: option.value } });
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg cursor-pointer transition-colors ${
                  value === option.value
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100/80 hover:text-gray-900'
                }`}
              >
                <span>{option.label}</span>
                {value === option.value && <Check size={14} className="text-white" strokeWidth={3} />}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
