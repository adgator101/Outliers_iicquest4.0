import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export const geminiFlash = genAI.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: {
    responseMimeType: "application/json",
    temperature: 0.2,
  },
});

export async function generateJSON<T>(prompt: string): Promise<T> {
  const result = await geminiFlash.generateContent(prompt);
  const text = result.response.text();
  return JSON.parse(text) as T;
}
