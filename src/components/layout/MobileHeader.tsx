import React, { useEffect, useRef, useState } from 'react';
import { Menu, Search } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { BrandLogo } from '../branding/BrandLogo';

export const MobileHeader: React.FC = () => {
  const { navigateTo, language, setIsTabletMenuOpen } = useApp();
  const [compact, setCompact] = useState(false);
  const lastY = useRef(0);

  useEffect(() => {
    lastY.current = window.scrollY;
    const onScroll = () => {
      const nextY = Math.max(0, window.scrollY);
      const delta = nextY - lastY.current;
      if (nextY < 48) setCompact(false);
      else if (delta > 8) setCompact(true);
      else if (delta < -8) setCompact(false);
      if (Math.abs(delta) > 8) lastY.current = nextY;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      id="mobile-header"
      data-compact={compact ? 'true' : 'false'}
      className="md:hidden sticky top-0 z-40 w-full bg-ui-surface border-b border-ui-stroke-subtle pt-safe"
    >
      <div className={`flex items-center justify-between px-3 sm:px-4 max-w-full gap-2 transition-[height] duration-150 ${compact ? 'h-12' : 'h-14'}`}>
        {/* Left: Flex cluster containing Menu button and Brand Logo */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            id="mobile-header-menu-btn"
            type="button"
            onClick={() => setIsTabletMenuOpen(true)}
            aria-label={language === 'bn' ? 'মেনু খুলুন' : 'Open menu'}
            className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl border border-ui-stroke-subtle bg-ui-surface text-ui-content-primary flex items-center justify-center cursor-pointer transition-colors hover:bg-ui-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus shrink-0"
          >
            <Menu className="w-5 h-5 text-ui-content-primary" aria-hidden="true" />
          </button>

          <BrandLogo
            id="mobile-header-brand-logo"
            size="sm"
            showEnglish={false}
            onClick={() => navigateTo('/')}
          />
        </div>

        {/* Right: Search Button navigating to /search */}
        <button
          id="mobile-header-search-btn"
          type="button"
          onClick={() => navigateTo('/search')}
          aria-label={language === 'bn' ? 'প্রতিবেদন খুঁজুন' : 'Search reports'}
          className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-xl border border-ui-stroke-subtle bg-ui-surface text-ui-content-primary flex items-center justify-center cursor-pointer transition-colors hover:bg-ui-surface-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus shrink-0"
        >
          <Search className="w-5 h-5 text-ui-content-primary" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
};
