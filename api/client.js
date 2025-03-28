const {CBExchangeClient} = require("coinbase-api");
  
//Se connecter à Coinbase avec la clé d'API
const client = new CBExchangeClient({
  apiKey: process.env.API_KEY,
  apiSecret: process.env.API_SECRET,
  apiPassphrase: process.env.API_PASSPHRASE,
  useSandbox: Boolean(process.env.USE_SANDBOX),
});

module.exports = client;

