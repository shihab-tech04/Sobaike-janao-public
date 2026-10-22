import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { SectionKey, SECTIONS, SECTION_KEYS } from '../theme/tokens';
import { SubcategoryOption, SEGMENT_SUBCATEGORIES } from '../data/reportOptions';
import { SUBCATEGORIES } from '../data/categories';
import { useState, useEffect } from 'react';

export interface SupabaseSegmentRow {
  id: string;
  slug?: string;
  name_bn: string;
  name_en: string;
  active?: boolean;
  sort_order?: number;
  [key: string]: any;
}

export interface SupabaseSubcategoryRow {
  id: string;
  segment_id: string;
  name_bn: string;
  name_en: string;
  description_bn?: string;
  description_en?: string;
  category_group?: 'violence' | 'relationship_scam' | 'digital_intimate' | 'general';
  is_sensitive?: boolean;
  active?: boolean;
  sort_order?: number;
  [key: string]: any;
}

export interface SegmentTaxonomyItem {
  key: SectionKey;
  id: string;
  slug: string;
  nameBn: string;
  nameEn: string;
  shortNameBn: string;
  shortNameEn: string;
  descriptionBn: string;
  descriptionEn: string;
  primaryColor: string;
  hoverColor: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
  colors: typeof SECTIONS.harassment.colors;
  sortOrder?: number;
}

/** Published forms are supplied by the server's filtered, anonymous-safe RPC. */
export interface PublicPublishedFormField {
  fieldKey: string;
  fieldType: string;
  storageMode: 'core_column' | 'custom_json' | 'system_block';
  storageKey: string;
  labelEn: string;
  labelBn: string;
  helperEn?: string | null;
  helperBn?: string | null;
  placeholderEn?: string | null;
  placeholderBn?: string | null;
  required: boolean;
  active: boolean;
  sortOrder: number;
  options?: unknown;
  validation?: unknown;
  config?: unknown;
}

export interface PublicPublishedForm {
  subcategoryId: string;
  schemaId: string;
  version: number;
  engineMode: 'legacy' | 'schema';
  fields: PublicPublishedFormField[];
}

interface PublicReportingConfiguration {
  segments: Array<{
    id: string;
    slug: string;
    nameEn: string;
    nameBn: string;
    shortNameEn?: string;
    shortNameBn?: string;
    descriptionEn?: string;
    descriptionBn?: string;
    sortOrder: number;
  }>;
  subcategories: Array<{
    id: string;
    segmentId: string;
    nameEn: string;
    nameBn: string;
    descriptionEn?: string;
    descriptionBn?: string;
    categoryGroup?: SubcategoryOption['categoryGroup'];
    isSensitive?: boolean;
    sortOrder: number;
  }>;
  forms: PublicPublishedForm[];
}

// In-memory cache initialized with robust local fallbacks until a successful backend read
let cachedSegments: Record<string, SegmentTaxonomyItem> = {
  harassment: { ...SECTIONS.harassment, id: 'harassment' },
  load_shedding: { ...SECTIONS.load_shedding, id: 'load_shedding' },
  extortion: { ...SECTIONS.extortion, id: 'extortion' },
  public_safety: { ...SECTIONS.public_safety, id: 'public_safety' },
  road_transport: { ...SECTIONS.road_transport, id: 'road_transport' },
  illegal_occupation: { ...SECTIONS.illegal_occupation, id: 'illegal_occupation' },
  rickshaw: { ...SECTIONS.rickshaw, id: 'rickshaw' },
};

let cachedSubcategories: Record<string, SubcategoryOption[]> = {
  harassment: [...SEGMENT_SUBCATEGORIES.harassment],
  load_shedding: [...SEGMENT_SUBCATEGORIES.load_shedding],
  extortion: [...SEGMENT_SUBCATEGORIES.extortion],
  public_safety: [...SEGMENT_SUBCATEGORIES.public_safety],
  road_transport: [...SEGMENT_SUBCATEGORIES.road_transport],
  illegal_occupation: [...SEGMENT_SUBCATEGORIES.illegal_occupation],
  rickshaw: [...SEGMENT_SUBCATEGORIES.rickshaw],
};
let cachedPublishedForms: Record<string, PublicPublishedForm> = {};
let isPublishedConfigurationVerified = false;

let isFetched = false;
let isFetching = false;
let lastFetchedAt = 0;
const listeners = new Set<() => void>();

/** Server-published categories can be added without shipping new theme tokens. */
function fallbackForSegment(key: string): SegmentTaxonomyItem {
  const configured = SECTIONS[key as SectionKey];
  if (configured) return { ...configured, id: key };
  return {
    ...SECTIONS.public_safety,
    key: key as SectionKey,
    id: key,
    slug: `/${key.replaceAll('_', '-')}`,
    nameEn: key.replaceAll('_', ' '),
    nameBn: key,
    shortNameEn: key.replaceAll('_', ' '),
    shortNameBn: key,
    descriptionEn: '',
    descriptionBn: '',
  };
}

function notifyListeners() {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (e) {
      console.warn('[TaxonomyService] Listener error:', e);
    }
  });
}

export const TaxonomyService = {
  /**
   * Fetch active segments from Supabase with automatic fallback to local SECTIONS.
   */
  async fetchSegments(): Promise<Record<string, SegmentTaxonomyItem>> {
    if (!isSupabaseConfigured() || !supabase) {
      return cachedSegments;
    }

    try {
      const { data, error } = await supabase
        .from('segments')
        .select('id,slug,name_bn,name_en,active,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('[TaxonomyService] Error fetching segments from Supabase:', error.message);
        return cachedSegments;
      }

      if (data && Array.isArray(data)) {
        const nextSegments: Record<string, SegmentTaxonomyItem> = {};

        data.forEach((row: SupabaseSegmentRow) => {
          const key = row.id as SectionKey;
          const fallback = SECTIONS[key] || {
            key: row.id as SectionKey,
            slug: `/${row.id}`,
            nameBn: row.name_bn || row.id,
            nameEn: row.name_en || row.id,
            shortNameBn: row.name_bn || row.id,
            shortNameEn: row.name_en || row.id,
            descriptionBn: '',
            descriptionEn: '',
            primaryColor: '#3A7CA5',
            hoverColor: '#1B4D6B',
            bgColor: '#F0F3F9',
            borderColor: '#CCD5E8',
            textColor: '#1B4D6B',
            colors: {
              primary: '#3A7CA5',
              hover: '#1B4D6B',
              lightBg: '#F0F3F9',
              bgLight: '#F0F3F9',
              border: '#CCD5E8',
              text: '#1B4D6B',
              textSafe: '#1B4D6B',
              filledText: '#FFFFFF',
            },
          };

          nextSegments[row.id] = {
            ...fallback,
            id: row.id,
            slug: row.slug ? `/${row.slug.replace(/^\/+/, '')}` : fallback.slug,
            nameBn: row.name_bn || fallback.nameBn,
            nameEn: row.name_en || fallback.nameEn,
            sortOrder: typeof row.sort_order === 'number' ? row.sort_order : undefined,
          };
        });

        cachedSegments = nextSegments;
      }
    } catch (err) {
      console.warn('[TaxonomyService] Failed to query segments:', err);
    }

    return cachedSegments;
  },

  /**
   * Fetch active subcategories from Supabase with automatic fallback to local SEGMENT_SUBCATEGORIES.
   */
  async fetchSubcategories(): Promise<Record<string, SubcategoryOption[]>> {
    if (!isSupabaseConfigured() || !supabase) {
      return cachedSubcategories;
    }

    try {
      const { data, error } = await supabase
        .from('subcategories')
        .select('id,segment_id,name_bn,name_en,description_bn,description_en,category_group,is_sensitive,active,sort_order')
        .eq('active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.warn('[TaxonomyService] Error fetching subcategories from Supabase:', error.message);
        return cachedSubcategories;
      }

      if (data && Array.isArray(data)) {
        const nextSubcategories: Record<string, SubcategoryOption[]> = {};

        // Initialize with empty arrays for known keys so successful backend reads stay authoritative
        SECTION_KEYS.forEach((sec) => {
          nextSubcategories[sec] = [];
        });

        data.forEach((row: SupabaseSubcategoryRow) => {
          const segKey = row.segment_id;
          if (!nextSubcategories[segKey]) {
            nextSubcategories[segKey] = [];
          }

          // Check if local description or metadata exists for enrichment
          const localMatch = (SEGMENT_SUBCATEGORIES[segKey as SectionKey] || []).find(
            (s) => s.id === row.id
          );

          nextSubcategories[segKey].push({
            id: row.id,
            nameBn: row.name_bn || localMatch?.nameBn || row.id,
            nameEn: row.name_en || localMatch?.nameEn || row.id,
            descriptionBn: row.description_bn || localMatch?.descriptionBn,
            descriptionEn: row.description_en || localMatch?.descriptionEn,
            categoryGroup: row.category_group || localMatch?.categoryGroup,
            isSensitive: typeof row.is_sensitive === 'boolean' ? row.is_sensitive : localMatch?.isSensitive,
          });
        });

        cachedSubcategories = nextSubcategories;
      }
    } catch (err) {
      console.warn('[TaxonomyService] Failed to query subcategories:', err);
    }

    return cachedSubcategories;
  },

  /**
   * Read one atomic, published-only Public configuration snapshot. Direct form
   * tables deny client access; this RPC joins active categories/subcategories,
   * excluding disabled drafts even if historical form rows are still published.
   */
  async fetchTaxonomy(): Promise<{
    segments: Record<string, SegmentTaxonomyItem>;
    subcategories: Record<string, SubcategoryOption[]>;
  }> {
    if (isFetching) {
      return { segments: cachedSegments, subcategories: cachedSubcategories };
    }

    isFetching = true;
    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.rpc('get_public_reporting_configuration');
        if (error) throw error;
        const configuration = data as PublicReportingConfiguration;
        if (!configuration
          || !Array.isArray(configuration.segments)
          || !Array.isArray(configuration.subcategories)
          || !Array.isArray(configuration.forms)) {
          throw new Error('Invalid public reporting configuration response.');
        }

        const nextSegments: Record<string, SegmentTaxonomyItem> = {};
        for (const row of configuration.segments) {
          if (!row.id || !/^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(row.id)) continue;
          const key = row.id as SectionKey;
          const fallback = fallbackForSegment(key);
          nextSegments[key] = {
            ...fallback,
            id: key,
            slug: row.slug ? `/${row.slug.replace(/^\/+/, '')}` : fallback.slug,
            nameEn: row.nameEn || fallback.nameEn,
            nameBn: row.nameBn || fallback.nameBn,
            shortNameEn: row.shortNameEn || fallback.shortNameEn,
            shortNameBn: row.shortNameBn || fallback.shortNameBn,
            descriptionEn: row.descriptionEn || fallback.descriptionEn,
            descriptionBn: row.descriptionBn || fallback.descriptionBn,
            sortOrder: Number.isInteger(row.sortOrder) ? row.sortOrder : 999,
          };
        }
        if (Object.keys(nextSegments).length === 0) {
          throw new Error('Public reporting configuration contains no recognized active category.');
        }

        const nextSubcategories: Record<string, SubcategoryOption[]> = {};
        for (const key of Object.keys(nextSegments)) nextSubcategories[key] = [];
        for (const row of configuration.subcategories) {
          if (!nextSegments[row.segmentId] || !row.id) continue;
          nextSubcategories[row.segmentId].push({
            id: row.id,
            nameEn: row.nameEn || row.id,
            nameBn: row.nameBn || row.id,
            descriptionEn: row.descriptionEn || undefined,
            descriptionBn: row.descriptionBn || undefined,
            categoryGroup: row.categoryGroup || undefined,
            isSensitive: row.isSensitive === true,
          });
        }

        const activeIds = new Set(configuration.subcategories
          .filter((row) => Boolean(nextSegments[row.segmentId]))
          .map((row) => row.id));
        const nextForms: Record<string, PublicPublishedForm> = {};
        for (const form of configuration.forms) {
          if (!activeIds.has(form.subcategoryId) || !form.schemaId) continue;
          if (form.engineMode !== 'legacy' && form.engineMode !== 'schema') continue;
          if (!Array.isArray(form.fields)) continue;
          nextForms[form.subcategoryId] = form;
        }

        // Publish the three caches together so the composer never mixes revisions.
        cachedSegments = nextSegments;
        cachedSubcategories = nextSubcategories;
        cachedPublishedForms = nextForms;
        isPublishedConfigurationVerified = true;
      }
    } catch (err) {
      // Keep the last known view for discovery, but never mark its forms verified.
      isPublishedConfigurationVerified = false;
      cachedPublishedForms = {};
      console.warn('[TaxonomyService] Published configuration not available:', err);
    } finally {
      isFetched = true;
      isFetching = false;
      lastFetchedAt = Date.now();
      notifyListeners();
    }

    return { segments: cachedSegments, subcategories: cachedSubcategories };
  },

  /**
   * Synchronous accessor for currently cached segments.
   */
  getSegments(): Record<string, SegmentTaxonomyItem> {
    return cachedSegments;
  },

  /**
   * Synchronous accessor for a specific segment.
   */
  getSegment(key: SectionKey): SegmentTaxonomyItem {
    return cachedSegments[key] || fallbackForSegment(key);
  },

  /**
   * Synchronous accessor for currently cached subcategories for a given segment.
   */
  getSubcategories(segment: SectionKey): SubcategoryOption[] {
    return cachedSubcategories[segment] || SEGMENT_SUBCATEGORIES[segment] || [];
  },

  /**
   * Subcategories formatted for public feed filters (including the 'all' option).
   */
  getFeedSubcategories(segment: SectionKey): SubcategoryOption[] {
    const list = this.getSubcategories(segment);
    const allOption: SubcategoryOption = {
      id: 'all',
      nameBn: 'সকল রিপোর্ট',
      nameEn: 'All Reports',
    };
    return [allOption, ...list];
  },

  /**
   * Synchronous accessor for all cached subcategories across all segments.
   */
  getAllSubcategories(): Record<string, SubcategoryOption[]> {
    return cachedSubcategories;
  },

  getPublishedForms(): Record<string, PublicPublishedForm> {
    return cachedPublishedForms;
  },

  getPublishedForm(subcategoryId: string): PublicPublishedForm | undefined {
    return cachedPublishedForms[subcategoryId];
  },

  isPublishedConfigurationVerified(): boolean {
    return isPublishedConfigurationVerified;
  },

  /**
   * Subscribe to taxonomy updates.
   */
  subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

// Initiate background fetch on module load
if (typeof window !== 'undefined' && !isFetched) {
  TaxonomyService.fetchTaxonomy().catch(() => {});
}

/**
 * Custom React Hook to consume taxonomy data reactively.
 */
export function useTaxonomy() {
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = TaxonomyService.subscribe(() => {
      setTick((t) => t + 1);
    });

    if ((!isFetched || Date.now() - lastFetchedAt > 5000) && !isFetching) {
      TaxonomyService.fetchTaxonomy().catch(() => {});
    }

    // Read published-only SQL again when a visitor returns to the reporting
    // flow, so Admin publication/deactivation is not masked by a stale cache.
    const refreshIfStale = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastFetchedAt > 1000 && !isFetching) {
        TaxonomyService.fetchTaxonomy().catch(() => {});
      }
    };
    window.addEventListener('focus', refreshIfStale);
    document.addEventListener('visibilitychange', refreshIfStale);

    return () => {
      unsubscribe();
      window.removeEventListener('focus', refreshIfStale);
      document.removeEventListener('visibilitychange', refreshIfStale);
    };
  }, []);

  return {
    segments: TaxonomyService.getSegments(),
    subcategories: TaxonomyService.getAllSubcategories(),
    publishedForms: TaxonomyService.getPublishedForms(),
    isPublishedConfigurationVerified: TaxonomyService.isPublishedConfigurationVerified(),
    getSubcategories: (segment: SectionKey) => TaxonomyService.getSubcategories(segment),
    getFeedSubcategories: (segment: SectionKey) => TaxonomyService.getFeedSubcategories(segment),
    getSegment: (key: SectionKey) => TaxonomyService.getSegment(key),
    refreshTaxonomy: () => TaxonomyService.fetchTaxonomy(),
  };
}
