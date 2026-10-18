import React from 'react';
import { Home, Menu, PlusCircle, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';

/** The four approved primary mobile actions; category navigation lives in Menu. */
export const BottomNav: React.FC<{ keyboardActive?: boolean }> = ({ keyboardActive = false }) => {
  const {
    currentRoute,
    language,
    navigateTo,
    setIsTabletMenuOpen,
    isTabletMenuOpen,
    openReportComposer,
    isReportComposerOpen,
  } = useApp();

  const items = [
    {
      id: 'bottom-nav-menu',
      name: language === 'bn' ? 'মেনু' : 'Menu',
      icon: Menu,
      active: isTabletMenuOpen,
      onClick: () => setIsTabletMenuOpen(true),
    },
    {
      id: 'bottom-nav-search',
      name: language === 'bn' ? 'খুঁজুন' : 'Search',
      icon: Search,
      active: currentRoute === '/search',
      onClick: () => navigateTo('/search'),
    },
    {
      id: 'bottom-nav-report',
      name: language === 'bn' ? 'ঘটনা জানান' : 'Report',
      icon: PlusCircle,
      active: isReportComposerOpen,
      onClick: () => openReportComposer(),
    },
    {
      id: 'bottom-nav-home',
      name: language === 'bn' ? 'মূলপাতা' : 'Home',
      icon: Home,
      active: currentRoute === '/',
      onClick: () => navigateTo('/'),
    },
  ];

  return (
    <nav
      id="bottom-nav"
      aria-label={language === 'bn' ? 'মোবাইল নেভিগেশন' : 'Mobile navigation'}
      data-keyboard-active={keyboardActive ? 'true' : 'false'}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-ui-surface border-t border-ui-stroke-subtle pb-safe"
    >
      <div className="grid grid-cols-4 items-center min-h-16 px-2">
        {items.map(({ id, name, icon: Icon, active, onClick }) => (
          <button
            key={id}
            id={id}
            type="button"
            onClick={onClick}
            aria-label={name}
            aria-current={active && (id === 'bottom-nav-search' || id === 'bottom-nav-home') ? 'page' : undefined}
            aria-pressed={id === 'bottom-nav-menu' || id === 'bottom-nav-report' ? active : undefined}
            className={`flex flex-col items-center justify-center gap-1 min-h-[52px] min-w-[44px] p-1 rounded-xl cursor-pointer select-none transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus ${active ? 'text-ui-content-primary font-bold' : 'text-ui-content-muted hover:text-ui-content-primary'}`}
          >
            <Icon className="w-5 h-5 shrink-0" strokeWidth={active ? 2.5 : 2} aria-hidden="true" />
            <span className="text-[11px] min-[390px]:text-[12px] leading-tight text-center whitespace-nowrap">{name}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
