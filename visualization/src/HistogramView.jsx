import { useEffect, useState, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import Header from './Header';
import Footer from './Footer';

const HistogramView = () => {
  const [data, setData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2023);
  const [selectedPercentile, setSelectedPercentile] = useState(50);
  const [bins, setBins] = useState(20);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState([]);
  const svgRef = useRef(null);

  // Column names from CSV
  const SCORE_5_COL = 'Score (5% Perzentil)';
  const SCORE_50_COL = 'Score (50% Perzentil)';
  const SCORE_95_COL = 'Score (95% Perzentil)';

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // Load CSV file
        const scoresText = await fetch('./data/export_3_level_Score.csv').then(r => r.text());

        // Parse semicolon-separated CSV with comma decimals
        const scoresData = d3.dsvFormat(';').parse(scoresText);

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

          processedData.push({
            regionId,
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

  // Filter and prepare data for histogram
  const histogramData = useMemo(() => {
    const yearData = data.filter(d => d.year === selectedYear);

    // Select the appropriate score based on percentile
    let scores = [];
    if (selectedPercentile === 5) {
      scores = yearData
        .filter(d => !d.isMissingData5)
        .map(d => d.score5);
    } else if (selectedPercentile === 95) {
      scores = yearData
        .filter(d => !d.isMissingData95)
        .map(d => d.score95);
    } else {
      scores = yearData
        .filter(d => !d.isMissingData50)
        .map(d => d.score50);
    }

    return scores;
  }, [data, selectedYear, selectedPercentile]);

  // Draw histogram
  useEffect(() => {
    if (!svgRef.current || histogramData.length === 0) return;

    // Clear previous content
    d3.select(svgRef.current).selectAll('*').remove();

    // Set up dimensions
    const margin = { top: 40, right: 40, bottom: 60, left: 60 };
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG
    const svg = d3.select(svgRef.current)
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create histogram bins
    const x = d3.scaleLinear()
      .domain(d3.extent(histogramData))
      .nice()
      .range([0, width]);

    const histogram = d3.histogram()
      .domain(x.domain())
      .thresholds(x.ticks(bins));

    const binData = histogram(histogramData);

    // Y scale
    const y = d3.scaleLinear()
      .domain([0, d3.max(binData, d => d.length)])
      .nice()
      .range([height, 0]);

    // Draw bars
    svg.selectAll('rect')
      .data(binData)
      .enter()
      .append('rect')
      .attr('x', d => x(d.x0) + 1)
      .attr('y', d => y(d.length))
      .attr('width', d => Math.max(0, x(d.x1) - x(d.x0) - 2))
      .attr('height', d => height - y(d.length))
      .attr('fill', '#3b82f6')
      .attr('stroke', '#1e40af')
      .attr('stroke-width', 1)
      .style('cursor', 'pointer')
      .on('mouseover', function (event, d) {
        d3.select(this)
          .attr('fill', '#2563eb');

        // Show tooltip
        const tooltip = svg.append('g')
          .attr('class', 'tooltip')
          .attr('transform', `translate(${x((d.x0 + d.x1) / 2)}, ${y(d.length) - 10})`);

        tooltip.append('rect')
          .attr('x', -50)
          .attr('y', -35)
          .attr('width', 100)
          .attr('height', 30)
          .attr('fill', 'white')
          .attr('stroke', '#333')
          .attr('rx', 5);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -20)
          .style('font-size', '12px')
          .style('font-weight', 'bold')
          .text(`Count: ${d.length}`);

        tooltip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', -8)
          .style('font-size', '10px')
          .style('fill', '#666')
          .text(`[${d.x0.toFixed(2)}, ${d.x1.toFixed(2)})`);
      })
      .on('mouseout', function () {
        d3.select(this)
          .attr('fill', '#3b82f6');
        svg.select('.tooltip').remove();
      });

    // X axis
    svg.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).ticks(10))
      .selectAll('text')
      .style('font-size', '12px');

    // X axis label
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', height + 45)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Score');

    // Y axis
    svg.append('g')
      .call(d3.axisLeft(y).ticks(10))
      .selectAll('text')
      .style('font-size', '12px');

    // Y axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -45)
      .attr('text-anchor', 'middle')
      .style('font-size', '14px')
      .style('font-weight', 'bold')
      .text('Number of Kreise');

    // Title
    svg.append('text')
      .attr('x', width / 2)
      .attr('y', -15)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Score Distribution (${selectedPercentile}% Percentile, ${selectedYear})`);

  }, [histogramData, bins, selectedYear, selectedPercentile]);

  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
        <Header title="Histogram View" />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-xl text-gray-600">Loading data...</div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <Header title="Histogram View" />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Controls Panel */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

            {/* Percentile Radio Buttons */}
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
                  </div>
                </label>
              </div>
            </div>

            {/* Bins Slider */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Bins</span>
                <span className="text-lg font-bold text-gray-800">{bins}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">10</span>
                <input
                  type="range"
                  min="10"
                  max="30"
                  value={bins}
                  onChange={(e) => {
                    const value = +e.target.value;
                    // Round to nearest even number
                    const evenValue = Math.round(value / 2) * 2;
                    setBins(evenValue);
                  }}
                  step="10"
                  className="flex-1 h-2"
                />
                <span className="text-xs text-gray-500">30</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex gap-6 text-sm text-gray-600">
              <div>
                <span className="font-medium">Total Regions:</span> {histogramData.length}
              </div>
              <div>
                <span className="font-medium">Min Score:</span> {histogramData.length > 0 ? d3.min(histogramData).toFixed(3) : 'N/A'}
              </div>
              <div>
                <span className="font-medium">Max Score:</span> {histogramData.length > 0 ? d3.max(histogramData).toFixed(3) : 'N/A'}
              </div>
              <div>
                <span className="font-medium">Mean Score:</span> {histogramData.length > 0 ? d3.mean(histogramData).toFixed(3) : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Histogram */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-center">
            <svg ref={svgRef}></svg>
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-lg shadow-lg p-6 mt-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">About This Visualization</h3>
          <p className="text-gray-600 mb-2">
            This histogram shows the distribution of rent vs. buy scores across all German Kreise for the selected year and percentile.
          </p>
          <ul className="list-disc list-inside text-gray-600 space-y-1">
            <li><strong>X-axis:</strong> Score values (negative = renting favorable, positive = buying favorable)</li>
            <li><strong>Y-axis:</strong> Number of Kreise (regions) with scores in each bin</li>
            <li><strong>Bins:</strong> Adjustable number of intervals to group the data (10-30, power of 10)</li>
            <li><strong>Hover:</strong> Mouse over bars to see exact count and score range</li>
          </ul>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HistogramView;
