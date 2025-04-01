const candles = require('../api/candles');
const ai = require('../ai/score');
const movingAverage = require('../logic/movingAverage');
const rsi = require('../logic/rsi');

const cache = {};

const MOVING_AVERAGE_PONDERATION = parseFloat(process.env.MOVING_AVERAGE_PONDERATION)
const AI_PONDERATION = parseFloat(process.env.AI_PONDERATION)
const DAY_MOVING_AVERAGE_PONDERATION = parseFloat(process.env.DAY_MOVING_AVERAGE_PONDERATION)
const RSI_PONDERATION = parseFloat(process.env.AI_PONDERATION)
const RSI_DAY_PONDERATION = parseFloat(process.env.DAY_MOVING_AVERAGE_PONDERATION)

//Calculer les valeurs que l'on doit renouveller quotidiennement (EMA 24h, RSI 24h, AI score)
async function calculateDailyValues(product_id) {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    //Si les valeurs sont déjà à jour, on les renvoie et on ne les renouvelle pas
    if (cache[product_id] && cache[product_id].date === today) {
        return cache[product_id];
    }

    //Récupérer les bougies de 1 jour
    const dayData = await candles(product_id, 86400);
    //Extraire le prix de fermeture du marché
    const dayClosePrices = dayData.map(candle => candle[3]);

    //Calculer l'EMA 10 et 100 sur les bougies de 1 jour
    const dayShortEMA = await movingAverage(10, dayClosePrices);
    const dayLongEMA = await movingAverage(100, dayClosePrices);

    //Faire un score entre -100 et 100 avec l'EMA 1 jour
    const maDscore = (dayShortEMA - dayLongEMA) / dayLongEMA

    //Calculer le RSI 14 sur 1 jour
    const rsiDayValue = await rsi(14, dayClosePrices);
    const normalizedRsiDayValue = rsiDayValue !== null ? ((100-rsiDayValue) - 50) * 2 : null; 

    //Calculer le score de l'IA
    const aiScore = Boolean(process.env.USE_AI) ? await ai(product_id) : null;

    //Stocker ces nouvelles valeurs pour les utiliser durant le reste de la journée
    cache[product_id] = {
        date: today,
        maDscore,
        normalizedRsiDayValue,
        aiScore,
    };

    return cache[product_id];
}

module.exports = async (product_id) => {
    try {
        //Récupérer les bougies de 15 minutes
        const minData = await candles(product_id, 900);
        const minClosePrices = minData.map(candle => candle[3]);

        //Récupérer les valeurs journalières
        const dailyValues = await calculateDailyValues(product_id);
        const { maDscore, normalizedRsiDayValue, aiScore } = dailyValues;

        //Calculer l'EMA 10 et 100 sur les bougies de 15 minutes
        const shortEMA = await movingAverage(10, minClosePrices);
        const longEMA = await movingAverage(100, minClosePrices);

        //Récupérer l'EMA actuelle
        const shortTermMA = shortEMA[shortEMA.length - 1];
        const longTermMA = longEMA[longEMA.length - 1];

        //Calculer le score entre -100 et 100 avec l'EMA 15 minutes
        const maScore = (shortTermMA - longTermMA) / longTermMA

        //Récupérer l'EMA précédente (avant la dernière bougie)
        const previousShortTermMA = shortEMA[shortEMA.length - 2];
        const previousLongTermMA = longEMA[shortEMA.length - 2];

        //Chercher d'éventuels croisements haussiers ou baissiers entre les EMA 10 et 100 15 minutes
        const isBullishCrossover = shortTermMA > longTermMA && previousShortTermMA <= previousLongTermMA;
        const isBearishCrossover = shortTermMA < longTermMA && previousShortTermMA >= previousLongTermMA;

        //Calculer le RSI 14 sur 15 minutes
        const rsiMinValue = await rsi(14, minClosePrices);
        const normalizedRsiMinValue = rsiMinValue !== null ? ((100-rsiMinValue) - 50) * 2 : null;

        //Calculer un score total. Dans un premier temps, on fait le poids pondéré
        const totalWeight =
            (aiScore != null && !isNaN(aiScore) ? AI_PONDERATION : 0) +
            (maScore != null && !isNaN(maScore) ? MOVING_AVERAGE_PONDERATION : 0) +
            (maDscore != null && !isNaN(maDscore) ? DAY_MOVING_AVERAGE_PONDERATION : 0) +
            (normalizedRsiDayValue != null && !isNaN(normalizedRsiDayValue) ? RSI_DAY_PONDERATION : 0) +
            (normalizedRsiMinValue != null && !isNaN(normalizedRsiMinValue) ? RSI_PONDERATION : 0);

        //On fait la somme des pondérations
        const weightedSum =
            (aiScore != null && !isNaN(aiScore) ? AI_PONDERATION * aiScore : 0) +
            (maScore != null && !isNaN(maScore) ? MOVING_AVERAGE_PONDERATION * maScore : 0) +
            (maDscore != null && !isNaN(maDscore) ? DAY_MOVING_AVERAGE_PONDERATION * maDscore : 0) +
            (normalizedRsiDayValue != null && !isNaN(normalizedRsiDayValue) ? RSI_DAY_PONDERATION * normalizedRsiDayValue : 0) +
            (normalizedRsiMinValue != null && !isNaN(normalizedRsiMinValue) ? RSI_PONDERATION * normalizedRsiMinValue : 0);

        //On a notre score
        const score = Math.max(-100, Math.min(100, (weightedSum / totalWeight) * 100));
        
        //On retourne les donnnées qui nous permettent d'interpréter la situation
        return [score, isBullishCrossover, isBearishCrossover];
    } catch (error) {
        console.error(`Error calculating score for ${product_id}:`, error.message);
        return null;
    }
};