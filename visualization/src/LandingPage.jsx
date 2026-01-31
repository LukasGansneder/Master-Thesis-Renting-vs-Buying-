import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
      <Header />

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        {/* Hero section */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Explore Housing Market Insights
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Visualize and analyze the rent vs. buy decision across different regions
            and time periods in Germany
          </p>
        </div>

        {/* Visualizations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {/* Germany Heatmap Card */}
          <div
            onClick={() => navigate('/germany-heatmap')}
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden group"
          >
            <div className="h-48 relative overflow-hidden bg-gray-50">
              <img 
                src="/germany-heatmap-hero.png" 
                alt="Germany Heatmap Visualization" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Germany Heatmap</h3>
              <p className="text-gray-600 mb-4">
                Interactive map visualization showing rent vs. buy scores across German regions
                with time series data from multiple years.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 mb-4">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Regional analysis
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Multiple color schemes
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Time series slider
                </li>
              </ul>
              <div className="text-blue-600 font-semibold group-hover:text-blue-700 flex items-center">
                View Visualization
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Histogram View Card */}
          <div
            onClick={() => navigate('/histogram-view')}
            className="bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 cursor-pointer overflow-hidden group"
          >
            <div className="h-48 relative overflow-hidden bg-gray-50">
              <img 
                src="/histogram-hero.png" 
                alt="Histogram Visualization" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-6">
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Histogram View</h3>
              <p className="text-gray-600 mb-4">
                Interactive histogram showing the distribution of rent vs. buy scores across
                all German Kreise with customizable bins.
              </p>
              <ul className="space-y-2 text-sm text-gray-500 mb-4">
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Score distribution
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Adjustable bin sizes
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Statistical insights
                </li>
              </ul>
              <div className="text-green-600 font-semibold group-hover:text-green-700 flex items-center">
                View Visualization
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-white rounded-lg shadow-lg overflow-hidden opacity-60" role="article" aria-disabled="true">
            <div className="h-48 bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center">
              <div className="text-white text-center">
                <svg className="w-24 h-24 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <h3 className="text-2xl font-bold">Coming Soon</h3>
              </div>
            </div>
            <div className="p-6">
              <p className="text-gray-500 mb-4">
                Additional visualizations and analysis tools will be added here.
              </p>
              <div className="text-gray-400 font-semibold">
                More visualizations coming soon...
              </div>
            </div>
          </div>
        </div>

        {/* Info section */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">About This Project</h3>
          <p className="text-gray-600 mb-4">
            This project provides interactive visualizations for analyzing the rent vs. buy decision
            across different regions in Germany. The data includes NPV (Net Present Value) scores
            that help determine whether renting or buying is more favorable in each region.
          </p>
          <p className="text-gray-600">
            The visualizations are based on comprehensive data analysis and provide insights into
            regional housing market trends over time.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LandingPage;
