import type { DistrictInfo } from '../data/districts';
import type { ReportItem } from '../types/report';

export declare function resolveCanonicalDistrict(query: string, districts: readonly DistrictInfo[]): DistrictInfo | null;
export declare function reportIsInDistrict(report: Pick<ReportItem, 'districtEn' | 'districtBn'>, district: DistrictInfo): boolean;
