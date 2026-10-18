import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';

type TextSizePreference = 'standard' | 'large';
const STORAGE_KEY = 'sobaike-janao-text-size';

function readPreference(): TextSizePreference {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'large' ? 'large' : 'standard';
  } catch {
    return 'standard';
  }
}

/** Reading preference scales semantic text tokens without changing site layout breakpoints. */
export const TextSizeSelector: React.FC = () => {
  const { language } = useApp();
  const [size, setSize] = useState<TextSizePreference>(readPreference);

  useEffect(() => {
    document.documentElement.setAttribute('data-text-size', size);
    try {
      localStorage.setItem(STORAGE_KEY, size);
    } catch {
      // The current session still honors the preference when storage is blocked.
    }
  }, [size]);

  return (
    <div
      id="drawer-text-size"
      className="grid grid-cols-2 gap-2"
      role="group"
      aria-label={language === 'bn' ? 'লেখার আকার' : 'Text size'}
    >
      {(['standard', 'large'] as const).map((option) => (
        <button
          key={option}
          type="button"
          id={`text-size-${option}`}
          aria-pressed={size === option}
          onClick={() => setSize(option)}
          className={`min-h-[44px] rounded-xl border px-2 py-2 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus ${size === option ? 'border-ui-accent bg-ui-accent-soft text-ui-content-primary' : 'border-ui-stroke-subtle bg-ui-surface text-ui-content-secondary'}`}
        >
          {option === 'standard'
            ? (language === 'bn' ? 'স্বাভাবিক' : 'Standard')
            : (language === 'bn' ? 'বড় লেখা' : 'Larger')}
        </button>
      ))}
    </div>
  );
};
