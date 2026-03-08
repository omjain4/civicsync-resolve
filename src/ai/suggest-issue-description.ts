import { GoogleGenAI } from "@google/genai";

const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;
const ai = new GoogleGenAI({ apiKey: GOOGLE_AI_API_KEY });

export interface SuggestIssueDescriptionInput {
  photoDataUri: string;
  locationData: string;
}

export interface SuggestIssueDescriptionOutput {
  suggestedDescription: string;
}

export async function suggestIssueDescription(
  input: SuggestIssueDescriptionInput
): Promise<SuggestIssueDescriptionOutput> {
  try {
    const base64Data = input.photoDataUri.split(',')[1];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Analyze this civic issue image and provide a concise description (2-3 sentences max). Location: ${input.locationData}. Focus on: What type of civic problem is visible, key details that would help authorities understand the issue. Avoid personal information or assumptions. Provide only the description, no introductory text.`
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }
      ]
    });

    const text = response.text;

    return {
      suggestedDescription: text || "Unable to analyze the image. Please provide a manual description."
    };
  } catch (error) {
    console.error('AI description generation failed:', error);
    return {
      suggestedDescription: "AI description unavailable. Please describe the issue manually."
    };
  }
}