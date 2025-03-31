module.exports = async (product_id) => {
    try {
      //Donner nos instructions à l'IA
      const prompt = `Try giving a score from -100 to 100 on ${product_id} market confidence and give your response using this JSON schema without explaining:
    
        score = {'score': integer}
        Return: Scores`
    

      const scores = [];
      // Demander 3 fois à l'IA
      for (let i = 0; i < 3; i++) {
        //Envoyer une requête à l'IA et récupérer la réponse
        const result = await ai.generateContent(prompt);
    
        //Récupérer les données qui nous intéressent
        const jsonMatch = result.response.text().match(/\{[\s\S]*\}/);
        const sanitizedText = jsonMatch[0];
        const parsedResponse = JSON.parse(sanitizedText);

        //Si le score n'est pas compris entre -100 et 100 comme on le demande à l'IA, on renvoie une erreur
        if(parsedResponse.score < -100 || parsedResponse.score > 100) {
          throw new Error("Score out of bounds");
        }
      }

      const averageScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

      return averageScore;
    } catch (error) {
        return null;
    }
  };
  