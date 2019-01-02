const SalesOrder = require('../models/salesOrder');

const MAX_ORDER_AMOUNT = 45.00;

module.exports = {
    generateSampleData: async (db, startDate, endDate, recordCount, put) => {
        const dateRange = endDate - startDate;
        const generateAmount = () => {
            return 100 * Math.floor(Math.random() * MAX_ORDER_AMOUNT * 100);
        };
        const orders = new Array(recordCount).fill(null)
            .map((_, i) => new SalesOrder({
                id: `sales-order-${i}`,
                date: startDate + Math.floor(Math.random() * dateRange),
                totalAmount: generateAmount()
            }));

        if (put) {
            for (let index = 0; index < orders.length; index++) {
                await put(orders[index]);
            }
        }
        else {
            const operations = orders.map((order) => {
                return { type: 'put', key: order.id, value: order }
            });

            await db.batch(operations);
        }
    }
}