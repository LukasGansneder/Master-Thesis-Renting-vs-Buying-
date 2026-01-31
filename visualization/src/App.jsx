import { Routes, Route, HashRouter } from 'react-router-dom';
import LandingPage from './LandingPage';
import GermanyHeatmap from './GermanyHeatmap';

function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="germany-heatmap" element={<GermanyHeatmap />} />
      </Routes>
    </HashRouter>
  );
}

export default App;
