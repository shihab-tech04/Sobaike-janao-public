import React from 'react';
import { toBanglaDigits } from '../../utils/formatters';

interface HeatmapLegendProps {
  language: 'bn' | 'en';
  maxDensity?: number;
  className?: string;
}

export const HeatmapLegend: React.FC<HeatmapLegendProps> = ({
  language,
  maxDensity = 1,
  className = '',
}) => {
  return (
    <div
      id="heatmap-legend"
      role="region"
      aria-label={language === 'bn' ? 'হিটম্যাপ নির্দেশিকা' : 'Heatmap legend'}
      className={`bg-ui-surface/95 backdrop-blur-md border border-ui-stroke-subtle rounded-xl p-2 sm:p-2.5 shadow-2xs flex flex-col gap-1 text-[11px] max-w-[170px] sm:max-w-[190px] select-none ${className}`}
    >
      <div className="flex items-center justify-between">
        <span className="font-bold text-ui-content-primary text-[10px] sm:text-[11px] uppercase tracking-wider">
          {language === 'bn' ? 'প্রতিবেদনের ঘনত্ব' : 'Report density'}
        </span>
      </div>

      {/* Continuous Gradient Bar */}
      <div
        aria-hidden="true"
        className="h-2 w-full rounded-full border border-ui-stroke-subtle/50"
        style={{
          background:
            'linear-gradient(to right, #2563EB 0%, #06B6D4 30%, #10B981 55%, #F59E0B 80%, #EF4444 100%)',
        }}
      />

      {/* Range Labels */}
      <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-semibold text-ui-content-secondary px-0.5">
        <span>{language === 'bn' ? '১' : '1'}</span>
        <span>{language === 'bn' ? toBanglaDigits(Math.ceil(maxDensity / 2)) : Math.ceil(maxDensity / 2)}</span>
        <span>{language === 'bn' ? toBanglaDigits(maxDensity) : maxDensity}</span>
      </div>

      {/* Responsible Interpretation Note */}
      <p className="text-[9.5px] sm:text-[10px] leading-tight text-ui-content-muted pt-1 border-t border-ui-stroke-subtle/50">
        {language === 'bn'
          ? 'জেলাভিত্তিক প্রতিবেদনের আনুমানিক ঘনত্ব, ঘটনার নির্দিষ্ট স্থান বা সত্যতা নয়।'
          : 'District-level approximation, not exact incidents, severity or verification.'}
      </p>
    </div>
  );
};

export default HeatmapLegend;
