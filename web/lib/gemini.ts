import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateProblemAnalysis(
    apiKey: string, 
    problemId: string, 
    problemName: string, 
    editorialContent?: string
) {
  // STRICTLY use the new fresh key
  const finalApiKey = "AIzaSyA94neEluCWbxKAZQCP-exxsdeUh4VNQ8A";

  try {
    const genAI = new GoogleGenerativeAI(finalApiKey);
    
    // gemini-2.0-flash is the only one recognized (returns 429 instead of 404)
    // We will use it and handle the quota error gracefully.
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.0-flash",
        generationConfig: {
            responseMimeType: "application/json",
        }
    });

    if (!editorialContent || !editorialContent.trim()) {
        return { error: "No tutorial content provided." };
    }

    const prompt = `Problem: ${problemId} - ${problemName}
Extract solution logic from this text. JSON only: { "hint": "...", "description": "...", "tags": "..." }

Text:
${editorialContent.substring(0, 20000)}`;

    const result = await model.generateContent(prompt);
    const text = (await result.response).text();

    try {
        return JSON.parse(text);
    } catch (e) {
        let jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    }

  } catch (error: any) {
    console.error(`Gemini generation failed for ${problemId}:`, error.message);
    
    if (error.status === 429 || error.message?.includes("Quota")) {
        return { error: "Quota Exceeded" };
    }
    
    return { error: "Generation Failed" };
  }
}
