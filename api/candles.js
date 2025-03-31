const client = require('../api/client');

// Calcul de la moyenne mobile (SMA ou EMA)
module.exports = async (product_id, granularity) => {
    try {
        // Récupérer et trier du plus récent aux plus ancien les bougies d'une durée déterminée par le paramètre granularity
        const candles = (await client.getProductCandles({
            product_id,
            granularity,
        })).sort((a, b) => a[0] - b[0]);

        return candles;
    } catch (error) {
        console.error(`Error getting candles:`, error.message);
        return null;
    }
};