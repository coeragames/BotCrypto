const volatility = require('../logic/volatility');
const order = require('../api/order');
const getBalance = require('../api/balance');
const getScore = require('../logic/score');

const BALANCE_RISK = parseFloat(process.env.BALANCE_RISK);
const MAX_BALANCE_RISK = parseFloat(process.env.MAX_BALANCE_RISK);

let period = 0;

module.exports = async () => {
    console.log("Running trade logic...");

    //Pour chaque produit activé
    for (const product_id of process.env.PRODUCT_ID.split(',')) {
        try {
            //On récupère le score et autres informations permettant d'interpréter la situation
            const scoreData = await getScore(product_id, period);
            const score = scoreData[0];
            const isBullishCrossover = scoreData[1];
            const isBearishCrossover = scoreData[2];

            //On calcule la volatilité du marché sur 20 jours
            const marketVolatility = await volatility(20, product_id);
            //On ajuste le risque de balance en fonction de la volatilité du marché, à partir du risque en paramètre, tout en faisant en sorte qu'il ne dépasse pas un taux déterminé.
            const adjustedBalanceRisk = Math.max(0.005, Math.min(MAX_BALANCE_RISK, BALANCE_RISK * (1 - marketVolatility)));

            const firstCurrency = product_id.split('-')[0];
            const secondCurrency = product_id.split('-')[1];

            // Si le score est supérieur à 10 ou si c'est un croisement haussier, on achète
            if (isBullishCrossover || score > 10) {
                const balance = (await getBalance(secondCurrency)).available;

                // On vérifie si le solde est suffisant pour trader
                if (balance <= 0) {
                    console.log("Not enough balance to trade", product_id);
                    continue;
                }

                //On ajuste la balance a trader en fonction du risque
                const tradableBalance = balance * adjustedBalanceRisk;
                //Puis en fonction de la balance
                const adjustedAmount = (tradableBalance * (score / 100)).toFixed(8);

                //On exécute l'ordre d'achat
                const buyOrder = await order('buy', product_id, adjustedAmount);
                if (!buyOrder) throw new Error("Failed to execute buy order");
                console.log("Buy Order Result:", buyOrder);
            // Si le score est inférieur à -10 ou si c'est un croisement baissier, on vend
            } else if (isBearishCrossover || score < -10) {
                const balance = (await getBalance(firstCurrency)).available;

                if (balance <= 0) {
                    console.log("Not enough balance to trade", product_id);
                    continue;
                }

                const tradableBalance = balance * adjustedBalanceRisk;
                const adjustedAmount = (tradableBalance * (-score / 100)).toFixed(8);

                //On exécute l'ordre de vente
                const sellOrder = await order('sell', product_id, adjustedAmount);
                if (!sellOrder) throw new Error("Failed to execute sell order");
                console.log("Sell Order Result:", sellOrder);
            }
        } catch (error) {
            console.error(`Error while running trade logic for ${product_id}:`, error.message);
            //Si il y a une erreur, on recommence tout dans 5 secondes
            setTimeout(module.exports, 5000);
        }

        period++;
    }

    //On recommence dans 15 minutes
    setTimeout(module.exports, 900000);
};