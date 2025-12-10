import { GoogleGenAI, Chat, GenerateContentResponse, FunctionDeclaration, Type, Part } from "@google/genai";
import { SYSTEM_INSTRUCTION } from '../constants';

let aiInstance: GoogleGenAI | null = null;
let chatSession: Chat | null = null;

const getAiInstance = () => {
  if (!aiInstance) {
    if (!process.env.API_KEY) {
      console.warn("API_KEY is missing from environment variables.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }
  return aiInstance;
};

// Define the tool for image generation
const imageGenerationTool: FunctionDeclaration = {
  name: "generate_marketing_image",
  description: "Generates a marketing image, flyer, or WhatsApp status image based on a prompt.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A detailed description of the image to generate, including style, product details, and text to appear (if any).",
      },
    },
    required: ["prompt"],
  },
};

export const initializeChat = async () => {
  const ai = getAiInstance();
  if (!ai) return null;

  chatSession = ai.chats.create({
    model: 'gemini-2.5-flash',
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
      tools: [{ functionDeclarations: [imageGenerationTool] }],
    },
  });
  return chatSession;
};

const generateImage = async (prompt: string): Promise<string | null> => {
  const ai = getAiInstance();
  if (!ai) return null;
  
  try {
    // Using gemini-2.5-flash-image for generation (nano banana)
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        // Nano banana models do not support responseMimeType or responseSchema
      }
    });

    // Extract image data
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      const parts = response.candidates[0].content.parts;
      for (const part of parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    }
    return null;
  } catch (e) {
    console.error("Image Generation Failed:", e);
    return null;
  }
};

export interface ChatResponse {
  text: string;
  images?: string[];
}

export interface AttachmentData {
  type: 'image' | 'audio' | 'document';
  content: string; // Base64 string or Raw Text
  mimeType: string;
  name?: string;
}

export const sendMessageToGemini = async (
  text: string, 
  attachment?: AttachmentData
): Promise<ChatResponse> => {
  const ai = getAiInstance();
  
  if (!ai) {
    return new Promise(resolve => 
      setTimeout(() => resolve({ text: "I can't connect right now (Missing API Key)." }), 1000)
    );
  }

  try {
    if (!chatSession) {
      await initializeChat();
    }

    if (!chatSession) throw new Error("Failed to initialize chat");

    let response: GenerateContentResponse;

    // Construct parts array strictly typed as Part[]
    const parts: Part[] = [];
    
    // Always ensure text is present if it's the only content, or if provided
    if (text && text.trim().length > 0) {
      parts.push({ text: text });
    }

    if (attachment) {
      if (attachment.type === 'document' && attachment.mimeType === 'application/pdf') {
        // PDF sent as inlineData (supported by Gemini 1.5/2.5)
        const cleanBase64 = attachment.content.split(',')[1] || attachment.content;
        if (cleanBase64) {
          parts.push({
             inlineData: { mimeType: 'application/pdf', data: cleanBase64 }
          });
        }
      } else if (attachment.type === 'document' && (attachment.mimeType.startsWith('text/') || attachment.mimeType === 'application/csv' || attachment.mimeType === 'application/json')) {
        // CSV/Text files sent as text parts
        const docName = attachment.name || "Document";
        parts.push({ text: `\n[Content of ${docName}]:\n${attachment.content}\n[End of ${docName}]\n` });
      } else {
         // Image or Audio
         const cleanBase64 = attachment.content.split(',')[1] || attachment.content;
         if (cleanBase64 && cleanBase64.length > 0) {
            parts.push({
              inlineData: {
                mimeType: attachment.mimeType, 
                data: cleanBase64
              }
            });
         }
      }
    }

    // Guard clause: ensure we are sending at least one part
    if (parts.length === 0) {
      // If nothing to send, do not call API.
      return { text: "" };
    }

    // Send the message
    response = await chatSession.sendMessage({
       message: parts
    });

    // Handle Tool Calls (Function Calling)
    const toolCalls = response.functionCalls;
    if (toolCalls && toolCalls.length > 0) {
      const toolCall = toolCalls[0];
      if (toolCall.name === 'generate_marketing_image') {
        const promptArg = toolCall.args['prompt'];
        const prompt = typeof promptArg === 'string' ? promptArg : JSON.stringify(promptArg);
        
        // Generate the image using a separate model call
        const generatedImageBase64 = await generateImage(prompt);
        
        // Respond to the function call within the chat session
        const toolResponsePart: Part = {
          functionResponse: {
            name: toolCall.name,
            id: toolCall.id,
            response: { 
              result: generatedImageBase64 ? "Image generated successfully." : "Failed to generate image." 
            }
          }
        };

        // Send tool response to get the final text caption.
        const finalResponse = await chatSession.sendMessage({ 
          message: [toolResponsePart] 
        });

        return {
          text: finalResponse.text || "",
          images: generatedImageBase64 ? [generatedImageBase64] : []
        };
      }
    }

    return { text: response.text || "" };
  } catch (error) {
    console.error("Gemini Error:", error);
    return { text: "Sorry, I had trouble processing that request." };
  }
};