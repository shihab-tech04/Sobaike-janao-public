import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';

/** Reading preference scales semantic text tokens without changing site layout breakpoints. */
export const TextSizeSelector: React.FC<{ idPrefix?: string }> = ({ idPrefix = 'drawer' }) => {
  const { language } = useApp();
  const { textSizePreference, setTextSizePreference } = useTheme();

  return (
    <div
      id={`${idPrefix}-text-size`}
      className="grid grid-cols-2 gap-2"
      role="group"
      aria-label={language === 'bn' ? 'লেখার আকার' : 'Text size'}
    >
      {(['standard', 'large'] as const).map((option) => (
        <button
          key={option}
          type="button"
          id={`${idPrefix}-text-size-${option}`}
          aria-pressed={textSizePreference === option}
          onClick={() => setTextSizePreference(option)}
          className={`min-h-[44px] rounded-xl border px-2 py-2 font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus ${textSizePreference === option ? 'border-ui-accent bg-ui-accent-soft text-ui-content-primary' : 'border-ui-stroke-subtle bg-ui-surface text-ui-content-secondary'}`}
        >
          {option === 'standard'
            ? (language === 'bn' ? 'স্বাভাবিক' : 'Standard')
            : (language === 'bn' ? 'বড় লেখা' : 'Larger')}
        </button>
      ))}
    </div>
  );
};
