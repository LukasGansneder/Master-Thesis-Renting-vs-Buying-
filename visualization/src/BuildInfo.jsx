import { useState, useEffect } from 'react';

const BuildInfo = () => {
  const [buildInfo, setBuildInfo] = useState({
    commit: 'dev',
    time: new Date().toISOString(),
    isDev: true
  });

  useEffect(() => {
    // Try to fetch build info if available (in production builds)
    // In dev mode, we'll show dev indicator
    const isDev = import.meta.env.DEV;
    
    if (isDev) {
      setBuildInfo({
        commit: 'development',
        time: new Date().toISOString(),
        isDev: true
      });
    } else {
      // In production, you could inject these values during build
      const commit = import.meta.env.VITE_COMMIT_SHA || 'unknown';
      const buildTime = import.meta.env.VITE_BUILD_TIME || new Date().toISOString();
      
      setBuildInfo({
        commit,
        time: buildTime,
        isDev: false
      });
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
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white text-xs py-1 px-4 flex items-center justify-center gap-4 z-[1000]">
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
  );
};

export default BuildInfo;
