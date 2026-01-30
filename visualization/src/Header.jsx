import { Link } from 'react-router-dom';

const Header = ({ title, subtitle }) => {
  const defaultSubtitle = subtitle = "Interactive visualizations for German real estate market analysis";
  const baseTitle = "Master Thesis: Renting vs. Buying";
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <h1 className="text-3xl font-bold text-gray-900">
            {[baseTitle, title].join(" > ")}
          </h1>
        </Link>
        <p className="mt-2 text-gray-600">
          {subtitle ?? defaultSubtitle}
        </p>
      </div>
    </header>
  );
};

export default Header;
