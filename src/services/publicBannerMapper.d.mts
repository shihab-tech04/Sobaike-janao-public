import type { CategoryBannerContent } from '../data/bannerContent';

export interface PublishedBannerSet {
  contentByKey: Partial<Record<string, CategoryBannerContent>>;
  visibleKeys: string[];
}

export function normalizePublishedBannerRows(
  rows: unknown,
  fallbackContent: Record<string, CategoryBannerContent>,
  trustedOrigins?: string[]
): PublishedBannerSet;
