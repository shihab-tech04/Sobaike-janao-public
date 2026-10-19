import { useEffect, useState } from 'react';
import { CANONICAL_BANNER_CONTENT, CategoryBannerContent } from '../data/bannerContent';
import { SECTION_KEYS, SectionKey } from '../theme/tokens';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  normalizePublishedBannerRows,
  PublishedBannerSet,
} from './publicBannerMapper.mjs';

let publishedCache: PublishedBannerSet | null = null;
let publishedRequest: Promise<PublishedBannerSet | null> | null = null;

export const PublicBannerService = {
  async fetchPublished(): Promise<PublishedBannerSet | null> {
    if (!isSupabaseConfigured() || !supabase) return null;
    if (publishedCache) return publishedCache;
    if (publishedRequest) return publishedRequest;

    publishedRequest = (async () => {
      try {
        const { data, error } = await supabase!.rpc('get_public_site_banners');
        if (error) {
          console.warn('[PublicBannerService] Published banner read failed:', error.message);
          return null;
        }

        const normalized = normalizePublishedBannerRows(
          data,
          CANONICAL_BANNER_CONTENT
        );
        publishedCache = normalized;
        return normalized;
      } catch (error) {
        console.warn('[PublicBannerService] Published banner request failed:', error);
        return null;
      }
    })().finally(() => {
      publishedRequest = null;
    });

    return publishedRequest;
  },
};

export const usePublicBanners = () => {
  const [published, setPublished] = useState<PublishedBannerSet | null>(publishedCache);

  useEffect(() => {
    let mounted = true;
    void PublicBannerService.fetchPublished().then((result) => {
      if (mounted && result) setPublished(result);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const fallbackContent = CANONICAL_BANNER_CONTENT as Record<SectionKey, CategoryBannerContent>;
  const fallbackVisibleKeys = SECTION_KEYS;

  return {
    contentByKey: published?.contentByKey ?? fallbackContent,
    visibleKeys: (published?.visibleKeys ?? fallbackVisibleKeys) as SectionKey[],
    isPublished: published !== null,
  };
};

