const { EMA } = require('technicalindicators');

// Calcul de la moyenne mobile (SMA ou EMA)
module.exports = async (period, closePrices) => {
    try {
        // Calculer l'EMA
        const ema = EMA.calculate({
            period: period,
            values: closePrices
        });
        
        return ema;
    } catch (error) {
        console.error(`Error calculating EMA: `, error.message);
        return null;
    }
};