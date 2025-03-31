const getBalance = require('../api/balance');
const movingAverage = require('../logic/movingAverage');
const getCandles = require('../api/candles');
const volatility = require('../logic/volatility');
const order = require('../api/order');

const evolutionRisk = parseFloat(process.env.EVOLUTION_RISK);
const PROFIT_EVOLUTION_BALANCE_RISK = parseFloat(process.env.PROFIT_EVOLUTION_BALANCE_RISK);
const maxEvolutionRisk = parseFloat(process.env.MAX_EVOLUTION_RISK);
const EVOLUTION_BALANCE_RISK = parseFloat(process.env.EVOLUTION_BALANCE_RISK);

const lastTradePrices = {};

module.exports = async (websocket) => {
  //On s'abonne au websocket ticker_batch (on reçoit les prix toutes les 5 secondes)
  websocket.subscribe(
    {
      topic: 'ticker_batch',
      payload: {
        product_ids: process.env.PRODUCT_ID.split(','),
      },
    },
    "exchangeMarketData",
  );

  websocket.on('update', async (data) => {
    try {
      // On récupère le marché concerné, la monnaie et sa balance actuelle
      const product_id = data.product_id;
      const firstCurrency = product_id.split('-')[0];
      const secondCurrency = product_id.split('-')[1];
      const firstBalance = (await getBalance(firstCurrency)).available
      const secondBalance = (await getBalance(secondCurrency)).available

      // On récupère le prix actuel
      const actualPrice = data.price;

      // Calcul de la moyenne mobile avec des bougies de 1 minute sur 10 minutes
      const candles = await getCandles(product_id, 60);
      const closePrices = candles.map(candle => candle[3]);
      const ma = (await movingAverage(10, closePrices)).slice(-2);

      // On calcule le taux d'évolution du prix par rapport à la moyenne mobile. On gare ce taux entre -100 et 100
      const evolution = Math.max(-100, Math.min(100, ((actualPrice - ma[ma.length - 1]) / ma[ma.length - 1]) * 100));

      // On calcule le taux d'évolution par rapport au dernier trade pour éviter de rentrer dans une boucle infinie.
      const lastTradeEvolution = lastTradePrices[product_id] != null
        ? (actualPrice - lastTradePrices[product_id]) / lastTradePrices[product_id]
        : null;


      //On calcule la volatilité du marché
      const marketVolatility = await volatility(20, product_id);

      //On ajuste le risque en fonction de la volatilité
      const adjustedRisk = Math.min(maxEvolutionRisk, evolutionRisk * (1 - marketVolatility));

      // Si l'évolution prix-EMA est supérieure au risque ajusté ou que l'évolution par rapport au dernier trade est supérieure au risque ajusté, on achète
      if (evolution > adjustedRisk && (!lastTradeEvolution || lastTradeEvolution > adjustedRisk)) {
        // On vérifie si le solde est suffisant pour trader
          if (firstBalance <= 0) {
              console.log("Not enough balance to trade", product_id);
              return false;
          }

          // On ajuste la balance à trader en fonction du risque
          const tradableBalance = firstBalance * PROFIT_EVOLUTION_BALANCE_RISK;
          // Puis en fonction de l'évolution
          const adjustedAmount = (tradableBalance * (evolution / 100)).toFixed(8);

          // On exécute l'ordre de vente
          const sellOrder = await order('sell', product_id, adjustedAmount);
          if (!sellOrder) throw new Error("Failed to execute sell order");
          console.log("Sell Order Result (Ticker):", sellOrder);
          lastTradePrices[product_id] = actualPrice;
      }
      else if (evolution < -adjustedRisk && (!lastTradeEvolution || lastTradeEvolution < -adjustedRisk)) {
          if (secondBalance <= 0) {
              console.log("Not enough balance to buy", product_id);
              return false;
          }

          const tradableBalance = secondBalance * EVOLUTION_BALANCE_RISK;
          const adjustedAmount = (tradableBalance * (-evolution / 100)).toFixed(8);

          // On exécute l'ordre d'achat
          const buyOrder = await order('buy', product_id, adjustedAmount);
          if (!buyOrder) throw new Error("Failed to execute buy order");
          console.log("Buy Order Result (Ticker):", buyOrder);
          lastTradePrices[product_id] = actualPrice;
      }      
  }
  catch (error) {
      console.error('Error in ticker update:', error);
  }
}); 

};