const volatility = require('../logic/volatility'); // Import volatility module
const getBalance = require('../api/balance');
const order = require('../api/order');
const currency = require('../api/currency');
const movingAverage = require('../logic/movingAverage');

const lastTradePrices = {};

module.exports = async (websocket) => {
  websocket.subscribe(
    {
      topic: 'ticker_batch',
      payload: {
        product_ids: process.env.PRODUCT_ID.split(','),
      },
    },
    "exchangeMarketData",
  )

  websocket.on('update', async (data) => {
    try {
      // On récupère le marché concerné, la monnaie et sa balance actuelle
      const product_id = data.product_id;
      const firstCurrency = product_id.split('-')[0];
      var balance = (await getBalance(firstCurrency)).available;

      //Si on n'a pas assez de balance, on ne fait pas de transactions
      if(balance < 0) {
        console.log("Not enough balance to trade", product_id);
        return;
      }

      //On récupère la taille minimale d'une transaction
      const minsize = (await currency(firstCurrency)).min_size;

      //On récupère le prix actuel
      const actualPrice = data.price;
      //Calcul de la moyenne mobile sur 10 minutes
      const ma = (await movingAverage(2, product_id, 300));

      //On calcule le taux d'évolution du prix par rapport à ces deux données, on le garde entre -100 et 100
      const evolution = Math.max(-10, Math.min(10, ((actualPrice - ma[ma.length -1]) / ma[ma.length -1])));

      //On calcule le taux d'évolution par rapport au dernier trader pour éviter de rentrer dans une boucle infinie.
      const lastTradeEvolution = lastTradePrices[product_id] != null
      ? (actualPrice - lastTradePrices[product_id]) / lastTradePrices[product_id]
      : null;

      //On récupère le taux d'évolution à partir duquel on vend
      const evolutionRisk = parseFloat(process.env.EVOLUTION_RISK);

      console.log("Evolution", evolution, "Evolution Risk", evolutionRisk, "Last Trade Evolution", lastTradeEvolution);

      //Si le prix a beaucoup augmenté
      if (evolution > evolutionRisk && (lastTradeEvolution === null || lastTradeEvolution === undefined || lastTradeEvolution > evolutionRisk)) {
        // On détermine ce que l'on va vendre en fonction de la part déterminée
        const tradableBalance = balance * parseFloat(process.env.PROFIT_EVOLUTION_BALANCE_RISK);

        const adjustedAmount = (tradableBalance * (evolution / 100)).toFixed(8);

        if(adjustedAmount < minsize) {
          console.log("Amount is too small to sell",adjustedAmount);
          return;
        }

        //On vend
        const sellOrder = await order('sell', product_id, adjustedAmount);
        lastTradePrices[product_id] = actualPrice;
        console.log("Sell Order Result (Profit):", sellOrder); 
        return;
      } 
  
      //On récupère le taux d'évolution maximum qu'on peut admettre après ajustement
      const maxEvolutionRisk = parseFloat(process.env.MAX_EVOLUTION_RISK);

      //On calcule la volatilité du marché sur 20 jours
      const marketVolatility = await volatility(20, product_id);

      //On ajuste le risque en fonction de la volatilité (plus volatile = plus facile d'activer le trade) du marché en le gardant inférieur à max balance risk
      const adjustedRisk = Math.min(maxEvolutionRisk, evolutionRisk * (1 - marketVolatility));

      //Si le prix a beaucoup baissé, au vu du risque ajusté
      if (evolution < -adjustedRisk && (lastTradeEvolution === null || lastTradeEvolution === undefined || lastTradeEvolution < -adjustedRisk)) {    
        // On récupère la balance, on l'ajuste en fonction de l'évolution
        const tradableBalance = balance * parseFloat(process.env.EVOLUTION_BALANCE_RISK);
        const adjustedAmount = (tradableBalance * (-evolution / 100)).toFixed(8);


        console.log(balance,tradableBalance)
        if(adjustedAmount < minsize) {
          console.log("Amount is too small to buy",adjustedAmount);
          return;
        }

        //On vend
        const sellOrder = await order('sell', product_id, adjustedAmount);
        lastTradePrices[product_id] = actualPrice;
        console.log("Sell Order Result (Risk):", sellOrder);
      }
    } catch (error) {
      console.error(`Error while running ticker logic for ${data.product_id}`, error)
    }
  });
};