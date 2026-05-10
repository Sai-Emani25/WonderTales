import { GoogleGenAI, Modality, Type } from "@google/genai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey! });

export interface StoryPage {
  text: string;
  illustrationPrompt: string;
  characterDescription?: string;
  sceneDescription?: string;
  keyPoints?: string[]; // Added for training slides
}

export interface Story {
  id?: string;
  title: string;
  pages: StoryPage[];
  type: 'kid-story' | 'visual-novel' | 'training-video';
  theme?: string;
}

export async function generateStory(theme: string, type: 'kid-story' | 'visual-novel' | 'training-video' = 'kid-story'): Promise<Story> {
  if (type === 'training-video') return generateTrainingModule(theme);

  const prompt = type === 'visual-novel' 
    ? `Write a gripping visual novel script based on the theme: "${theme}". 
       Focus on dialogue and dramatic scene descriptions. 
       The story should be exactly 5 substantial pages long. 
       For each page, provide the dialogue/text and a detailed illustration prompt.
       The style should be "modern high-quality anime visual novel art, cinematic lighting".`
    : `Write a short, engaging children's story (for kids aged 4-8) based on the theme: "${theme}". 
       The story should be exactly 5 pages long. 
       For each page, provide the story text (1-2 sentences) and a detailed illustration prompt.
       The style should be "colorful children's book illustration, whimsical and soft".`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                illustrationPrompt: { type: Type.STRING },
                characterDescription: { type: Type.STRING, description: "Detailed physical description of main characters to ensure consistency" },
                sceneDescription: { type: Type.STRING, description: "Detailed description of the setting" }
              },
              required: ["text", "illustrationPrompt", "characterDescription", "sceneDescription"],
            },
          },
        },
        required: ["title", "pages"],
      },
    },
  });

  if (!response.text) throw new Error("No text returned from Gemini");

  try {
    const data = JSON.parse(response.text);
    return { ...data, type, theme };
  } catch (e) {
    throw new Error("Failed to parse story structure");
  }
}

export async function convertToVisualNovel(text: string): Promise<Story> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Convert the following book text/content into a 5-page visual novel script. 
    Focus on the most cinematic scenes. 
    Original Text: """${text}"""
    Illustration style: "high-quality cinematic anime visual novel art".`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                illustrationPrompt: { type: Type.STRING },
                characterDescription: { type: Type.STRING },
                sceneDescription: { type: Type.STRING }
              },
              required: ["text", "illustrationPrompt", "characterDescription", "sceneDescription"],
            },
          },
        },
        required: ["title", "pages"],
      },
    },
  });

  if (!response.text) throw new Error("No response");
  return { ...JSON.parse(response.text), type: 'visual-novel' };
}

export async function generateTrainingModule(guide: string): Promise<Story> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Transform the following training information into a 10-segment professional training video script. 
    Information: """${guide}"""
    
    Structure:
    1. Introduction to the topic.
    2. 8 Core Lessons/Modules based on the content.
    3. Final Summary and Call to Action.
    
    For each segment:
    - Provide a professional, clear narrative (text).
    - Provide 3-4 key bullet points (keyPoints) to show as a slide component.
    - Provide an illustration prompt for a "modern corporate tech illustration" or "clean 3D vector isometric" style.
    - Maintain a consistent "Mentor" character description for all segments.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          pages: {
            type: Type.ARRAY,
            minItems: 10,
            maxItems: 10,
            items: {
              type: Type.OBJECT,
              properties: {
                text: { type: Type.STRING },
                illustrationPrompt: { type: Type.STRING },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                },
                characterDescription: { type: Type.STRING },
                sceneDescription: { type: Type.STRING }
              },
              required: ["text", "illustrationPrompt", "keyPoints", "characterDescription", "sceneDescription"],
            },
          },
        },
        required: ["title", "pages"],
      },
    },
  });

  if (!response.text) throw new Error("No response from AI");
  return { ...JSON.parse(response.text), type: 'training-video' };
}

export async function generateIllustration(prompt: string, style: string, previousImageBase64?: string): Promise<string> {
  const parts: any[] = [
    {
      text: `${prompt}. Style: ${style}. High quality, detailed, centered composition.`,
    }
  ];

  if (previousImageBase64) {
    const cleanBase64 = previousImageBase64.replace(/^data:image\/[a-z]+;base64,/, "");
    parts.push({
      inlineData: {
        mimeType: "image/png",
        data: cleanBase64
      }
    });
    parts[0].text = `Reference the attached image for character, color, and background consistency. Maintain the same character appearance and setting style. ${parts[0].text}`;
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-image",
    contents: { parts },
    config: {
      imageConfig: {
        aspectRatio: "1:1",
      },
    },
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }

  throw new Error("No image generated");
}

export async function generateSpeech(text: string): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-tts-preview",
    contents: [{ parts: [{ text: `Read this story page: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Kore' },
        },
      },
    },
  });

  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) return pcmToWav(base64Audio);
  throw new Error("No audio generated");
}

function pcmToWav(base64Pcm: string): string {
  if (typeof window === 'undefined') return '';
  const pcmData = atob(base64Pcm);
  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 24000 * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, pcmData.length, true);

  for (let i = 0; i < pcmData.length; i++) {
    view.setUint8(44 + i, pcmData.charCodeAt(i));
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}
