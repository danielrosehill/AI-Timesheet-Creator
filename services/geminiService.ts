import { GoogleGenAI } from "@google/genai";
import { fileToBase64 } from '../utils/fileUtils';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  // In a real app, this would be handled more gracefully, maybe disabling the feature.
  // For this context, we assume the key is present.
  console.warn("API_KEY environment variable not set. Gemini API calls will fail.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });

interface GenerateTimesheetParams {
    imageFile: File | null;
    calendarText: string;
    narration: string;
    startDate: string;
}

const buildPrompt = (startDate: string, hasImage: boolean, hasText: boolean, hasNarration: boolean) => {
    let prompt = `You are a helpful assistant that generates detailed timesheets in Markdown format. Your task is to analyze the provided calendar information, a voice narration of the week's work, and a starting date. Combine all this information to create a structured timesheet.

**Generate a timesheet for the week commencing ${startDate}.**

Here is the information I have provided:
`;
    if(hasImage) prompt += `- A calendar screenshot.\n`;
    if(hasText) prompt += `- Text from my calendar.\n`;
    if(hasNarration) prompt += `- A voice narration transcript of my work.\n`;

    prompt += `
**Instructions for the output:**

1.  Create a main heading: 'Timesheet for Week Commencing ${startDate}'.
2.  For each day of the week (Monday to Friday, or as indicated by the data), create a subheading.
3.  Under each day, list the activities as bullet points. Incorporate meetings from the calendar data and tasks from the voice narration.
4.  If time estimates are mentioned in the voice narration (e.g., 'I spent 3 hours on Project X'), include them next to the task.
5.  At the end of each day's list, calculate and display the 'Total Hours' for that day in bold.
6.  After all the days, add a 'Weekly Summary' section.
7.  In the summary, calculate and display the 'Total Estimated Hours for the Week' in bold.
8.  Format the entire output as clean, readable Markdown. Use tables for daily summaries if it improves clarity. Ensure the final output is only the markdown, with no extra conversational text or preambles.
`;
    return prompt;
}

export const generateTimesheet = async ({
    imageFile,
    calendarText,
    narration,
    startDate,
}: GenerateTimesheetParams): Promise<string> => {
    const model = 'gemini-2.5-flash';
    const parts: any[] = [];
    
    if (imageFile) {
        const base64Image = await fileToBase64(imageFile);
        parts.push({
            inlineData: {
                mimeType: imageFile.type,
                data: base64Image,
            },
        });
    }

    const promptText = buildPrompt(startDate, !!imageFile, !!calendarText.trim(), !!narration.trim());
    let combinedText = promptText;

    if(calendarText.trim()) {
        combinedText += `\n\n--- CALENDAR TEXT ---\n${calendarText}`;
    }

    if(narration.trim()) {
        combinedText += `\n\n--- VOICE NARRATION TRANSCRIPT ---\n${narration}`;
    }
    
    parts.push({text: combinedText});

    try {
        const response = await ai.models.generateContent({
            model: model,
            contents: { parts: parts },
        });

        return response.text;
    } catch (error) {
        console.error("Error generating timesheet:", error);
        if (error instanceof Error) {
            return `Error: An error occurred while generating the timesheet. ${error.message}`;
        }
        return "Error: An unknown error occurred while generating the timesheet.";
    }
};
