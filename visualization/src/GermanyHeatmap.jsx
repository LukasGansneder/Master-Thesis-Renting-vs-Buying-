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

// Custom component to render SVG regions as Leaflet layers
const SVGRegions = ({ svgData, yearData, colorScale }) => {
  const map = useMap();
  const layerGroupRef = useRef(null);

  useEffect(() => {
    if (!map || !svgData || !yearData || yearData.length === 0) return;

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

    // Calibrated transformation parameters based on reference points
    // Reference points used:
    // - Flensburg (238, 29) -> (54.78°N, 9.44°E)
    // - Berlin (490, 262) -> (52.52°N, 13.40°E)  
    // - München (380, 720) -> (48.14°N, 11.58°E)
    //
    // Transformation: lat = lat_offset - (lat_scale * y)
    //                 lon = lon_offset + (lon_scale * x)
    const lat_offset = 55.051331;
    const lat_scale = 0.009609;
    const lon_offset = 5.800000;
    const lon_scale = 0.015610;

    // Function to convert SVG coordinates to lat/lng using calibrated transformation
    const svgToLatLng = (x, y) => {
      const lat = lat_offset - (lat_scale * y);
      const lng = lon_offset + (lon_scale * x);
      return [lat, lng];
    };

    // Function to parse SVG path and convert to lat/lng coordinates
    // Returns array of polygon coordinate arrays (to handle multi-polygons)
    const parseSVGPath = (pathData) => {
      const polygons = [];

      // Split path by Z command to find separate sub-paths
      // Each sub-path represents a separate polygon (main region or islands)
      const subPaths = pathData.split(/Z\s*/i).filter(p => p.trim());

      subPaths.forEach(subPath => {
        const coords = [];

        // Match all commands (M, L) followed by their coordinates
        const commands = subPath.trim().match(/[ML][^MLZ]*/gi);

        if (!commands) return;

        commands.forEach(cmd => {
          // Extract all numbers from the command
          const numbers = cmd.slice(1).match(/-?\d+\.?\d*/g);

          if (!numbers) return;

          // Convert number strings to actual numbers and pair them as x,y coordinates
          for (let i = 0; i < numbers.length; i += 2) {
            const x = parseFloat(numbers[i]);
            const y = parseFloat(numbers[i + 1]);

            if (!isNaN(x) && !isNaN(y)) {
              coords.push(svgToLatLng(x, y));
            }
          }
        });

        // Only add if we have at least 3 points for a valid polygon
        if (coords.length >= 3) {
          polygons.push(coords);
        }
      });

      return polygons;
    };

    // Render each region
    svgData.forEach((regionInfo) => {
      const scoreData = scoreMap.get(regionInfo.kgs);

      if (!scoreData) return; // Skip regions without data

      const polygonCoords = parseSVGPath(regionInfo.path);

      if (polygonCoords.length === 0) return; // Skip if no valid polygons

      const color = colorScale(scoreData.score);

      // L.polygon can handle both single polygons and multi-polygons
      // Single polygon: [[lat,lng], [lat,lng], ...]
      // Multi-polygon: [[[lat,lng], [lat,lng], ...], [[lat,lng], [lat,lng], ...]]
      const coords = polygonCoords.length === 1 ? polygonCoords[0] : polygonCoords;

      const polygon = L.polygon(coords, {
        fillColor: !scoreData.score ? "#444" : color,
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
            Score: <span style="color: ${scoreData.score > 0 ? '#16a34a' : '#dc2626'}; font-weight: bold;">
              ${scoreData.score.toFixed(3)}
            </span>
          </div>
          <div style="font-size: 12px; color: #666; margin-top: 4px;">
            ${scoreData.score > 0.5 ? '✓ Buying favorable' :
          scoreData.score < -0.5 ? '✓ Renting favorable' :
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
  }, [map, svgData, yearData, colorScale]);

  return null;
};

const GermanyHeatmap = () => {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2023);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const [svgData, setSvgData] = useState(null);
  const [showBasemap, setShowBasemap] = useState(false);
  const [colorScheme, setColorScheme] = useState('blue-white-red');
  const fitBoundsRef = useRef(null);

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

        // Load CSV files and SVG
        const [scoresText, svgText] = await Promise.all([
          fetch('./data/export_empirica_regio.csv').then(r => r.text()),
          fetch('./data/landkreise.svg').then(r => r.text())
        ]);

        // Parse semicolon-separated CSV with comma decimals
        const scoresData = d3.dsvFormat(';').parse(scoresText);

        // Parse SVG to extract region shapes
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
        const paths = svgDoc.querySelectorAll('path[data-kgs]');

        const regions = [];
        paths.forEach(path => {
          const kgs = path.getAttribute('data-kgs');
          const id = path.getAttribute('id');
          const d = path.getAttribute('d');
          if (kgs && d) {
            regions.push({
              id,
              path: d,
              name: id,
              kgs
            });
          }
        });

        setSvgData(regions);

        // Get unique years
        const uniqueYears = [...new Set(scoresData.map(d => +d.Jahr))].sort((a, b) => b - a);
        setYears(uniqueYears);

        // Process score data
        const processedData = [];
        scoresData.forEach(d => {
          const regionId = d.RegionID;
          const regionName = d.Regionsname;
          const year = +d.Jahr;
          // Convert comma decimal to period decimal
          const scoreStr = d.Score.replace(',', '.');
          const score = +scoreStr;

          if (isNaN(year) || isNaN(score)) return;

          // Map regionId to data-kgs format (e.g., 1001 -> "01001")
          const kgs = regionId.toString().padStart(5, '0');

          processedData.push({
            regionId,
            kgs,
            region: regionName,
            year,
            score
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

  // Calculate bounds from svgData once when it loads (memoized)
  const mapBounds = useMemo(() => {
    if (!svgData) return null;

    const lat_offset = 55.051331;
    const lat_scale = 0.009609;
    const lon_offset = 5.800000;
    const lon_scale = 0.015610;

    const svgToLatLng = (x, y) => {
      const lat = lat_offset - (lat_scale * y);
      const lng = lon_offset + (lon_scale * x);
      return [lat, lng];
    };

    // Calculate bounds from all SVG paths
    let minLat = Infinity, maxLat = -Infinity;
    let minLng = Infinity, maxLng = -Infinity;

    svgData.forEach(region => {
      const numbers = region.path.match(/-?\d+\.?\d*/g);
      if (numbers) {
        for (let i = 0; i < numbers.length; i += 2) {
          const x = parseFloat(numbers[i]);
          const y = parseFloat(numbers[i + 1]);
          if (!isNaN(x) && !isNaN(y)) {
            const [lat, lng] = svgToLatLng(x, y);
            minLat = Math.min(minLat, lat);
            maxLat = Math.max(maxLat, lat);
            minLng = Math.min(minLng, lng);
            maxLng = Math.max(maxLng, lng);
          }
        }
      }
    });

    if (isFinite(minLat) && isFinite(maxLat) && isFinite(minLng) && isFinite(maxLng)) {
      return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
    }
    return null;
  }, [svgData]);

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
          zoom={7}
          className="h-full w-full"
          style={{ background: '#ffffff' }}
          zoomAnimation={true}
          fadeAnimation={true}
          markerZoomAnimation={true}
          zoomAnimationThreshold={4}
        >
          {showBasemap && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {svgData && (
            <>
              <SVGRegions 
                svgData={svgData} 
                yearData={yearData} 
                colorScale={colorScale}
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
