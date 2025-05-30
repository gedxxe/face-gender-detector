
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { analyzeImageForGender } from './services/geminiService';
import { GenderDetectionStatus, DetailedGenderAnalysisResult } from './types';
import { CameraFeed } from './components/CameraFeed';
import { StatusDisplay } from './components/StatusDisplay';
import { LoadingSpinner } from './components/LoadingSpinner';

const CAPTURE_INTERVAL_MS = 7000; // Capture frame every 5 seconds

const App: React.FC = () => {
  // Camera related state
  const [isCameraEnabled, setIsCameraEnabled] = useState<boolean>(true);
  const [cameraGenderResult, setCameraGenderResult] = useState<DetailedGenderAnalysisResult>({ status: GenderDetectionStatus.IDLE });
  const [isCameraLoading, setIsCameraLoading] = useState<boolean>(true);
  const [isCameraProcessing, setIsCameraProcessing] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  // File upload related state
  const [fileUploadResult, setFileUploadResult] = useState<DetailedGenderAnalysisResult | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [isFileSystemProcessing, setIsFileSystemProcessing] = useState<boolean>(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [apiKeyAvailable, setApiKeyAvailable] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCameraProcessingRef = useRef(isCameraProcessing);
  useEffect(() => {
    isCameraProcessingRef.current = isCameraProcessing;
  }, [isCameraProcessing]);

  useEffect(() => {
    const apiKey = process.env.API_KEY;
    if (apiKey && apiKey.trim() !== "") {
      setApiKeyAvailable(true);
    } else {
      const errorResult: DetailedGenderAnalysisResult = { 
        status: GenderDetectionStatus.API_KEY_MISSING, 
        message: "Gemini API Key is not configured." 
      };
      setCameraGenderResult(errorResult);
      setFileUploadResult(errorResult);
      setApiKeyAvailable(false);
      setIsCameraLoading(false); 
      setIsCameraEnabled(false); 
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraGenderResult({ status: GenderDetectionStatus.IDLE, message: "Camera is disabled." });
    setIsCameraLoading(false);
    setIsCameraProcessing(false);
    setCameraError(null);
  }, []);

  const startCamera = useCallback(async () => {
    if (!apiKeyAvailable) {
        setCameraError("API Key not available to start camera.");
        setIsCameraLoading(false);
        return;
    }

    setIsCameraLoading(true);
    setCameraError(null);
    setCameraGenderResult({ status: GenderDetectionStatus.IDLE }); 
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadedmetadata = () => {
          setIsCameraLoading(false);
        };
        videoRef.current.onemptied = () => { 
          setIsCameraLoading(false); 
        }
      } else {
        stream.getTracks().forEach(track => track.stop());
        setIsCameraLoading(false);
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      const errorMessage = "Could not access camera. Please ensure permissions are granted and no other app is using it.";
      setCameraError(errorMessage);
      setCameraGenderResult({ status: GenderDetectionStatus.CAMERA_ERROR, message: errorMessage });
      setIsCameraLoading(false);
    }
  }, [apiKeyAvailable]);


  useEffect(() => {
    if (apiKeyAvailable) {
      if (isCameraEnabled) {
        startCamera();
      } else {
        stopCamera();
      }
    } else {
      stopCamera();
    }
    return () => {
        if (streamRef.current) { 
            stopCamera(); 
        }
    };
  }, [apiKeyAvailable, isCameraEnabled, startCamera, stopCamera]);


  const captureAndAnalyzeFrame = useCallback(async () => {
    if (!isCameraEnabled || !videoRef.current || !canvasRef.current || videoRef.current.readyState < videoRef.current.HAVE_METADATA || videoRef.current.paused || videoRef.current.ended) {
      // console.warn("Camera not ready or disabled, skipping frame capture.");
      return;
    }
    if(isCameraProcessingRef.current) {
      // console.log("Already processing a camera frame.");
      return;
    }

    setIsCameraProcessing(true);
    setCameraGenderResult(prev => ({ ...prev, status: GenderDetectionStatus.DETECTING }));

    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      setCameraGenderResult({ status: GenderDetectionStatus.ERROR, message: "Failed to get canvas context." });
      setIsCameraProcessing(false);
      return;
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const result = await analyzeImageForGender(imageDataUrl);
      setCameraGenderResult(result);
    } catch (error) {
      console.error("Error analyzing camera image:", error);
      let message = "An error occurred during camera analysis.";
      if (error instanceof Error) {
        message = error.message;
      }
      setCameraGenderResult({ status: GenderDetectionStatus.ERROR, message });
    } finally {
      setIsCameraProcessing(false);
    }
  }, [videoRef, canvasRef, isCameraEnabled]); 


  useEffect(() => {
    let intervalId: number | null = null;
    if (apiKeyAvailable && isCameraEnabled && !isCameraLoading && !cameraError && videoRef.current?.srcObject) {
      intervalId = setInterval(() => {
        if (!isCameraProcessingRef.current) { 
          captureAndAnalyzeFrame();
        }
      }, CAPTURE_INTERVAL_MS) as unknown as number; 
    }
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [apiKeyAvailable, isCameraEnabled, isCameraLoading, cameraError, captureAndAnalyzeFrame]);

  const handleFileChange = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!apiKeyAvailable) return;

    const file = event.target.files?.[0];
    if (!file) {
      setUploadedImagePreview(null);
      setFileUploadResult(null);
      setFileError(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
        setUploadedImagePreview(null);
        setFileUploadResult(null);
        setFileError("Invalid file type. Please upload an image.");
        return;
    }
    
    setFileError(null);
    setIsFileSystemProcessing(true);
    setFileUploadResult({ status: GenderDetectionStatus.DETECTING });

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64ImageData = reader.result as string;
      setUploadedImagePreview(base64ImageData);
      try {
        const result = await analyzeImageForGender(base64ImageData);
        setFileUploadResult(result);
      } catch (error) {
        console.error("Error analyzing uploaded image:", error);
        let message = "An error occurred during file analysis.";
        if (error instanceof Error) {
          message = error.message;
        }
        setFileUploadResult({ status: GenderDetectionStatus.ERROR, message });
      } finally {
        setIsFileSystemProcessing(false);
      }
    };
    reader.onerror = () => {
        console.error("Error reading file:", reader.error);
        setFileUploadResult({ status: GenderDetectionStatus.ERROR, message: "Failed to read the selected file." });
        setIsFileSystemProcessing(false);
        setUploadedImagePreview(null);
    };
    reader.readAsDataURL(file);
    
    if(fileInputRef.current) {
        fileInputRef.current.value = "";
    }

  }, [apiKeyAvailable]);

  const handleToggleCamera = () => {
    setIsCameraEnabled(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-indigo-950 to-slate-900 text-gray-200 flex flex-col font-['Montserrat']">
      <header className="py-10 sm:py-12 md:py-16 px-4 text-center shrink-0">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-[0.15em] sm:tracking-[0.2em] uppercase text-white">
          Face Gender Detector
        </h1>
        <p className="text-gray-400 mt-4 text-base sm:text-lg max-w-2xl mx-auto">
          Utilizing Gemini API for real-time &amp; uploaded image insights.
        </p>
        <p className="text-gray-400 mt-4 text-base sm:text-lg max-w-2xl mx-auto">
          Created by I Gede Bagus Jayendra.
        </p>
      </header>

      {!apiKeyAvailable && (cameraGenderResult.status === GenderDetectionStatus.API_KEY_MISSING || fileUploadResult?.status === GenderDetectionStatus.API_KEY_MISSING) && (
        <div className="w-full max-w-3xl mx-auto p-6 bg-red-900 bg-opacity-80 rounded-lg shadow-xl text-center my-8">
          <h2 className="text-2xl font-semibold text-red-300">API Key Error</h2>
          <p className="text-red-200 mt-2">{cameraGenderResult.message || fileUploadResult?.message}</p>
          <p className="text-gray-400 mt-2 text-sm">Please ensure the Gemini API key is correctly configured in your environment.</p>
        </div>
      )}

      {apiKeyAvailable && (
        <main className="flex-grow w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Live Camera Panel */}
          <section className="bg-slate-800/70 backdrop-blur-lg border border-white/10 shadow-2xl rounded-xl flex flex-col overflow-hidden h-full">
            <div className="p-4 sm:p-6 border-b border-gray-700/50 flex flex-col sm:flex-row justify-between items-center">
              <h2 className="text-xl sm:text-2xl font-bold text-sky-400 mb-3 sm:mb-0">Live Camera Analysis</h2>
              <button
                onClick={handleToggleCamera}
                className={`px-4 py-2 rounded-md font-semibold transition-colors duration-150 ease-in-out text-xs sm:text-sm shadow-md
                            ${isCameraEnabled ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' 
                                            : 'bg-green-500 hover:bg-green-600 focus:ring-green-400'} 
                            text-white focus:outline-none focus:ring-2 focus:ring-opacity-75`}
                aria-pressed={isCameraEnabled}
                aria-label={isCameraEnabled ? 'Disable camera' : 'Enable camera'}
              >
                {isCameraEnabled ? 'Disable Camera' : 'Enable Camera'}
              </button>
            </div>
            <div className="p-4 sm:p-6 flex-grow flex flex-col">
                <div className="relative mb-4">
                  <CameraFeed 
                    videoRef={videoRef} 
                    isLoading={isCameraLoading} 
                    error={cameraError} 
                    isCameraEnabled={isCameraEnabled} 
                  />
                  {isCameraEnabled && (isCameraProcessing || (isCameraLoading && !cameraError)) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-70 rounded-t-xl">
                      <LoadingSpinner />
                    </div>
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden"></canvas>
                {isCameraEnabled ? (
                  <div className="mt-auto">
                     <StatusDisplay result={cameraGenderResult} isProcessing={isCameraProcessing} />
                  </div>
                ) : (
                  <div className="mt-auto text-center p-4 bg-gray-800/80 backdrop-blur-sm rounded-lg">
                    <p className="text-gray-400 text-base sm:text-lg font-medium">Camera analysis is currently disabled.</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">Click "Enable Camera" to begin live analysis.</p>
                  </div>
                )}
            </div>
          </section>

          {/* File Upload Panel */}
          <section className="bg-slate-800/70 backdrop-blur-lg border border-white/10 shadow-2xl rounded-xl flex flex-col overflow-hidden h-full">
             <div className="p-4 sm:p-6 border-b border-gray-700/50">
                <h2 className="text-xl sm:text-2xl font-bold text-sky-400 text-center sm:text-left">Analyze Image from File</h2>
             </div>
            <div className="p-4 sm:p-6 flex-grow flex flex-col items-center justify-center">
              <label htmlFor="file-upload" className={`cursor-pointer text-white font-semibold py-2.5 px-6 sm:py-3 sm:px-8 rounded-lg shadow-xl transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-75 text-sm sm:text-base
                ${isFileSystemProcessing ? 'bg-gray-600 cursor-not-allowed' : 'bg-sky-600 hover:bg-sky-700 focus:ring-sky-400'}`}>
                {isFileSystemProcessing ? 'Processing...' : 'Upload Image'}
              </label>
              <input 
                id="file-upload"
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden"
                aria-label="Upload image for gender detection"
                disabled={isFileSystemProcessing || !apiKeyAvailable}
              />
              
              {fileError && (
                <p className="text-red-400 text-xs sm:text-sm mt-3">{fileError}</p>
              )}

              {uploadedImagePreview && (
                <div className="mt-4 w-full max-w-md border-2 border-gray-700/50 rounded-lg overflow-hidden shadow-lg">
                  <img src={uploadedImagePreview} alt="Uploaded preview" className="w-full h-auto object-contain max-h-[40vh] sm:max-h-[50vh]" />
                </div>
              )}

              {isFileSystemProcessing && !uploadedImagePreview && (
                 <div className="py-4 mt-3">
                    <LoadingSpinner />
                 </div>
              )}
              
              {fileUploadResult && (
                <div className="mt-4 w-full max-w-md">
                  <StatusDisplay result={fileUploadResult} isProcessing={isFileSystemProcessing} />
                </div>
              )}
               {!uploadedImagePreview && !fileUploadResult && !isFileSystemProcessing && (
                <p className="mt-6 text-gray-500 text-sm text-center">Upload an image to begin analysis.</p>
              )}
            </div>
          </section>
        </main>
      )}
      
      <footer className="mt-auto py-8 text-center text-gray-500 text-xs sm:text-sm shrink-0 px-4">
        <p>Note: Gender detection is based on visual cues and AI perception. It may not be accurate and should be used responsibly.</p>
        <p>&copy; {new Date().getFullYear()} gedxxe. All Rights Reserved.</p>
      </footer>
    </div>
  );
};

export default App;
