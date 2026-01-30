import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { useEffect, useState } from 'react';
import * as d3 from 'd3';
import 'leaflet/dist/leaflet.css';

const GermanyHeatmap = () => {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2023);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load both CSV files
        // Note: export_empirica_regio.csv uses semicolon separator and comma decimals
        const [scoresText, coordinatesData] = await Promise.all([
          fetch('/data/export_empirica_regio.csv').then(r => r.text()),
          d3.csv('/data/Gemeinden_coordinates.csv')
        ]);

        // Parse semicolon-separated CSV with comma decimals
        const scoresData = d3.dsvFormat(';').parse(scoresText);
        
        // Create a map of RegionID to coordinates
        // Coordinates have detailed IDs (e.g., 1001000), scores have district IDs (e.g., 1001)
        const coordMap = new Map();
        coordinatesData.forEach(d => {
          const regionId = d.RegionID;
          const lat = +d.lat;
          const lon = +d.lon;
          if (regionId && !isNaN(lat) && !isNaN(lon)) {
            coordMap.set(regionId, { lat, lon });
          }
        });

        // Get unique years
        const uniqueYears = [...new Set(scoresData.map(d => +d.Jahr))].sort((a, b) => b - a);
        setYears(uniqueYears);

        // Process and merge data with coordinates
        const processedData = [];
        scoresData.forEach(d => {
          const regionId = d.RegionID;
          const regionName = d.Regionsname;
          const year = +d.Jahr;
          // Convert comma decimal to period decimal
          const scoreStr = d.Score.replace(',', '.');
          const score = +scoreStr;
          
          if (isNaN(year) || isNaN(score)) return;
          
          // Find matching coordinates - try exact match first, then prefix match
          let coords = coordMap.get(regionId);
          if (!coords) {
            // Try adding '000' suffix for district-level IDs
            coords = coordMap.get(regionId + '000');
          }
          if (!coords) {
            // Try finding any coordinate that starts with this regionId
            for (const [coordId, coordValue] of coordMap.entries()) {
              if (coordId.startsWith(regionId)) {
                coords = coordValue;
                break;
              }
            }
          }
          
          if (coords) {
            processedData.push({
              regionId,
              region: regionName,
              year,
              score,
              lat: coords.lat,
              lon: coords.lon
            });
          }
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
          
          {yearData.map((item, idx) => {
            // Use coordinates from the data (already merged with coordinates)
            const coords = [item.lat, item.lon];
            if (!coords || isNaN(coords[0]) || isNaN(coords[1])) return null;

            const color = colorScale(item.score);
            const radius = 5 + Math.abs(item.score) * 5;

            return (
              <CircleMarker
                key={`${item.regionId}-${idx}`}
                center={coords}
                radius={radius}
                fillColor={color}
                fillOpacity={0.7}
                color="#333"
                weight={1}
              >
                <Popup>
                  <div className="p-2">
                    <div className="font-bold text-lg">{item.region}</div>
                    <div className="text-xs text-gray-500">ID: {item.regionId}</div>
                    <div className="text-sm">Year: {item.year}</div>
                    <div className="text-sm">
                      Score: <span className={item.score > 0 ? 'text-green-600' : 'text-red-600'}>
                        {item.score.toFixed(3)}
                      </span>
                    </div>
                    <div className="text-xs mt-1 text-gray-600">
                      {item.score > 0.5 ? '✓ Buying favorable' : 
                       item.score < -0.5 ? '✓ Renting favorable' : 
                       '≈ Neutral'}
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
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
