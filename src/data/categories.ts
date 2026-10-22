import { SectionKey, SECTION_KEYS } from '../theme/tokens';
import { SEGMENT_SUBCATEGORIES } from './reportOptions';

export interface SubcategoryOption {
  id: string;
  nameBn: string;
  nameEn: string;
}

/** Shared, active-only, database-verified offline fallback (never include disabled bribe-paid). */
export const SUBCATEGORIES: Record<SectionKey, SubcategoryOption[]> =
  Object.fromEntries(SECTION_KEYS.map((key) => [
    key,
    [
      { id: 'all', nameBn: 'সকল রিপোর্ট', nameEn: 'All Reports' },
      ...SEGMENT_SUBCATEGORIES[key].map(({ id, nameBn, nameEn }) => ({ id, nameBn, nameEn })),
    ],
  ])) as Record<SectionKey, SubcategoryOption[]>;

export const POPULAR_DISTRICTS = [
  { id: 'all', nameBn: 'সারা বাংলাদেশ', nameEn: 'All Bangladesh' },
  { id: 'ঢাকা', nameBn: 'ঢাকা', nameEn: 'Dhaka' },
  { id: 'চট্টগ্রাম', nameBn: 'চট্টগ্রাম', nameEn: 'Chittagong' },
  { id: 'সিলেট', nameBn: 'সিলেট', nameEn: 'Sylhet' },
  { id: 'রাজশাহী', nameBn: 'রাজশাহী', nameEn: 'Rajshahi' },
  { id: 'খুলনা', nameBn: 'খুলনা', nameEn: 'Khulna' },
  { id: 'বরিশাল', nameBn: 'বরিশাল', nameEn: 'Barisal' },
  { id: 'রংপুর', nameBn: 'রংপুর', nameEn: 'Rangpur' },
  { id: 'ময়মনসিংহ', nameBn: 'ময়মনসিংহ', nameEn: 'Mymensingh' },
];
