import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyA94neEluCWbxKAZQCP-exxsdeUh4VNQ8A";

const MODELS_TO_TEST = [
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-1.5-flash-001",
  "gemini-1.5-flash-8b",
  "gemini-1.5-pro",
  "gemini-pro",
  "gemini-1.0-pro"
];

async function testAll() {
  console.log(`\n🔍 Testing ${MODELS_TO_TEST.length} models with key ending in ...${API_KEY.slice(-4)}\n`);
  const genAI = new GoogleGenerativeAI(API_KEY);

  for (const modelName of MODELS_TO_TEST) {
    process.stdout.write(`Testing ${modelName.padEnd(25)} ... `);
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent("Say 'OK'");
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        console.log(`✅ SUCCESS!`);
        console.log(`\n🎉 FOUND WORKING MODEL: "${modelName}"`);
        console.log(`\n👉 Update your gemini.ts to use: "${modelName}"\n`);
        return; 
      }
    } catch (error: any) {
      if (error.message && error.message.includes("404")) {
        console.log("❌ Not Found (404)");
      } else if (error.message && error.message.includes("429")) {
        console.log("⚠️ Quota Limit (429)");
      } else {
        const msg = error.message ? error.message.split(":")[0] : "Unknown Error";
        console.log(`❌ Error: ${msg}`);
      }
    }
  }
  console.log("\n❌ No working models found. You may need a new API key.");
}

testAll();