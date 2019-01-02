class SalesOrder{
    constructor(rawData) {
        this.id = rawData.id;
        this.date = rawData.date;
        this.totalAmount = rawData.totalAmount;
        this.lines = [];
    }
}

module.exports = SalesOrder;