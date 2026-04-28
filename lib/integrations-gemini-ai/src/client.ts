import { GoogleGenAI } from "@google/genai";

if (!process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
  console.warn(
    "AI_INTEGRATIONS_GEMINI_BASE_URL is not set. AI features will fall back to deterministic responses.",
  );
}

if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY) {
  console.warn(
    "AI_INTEGRATIONS_GEMINI_API_KEY is not set. AI features will fall back to deterministic responses.",
  );
}

export const ai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY || "dummy",
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL || "http://localhost",
  },
});
