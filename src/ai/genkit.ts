
import { genkit, AIMiddleware } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { z } from 'zod';

const logMiddleware: AIMiddleware = async (input, next) => {
  console.log('AI Request:', JSON.stringify(input, null, 2));
  try {
    const result = await next(input);
    console.log('AI Response:', JSON.stringify(result, null, 2));
    return result;
  } catch (e: any) {
    console.error('AI Error:', e.stack);
    throw e;
  }
};

export const ai = genkit({
  plugins: [
    googleAI({
      apiVersion: 'v1beta',
    }),
  ],
  defaultModel: {
    model: googleAI.model('gemini-1.0-pro'),
    temperature: 0.5,
  },
  middlewares: [logMiddleware],
});
