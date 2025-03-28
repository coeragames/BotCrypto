
const { GoogleGenerativeAI } = require("@google/generative-ai");
  
//se connecter à Gemini avec la clé d'API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

//Choisir le modèle qui nous intéresse et activer la fonctionnalité Google Search (chercher des informations en ligne)
const model = genAI.getGenerativeModel({
  model: "gemini-2.0-flash-exp",
  systemInstruction: "Use news and online reactions of individuals as sources for your answer.",
  tools: [{ googleSearch: {} }]
});

module.exports = model