import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
// leaflet.heat is a legacy global-L plugin. A static ESM import evaluates
// before this module can set window.L, crashing the lazy Explore route.

import { ReportItem } from '../../types/report';
import { SectionKey } from '../../theme/tokens';
import { BANGLADESH_DISTRICTS, DistrictInfo } from '../../data/districts';
import { toBanglaDigits } from '../../utils/formatters';
import { MapIcon } from './MapIcon';
import { HeatmapLegend } from './HeatmapLegend';

export interface PublicIncidentMapProps {
  reports: ReportItem[];
  language: 'bn' | 'en';
  selectedSection: SectionKey | 'all';
  selectedDistrict: string;
  onSelectDistrict: (district: string) => void;
  onResetFilters?: () => void;
}

const BANGLADESH_CENTER: [number, number] = [23.685, 90.3563];
const BANGLADESH_BOUNDS: L.LatLngBoundsExpression = [
  [20.7, 88.0],
  [26.6, 92.7],
];

export const PublicIncidentMap: React.FC<PublicIncidentMapProps> = ({
  reports,
  language,
  selectedDistrict,
  onSelectDistrict,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const heatLayerRef = useRef<L.HeatLayer | null>(null);
  const districtLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [isMapReady, setIsMapReady] = useState(false);
  const [isHeatReady, setIsHeatReady] = useState(false);
  const [mapMode, setMapMode] = useState<'density' | 'points' | 'districts'>('density');

  useEffect(() => {
    (window as any).L = L;
    let active = true;
    import('leaflet.heat').then(() => {
      if (active) setIsHeatReady(true);
    }).catch((err) => console.warn('[PublicIncidentMap] Heatmap plugin unavailable:', err));
    return () => { active = false; };
  }, []);

  const isInitialMount = useRef(true);

  // Only district centroids are mapped; reporter and incident exact coordinates
  // are intentionally ignored even if a caller accidentally supplies them.
  const { districtCounts, totalMappedInDistricts } = useMemo(() => {
    const map = new Map<string, { district: DistrictInfo; count: number }>();
    let mappedInDist = 0;

    reports.forEach((rep) => {
      const dEn = (rep.districtEn || '').toLowerCase().trim();
      const dBn = (rep.districtBn || '').trim();
      const found = BANGLADESH_DISTRICTS.find(
        (d) =>
          d.nameEn.toLowerCase() === dEn ||
          d.nameBn === dBn ||
          d.id === dEn
      );
      if (found && !isNaN(Number(found.lat)) && !isNaN(Number(found.lng))) {
        mappedInDist += 1;
        if (!map.has(found.id)) {
          map.set(found.id, { district: found, count: 0 });
        }
        map.get(found.id)!.count += 1;
      }
    });

    const list = Array.from(map.values());
    list.sort((a, b) => b.count - a.count);

    return {
      districtCounts: list,
      totalMappedInDistricts: mappedInDist,
    };
  }, [reports]);

  const totalReportsCount = reports.length;
  const mappedCount = totalMappedInDistricts;
  const isDistrictFallback = reports.length > 0;

  // Heat points represent district-level aggregates, never exact incidents.
  const { heatPoints, maxHeatWeight } = useMemo(() => {
    if (districtCounts.length) {
      const pts: Array<[number, number, number]> = [];
      for (const dc of districtCounts) {
        if (dc.district) {
          const lat = Number(dc.district.lat);
          const lng = Number(dc.district.lng);
          const count = Number(dc.count) || 1;
          if (!isNaN(lat) && !isNaN(lng) && isFinite(lat) && isFinite(lng)) {
            pts.push([lat, lng, count]);
          }
        }
      }
      const rawMax = districtCounts.length > 0 ? Math.max(...districtCounts.map((dc) => dc.count)) : 1;
      const maxVal = Math.max(rawMax, 1);
      return { heatPoints: pts, maxHeatWeight: maxVal };
    }

    return { heatPoints: [], maxHeatWeight: 1 };
  }, [districtCounts]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: BANGLADESH_CENTER,
      zoom: 7.2,
      minZoom: 6,
      maxZoom: 16,
      maxBounds: [
        [20.25, 87.4],
        [27.0, 93.1],
      ],
      maxBoundsViscosity: 1,
      zoomSnap: 0.25,
      worldCopyJump: false,
      zoomControl: false,
      attributionControl: true,
    });

    // CARTO's former keyless endpoint now requires a key. OSM's official raster
    // endpoint supports low-volume browsing with visible attribution, a normal
    // Referer and browser caching. Never prefetch tiles or suppress the Referer.
    const tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>',
      noWrap: true,
      maxZoom: 19,
    }).addTo(map);

    tileLayerRef.current = tileLayer;
    mapInstanceRef.current = map;
    setIsMapReady(true);

    return () => {
      if (heatLayerRef.current && mapInstanceRef.current) {
        try {
          mapInstanceRef.current.removeLayer(heatLayerRef.current);
        } catch {}
        heatLayerRef.current = null;
      }
      districtLayerRef.current?.remove();
      districtLayerRef.current = null;
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
    };
  }, []);

  // Update Heatmap Layer whenever heatPoints change
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;

    // Clean up existing heat layer
    if (heatLayerRef.current) {
      try {
        map.removeLayer(heatLayerRef.current);
      } catch {}
      heatLayerRef.current = null;
    }

    const safePoints = heatPoints.filter(
      (p) =>
        Array.isArray(p) &&
        typeof p[0] === 'number' &&
        typeof p[1] === 'number' &&
        !isNaN(p[0]) &&
        !isNaN(p[1]) &&
        isFinite(p[0]) &&
        isFinite(p[1])
    );

    if (isHeatReady && mapMode === 'density' && safePoints.length > 0 && typeof (L as any).heatLayer === 'function') {
      try {
        const heatLayer = (L as any).heatLayer(safePoints, {
          radius: 36,
          blur: 24,
          maxZoom: 14,
          max: maxHeatWeight || 1,
          minOpacity: 0.55,
          gradient: {
            0.2: '#2563EB',
            0.4: '#06B6D4',
            0.6: '#10B981',
            0.8: '#F59E0B',
            1.0: '#EF4444',
          },
        });

        heatLayer.addTo(map);
        heatLayerRef.current = heatLayer;
      } catch (err) {
        console.warn('[PublicIncidentMap] Heatmap layer creation error:', err);
      }
    }
  }, [heatPoints, maxHeatWeight, mapMode, isMapReady, isHeatReady]);

  // Marker modes show administrative centroids, not invented polygons or pins
  // implying precise incident locations. Districts is selectable even at zero.
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !isMapReady) return;
    districtLayerRef.current?.remove();
    districtLayerRef.current = null;
    if (mapMode === 'density') return;
    const counts = new Map(districtCounts.map(({ district, count }) => [district.id, count]));
    const list = mapMode === 'districts'
      ? BANGLADESH_DISTRICTS
      : districtCounts.map(({ district }) => district);
    const layer = L.layerGroup();
    for (const district of list) {
      const count = counts.get(district.id) ?? 0;
      const selected = selectedDistrict.toLowerCase() === district.nameEn.toLowerCase() ||
        selectedDistrict.toLowerCase() === district.id;
      const marker = L.circleMarker([district.lat, district.lng], {
        radius: Math.min(15, 5 + Math.sqrt(count) * 2 + (selected ? 2 : 0)),
        color: selected ? '#f59e0b' : '#0369a1',
        weight: selected ? 3 : 2,
        fillColor: count ? '#0ea5e9' : '#94a3b8',
        fillOpacity: count ? 0.75 : 0.45,
      });
      marker.bindTooltip(`${language === 'bn' ? district.nameBn : district.nameEn}: ${language === 'bn' ? toBanglaDigits(count) : count} ${language === 'bn' ? 'প্রতিবেদন' : 'reports'}`);
      marker.on('click', () => onSelectDistrict(district.nameEn));
      marker.addTo(layer);
    }
    layer.addTo(map);
    districtLayerRef.current = layer;
    return () => {
      layer.remove();
      if (districtLayerRef.current === layer) districtLayerRef.current = null;
    };
  }, [mapMode, districtCounts, selectedDistrict, language, onSelectDistrict, isMapReady]);

  // Center on Selected District when changed from dropdown or district panel
  useEffect(() => {
    if (!mapInstanceRef.current || !isMapReady) return;

    const map = mapInstanceRef.current;

    if (isInitialMount.current) {
      isInitialMount.current = false;
      if (selectedDistrict === 'all') {
        try {
          const size = map.getSize();
          if (!size || size.x <= 50 || size.y <= 50) {
            map.invalidateSize();
          }
          map.fitBounds(BANGLADESH_BOUNDS, {
            padding: [16, 16],
            animate: false,
          });
        } catch (err) {
          console.warn('[PublicIncidentMap] initial fitBounds error:', err);
          try {
            map.fitBounds(BANGLADESH_BOUNDS, { animate: false });
          } catch {
            try {
              map.setView(BANGLADESH_CENTER, 7.2);
            } catch {}
          }
        }
        return;
      }
    }

    if (selectedDistrict === 'all') {
      try {
        const size = map.getSize();
        if (!size || size.x <= 50 || size.y <= 50) {
          map.invalidateSize();
          map.setView(BANGLADESH_CENTER, 7.2);
        } else {
          map.flyToBounds(BANGLADESH_BOUNDS, {
            padding: [16, 16],
            duration: 0.8,
          });
        }
      } catch (err) {
        console.warn('[PublicIncidentMap] flyToBounds error:', err);
        try {
          map.setView(BANGLADESH_CENTER, 7.2);
        } catch {}
      }
    } else {
      const found = BANGLADESH_DISTRICTS.find(
        (d) =>
          d.nameEn.toLowerCase() === selectedDistrict.toLowerCase() ||
          d.nameBn === selectedDistrict ||
          d.id === selectedDistrict.toLowerCase()
      );
      if (
        found &&
        typeof found.lat === 'number' &&
        typeof found.lng === 'number' &&
        !isNaN(found.lat) &&
        !isNaN(found.lng) &&
        isFinite(found.lat) &&
        isFinite(found.lng)
      ) {
        try {
          const size = map.getSize();
          if (!size || size.x <= 50 || size.y <= 50) {
            map.invalidateSize();
          }
          map.flyTo([found.lat, found.lng], 9, {
            duration: 0.9,
          });
        } catch (err) {
          console.warn('[PublicIncidentMap] flyTo error:', err);
          try {
            map.setView([found.lat, found.lng], 9);
          } catch {}
        }
      }
    }
  }, [selectedDistrict, isMapReady]);

  // Map Controls
  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.zoomIn();
      } catch {}
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      try {
        mapInstanceRef.current.zoomOut();
      } catch {}
    }
  };

  const handleResetView = () => {
    if (mapInstanceRef.current) {
      try {
        const map = mapInstanceRef.current;
        const size = map.getSize();
        if (!size || size.x <= 50 || size.y <= 50) {
          map.invalidateSize();
          map.setView(BANGLADESH_CENTER, 7.2);
        } else {
          map.flyToBounds(BANGLADESH_BOUNDS, {
            padding: [16, 16],
            duration: 0.8,
          });
        }
      } catch {
        mapInstanceRef.current?.setView(BANGLADESH_CENTER, 7.2);
      }
    }
    onSelectDistrict('all');
  };

  // Generate accessible summary text
  const accessibleSummary = useMemo(() => {
    if (totalReportsCount === 0) {
      return language === 'bn'
        ? 'বর্তমান ফিল্টারে কোনো প্রতিবেদন নেই।'
        : 'No reports match the current filters.';
    }

    const selectedDistrictObj =
      selectedDistrict !== 'all'
        ? BANGLADESH_DISTRICTS.find(
            (d) =>
              d.nameEn.toLowerCase() === selectedDistrict.toLowerCase() ||
              d.nameBn === selectedDistrict ||
              d.id === selectedDistrict.toLowerCase()
          )
        : null;

    if (selectedDistrictObj) {
      const fallbackSuffix = isDistrictFallback
        ? language === 'bn'
          ? ' সুনির্দিষ্ট অবস্থান না থাকায় জেলা অনুযায়ী প্রতিবেদন দেখানো হচ্ছে।'
          : ' Reports are shown by district because precise incident locations are unavailable.'
        : '';

      if (language === 'bn') {
        return `${selectedDistrictObj.nameBn} জেলা: ${toBanglaDigits(totalReportsCount)}টি প্রতিবেদনের মধ্যে ${toBanglaDigits(mappedCount)}টি মানচিত্রে দেখানো হয়েছে।${fallbackSuffix}`;
      }
      return `${selectedDistrictObj.nameEn}: ${mappedCount} of ${totalReportsCount} reports mapped.${fallbackSuffix}`;
    }

    if (isDistrictFallback) {
      if (language === 'bn') {
        const totalBn = toBanglaDigits(totalReportsCount);
        const mappedBn = toBanglaDigits(mappedCount);
        return `জেলা-ভিত্তিক: ${totalBn}টি প্রতিবেদনের মধ্যে ${mappedBn}টি মানচিত্রে দেখানো হয়েছে। সুনির্দিষ্ট অবস্থান না থাকায় জেলা অনুযায়ী প্রতিবেদন দেখানো হচ্ছে।`;
      }
      return `District-level: ${mappedCount} of ${totalReportsCount} reports are mapped. Reports are shown by district because precise incident locations are unavailable.`;
    }

    if (language === 'bn') {
      const totalBn = toBanglaDigits(totalReportsCount);
      const mappedBn = toBanglaDigits(mappedCount);
      return `${totalBn}টি প্রতিবেদনের মধ্যে ${mappedBn}টি মানচিত্রে দেখানো হয়েছে।`;
    } else {
      return `${mappedCount} of ${totalReportsCount} reports are mapped.`;
    }
  }, [totalReportsCount, mappedCount, isDistrictFallback, selectedDistrict, language]);

  // Keep Leaflet properly sized when container dimensions change
  useEffect(() => {
    if (!mapContainerRef.current || !mapInstanceRef.current) return;
    const observer = new ResizeObserver(() => {
      mapInstanceRef.current?.invalidateSize();
    });
    observer.observe(mapContainerRef.current);
    return () => observer.disconnect();
  }, [isMapReady]);

  return (
    <div className="space-y-2">
      <div id="explore-map-modes" role="group" aria-label={language === 'bn' ? 'মানচিত্রের ধরন' : 'Map display mode'} className="flex flex-wrap gap-2">
        {(['density', 'points', 'districts'] as const).map((mode) => (
          <button
            key={mode}
            id={`explore-map-mode-${mode}`}
            type="button"
            aria-pressed={mapMode === mode}
            onClick={() => setMapMode(mode)}
            className={`min-h-[44px] px-3 py-2 rounded-xl border text-[13px] font-semibold focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus ${mapMode === mode ? 'bg-ui-action-bg text-ui-action-text border-ui-action-bg' : 'bg-ui-surface text-ui-content-secondary border-ui-stroke-subtle'}`}
          >
            {language === 'bn' ? { density: 'ঘনত্ব', points: 'পয়েন্ট', districts: 'জেলা' }[mode] : { density: 'Density', points: 'Points', districts: 'Districts' }[mode]}
          </button>
        ))}
      </div>
      {/* 1. Accessible Text Summary (Above map) */}
      <div
        role="status"
        aria-live="polite"
        className="px-3 py-2 sm:px-3.5 sm:py-2 rounded-xl bg-ui-surface-subtle border border-ui-stroke-subtle text-[12px] sm:text-[13px] text-ui-content-secondary flex items-start sm:items-center justify-between gap-2 shadow-2xs"
      >
        <div className="flex items-start sm:items-center gap-2 min-w-0 w-full">
          <MapIcon name="info" size="xs" className="text-ui-content-muted shrink-0 mt-0.5 sm:mt-0" ariaHidden={true} />
          <span className="break-words leading-snug">{accessibleSummary}</span>
        </div>
      </div>

      {/* 2. Map Container & Visual Overlays */}
      <div
        id="public-heatmap-card"
        role="region"
        aria-label={language === 'bn' ? 'বাংলাদেশের জেলা-ভিত্তিক প্রতিবেদন মানচিত্র' : 'Bangladesh district-level reports map'}
        className="relative isolate z-0 rounded-2xl border border-ui-stroke-subtle bg-ui-surface shadow-xs overflow-hidden flex flex-col h-[360px] sm:h-[420px] md:h-[600px] md:min-h-[600px]"
      >
        {/* Zoom & Recenter Controls (Top-Right) */}
        <div className="absolute top-3.5 right-3.5 z-[500] flex flex-col gap-1.5 shadow-sm">
          <button
            type="button"
            onClick={handleZoomIn}
            title={language === 'bn' ? 'জুম ইন' : 'Zoom In'}
            aria-label={language === 'bn' ? 'জুম ইন' : 'Zoom In'}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-ui-surface/95 backdrop-blur-md border border-ui-stroke-subtle text-ui-content-primary flex items-center justify-center cursor-pointer transition-all shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus active:scale-95"
          >
            <MapIcon name="plus" size="sm" />
          </button>

          <button
            type="button"
            onClick={handleZoomOut}
            title={language === 'bn' ? 'জুম আউট' : 'Zoom Out'}
            aria-label={language === 'bn' ? 'জুম আউট' : 'Zoom Out'}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-ui-surface/95 backdrop-blur-md border border-ui-stroke-subtle text-ui-content-primary flex items-center justify-center cursor-pointer transition-all shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus active:scale-95"
          >
            <MapIcon name="minus" size="sm" />
          </button>

          <button
            type="button"
            onClick={handleResetView}
            title={language === 'bn' ? 'সারাদেশ ভিউ' : 'Reset View'}
            aria-label={language === 'bn' ? 'সারাদেশ ভিউ' : 'Reset View'}
            className="min-w-[44px] min-h-[44px] rounded-xl bg-ui-surface/95 backdrop-blur-md border border-ui-stroke-subtle text-ui-content-primary flex items-center justify-center cursor-pointer transition-all shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-ui-focus active:scale-95"
          >
            <MapIcon name="reset" size="sm" />
          </button>
        </div>

        {/* Heatmap Legend (Top-Left) */}
        {mapMode === 'density' && totalReportsCount > 0 && (
          <div className="absolute top-3.5 left-3.5 z-[500]">
            <HeatmapLegend language={language} maxDensity={maxHeatWeight} />
          </div>
        )}

        {/* Real Leaflet Map Container */}
        <div
          ref={mapContainerRef}
          className="w-full flex-1 z-10 h-[360px] sm:h-[420px] md:h-[600px]"
          style={{ backgroundColor: 'var(--ui-surface-subtle)' }}
        />

        {/* Empty State Banner if 0 reports match active filters */}
        {totalReportsCount === 0 && (
          <div role="status" className="absolute bottom-8 left-3 right-3 z-[500] bg-ui-surface/95 border border-ui-stroke-subtle rounded-lg p-2 text-center text-[12px] text-ui-content-secondary pointer-events-none">
            {language === 'bn' ? 'এই ফিল্টারে প্রতিবেদন নেই। জেলা মোডে সব ৬৪টি জেলা বেছে নিতে পারবেন।' : 'No matching reports. Choose Districts to explore all 64 districts.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PublicIncidentMap;
