import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './LandingPage';
import GermanyHeatmap from './GermanyHeatmap';

function App() {
  return (
    <Router basename="/Master-Thesis-Renting-vs-Buying-">
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/germany-heatmap" element={<GermanyHeatmap />} />
      </Routes>
    </Router>
  );
}

export default App;
