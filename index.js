//Charger les variables d'environnement
require('dotenv').config()

//Démarrer le bot, on se connecte aux API, récupère les informations sur les comptes et frais et on commence à récupérer les informations sur les marchés
async function startup() {
    global.client = require('./api/client')
    global.ai = require('./ai/ai')

    console.log("Trading on.")
    require('./trading/trade')()

    require('./websockets/websocket')()
}

startup()


