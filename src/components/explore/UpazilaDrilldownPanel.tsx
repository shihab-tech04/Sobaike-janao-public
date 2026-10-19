import React, { useMemo, useState, useEffect } from 'react';
import { getDistrictByStoredName } from '../../data/districts';
import { getUpazilasByDistrict } from '../../data/upazilas';
import { SearchableSelect } from '../ui/SearchableSelect';
import { toBanglaDigits } from '../../utils/formatters';

interface UpazilaDrilldownPanelProps {
  selectedDistrict: string;
  language: 'bn' | 'en';
}

/** Registry drilldown only. Public report RPCs do not yet expose a canonical
 * upazila ID, so selecting one must never imply a precise report count/pin. */
export const UpazilaDrilldownPanel: React.FC<UpazilaDrilldownPanelProps> = ({
  selectedDistrict,
  language,
}) => {
  const [selectedUpazila, setSelectedUpazila] = useState('all');
  const district = useMemo(() => getDistrictByStoredName(selectedDistrict), [selectedDistrict]);
  const upazilas = useMemo(() => district ? getUpazilasByDistrict(district.id) : [], [district]);

  useEffect(() => setSelectedUpazila('all'), [district?.id]);

  if (!district) return null;
  const selected = upazilas.find((u) => u.id === selectedUpazila);
  return (
    <section id="explore-upazila-drilldown" className="rounded-2xl bg-ui-surface border border-ui-stroke-subtle p-3.5 sm:p-4 space-y-3">
      <div className="space-y-1">
        <h3 className="font-bold text-[15px] text-ui-content-primary">
          {language === 'bn' ? `${district.nameBn} জেলার থানা / উপজেলা` : `Thanas / upazilas in ${district.nameEn}`}
        </h3>
        <p className="text-[12px] text-ui-content-secondary">
          {language === 'bn'
            ? `${toBanglaDigits(upazilas.length)}টি নিবন্ধিত থানা / উপজেলা। অবস্থান চিহ্নিত করার জন্য এই তালিকা; উপ-জেলাভিত্তিক প্রতিবেদন সংখ্যা উপলব্ধ নয়।`
            : `${upazilas.length} registered thanas / upazilas. This is an administrative directory; reports are counted at district level only.`}
        </p>
      </div>
      <SearchableSelect
        id="explore-upazila-select"
        label={language === 'bn' ? 'থানা / উপজেলা খুঁজুন' : 'Find a thana / upazila'}
        value={selectedUpazila}
        onChange={setSelectedUpazila}
        searchPlaceholder={language === 'bn' ? 'নাম দিয়ে খুঁজুন...' : 'Search by name...'}
        noResultsText={language === 'bn' ? 'কোনো মিল পাওয়া যায়নি' : 'No matching location'}
        options={[
          { value: 'all', label: language === 'bn' ? 'সব থানা / উপজেলা' : 'All thanas / upazilas' },
          ...upazilas.map((u) => ({
            value: u.id,
            label: language === 'bn' ? u.nameBn : u.nameEn,
            keywords: [u.nameBn, u.nameEn],
          })),
        ]}
      />
      {selected && (
        <p id="explore-upazila-selection" role="status" className="text-[13px] text-ui-content-secondary bg-ui-surface-subtle rounded-xl p-3">
          {language === 'bn'
            ? `${selected.nameBn} নির্বাচিত। এই এলাকার নির্ভরযোগ্য পৃথক প্রতিবেদন গণনা পাওয়া যায়নি; জেলাভিত্তিক ফলাফল দেখানো হচ্ছে।`
            : `${selected.nameEn} selected. No verified subdistrict report count is available; results remain district-wide.`}
        </p>
      )}
    </section>
  );
};
