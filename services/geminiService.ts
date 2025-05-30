
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { GenderDetectionStatus, DetailedGenderAnalysisResult, GenderAnalysisCounts } from '../types';

const API_KEY = process.env.API_KEY;

let ai: GoogleGenAI | null = null;
if (API_KEY) {
  ai = new GoogleGenAI({ apiKey: API_KEY });
}

interface GeminiGenderResponse {
  male_count: number;
  female_count: number;
  indeterminate_count: number;
  no_face_detected: boolean;
}

export const analyzeImageForGender = async (base64ImageData: string): Promise<DetailedGenderAnalysisResult> => {
  if (!ai) {
    console.error("Gemini API key not configured or GoogleGenAI SDK failed to initialize.");
    return { status: GenderDetectionStatus.API_KEY_MISSING, message: "Gemini API client is not initialized. Check API Key." };
  }

  const imagePart = {
    inlineData: {
      mimeType: 'image/jpeg',
      data: base64ImageData.split(',')[1], // Remove the "data:image/jpeg;base64," prefix
    },
  };

  const textPart = {
    text: `Analyze all human faces in this image. For each face, perceive its gender as 'Male', 'Female', or 'Indeterminate'.
Respond strictly in JSON format with the following structure:
{
  "male_count": <integer>,
  "female_count": <integer>,
  "indeterminate_count": <integer>,
  "no_face_detected": <boolean> 
}
If 'no_face_detected' is true, all counts must be 0.
If faces are detected, 'no_face_detected' must be false.
Only include detected human faces in the counts.`
  };

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash-preview-04-17',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseMimeType: "application/json",
      }
    });

    let jsonStr = response.text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
      jsonStr = match[2].trim();
    }
    
    const parsedData = JSON.parse(jsonStr) as GeminiGenderResponse;

    const counts: GenderAnalysisCounts = {
      maleCount: parsedData.male_count || 0,
      femaleCount: parsedData.female_count || 0,
      indeterminateCount: parsedData.indeterminate_count || 0,
    };

    if (parsedData.no_face_detected) {
      return { status: GenderDetectionStatus.NO_FACE_DETECTED, counts, message: "No human faces were detected in the image." };
    }

    const totalDetected = counts.maleCount + counts.femaleCount + counts.indeterminateCount;
    if (totalDetected === 0 && !parsedData.no_face_detected) {
        // This case implies faces might have been expected but none classified.
        return { status: GenderDetectionStatus.NO_FACE_DETECTED, counts, message: "No human faces were clearly classified."};
    }
    
    let statusMessage = "Analysis complete.";
    let finalStatus = GenderDetectionStatus.SUCCESS;

    if (counts.indeterminateCount > 0 && (counts.maleCount > 0 || counts.femaleCount > 0)) {
      finalStatus = GenderDetectionStatus.PARTIAL_DETECTION;
      statusMessage = "Some face genders could not be determined.";
    } else if (counts.indeterminateCount > 0 && counts.maleCount === 0 && counts.femaleCount === 0) {
      finalStatus = GenderDetectionStatus.INDETERMINATE; 
      statusMessage = "Could not determine gender for any detected faces.";
    }


    return { 
        status: finalStatus, 
        counts, 
        message: statusMessage,
        rawResponse: response.text 
    };

  } catch (error) {
    console.error("Error calling Gemini API or parsing response:", error);
    let errorMessage = "Failed to analyze image due to an API error or response issue.";
    let errorStatus = GenderDetectionStatus.ERROR;

    if (error instanceof SyntaxError) {
        errorMessage = "Failed to parse JSON response from AI. The format might be incorrect.";
    } else if (error instanceof Error) {
      if (error.message.includes("API key not valid")) {
        errorMessage = "Invalid Gemini API Key. Please check your configuration.";
        errorStatus = GenderDetectionStatus.API_KEY_MISSING;
      } else if (error.message.includes("quota")) {
        errorMessage = "API quota exceeded. Please try again later.";
      }
    }
    return { status: errorStatus, message: errorMessage, rawResponse: (error instanceof Error && 'response' in error) ? (error as any).response?.text : undefined };
  }
};