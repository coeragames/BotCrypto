const { RSI } = require('technicalindicators');

// Calcul de la moyenne mobile (SMA ou EMA)
module.exports = async (period, closePrices) => {
    try {
        // Calculer le RSI
        const rsi = RSI.calculate({
            values: closePrices,
            period: period,
        })
        
        return rsi[rsi.length-1];
    } catch (error) {
        console.error(`Error calculating RSI: `, error.message);
        return null;
    }
};