const client = require('../api/client'); // Ensure you have the client setup for API calls

// On calcule la volatilité, soit l'écart-type. Petite référence au cours sur les probabilités aléatoires ;)
module.exports = async (days, product_id) => {
    try {
        // On récupére les bougies de 1 journée
        const candles = (await client.getProductCandles({
            product_id: product_id,
            granularity: "86400",
        })).sort((a, b) => a[0] - b[0]);

        // On garde les bougies des derniers jours (défini en fonction de days)
        const lastDaysCandles = candles.slice(-days);

        // On enlève toutes les données sauf les prix de clôture
        const closingPrices = lastDaysCandles.map(candle => candle[4]);

        // On calcule la variation des prix de fermeture et on fait leur moyenne.
        const priceChanges = closingPrices.slice(1).map((price, i) => (price - closingPrices[i]) / closingPrices[i]);
        const meanChange = priceChanges.reduce((sum, change) => sum + change, 0) / priceChanges.length;

        // On calcule la variance
        const variance = priceChanges.reduce((sum, change) => sum + Math.pow(change - meanChange, 2), 0) / priceChanges.length;
        //Puis la volatilité, soit l'écart-type
        const volatility = Math.sqrt(variance);

        return volatility;
    } catch (error) {
        console.error("Error while calculating volatility:", error.message);
        return null;
    }
};