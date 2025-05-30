
export enum GenderDetectionStatus {
  IDLE = "Idle",
  DETECTING = "Detecting...",
  SUCCESS = "Analysis Complete",
  NO_FACE_DETECTED = "No Faces Detected",
  PARTIAL_DETECTION = "Partial Detection", // Some faces indeterminate
  INDETERMINATE = "All Detected Faces Indeterminate", // All detected faces are indeterminate
  ERROR = "Error",
  CAMERA_ERROR = "Camera Error",
  API_KEY_MISSING = "API Key Missing"
}

export interface GenderAnalysisCounts {
  maleCount: number;
  femaleCount: number;
  indeterminateCount: number;
}

export interface DetailedGenderAnalysisResult {
  status: GenderDetectionStatus;
  counts?: GenderAnalysisCounts;
  message?: string; // For errors, or additional context like "1 male, 2 females"
  rawResponse?: string; // Optional: store the raw text from Gemini for debugging
}