import { Routes, Route, HashRouter } from 'react-router-dom';
import LandingPage from './LandingPage';
import GermanyHeatmap from './GermanyHeatmap';
import HistogramView from './HistogramView';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="germany-heatmap" element={<GermanyHeatmap />} />
        <Route path="histogram-view" element={<HistogramView />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
