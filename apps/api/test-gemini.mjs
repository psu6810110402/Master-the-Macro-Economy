import { GoogleGenAI } from '@google/genai';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

console.log('Testing Gemini API with key starting with:', process.env.GEMINI_API_KEY?.substring(0, 10));

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: 'Hello, testing the API key! Reply with "OK" if you can read this.',
}).then(res => console.log('✅ Gemini Success:', res.text))
  .catch(err => console.error('❌ Gemini Error:', err.message));
