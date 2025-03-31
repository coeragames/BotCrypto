const fs = require('fs');
const fees = require('../api/fees');
const logFile = process.env.LOG_FILE || 'trade.log';
const logActivated = process.env.LOG_ACTIVATED || false;

//Ajouter la transaction réussie au log
const logOrder = (side, product_id, size, price, result, error = null) => {
    if (logActivated) {
        const logEntry = `${new Date().toISOString()} - SIDE: ${side.toUpperCase()}, PRODUCT: ${product_id}, SIZE: ${size}, PRICE: ${price || 'MARKET'}, RESULT: ${result ? JSON.stringify(result) : 'N/A'}, ERROR: ${error ? error : 'NONE'}\n`;
        fs.appendFileSync(logFile, logEntry);
    }
};

//Ajouter la transaction qui a échoué au log
const handleOrderError = (error, side, product_id, size, price) => {
    console.error(`Order Error (${side.toUpperCase()} - ${product_id}):`, error.message+' - '+error.body.message);
    logOrder(side, product_id, size, price, null, error.message+' - '+error.body.message);
    return null;
};


module.exports = async (side, product_id, size, price) => {
    try {
        // Modifier la taille de la transaction et retirer les frais
        const FEE_RATE = (await fees()).maker_fee_rate
        const adjustedSize = size * (1 - FEE_RATE);

        // Placer l'ordre
        const order = await client.submitOrder({
            side,
            type: price ? 'limit' : 'market',
            product_id,
            size: adjustedSize.toFixed(8),
            price,
        });

        logOrder(side, product_id, size, price, order);
        return order;
    } catch (error) {
        handleOrderError(error, side, product_id, size, price);
    }
};