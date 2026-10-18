import React from 'react';

export const SECTIONS = {
  harassment: {
    key: 'harassment' as const,
    slug: '/harassment',
    nameBn: 'হয়রানি ও নির্যাতন',
    nameEn: 'Harassment & abuse',
    shortNameBn: 'হয়রানি',
    shortNameEn: 'Harassment',
    descriptionBn: 'শারীরিক বা মানসিক নির্যাতন, নিপীড়ন ও অনলাইনে হেনস্তার তথ্য জানান।',
    descriptionEn: 'Report incidents of harassment, abuse, or safety violations.',
    primaryColor: '#B84A62',
    hoverColor: '#9E384E',
    bgColor: '#FDF2F4',
    borderColor: '#F7CCD5',
    textColor: '#8B293E',
    colors: {
      primary: '#B84A62',
      hover: '#9E384E',
      lightBg: '#FDF2F4',
      bgLight: '#FDF2F4',
      border: '#F7CCD5',
      text: '#8B293E',
      textSafe: '#8B293E',
      filledText: '#FFFFFF',
    },
  },
  public_safety: {
    key: 'public_safety' as const,
    slug: '/public-safety',
    nameBn: 'জননিরাপত্তা',
    nameEn: 'Public Safety',
    shortNameBn: 'জননিরাপত্তা',
    shortNameEn: 'Public safety',
    descriptionBn: 'চুরি, ডাকাতি, ছিনতাই ও জননিরাপত্তার ঝুঁকির তথ্য জানান।',
    descriptionEn: 'Share information about theft, robbery, snatching, and public safety risks.',
    primaryColor: '#C2413B',
    hoverColor: '#A8322D',
    bgColor: '#FEF2F1',
    borderColor: '#F4C9C6',
    textColor: '#8E2D27',
    colors: {
      primary: '#C2413B', hover: '#A8322D', lightBg: '#FEF2F1', bgLight: '#FEF2F1',
      border: '#F4C9C6', text: '#8E2D27', textSafe: '#8E2D27', filledText: '#FFFFFF',
    },
  },
  road_transport: {
    key: 'road_transport' as const,
    slug: '/road-transport',
    nameBn: 'সড়ক ও যাতায়াত সমস্যা',
    nameEn: 'Road & Transport Issues',
    shortNameBn: 'সড়ক ও যাতায়াত',
    shortNameEn: 'Road & transport',
    descriptionBn: 'ভাঙা রাস্তা, দুর্ঘটনার ঝুঁকি ও যানজটের তথ্য জানান।',
    descriptionEn: 'Report damaged roads, transport hazards, and serious congestion.',
    primaryColor: '#3976A8',
    hoverColor: '#2D628E',
    bgColor: '#EFF6FC',
    borderColor: '#C9DFF2',
    textColor: '#285783',
    colors: {
      primary: '#3976A8', hover: '#2D628E', lightBg: '#EFF6FC', bgLight: '#EFF6FC',
      border: '#C9DFF2', text: '#285783', textSafe: '#285783', filledText: '#FFFFFF',
    },
  },
  illegal_occupation: {
    key: 'illegal_occupation' as const,
    slug: '/illegal-occupation',
    nameBn: 'অবৈধ দখল',
    nameEn: 'Illegal Occupation',
    shortNameBn: 'অবৈধ দখল',
    shortNameEn: 'Illegal occupation',
    descriptionBn: 'রাস্তা, ফুটপাত বা সরকারি জায়গা অবৈধভাবে দখলের তথ্য জানান।',
    descriptionEn: 'Report roads, footpaths, or public spaces occupied illegally.',
    primaryColor: '#7257A4',
    hoverColor: '#5D4689',
    bgColor: '#F5F2FA',
    borderColor: '#DDD4ED',
    textColor: '#57427E',
    colors: {
      primary: '#7257A4', hover: '#5D4689', lightBg: '#F5F2FA', bgLight: '#F5F2FA',
      border: '#DDD4ED', text: '#57427E', textSafe: '#57427E', filledText: '#FFFFFF',
    },
  },
  rickshaw: {
    key: 'rickshaw' as const,
    slug: '/rickshaw',
    nameBn: 'অবৈধ অটো-রিকশা চার্জিং স্টেশন',
    nameEn: 'Illegal Auto-rickshaw Charging Station',
    shortNameBn: 'চার্জিং',
    shortNameEn: 'Charging',
    descriptionBn: 'অবৈধ বা ঝুঁকিপূর্ণ চার্জিং স্টেশনের অবস্থান ও তথ্য দিন।',
    descriptionEn: 'Share the location and details of illegal or unsafe charging stations.',
    primaryColor: '#D9822B',
    hoverColor: '#B8681A',
    bgColor: '#FEF7EE',
    borderColor: '#FBDDB9',
    textColor: '#9A530C',
    colors: {
      primary: '#D9822B',
      hover: '#B8681A',
      lightBg: '#FEF7EE',
      bgLight: '#FEF7EE',
      border: '#FBDDB9',
      text: '#9A530C',
      textSafe: '#9A530C',
      filledText: '#050505',
    },
  },
  extortion: {
    key: 'extortion' as const,
    slug: '/extortion',
    nameBn: 'চাঁদাবাজি ও ঘুষ',
    nameEn: 'Extortion & Bribery',
    shortNameBn: 'চাঁদাবাজি ও ঘুষ',
    shortNameEn: 'Extortion & Bribery',
    descriptionBn: 'চাঁদাবাজি, ঘুষ দাবি, অবৈধ চাঁদা বা জোরপূর্বক অর্থ আদায়ের অভিযোগ জানান।',
    descriptionEn: 'Report alleged extortion, bribe demands, illegal tolls, or coercive payments.',
    primaryColor: '#4F5D95',
    hoverColor: '#3E4A7A',
    bgColor: '#F0F3F9',
    borderColor: '#CCD5E8',
    textColor: '#333E67',
    colors: {
      primary: '#4F5D95',
      hover: '#3E4A7A',
      lightBg: '#F0F3F9',
      bgLight: '#F0F3F9',
      border: '#CCD5E8',
      text: '#333E67',
      textSafe: '#333E67',
      filledText: '#FFFFFF',
    },
  },
  load_shedding: {
    key: 'load_shedding' as const,
    slug: '/load-shedding',
    nameBn: 'ইউটিলিটি সমস্যা',
    nameEn: 'Utility issues',
    shortNameBn: 'ইউটিলিটি',
    shortNameEn: 'Utility',
    descriptionBn: 'লোডশেডিং, গ্যাস সংকট বা অতিরিক্ত বিদ্যুৎ বিল সংক্রান্ত প্রতিবেদন জমা দিন।',
    descriptionEn: 'Report load shedding, gas shortages, or electricity billing issues.',
    primaryColor: '#0D9488',
    hoverColor: '#0F766E',
    bgColor: '#F0FDFA',
    borderColor: '#CCFBF1',
    textColor: '#115E59',
    colors: {
      primary: '#0D9488',
      hover: '#0F766E',
      lightBg: '#F0FDFA',
      bgLight: '#F0FDFA',
      border: '#CCFBF1',
      text: '#115E59',
      textSafe: '#115E59',
      filledText: '#050505',
    },
  },
};

export type SectionKey = keyof typeof SECTIONS;

/** Active public categories in the live taxonomy's stable display order. */
export const SECTION_KEYS: SectionKey[] = [
  'harassment',
  'load_shedding',
  'extortion',
  'public_safety',
  'road_transport',
  'illegal_occupation',
  'rickshaw',
];

/** Categories with a verified local report form contract. */
export const REPORT_FORM_SECTION_KEYS: SectionKey[] = [
  'harassment',
  'load_shedding',
  'extortion',
  'rickshaw',
];

export interface ComingSoonServiceConfig {
  key: 'illegal_occupation';
  slug: '/illegal-occupation';
  nameBn: string;
  nameEn: string;
  shortNameBn: string;
  shortNameEn: string;
  badgeBn: string;
  badgeEn: string;
  descriptionBn: string;
  descriptionEn: string;
  primaryColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  iconName: 'building';
}

export const COMING_SOON_SERVICES: Record<'illegal_occupation', ComingSoonServiceConfig> = {
  illegal_occupation: {
    key: 'illegal_occupation',
    slug: '/illegal-occupation',
    nameBn: 'অবৈধ দখল',
    nameEn: 'Illegal occupation',
    shortNameBn: 'অবৈধ দখল',
    shortNameEn: 'Illegal occupation',
    badgeBn: 'শীঘ্রই আসছে',
    badgeEn: 'Coming soon',
    descriptionBn: 'এই সেবাটি এখনো চালু হয়নি।',
    descriptionEn: 'This service isn’t available yet.',
    primaryColor: '#6B7280',
    bgColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    textColor: '#374151',
    iconName: 'building',
  },
};

export type ComingSoonServiceKey = keyof typeof COMING_SOON_SERVICES;

export const LAYOUT_TOKENS = {
  navWidth: {
    desktop: '240px',
    largeDesktop: '250px',
    xlDesktop: '260px',
  },
  navLeft: {
    desktop: '16px',
    largeDesktop: '20px',
    xlDesktop: '24px',
  },
  maxWidth: {
    desktopWorkspace: 'max-w-[900px]',
    desktop1440: 'max-w-[880px]',
    desktop1536: 'max-w-[900px]',
    desktop1920: 'max-w-[920px]',
    readingColumn: 'max-w-[720px]',
    formColumn: 'max-w-[720px]',
    modal: 'max-w-xl',
  },
  gutters: {
    mobile: 'px-4',
    tablet: 'px-6',
    compactDesktop: 'px-8',
    desktop: 'px-0',
  },
  spacing: {
    pagePaddingY: {
      mobile: 'py-4',
      tablet: 'py-5',
      desktop: 'py-6',
    },
    sectionGap: {
      mobile: 'space-y-5',
      tablet: 'space-y-6',
      desktop: 'space-y-7',
    },
    cardPadding: {
      mobile: 'p-4',
      tablet: 'p-5',
      desktop: 'p-6',
    },
  },
  touchTargetMin: '44px',
};

export interface HeroSectionTheme {
  background: string;
  ctaText: string;
  ctaBorder: string;
  ctaHover: string;
  ctaHoverText: string;
  desktopMediaPosition?: string;
  desktopMediaScale?: number;
  desktopMediaTranslateY?: string;
}

export const HERO_TOKENS = {
  text: {
    primary: '#102A43',
    secondary: '#596579',
  },
  sections: {
    harassment: {
      background: '#FEEAEC',
      ctaText: '#9E384E',
      ctaBorder: '#9E384E',
      ctaHover: '#B84A62',
      ctaHoverText: '#FFFFFF',
      desktopMediaPosition: 'center bottom',
      desktopMediaScale: 1.05,
      desktopMediaTranslateY: '10px',
    },
    rickshaw: {
      background: '#E4F8EE',
      ctaText: '#9A520A',
      ctaBorder: '#9A520A',
      ctaHover: '#D9822B',
      ctaHoverText: '#050505',
      desktopMediaPosition: 'center bottom',
      desktopMediaScale: 1.0,
      desktopMediaTranslateY: undefined,
    },
    extortion: {
      background: '#FEEADE',
      ctaText: '#4F5D95',
      ctaBorder: '#4F5D95',
      ctaHover: '#4F5D95',
      ctaHoverText: '#FFFFFF',
      desktopMediaPosition: 'center bottom',
      desktopMediaScale: 1.0,
      desktopMediaTranslateY: undefined,
    },
    load_shedding: {
      background: '#FEEDD4',
      ctaText: '#0A756E',
      ctaBorder: '#0A756E',
      ctaHover: '#0D9488',
      ctaHoverText: '#050505',
      desktopMediaPosition: 'center bottom',
      desktopMediaScale: 1.0,
      desktopMediaTranslateY: undefined,
    },
    public_safety: {
      background: '#FCEBEA',
      ctaText: '#8E2D27',
      ctaBorder: '#8E2D27',
      ctaHover: '#C2413B',
      ctaHoverText: '#FFFFFF',
      desktopMediaPosition: 'center bottom',
      desktopMediaScale: 1.0,
    },
    road_transport: {
      background: '#EAF3FB',
      ctaText: '#285783',
      ctaBorder: '#285783',
      ctaHover: '#3976A8',
      ctaHoverText: '#FFFFFF',
      desktopMediaPosition: 'center bottom',
      desktopMediaScale: 1.0,
    },
    illegal_occupation: {
      background: '#F0EDF7',
      ctaText: '#57427E',
      ctaBorder: '#57427E',
      ctaHover: '#7257A4',
      ctaHoverText: '#FFFFFF',
      desktopMediaPosition: 'center bottom',
      desktopMediaScale: 1.0,
    },
  } as Record<SectionKey, HeroSectionTheme>,
};

export const HERO_SLIDER_BEHAVIOR = {
  autoplayIntervalMs: 15_000,
  swipeThresholdPx: 45,
  swipeDominanceRatio: 1.2,
  transitionDurationMs: 500,
} as const;

export const HERO_SLIDER_TOKENS = {
  dimensions: {
    mediaHeightMobile: '150px',
    mediaHeightSmall: '180px',
    mediaMaxHeightTablet: '220px',

    minHeightMobile: '160px',
    minHeightTablet: '180px',
    minHeightDesktop: '230px',
    minHeightLargeDesktop: '250px',
  },

  spacing: {
    contentMobileX: '1rem',
    contentMobileTop: '1rem',
    contentMobileBottom: '0.5rem',

    contentSmallX: '1.25rem',
    contentSmallTop: '1.25rem',
    contentSmallBottom: '0.75rem',

    contentTabletX: '1.5rem',
    contentTabletY: '1.5rem',

    contentDesktopX: '2rem',
    contentDesktopY: '1.75rem',

    contentLargeDesktopX: '2.5rem',
    contentLargeDesktopY: '2rem',

    contentGapMobile: '0.5rem',
    contentGapTablet: '0.75rem',

    ctaTopMobile: '0.5rem',
    ctaTopSmall: '0.625rem',
    ctaTopTablet: '0.375rem',
  },

  media: {
    mobileFit: 'cover',
    mobilePosition: 'center',
    tabletFit: 'contain',
    desktopFit: 'cover',
    defaultDesktopPosition: 'center bottom',
    defaultDesktopScale: 1,
  },

  controls: {
    arrowSize: '44px',
    arrowOffset: '12px',
    arrowIconSize: '20px',
  },
} as const;

export const getHeroSliderCssVars = (): React.CSSProperties =>
  ({
    '--hero-slider-media-mobile-h': HERO_SLIDER_TOKENS.dimensions.mediaHeightMobile,
    '--hero-slider-media-sm-h': HERO_SLIDER_TOKENS.dimensions.mediaHeightSmall,
    '--hero-slider-media-tablet-max-h': HERO_SLIDER_TOKENS.dimensions.mediaMaxHeightTablet,

    '--hero-slider-min-mobile': HERO_SLIDER_TOKENS.dimensions.minHeightMobile,
    '--hero-slider-min-tablet': HERO_SLIDER_TOKENS.dimensions.minHeightTablet,
    '--hero-slider-min-desktop': HERO_SLIDER_TOKENS.dimensions.minHeightDesktop,
    '--hero-slider-min-xl': HERO_SLIDER_TOKENS.dimensions.minHeightLargeDesktop,

    '--hero-slider-content-mobile-x': HERO_SLIDER_TOKENS.spacing.contentMobileX,
    '--hero-slider-content-mobile-top': HERO_SLIDER_TOKENS.spacing.contentMobileTop,
    '--hero-slider-content-mobile-bottom': HERO_SLIDER_TOKENS.spacing.contentMobileBottom,

    '--hero-slider-content-sm-x': HERO_SLIDER_TOKENS.spacing.contentSmallX,
    '--hero-slider-content-sm-top': HERO_SLIDER_TOKENS.spacing.contentSmallTop,
    '--hero-slider-content-sm-bottom': HERO_SLIDER_TOKENS.spacing.contentSmallBottom,

    '--hero-slider-content-tablet-x': HERO_SLIDER_TOKENS.spacing.contentTabletX,
    '--hero-slider-content-tablet-y': HERO_SLIDER_TOKENS.spacing.contentTabletY,

    '--hero-slider-content-desktop-x': HERO_SLIDER_TOKENS.spacing.contentDesktopX,
    '--hero-slider-content-desktop-y': HERO_SLIDER_TOKENS.spacing.contentDesktopY,

    '--hero-slider-content-xl-x': HERO_SLIDER_TOKENS.spacing.contentLargeDesktopX,
    '--hero-slider-content-xl-y': HERO_SLIDER_TOKENS.spacing.contentLargeDesktopY,

    '--hero-slider-content-gap-mobile': HERO_SLIDER_TOKENS.spacing.contentGapMobile,
    '--hero-slider-content-gap-tablet': HERO_SLIDER_TOKENS.spacing.contentGapTablet,

    '--hero-slider-cta-top-mobile': HERO_SLIDER_TOKENS.spacing.ctaTopMobile,
    '--hero-slider-cta-top-sm': HERO_SLIDER_TOKENS.spacing.ctaTopSmall,
    '--hero-slider-cta-top-tablet': HERO_SLIDER_TOKENS.spacing.ctaTopTablet,

    '--hero-slider-arrow-size': HERO_SLIDER_TOKENS.controls.arrowSize,
    '--hero-slider-arrow-offset': HERO_SLIDER_TOKENS.controls.arrowOffset,
    '--hero-slider-arrow-icon-size': HERO_SLIDER_TOKENS.controls.arrowIconSize,

    '--hero-slider-media-fit-mobile': HERO_SLIDER_TOKENS.media.mobileFit,
    '--hero-slider-media-position-mobile': HERO_SLIDER_TOKENS.media.mobilePosition,
    '--hero-slider-media-fit-tablet': HERO_SLIDER_TOKENS.media.tabletFit,
    '--hero-slider-media-fit-desktop': HERO_SLIDER_TOKENS.media.desktopFit,

    '--hero-slider-transition-duration': `${HERO_SLIDER_BEHAVIOR.transitionDurationMs}ms`,
  } as React.CSSProperties);

export const getHeroCtaStyle = (section: SectionKey): React.CSSProperties => {
  const t = HERO_TOKENS.sections[section];
  if (!t) return {};
  return {
    '--hero-cta-text': t.ctaText,
    '--hero-cta-border': t.ctaBorder,
    '--hero-cta-hover-bg': t.ctaHover,
    '--hero-cta-hover-border': t.ctaHover,
    '--hero-cta-hover-text': t.ctaHoverText,
  } as React.CSSProperties;
};
