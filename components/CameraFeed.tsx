
import React from 'react';

interface CameraFeedProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  isLoading: boolean;
  error: string | null;
  isCameraEnabled: boolean; // New prop
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ videoRef, isLoading, error, isCameraEnabled }) => {
  return (
    <div className="relative w-full aspect-video bg-black flex items-center justify-center rounded-t-xl overflow-hidden border border-gray-700">
      {!isCameraEnabled ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 p-4 text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />
            <line x1="2" y1="22" x2="22" y2="2" strokeWidth="2.5" className="text-red-500 opacity-70" />
          </svg>
          <p className="text-xl font-semibold text-gray-400">Camera Disabled</p>
          <p className="text-sm text-gray-500 mt-1">Enable the camera using the button above to start live analysis.</p>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted 
            className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading || error || !videoRef.current?.srcObject ? 'opacity-20' : 'opacity-100'}`}
          />
          {isLoading && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-300">
              <p className="text-lg">Initializing Camera...</p>
            </div>
          )}
          {error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center bg-red-800 bg-opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-red-200 font-semibold text-lg">Camera Error</p>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          )}
          {!isLoading && !error && !videoRef.current?.srcObject && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-500">
              <p>Attempting to start camera stream...</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};