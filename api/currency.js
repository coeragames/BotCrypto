module.exports = async (currencyName) => {
    const currency = await client.getCurrency(currencyName);
    return currency;
};