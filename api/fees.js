module.exports = async() => {
    //Récupérer les frais de transaction en vigueur
    //maker_fee_rate/taker_fee_rate
    return await client.getFees()
}