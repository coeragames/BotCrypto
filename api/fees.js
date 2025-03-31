const client = require('./client')

// Récupérer les frais de transaction
module.exports = async() => {
    return await client.getFees()
}