const GOOGLE_AI_API_KEY = import.meta.env.VITE_GOOGLE_AI_API_KEY;

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
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GOOGLE_AI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `Analyze this civic issue image and provide a concise description (2-3 sentences max). Location: ${input.locationData}. Focus on: What type of civic problem is visible, key details that would help authorities understand the issue. Avoid personal information or assumptions. Provide only the description, no introductory text.`
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: base64Data
              }
            }
          ]
        }]
      })
    });

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

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