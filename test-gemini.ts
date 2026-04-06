import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';
dotenv.config({ path: 'apps/api/.env' });

async function testGemini() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Sending test prompt to Gemini...');
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Hello, are you working?',
    });
    console.log('Response:', response.text);
    console.log('Gemini API is WORKING perfectly! ✅');
  } catch (err: any) {
    console.error('Error testing Gemini AI:', err.message);
  }
}
testGemini();
