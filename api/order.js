module.exports = async (side,product_id,size,price) => {
    //Placer un ordre en fonction des paramètres
    try {
        if(!price) {
            const order = await client.submitOrder({
                side: side,
                type: 'market',
                product_id: product_id,
                size: size
            })
            return order
        } else {
            const order = await client.submitOrder({
                side: side,
                type: 'limit',
                product_id: product_id,
                size: size,
                price: price
            })
            return order
        }
    }  
    catch(e) {
        console.error(e)
    }
}