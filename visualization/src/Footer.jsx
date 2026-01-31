import { useMemo } from 'react';

const Footer = () => {
  const buildInfo = useMemo(() => {
    const isDev = import.meta.env.DEV;

    if (isDev) {
      return {
        commit: 'development',
        time: new Date().toISOString(),
        isDev: true
      };
    } else {
      const commit = import.meta.env.VITE_COMMIT_MESSAGE || 'production build';
      const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();

      return {
        commit,
        time: buildTime,
        isDev: false
      };
    }
  }, []);

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <footer className="bg-white border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Master Thesis Project - Renting vs. Buying Analysis
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            {buildInfo.isDev ? (
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="font-medium">Development Mode</span>
              </div>
            ) : (
              <>
                <span>Build: {buildInfo.commit.substring(0, 7)}</span>
                <span>•</span>
                <span>Built: {formatDate(buildInfo.time)}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
