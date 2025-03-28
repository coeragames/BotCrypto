module.exports = async () => {
  const {WebsocketClient} = require("coinbase-api");
  
  //Se connecter à Coinbase avec la clé d'API
  const websocket = new WebsocketClient({
    useSandbox: Boolean(process.env.USE_SANDBOX),
  });

  //Faire référence à la fonction ticker
  const ticker = require('./ticker')
  ticker(websocket)
  
}