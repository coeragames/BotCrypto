module.exports = async () => {
    try {
      //Donner nos instructions à l'IA
      const prompt = `Try giving a list of 2 trending cryptos and give your response using this JSON schema without explaining:
    
      cryptos = {'cryptos': list}
      Return: Cryptos`
    
      //Envoyer une requête à l'IA et récupérer la réponse
      const result = await ai.generateContent(prompt);
  
      //Récupérer les données qui nous intéressent
      const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
      const sanitizedText = jsonMatch[0];
      const parsedResponse = JSON.parse(sanitizedText);
  
      return parsedResponse.cryptos
    } catch (error) {
      return null
    }
  };
  