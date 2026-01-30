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
        fillColor: color,
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

  // Create a color scale
  const colorScale = d3.scaleSequential(d3.interpolateRdYlGn)
    .domain([-1, 1]); // Score range from data

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
        <p className="text-gray-600 mb-4">
          Visualization of NPV scores across German regions (higher score = buying is more favorable)
        </p>

        {/* Year Selector */}
        <div className="flex items-center gap-4">
          <label htmlFor="year-select" className="text-gray-700 font-medium">
            Select Year:
          </label>
          <select
            id="year-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(+e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-gray-600">Score Range:</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium">-1 (Rent)</span>
              <div className="w-32 h-4 rounded" style={{
                background: 'linear-gradient(to right, #d73027, #fee08b, #1a9850)'
              }}></div>
              <span className="text-xs text-green-600 font-medium">+1 (Buy)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer
          center={[51.1657, 10.4515]}
          zoom={6}
          className="h-full w-full"
          style={{ background: '#f0f0f0' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

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
            <div className="text-2xl font-bold text-green-600">
              {yearData.filter(d => d.score > 0.5).length}
            </div>
            <div className="text-sm text-gray-600">Favorable to Buy</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">
              {yearData.filter(d => d.score < -0.5).length}
            </div>
            <div className="text-sm text-gray-600">Favorable to Rent</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-yellow-600">
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
