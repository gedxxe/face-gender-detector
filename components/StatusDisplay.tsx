
import React from 'react';
import { GenderDetectionStatus, DetailedGenderAnalysisResult, GenderAnalysisCounts } from '../types';

interface StatusDisplayProps {
  result: DetailedGenderAnalysisResult;
  isProcessing: boolean;
}

const getStatusColor = (status: GenderDetectionStatus): string => {
  switch (status) {
    case GenderDetectionStatus.SUCCESS:
      return 'text-green-400'; // Keep bright for success
    case GenderDetectionStatus.PARTIAL_DETECTION:
    case GenderDetectionStatus.INDETERMINATE: 
      return 'text-yellow-400'; // Keep bright for warning/partial
    case GenderDetectionStatus.NO_FACE_DETECTED:
      return 'text-orange-400'; // Keep bright for no face
    case GenderDetectionStatus.DETECTING:
      return 'text-sky-400 animate-pulse'; // Changed from purple to sky blue
    case GenderDetectionStatus.ERROR:
    case GenderDetectionStatus.CAMERA_ERROR:
    case GenderDetectionStatus.API_KEY_MISSING:
      return 'text-red-400'; // Keep bright for errors
    case GenderDetectionStatus.IDLE:
    default:
      return 'text-gray-500'; // Muted for idle
  }
};

const CountDisplay: React.FC<{ counts: GenderAnalysisCounts }> = ({ counts }) => {
  const parts = [];
  if (counts.maleCount > 0) {
    parts.push(<span key="male" className="inline-flex items-center mx-1.5">♂️ <span className="ml-1 font-medium">{counts.maleCount}</span></span>);
  }
  if (counts.femaleCount > 0) {
    parts.push(<span key="female" className="inline-flex items-center mx-1.5">♀️ <span className="ml-1 font-medium">{counts.femaleCount}</span></span>);
  }
  if (counts.indeterminateCount > 0) {
    parts.push(<span key="indeterminate" className="inline-flex items-center mx-1.5">❓ <span className="ml-1 font-medium">{counts.indeterminateCount}</span></span>);
  }
  
  if (parts.length === 0 && (counts.maleCount + counts.femaleCount + counts.indeterminateCount) === 0) {
      return null; 
  }

  return <>{parts.map((part, index) => <React.Fragment key={index}>{part}{index < parts.length -1 ? <span className="text-gray-500 mx-1">|</span> : ''}</React.Fragment>)}</>;
};


const StatusIcon: React.FC<{ status: GenderDetectionStatus, counts?: GenderAnalysisCounts }> = ({ status, counts }) => {
  const iconBaseClass = "h-7 w-7 mr-2.5 inline-block";
  switch (status) {
    case GenderDetectionStatus.SUCCESS:
    case GenderDetectionStatus.PARTIAL_DETECTION:
      if (counts && (counts.maleCount > 0 || counts.femaleCount > 0 || counts.indeterminateCount > 0)) {
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className={`${iconBaseClass} text-green-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      } // Fallthrough for generic success if no counts
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${iconBaseClass} text-green-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case GenderDetectionStatus.NO_FACE_DETECTED:
    case GenderDetectionStatus.INDETERMINATE: 
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${iconBaseClass} ${status === GenderDetectionStatus.NO_FACE_DETECTED ? 'text-orange-400' : 'text-yellow-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9 14a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm6 0a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
        </svg>
      );
    case GenderDetectionStatus.DETECTING:
       return (
        <svg className={`animate-spin h-6 w-6 mr-3 inline-block ${getStatusColor(status)}`} viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
       );
    case GenderDetectionStatus.ERROR:
    case GenderDetectionStatus.CAMERA_ERROR:
    case GenderDetectionStatus.API_KEY_MISSING:
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className={`${iconBaseClass} text-red-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default: // IDLE
      return (
         <svg xmlns="http://www.w3.org/2000/svg" className={`${iconBaseClass} text-gray-600`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
  }
};


export const StatusDisplay: React.FC<StatusDisplayProps> = ({ result, isProcessing }) => {
  const currentStatus = isProcessing && result.status !== GenderDetectionStatus.DETECTING ? GenderDetectionStatus.DETECTING : result.status;

  let displayMessageText: string = currentStatus; 

  if (currentStatus === GenderDetectionStatus.SUCCESS || currentStatus === GenderDetectionStatus.PARTIAL_DETECTION) {
    if (result.counts) {
       const { maleCount, femaleCount, indeterminateCount } = result.counts;
       const totalFaces = maleCount + femaleCount + indeterminateCount;
        if (totalFaces > 0) {
            displayMessageText = "Detected"; 
        } else if (!isProcessing) { 
            displayMessageText = GenderDetectionStatus.NO_FACE_DETECTED;
        }
    }
  }

  const statusesWithDetailedMessage: GenderDetectionStatus[] = [
    GenderDetectionStatus.ERROR,
    GenderDetectionStatus.CAMERA_ERROR,
    GenderDetectionStatus.API_KEY_MISSING,
    GenderDetectionStatus.NO_FACE_DETECTED,
    GenderDetectionStatus.PARTIAL_DETECTION,
    GenderDetectionStatus.INDETERMINATE,
  ];

  return (
    <div className="text-center p-4 bg-gray-800 rounded-lg shadow-inner">
      <div className={`text-2xl font-semibold flex items-center justify-center ${getStatusColor(currentStatus)}`}>
        <StatusIcon status={currentStatus} counts={result.counts} />
        <span className="capitalize">{displayMessageText.replace("...", "")}</span> 
        {currentStatus === GenderDetectionStatus.DETECTING && <span className="animate-ping">...</span>}
      </div>
      
      {(currentStatus === GenderDetectionStatus.SUCCESS || currentStatus === GenderDetectionStatus.PARTIAL_DETECTION || currentStatus === GenderDetectionStatus.INDETERMINATE) && 
        result.counts && (result.counts.maleCount + result.counts.femaleCount + result.counts.indeterminateCount > 0) && (
        <div className={`mt-3 text-xl ${getStatusColor(currentStatus)}`}>
          <CountDisplay counts={result.counts} />
        </div>
      )}

      {result.message && statusesWithDetailedMessage.includes(currentStatus) && (
        <p className={`mt-2.5 text-sm ${getStatusColor(currentStatus)} opacity-80`}>{result.message}</p>
      )}

      {currentStatus === GenderDetectionStatus.IDLE && (
         <p className="mt-2 text-sm text-gray-500">Position face(s) in the camera view or upload an image.</p>
      )}
    </div>
  );
};