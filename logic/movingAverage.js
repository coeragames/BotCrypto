const candles = require('../api/candles');
const { EMA } = require('technicalindicators');

// Calcul de la moyenne mobile (SMA ou EMA)
module.exports = async (period, product_id, granularity) => {
    try {
        const data = await candles(product_id, granularity);

        const closePrices = data.map(candle => candle[3]);

        // Calculer l'EMA
        const ema = EMA.calculate({
            period: period,
            values: closePrices
        });
        
        return ema;
    } catch (error) {
        console.error(`Error calculating MA for ${product_id}:`, error.message);
        return null;
    }
};