const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');
const SalesOrder = require('./models/salesOrder');

// create the data store
const db = levelup(encode(leveldown(`./data/datastore-1`), { valueEncoding: 'json' }));


async function basicOperations(sampleOrder) {
    // add the sampleOrder to the database
    await db.put(sampleOrder.id, sampleOrder);

    // get a copy out of the database
    const retrievedVersion = await db.get(sampleOrder.id);
    console.log(retrievedVersion);  // outputs the sampleOrder as json

    // delete it from the database
    await db.del(sampleOrder.id);
}

async function advancedOperations(sampleOrder1, sampleOrder2, sampleOrder3) {
    // perform a series of puts as a batch
    await db.batch([
        { type: 'put', key: 'sample-order-1', value: sampleOrder1 },
        { type: 'put', key: 'sample-order-2', value: sampleOrder2 },
        { type: 'put', key: 'sample-order-3', value: sampleOrder3 }
    ]);

    // read the series back out
    const values = await new Promise((resolve, reject) => {
        const tempValues = [];
        db.createReadStream({
            gte: 'sample-order-1',
            lte: 'sample-order-3',
            keys: true,
            values: true
        })
            .on('data', (data) => {
                tempValues.push(data.value);
            })
            .on('error', (error) => {
                reject(error);
            })
            .on('close', () => { })
            .on('end', () => {
                resolve(tempValues);
            });
    });
    console.log(values);    // outputs 3 sample orders
}

// -- run them --
const sampleOrders = [
    'sample-order-1',
    'sample-order-2',
    'sample-order-3'
].map((id) => new SalesOrder({
    id: id,
    date: Date.now(),
    totalAmount: 123.45
}));
basicOperations(sampleOrders[0]);
advancedOperations(sampleOrders[0], sampleOrders[1], sampleOrders[2]);
