import { MapContainer, TileLayer, Popup, SVGOverlay, useMap } from 'react-leaflet';
import { useEffect, useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Header from './Header';
import Footer from './Footer';

// Component to handle fit bounds inside MapContainer
const MapController = ({ bounds, onFitBoundsRef }) => {
  const map = useMap();

  useEffect(() => {
    if (onFitBoundsRef) {
      const handler = () => {
        if (bounds) {
          map.fitBounds(bounds, { padding: [50, 50] });
        }
      };
      onFitBoundsRef.current = handler;
    }
  }, [map, bounds, onFitBoundsRef]);

  return null;
};

// Custom component to render geoJson regions as Leaflet layers
const GeoJsonRegions = ({ geoJsonData, yearData, colorScale, selectedPercentile }) => {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!map || !geoJsonData || !yearData || yearData.length === 0) return;

    // Remove existing layer group if any
    if (layerGroupRef.current) {
      map.removeLayer(layerGroupRef.current);
    }

    // Create a new layer group
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;

    // Create a map of kgs to score data
    const scoreMap = new Map();
    yearData.forEach(item => {
      scoreMap.set(item.kgs, item);
    });

    // Function to convert geoJson coordinates to Leaflet format
    // geoJson uses [lng, lat] format, Leaflet uses [lat, lng]
    const geoJsonToLeaflet = (coordinates, type) => {
      if (type === 'Polygon') {
        // Polygon: array of rings, each ring is an array of [lng, lat]
        return coordinates.map(ring => 
          ring.map(coord => [coord[1], coord[0]])
        );
      } else if (type === 'MultiPolygon') {
        // MultiPolygon: array of polygons
        return coordinates.map(polygon =>
          polygon.map(ring =>
            ring.map(coord => [coord[1], coord[0]])
          )
        );
      }
      return [];
    };

    // Render each region from geoJson features
    geoJsonData.features.forEach((feature) => {
      const kgs = feature.properties.AGS;
      const scoreData = scoreMap.get(kgs);

      if (!scoreData) return; // Skip regions without data

      const geometry = feature.geometry;
      if (!geometry || !geometry.coordinates) return;

      const leafletCoords = geoJsonToLeaflet(geometry.coordinates, geometry.type);
      if (leafletCoords.length === 0) return; // Skip if no valid coordinates

      // Select the appropriate score and missing data flag based on percentile
      let score, isMissingData;
      if (selectedPercentile === 5) {
        score = scoreData.score5;
        isMissingData = scoreData.isMissingData5;
      } else if (selectedPercentile === 95) {
        score = scoreData.score95;
        isMissingData = scoreData.isMissingData95;
      } else {
        score = scoreData.score50;
        isMissingData = scoreData.isMissingData50;
      }

      const color = colorScale(score);

      // Create polygon from geoJson coordinates
      // Leaflet's L.polygon handles both simple polygons and multi-polygons
      const polygon = L.polygon(leafletCoords, {
        fillColor: isMissingData ? "#444" : color,
        fillOpacity: 0.7,
        color: '#333',
        weight: 1,
        smoothFactor: 0.5
      });

      polygon.bindPopup(`
        <div style="padding: 8px;">
          <div style="font-weight: bold; font-size: 16px;">${scoreData.region}</div>
          <div style="font-size: 12px; color: #666;">ID: ${scoreData.regionId}</div>
          <div style="font-size: 14px;">Year: ${scoreData.year}</div>
          <div style="font-size: 14px;">
            Score (${selectedPercentile}% Percentile): <span style="color: ${isMissingData ? '#444' : score > 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">
              ${isMissingData ? "N/A" : score.toFixed(3)}
            </span>
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            ${score > 0.5 ? '✓ Buying favorable' :
          score < -0.5 ? '✓ Renting favorable' :
            isMissingData ? '' :
              '≈ Neutral'}
          </div>
        </div>
      `);

      polygon.addTo(layerGroup);
    });

    // Cleanup function
    return () => {
      if (layerGroupRef.current) {
        map.removeLayer(layerGroupRef.current);
      }
    };
  }, [map, geoJsonData, yearData, colorScale, selectedPercentile]);

  return null;
};

const GermanyHeatmap = () => {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2023);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [showBasemap, setShowBasemap] = useState(false);
  const [colorScheme, setColorScheme] = useState('navy-silver-amber');
  const [selectedPercentile, setSelectedPercentile] = useState(50);
  const fitBoundsRef = useRef(null);

  // Column names from CSV
  const SCORE_5_COL = 'Score (5% Perzentil)';
  const SCORE_50_COL = 'Score (50% Perzentil)';
  const SCORE_95_COL = 'Score (95% Perzentil)';

  // Define color schemes
  const colorSchemes = {
    // 2-color schemes
    'blue-red': {
      name: 'Blue-Red (2 colors)',
      domain: [-1, 1],
      range: ['#0000ff', '#ff0000'],
      labels: { low: 'Blue (Rent)', high: 'Red (Buy)' }
    },
    'purple-orange': {
      name: 'Purple-Orange (2 colors)',
      domain: [-1, 1],
      range: ['#9b59b6', '#ff8c00'],
      labels: { low: 'Purple (Rent)', high: 'Orange (Buy)' }
    },
    'red-green': {
      name: 'Red-Green (2 colors)',
      domain: [-1, 1],
      range: ['#e74c3c', '#27ae60'],
      labels: { low: 'Red (Rent)', high: 'Green (Buy)' }
    },
    'teal-coral': {
      name: 'Teal-Coral (2 colors)',
      domain: [-1, 1],
      range: ['#14b8a6', '#ff7f50'],
      labels: { low: 'Teal (Rent)', high: 'Coral (Buy)' }
    },
    'indigo-gold': {
      name: 'Indigo-Gold (2 colors)',
      domain: [-1, 1],
      range: ['#4f46e5', '#fbbf24'],
      labels: { low: 'Indigo (Rent)', high: 'Gold (Buy)' }
    },
    'cyan-magenta': {
      name: 'Cyan-Magenta (2 colors)',
      domain: [-1, 1],
      range: ['#06b6d4', '#ec4899'],
      labels: { low: 'Cyan (Rent)', high: 'Magenta (Buy)' }
    },
    'navy-amber': {
      name: 'Navy-Amber (2 colors)',
      domain: [-1, 1],
      range: ['#1e3a8a', '#f59e0b'],
      labels: { low: 'Navy (Rent)', high: 'Amber (Buy)' }
    },
    // 3-color schemes
    'blue-white-red': {
      name: 'Blue-White-Red (3 colors)',
      domain: [-1, 0, 1],
      range: ['#0000ff', '#ffffff', '#ff0000'],
      labels: { low: 'Blue (Rent)', mid: 'White (Neutral)', high: 'Red (Buy)' }
    },
    'purple-gray-orange': {
      name: 'Purple-Gray-Orange (3 colors)',
      domain: [-1, 0, 1],
      range: ['#9b59b6', '#95a5a6', '#ff8c00'],
      labels: { low: 'Purple (Rent)', mid: 'Gray (Neutral)', high: 'Orange (Buy)' }
    },
    'red-yellow-green': {
      name: 'Red-Yellow-Green (3 colors)',
      domain: [-1, 0, 1],
      range: ['#e74c3c', '#f1c40f', '#27ae60'],
      labels: { low: 'Red (Rent)', mid: 'Yellow (Neutral)', high: 'Green (Buy)' }
    },
    'blue-beige-brown': {
      name: 'Blue-Beige-Brown (3 colors)',
      domain: [-1, 0, 1],
      range: ['#3498db', '#f5deb3', '#8b4513'],
      labels: { low: 'Blue (Rent)', mid: 'Beige (Neutral)', high: 'Brown (Buy)' }
    },
    'pink-white-teal': {
      name: 'Pink-White-Teal (3 colors)',
      domain: [-1, 0, 1],
      range: ['#ff69b4', '#ffffff', '#008080'],
      labels: { low: 'Pink (Rent)', mid: 'White (Neutral)', high: 'Teal (Buy)' }
    },
    'teal-ivory-coral': {
      name: 'Teal-Ivory-Coral (3 colors)',
      domain: [-1, 0, 1],
      range: ['#14b8a6', '#fffff0', '#ff7f50'],
      labels: { low: 'Teal (Rent)', mid: 'Ivory (Neutral)', high: 'Coral (Buy)' }
    },
    'indigo-lavender-gold': {
      name: 'Indigo-Lavender-Gold (3 colors)',
      domain: [-1, 0, 1],
      range: ['#4f46e5', '#e9d5ff', '#fbbf24'],
      labels: { low: 'Indigo (Rent)', mid: 'Lavender (Neutral)', high: 'Gold (Buy)' }
    },
    'navy-silver-amber': {
      name: 'Navy-Silver-Amber (3 colors)',
      domain: [-1, 0, 1],
      range: ['#1e3a8a', '#d1d5db', '#f59e0b'],
      labels: { low: 'Navy (Rent)', mid: 'Silver (Neutral)', high: 'Amber (Buy)' }
    },
    'turquoise-pearl-salmon': {
      name: 'Turquoise-Pearl-Salmon (3 colors)',
      domain: [-1, 0, 1],
      range: ['#06b6d4', '#faf9f6', '#fa8072'],
      labels: { low: 'Turquoise (Rent)', mid: 'Pearl (Neutral)', high: 'Salmon (Buy)' }
    },
    'forest-cream-rust': {
      name: 'Forest-Cream-Rust (3 colors)',
      domain: [-1, 0, 1],
      range: ['#166534', '#fffbeb', '#b45309'],
      labels: { low: 'Forest (Rent)', mid: 'Cream (Neutral)', high: 'Rust (Buy)' }
    }
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load CSV and geoJson files
        const [scoresText, geoJsonResponse] = await Promise.all([
          fetch('./data/export_3_level_Score.csv').then(r => r.text()),
          fetch('./data/landkreise_simplify200.geojson').then(r => r.json())
        ]);

        // Parse semicolon-separated CSV with comma decimals
        const scoresData = d3.dsvFormat(';').parse(scoresText);

        // Store the geoJson data
        setGeoJsonData(geoJsonResponse);

        // Get unique years
        const uniqueYears = [...new Set(scoresData.map(d => +d.Jahr))].sort((a, b) => b - a);
        setYears(uniqueYears);

        // Process score data
        const processedData = [];
        scoresData.forEach(d => {
          const regionId = d.RegionID;
          const regionName = d.Regionsname;
          const year = +d.Jahr;
          
          // Convert comma decimal to period decimal for all percentiles
          const score5Str = d[SCORE_5_COL]?.replace(',', '.');
          const score50Str = d[SCORE_50_COL]?.replace(',', '.');
          const score95Str = d[SCORE_95_COL]?.replace(',', '.');
          
          const score5 = +score5Str;
          const score50 = +score50Str;
          const score95 = +score95Str;

          if (isNaN(year)) return;

          // Map regionId to data-kgs format (e.g., 1001 -> "01001")
          const kgs = regionId.toString().padStart(5, '0');

          processedData.push({
            regionId,
            kgs,
            region: regionName,
            year,
            score5,
            score50,
            score95,
            isMissingData5: !d[SCORE_5_COL]?.trim() || isNaN(score5),
            isMissingData50: !d[SCORE_50_COL]?.trim() || isNaN(score50),
            isMissingData95: !d[SCORE_95_COL]?.trim() || isNaN(score95)
          });
        });

        setData(processedData);
        setLoading(false);
      } catch (error) {
        console.error('Error loading data:', error);
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Calculate bounds from geoJsonData once when it loads (memoized)
  const mapBounds = useMemo(() => {
    if (!geoJsonData) return null;

    // Calculate bounds from all geoJson features
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    geoJsonData.features.forEach(feature => {
      const geometry = feature.geometry;
      if (!geometry || !geometry.coordinates) return;

      const processCoordinate = (coord) => {
        const [lng, lat] = coord;
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
      };

      if (geometry.type === 'Polygon') {
        // Polygon: array of rings, each ring is an array of [lng, lat]
        geometry.coordinates.forEach(ring => {
          ring.forEach(coord => processCoordinate(coord));
        });
      } else if (geometry.type === 'MultiPolygon') {
        // MultiPolygon: array of polygons
        geometry.coordinates.forEach(polygon => {
          polygon.forEach(ring => {
            ring.forEach(coord => processCoordinate(coord));
          });
        });
      }
    });

    if (isFinite(minLat) && isFinite(maxLat) && isFinite(minLng) && isFinite(maxLng)) {
      return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
    }
    return null;
  }, [geoJsonData]);

  // Filter data for selected year
  const yearData = data.filter(d => d.year === selectedYear);

  // Create color scale based on selected scheme (memoized)
  const scheme = colorSchemes[colorScheme];
  const colorScale = useMemo(
    () => d3.scaleLinear()
      .domain(scheme.domain)
      .range(scheme.range)
      .interpolate(d3.interpolateRgb),
    [scheme.domain, scheme.range]
  );

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
        <Header title="Germany Heatmap" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading data...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <Header title="Germany Heatmap" />

      {/* Map Container */}
      <div className="flex-1 relative">
        <MapContainer
          center={[51.1657, 10.4515]}
          zoom={6}
          className="h-full w-full"
          style={{ background: '#ffffff' }}
          zoomAnimation={true}
          fadeAnimation={true}
          markerZoomAnimation={true}
          zoomAnimationThreshold={4}
          minZoom={5.5}
          maxBounds={mapBounds}
        >
          {showBasemap && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {geoJsonData && (
            <>
              <GeoJsonRegions
                geoJsonData={geoJsonData}
                yearData={yearData}
                colorScale={colorScale}
                selectedPercentile={selectedPercentile}
              />
              <MapController bounds={mapBounds} onFitBoundsRef={fitBoundsRef} />
            </>
          )}
        </MapContainer>

        {/* Floating Control Panel - Bottom Left */}
        <div className="absolute bottom-6 left-6 z-[1000] bg-white rounded-lg shadow-xl p-4 space-y-4 max-w-md">
          {/* Year Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Year</span>
              <span className="text-lg font-bold text-gray-800">{selectedYear}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500">{Math.min(...years)}</span>
              <input
                type="range"
                min={Math.min(...years)}
                max={Math.max(...years)}
                value={selectedYear}
                onChange={(e) => setSelectedYear(+e.target.value)}
                step="1"
                className="flex-1 h-2"
              />
              <span className="text-xs text-gray-500">{Math.max(...years)}</span>
            </div>
          </div>

          {/* Percentile Selector */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700 block">Percentile</span>
            <div className="flex gap-2">
              <label className={`flex-1 cursor-pointer ${selectedPercentile === 5 ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300'} border-2 rounded-lg px-3 py-2 transition-all hover:border-blue-400`}>
                <input
                  type="radio"
                  name="percentile"
                  value="5"
                  checked={selectedPercentile === 5}
                  onChange={(e) => setSelectedPercentile(+e.target.value)}
                  className="sr-only"
                />
                <div className="flex flex-col items-center">
                  <span className={`text-sm font-semibold ${selectedPercentile === 5 ? 'text-blue-700' : 'text-gray-700'}`}>5%</span>
                  <span className={`text-xs ${selectedPercentile === 5 ? 'text-blue-600' : 'text-gray-500'}`}>Low</span>
                </div>
              </label>
              <label className={`flex-1 cursor-pointer ${selectedPercentile === 50 ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300'} border-2 rounded-lg px-3 py-2 transition-all hover:border-blue-400`}>
                <input
                  type="radio"
                  name="percentile"
                  value="50"
                  checked={selectedPercentile === 50}
                  onChange={(e) => setSelectedPercentile(+e.target.value)}
                  className="sr-only"
                />
                <div className="flex flex-col items-center">
                  <span className={`text-sm font-semibold ${selectedPercentile === 50 ? 'text-blue-700' : 'text-gray-700'}`}>50%</span>
                  <span className={`text-xs ${selectedPercentile === 50 ? 'text-blue-600' : 'text-gray-500'}`}>Median</span>
                </div>
              </label>
              <label className={`flex-1 cursor-pointer ${selectedPercentile === 95 ? 'bg-blue-50 border-blue-500' : 'bg-white border-gray-300'} border-2 rounded-lg px-3 py-2 transition-all hover:border-blue-400`}>
                <input
                  type="radio"
                  name="percentile"
                  value="95"
                  checked={selectedPercentile === 95}
                  onChange={(e) => setSelectedPercentile(+e.target.value)}
                  className="sr-only"
                />
                <div className="flex flex-col items-center">
                  <span className={`text-sm font-semibold ${selectedPercentile === 95 ? 'text-blue-700' : 'text-gray-700'}`}>95%</span>
                  <span className={`text-xs ${selectedPercentile === 95 ? 'text-blue-600' : 'text-gray-500'}`}>High</span>
                </div>
              </label>
            </div>
          </div>

          {/* Color Scheme Picker */}
          <div className="space-y-2">
            <label htmlFor="color-scheme" className="text-sm font-medium text-gray-700 block">
              Color Scheme
            </label>
            <select
              id="color-scheme"
              value={colorScheme}
              onChange={(e) => setColorScheme(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <optgroup label="2-Color Schemes">
                <option value="blue-red">Blue-Red</option>
                <option value="purple-orange">Purple-Orange</option>
                <option value="red-green">Red-Green</option>
                <option value="teal-coral">Teal-Coral</option>
                <option value="indigo-gold">Indigo-Gold</option>
                <option value="cyan-magenta">Cyan-Magenta</option>
                <option value="navy-amber">Navy-Amber</option>
              </optgroup>
              <optgroup label="3-Color Schemes">
                <option value="blue-white-red">Blue-White-Red</option>
                <option value="purple-gray-orange">Purple-Gray-Orange</option>
                <option value="red-yellow-green">Red-Yellow-Green</option>
                <option value="blue-beige-brown">Blue-Beige-Brown</option>
                <option value="pink-white-teal">Pink-White-Teal</option>
                <option value="teal-ivory-coral">Teal-Ivory-Coral</option>
                <option value="indigo-lavender-gold">Indigo-Lavender-Gold</option>
                <option value="navy-silver-amber">Navy-Silver-Amber</option>
                <option value="turquoise-pearl-salmon">Turquoise-Pearl-Salmon</option>
                <option value="forest-cream-rust">Forest-Cream-Rust</option>
              </optgroup>
            </select>
          </div>

          {/* Color Legend */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-gray-700 block">Score Legend</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: scheme.range[0] }}>
                -1 (Rent)
              </span>
              <div
                className="flex-1 h-4 rounded"
                style={{
                  background: `linear-gradient(to right, ${scheme.range.join(', ')})`
                }}
              ></div>
              <span className="text-xs font-medium" style={{ color: scheme.range[scheme.range.length - 1] }}>
                +1 (Buy)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
            {/* Basemap Toggle Icon */}
            <button
              onClick={() => setShowBasemap(!showBasemap)}
              className={`p-2 rounded border ${showBasemap ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-gray-300 text-gray-700'} hover:bg-gray-50 transition-colors`}
              title="Toggle basemap"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </button>

            {/* Fit All Button */}
            {mapBounds && (
              <button
                onClick={() => fitBoundsRef.current && fitBoundsRef.current()}
                className="bg-white hover:bg-gray-100 p-2 rounded shadow cursor-pointer border border-gray-300"
                title="Fit all regions in view"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              </button>
            )}

            {/* Statistics Summary */}
            <div className="flex-1 flex items-center justify-end gap-3 text-xs text-gray-600">
              <div className="text-center">
                <div className="font-bold text-sm text-gray-800">{yearData.length}</div>
                <div>Regions</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-sm text-red-600">{yearData.filter(d => d.score > 0.5).length}</div>
                <div>Buy</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-sm text-blue-600">{yearData.filter(d => d.score < -0.5).length}</div>
                <div>Rent</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default GermanyHeatmap;
