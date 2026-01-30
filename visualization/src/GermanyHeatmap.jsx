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
        const [scoresData, coordinatesData] = await Promise.all([
          d3.csv('/data/export_score.csv'),
          d3.csv('/data/Gemeinden_coordinates.csv')
        ]);

        // Create a map of region names to coordinates
        // Note: coordinates file has RegionID, we need to match by region name
        // For now, we'll use the main cities/regions from the scores data
        
        // Get unique years
        const uniqueYears = [...new Set(scoresData.map(d => +d.Jahr))].sort((a, b) => b - a);
        setYears(uniqueYears);

        // Process and merge data
        const processedData = scoresData.map(d => ({
          region: d.Regionsname,
          year: +d.Jahr,
          score: +d.Score
        }));

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

  // German cities approximate coordinates (main cities for visualization)
  const cityCoordinates = {
    'Flensburg': [54.78, 9.44],
    'Kiel': [54.32, 10.13],
    'Hamburg': [53.55, 10.00],
    'Bremen': [53.08, 8.80],
    'Berlin': [52.52, 13.40],
    'Potsdam': [52.40, 13.06],
    'Schwerin': [53.63, 11.41],
    'Hannover': [52.37, 9.74],
    'Magdeburg': [52.13, 11.64],
    'Düsseldorf': [51.23, 6.78],
    'Köln': [50.94, 6.96],
    'Münster': [51.96, 7.63],
    'Wuppertal': [51.26, 7.18],
    'Essen': [51.46, 7.01],
    'Dortmund': [51.51, 7.47],
    'Duisburg': [51.43, 6.76],
    'Bonn': [50.73, 7.10],
    'Erfurt': [50.98, 11.03],
    'Dresden': [51.05, 13.74],
    'Leipzig': [51.34, 12.37],
    'Chemnitz': [50.83, 12.92],
    'Mainz': [50.00, 8.27],
    'Wiesbaden': [50.08, 8.24],
    'Saarbrücken': [49.23, 6.99],
    'Stuttgart': [48.78, 9.18],
    'Karlsruhe': [49.01, 8.40],
    'Mannheim': [49.49, 8.47],
    'Freiburg im Breisgau': [47.99, 7.85],
    'München': [48.14, 11.58],
    'Nürnberg': [49.45, 11.08],
    'Augsburg': [48.37, 10.90],
    'Regensburg': [49.02, 12.10],
  };

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
            const coords = cityCoordinates[item.region];
            if (!coords) return null;

            const color = colorScale(item.score);
            const radius = 8 + Math.abs(item.score) * 7;

            return (
              <CircleMarker
                key={`${item.region}-${idx}`}
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
