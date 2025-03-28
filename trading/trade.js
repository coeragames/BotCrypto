const movingAverage = require('../logic/movingAverage');
const volatility = require('../logic/volatility'); // Import volatility module
const order = require('../api/order');
const getBalance = require('../api/balance');
const ai = require('../ai/score');
const currency = require('../api/currency');

const BALANCE_RISK = parseFloat(process.env.BALANCE_RISK);
const MAX_BALANCE_RISK = parseFloat(process.env.MAX_BALANCE_RISK)
const MOVING_AVERAGE_PONDERATION = parseFloat(process.env.MOVING_AVERAGE_PONDERATION)
const AI_PONDERATION = parseFloat(process.env.AI_PONDERATION)
const DAY_MOVING_AVERAGE_PONDERATION = parseFloat(process.env.DAY_MOVING_AVERAGE_PONDERATION)

let period = 0;

module.exports = async () => {
    console.log("Running trade logic...");

    // Pour chaque produit financier 
    for (const product_id of process.env.PRODUCT_ID.split(',')) {
        try {
            let aiScore;
            let maDscore;

            if(period == 97 || period == 0) {
                // Calculer le score de l'IA
                if(Boolean(process.env.USE_AI)) {
                    aiScore = await ai(product_id);
                }

                const dayShortEMA = await movingAverage(10, product_id, 86400);
                const dayLongEMA = await movingAverage(100, product_id, 86400);

                maDscore = Math.max(-100, Math.min(100, ((dayShortEMA - dayLongEMA) / dayLongEMA) * 100));

                period = 1
            }

            const shortEMA = await movingAverage(10, product_id, 900);
            const longEMA = await movingAverage(100, product_id, 900);

            shortTermMA = shortEMA[shortEMA.length - 1];
            longTermMA = longEMA[longEMA.length - 1];

            previousShortTermMA = shortEMA[shortEMA.length - 2];
            previousLongTermMA = longEMA[shortEMA.length - 2];

            // Détecter des croisements de moyennes mobiles
            const isBullishCrossover = shortTermMA > longTermMA && previousShortTermMA <= previousLongTermMA;
            const isBearishCrossover = shortTermMA < longTermMA && previousShortTermMA >= previousLongTermMA;

            // Calculer le "score" de la moyenne mobile: il correspond au taux d'évolution des moyennes mobiles, entre -100 et 100
            const maScore = Math.max(-100, Math.min(100, ((shortTermMA - longTermMA) / longTermMA) * 100));

            // Calculer le score final en faisant une moyenne pondérée entre le score de l'IA et le score de la moyenne mobile
            const totalWeight = 
                (aiScore != null && !isNaN(aiScore) ? AI_PONDERATION : 0) +
                (maScore != null && !isNaN(maScore) ? MOVING_AVERAGE_PONDERATION : 0) +
                (maDscore != null && !isNaN(maDscore) ? DAY_MOVING_AVERAGE_PONDERATION : 0);
          
            const weightedSum = 
                (aiScore != null && !isNaN(aiScore) ? AI_PONDERATION * aiScore : 0) +
                (maScore != null && !isNaN(maScore) ? MOVING_AVERAGE_PONDERATION * maScore : 0) +
                (maDscore != null && !isNaN(maDscore) ? DAY_MOVING_AVERAGE_PONDERATION * maDscore : 0);
          
            const score = totalWeight > 0 ? weightedSum / totalWeight : 0; // Avoid division by zero
            // Calculer la volatilité du marché sur 20 jours
            const marketVolatility = await volatility(20, product_id);

            // Ajuster le risque en fonction de la volatilité du marché et du paramètre balance risk. 
            // Cette valeur ne doit pas dépasser max balance risk et doit atteindre au minimum 1%.
            const adjustedBalanceRisk = Math.max(0.01, Math.min(MAX_BALANCE_RISK, BALANCE_RISK * (1 - marketVolatility)));

            // On récupère le nom des monnaies que l'on va vendre ou acheter.
            const firstCurrency = product_id.split('-')[0];
            const secondCurrency = product_id.split('-')[1];

            // Le croisement est haussier ou le score est supérieur à 10
            if (isBullishCrossover || score > 10) {
                // On regarde notre balance pour la monnaie avec laquelle on va acheter
                var balance = (await getBalance(secondCurrency)).available;
            
                if(balance < 0) {
                    console.log("Not enough balance to trade", product_id);
                    continue;
                }

                const minsize = (await currency(secondCurrency)).min_size;

                // On cherche l'argent qu'on peut trader en fonction du risque
                const tradableBalance = balance * adjustedBalanceRisk;

                // On ajuste le montant du trade en fonction du score
                const adjustedAmount = (tradableBalance * (score / 100)).toFixed(8);

                if(adjustedAmount < minsize) {
                    console.log("Trade amount is too low", product_id);
                    continue;
                }

                const buyOrder = await order('buy', product_id, adjustedAmount);
                console.log("Buy Order Result:", buyOrder);
            } 
            // Le croisement est baissier ou le score est inférieur à 0
            else if (isBearishCrossover || score < -10) {
                // On regarde notre balance pour la monnaie que l'on va vendre
                var balance = (await getBalance(firstCurrency)).available;

                if(balance < 0) {
                    console.log("Not enough balance to trade", product_id);
                    continue;
                }

                const minsize = (await currency(firstCurrency)).min_size;

                // On chercher l'argent qu'on peut trader en fonction du risque
                const tradableBalance = balance * adjustedBalanceRisk;

                // On ajuste le montant du trade en fonction du score
                const adjustedAmount = (tradableBalance * (-score / 100)).toFixed(8);

                if(adjustedAmount < minsize) {
                    console.log("Trade amount is too low", product_id);
                    continue;
                }

                // On place notre ordre de vente
                const sellOrder = await order('sell', product_id, adjustedAmount);
                console.log("Sell Order Result:", sellOrder);
            }
        } catch (error) {
            console.error(`Error while running trade logic for ${product_id}`, error);
            setTimeout(module.exports, 5000);
        }

        period++
    }

    setTimeout(module.exports, 900000);
};