import { Link } from 'react-router-dom';

const Header = ({ title, subtitle }) => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link to="/" className="hover:opacity-80 transition-opacity">
          <h1 className="text-3xl font-bold text-gray-900">
            {title}
          </h1>
        </Link>
        {subtitle && (
          <p className="mt-2 text-gray-600">
            {subtitle}
          </p>
        )}
      </div>
    </header>
  );
};

export default Header;
