module.exports = async (product_id) => {
    try {
      //Donner nos instructions à l'IA
      const prompt = `Try giving a score from -100 to 100 on ${product_id} market confidence and give your response using this JSON schema without explaining:
    
        score = {'score': integer}
        Return: Scores`
    
      //Envoyer une requête à l'IA et récupérer la réponse
      const result = await ai.generateContent(prompt);
    
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
      const sanitizedText = jsonMatch[0];
      const parsedResponse = JSON.parse(sanitizedText);

      return parsedResponse.score;
    } catch (error) {
        console.error("Error parsing response:", error.message);
        return null;
    }
  };
  