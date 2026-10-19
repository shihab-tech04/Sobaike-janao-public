const normalize = (value) => typeof value === 'string' ? value.trim().toLowerCase() : '';

/** Resolve a location route/filter to one of the existing 64 canonical districts. */
export const resolveCanonicalDistrict = (query, districts) => {
  const key = normalize(query);
  if (!key || !Array.isArray(districts)) return null;
  return districts.find((district) =>
    [district.id, district.nameEn, district.nameBn].some((label) => normalize(label) === key)
  ) ?? null;
};

/** A road name mentioning Dhaka does not make a Feni report a Dhaka report. */
export const reportIsInDistrict = (report, district) => {
  if (!report || !district) return false;
  const names = new Set([district.id, district.nameEn, district.nameBn].map(normalize));
  return [report.districtEn, report.districtBn].some((label) => {
    const value = normalize(label);
    return value !== '' && names.has(value);
  });
};
