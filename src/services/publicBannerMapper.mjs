const textOr = (value, fallback) =>
  typeof value === 'string' && value.trim() ? value.trim() : fallback;

const safeImageSource = (value, fallback, trustedOrigins) => {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const source = value.trim();

  if (source.startsWith('/') && !source.startsWith('//') && !source.split('/').includes('..')) {
    return source;
  }

  try {
    const url = new URL(source);
    return url.protocol === 'https:' && trustedOrigins.includes(url.origin) ? source : fallback;
  } catch {
    return fallback;
  }
};

/** Normalizes the published-only RPC response without trusting dynamic category keys or image URLs. */
export function normalizePublishedBannerRows(rows, fallbackContent, trustedOrigins = []) {
  const categoryKeys = Object.keys(fallbackContent);
  if (!Array.isArray(rows)) return { contentByKey: {}, visibleKeys: [] };

  const normalizedRows = rows.flatMap((row) => {
    const key = row?.category_key;
    const content = row?.content;
    if (!categoryKeys.includes(key) || !content || typeof content !== 'object') return [];
    if (content.isActive !== true || content.showOnHome !== true) return [];

    const fallback = fallbackContent[key];
    const parsedSortOrder = Number(content.sortOrder);
    return [{
      key,
      sortOrder: Number.isInteger(parsedSortOrder) && parsedSortOrder > 0 ? parsedSortOrder : categoryKeys.indexOf(key) + 1,
      content: {
        ...fallback,
        titleBn: textOr(content.titleBn, fallback.titleBn),
        titleEn: textOr(content.titleEn, fallback.titleEn),
        mobileDescriptionBn: textOr(content.mobileDescriptionBn, fallback.mobileDescriptionBn),
        mobileDescriptionEn: textOr(content.mobileDescriptionEn, fallback.mobileDescriptionEn),
        tabletDescriptionBn: textOr(content.tabletDescriptionBn, fallback.tabletDescriptionBn),
        tabletDescriptionEn: textOr(content.tabletDescriptionEn, fallback.tabletDescriptionEn),
        desktopDescriptionBn: textOr(content.desktopDescriptionBn, fallback.desktopDescriptionBn),
        desktopDescriptionEn: textOr(content.desktopDescriptionEn, fallback.desktopDescriptionEn),
        illustrationSrc: safeImageSource(content.illustrationSrc, fallback.illustrationSrc, trustedOrigins),
        primaryCtaBn: textOr(content.primaryCtaBn, fallback.primaryCtaBn),
        primaryCtaEn: textOr(content.primaryCtaEn, fallback.primaryCtaEn),
      },
    }];
  });

  normalizedRows.sort((a, b) => a.sortOrder - b.sortOrder || categoryKeys.indexOf(a.key) - categoryKeys.indexOf(b.key));
  return {
    contentByKey: Object.fromEntries(normalizedRows.map(({ key, content }) => [key, content])),
    visibleKeys: normalizedRows.map(({ key }) => key),
  };
}
