import { Link } from 'react-router-dom';

const Header = ({ title, subtitle }) => {
  const defaultSubtitle = "Interactive visualizations for German real estate market analysis";
  const baseTitle = "Master Thesis: Renting vs. Buying";
  
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center text-sm text-gray-600 mb-3" aria-label="Breadcrumb">
          <Link 
            to="/" 
            className="flex items-center hover:text-gray-900 transition-colors"
            aria-label="Home"
          >
            <svg 
              className="w-5 h-5" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="ml-1">Home</span>
          </Link>
          {title && (
            <>
              <span className="mx-2 text-gray-400">&gt;</span>
              <span className="text-gray-900 font-medium">{title}</span>
            </>
          )}
        </nav>

        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900">
          {baseTitle}
        </h1>
        <p className="mt-2 text-gray-600">
          {subtitle ?? defaultSubtitle}
        </p>
      </div>
    </header>
  );
};

export default Header;
