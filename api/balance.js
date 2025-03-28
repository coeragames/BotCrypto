module.exports = async (currency) => {
    // Récupérer les comptes crypto 
    const accounts = await client.getAccounts();

    // Récupérer la balance d'un compte spécifique
    const filteredAccounts = accounts
        .filter(account => account.currency === currency)
        .map(account => ({
            currency: account.currency,
            balance: account.balance,
            available: account.available
        }));
    return filteredAccounts[0];
};