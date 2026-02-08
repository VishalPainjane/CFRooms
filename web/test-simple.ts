import { generateProblemAnalysis } from './lib/gemini';

async function test() {
    console.log("Testing Single Key...");
    const result = await generateProblemAnalysis(
        "AIzaSyBUA-QVeEMftZwZdNVHB1Kj_1ng1oz8kQI", 
        "1490C", 
        "Sum of Cubes", 
        "Editorial content..."
    );
    console.log("Result:", result);
}

test();
