import { useMemo } from 'react';

const BuildInfo = () => {
  const buildInfo = useMemo(() => {
    const isDev = import.meta.env.DEV;
    
    if (isDev) {
      return {
        commit: 'development',
        time: new Date().toISOString(),
        isDev: true
      };
    } else {
      const commit = import.meta.env.VITE_COMMIT_SHA || 'unknown';
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
