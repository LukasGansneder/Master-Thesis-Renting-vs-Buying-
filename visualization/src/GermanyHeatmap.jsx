import { MapContainer, TileLayer, Popup, SVGOverlay, useMap } from 'react-leaflet';
import { useEffect, useState, useRef } from 'react';
import * as d3 from 'd3';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

    // SVG viewBox dimensions
    const svgWidth = 600;
    const svgHeight = 814;

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
          const type = cmd[0].toUpperCase();
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
          fetch('/data/export_empirica_regio.csv').then(r => r.text()),
          fetch('/data/landkreise.svg').then(r => r.text())
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

  // Filter data for selected year
  const yearData = data.filter(d => d.year === selectedYear);

  // Create color scale based on selected scheme
  const scheme = colorSchemes[colorScheme];
  const colorScale = d3.scaleLinear()
    .domain(scheme.domain)
    .range(scheme.range)
    .interpolate(d3.interpolateRgb);

  // Color for N/A values (if needed)
  const naColor = '#000000';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-xl text-gray-600">Loading data...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-md p-4">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          Germany Rent vs. Buy Score Heatmap
        </h1>
        <div className="flex items-center justify-between mb-4">
          <p className="text-gray-600">
            Visualization of NPV scores across German regions (higher score = buying is more favorable)
          </p>

          <div className="flex items-center gap-6">
            {/* Color scheme selector */}
            <div className="flex items-center gap-2">
              <label htmlFor="color-scheme" className="text-sm font-medium text-gray-700">
                Color Scheme:
              </label>
              <select
                id="color-scheme"
                value={colorScheme}
                onChange={(e) => setColorScheme(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* Basemap toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showBasemap}
                onChange={(e) => setShowBasemap(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-700">Show Basemap</span>
            </label>

            {/* Color legend */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Score:</span>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium" style={{ color: scheme.range[0] }}>
                  -1 (Rent)
                </span>
                <div 
                  className="w-32 h-4 rounded" 
                  style={{
                    background: `linear-gradient(to right, ${scheme.range.join(', ')})`
                  }}
                ></div>
                <span className="text-xs font-medium" style={{ color: scheme.range[scheme.range.length - 1] }}>
                  +1 (Buy)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Horizontal Year Slider */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium text-gray-700">Year:</span>
          <div className="flex-1 flex items-center gap-4">
            <span className="text-sm text-gray-600">{Math.min(...years)}</span>
            <input
              type="range"
              min={Math.min(...years)}
              max={Math.max(...years)}
              value={selectedYear}
              onChange={(e) => setSelectedYear(+e.target.value)}
              step="1"
              list="year-marks"
              className="flex-1"
              style={{
                height: '8px'
              }}
            />
            <span className="text-sm text-gray-600">{Math.max(...years)}</span>
            <datalist id="year-marks">
              {years.map(year => (
                <option key={year} value={year} />
              ))}
            </datalist>
          </div>
          <div className="text-lg font-bold text-gray-800 min-w-[60px] text-center">
            {selectedYear}
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[51.1657, 10.4515]}
          zoom={7}
          className="h-full w-full"
          style={{ background: '#ffffff' }}
        >
          {showBasemap && (
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          )}

          {svgData && <SVGRegions svgData={svgData} yearData={yearData} colorScale={colorScale} />}
        </MapContainer>
      </div>

      {/* Stats Footer */}
      <div className="bg-white border-t border-gray-200 p-4">
        <div className="flex justify-around text-center">
          <div>
            <div className="text-2xl font-bold text-gray-800">{yearData.length}</div>
            <div className="text-sm text-gray-600">Regions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {yearData.filter(d => d.score > 0.5).length}
            </div>
            <div className="text-sm text-gray-600">Favorable to Buy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">
              {yearData.filter(d => d.score < -0.5).length}
            </div>
            <div className="text-sm text-gray-600">Favorable to Rent</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-600">
              {yearData.filter(d => d.score >= -0.5 && d.score <= 0.5).length}
            </div>
            <div className="text-sm text-gray-600">Neutral</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GermanyHeatmap;
