const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');
const dataGenerator = require('./utility/dataGenerator');

const today = Date.now();
const oneDayAgo = today - 1 * (24 * 60 * 60 * 1000);
const twoDaysAgo = today - 2 * (24 * 60 * 60 * 1000);
const threeDaysAgo = today - 3 * (24 * 60 * 60 * 1000);

const db = levelup(encode(leveldown(`./data/datastore-2`), { valueEncoding: 'json' }));
dataGenerator.generateSampleData(db, threeDaysAgo, today, 40)
    .then(async () => {
        const results = await findByDate(db, twoDaysAgo, oneDayAgo);
    });

async function findByDate(db, dateStart, dateEnd) {
    const values = await new Promise((resolve, reject) => {
        const tempValues = [];
        db.createReadStream({
            gte: 'sales-order-',
            lt: 'sales-order.',
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

    const matchingValues = values.filter(v => v.date >= dateStart && v.date <= dateEnd);

    console.log(`Loaded ${values.length} records, ${matchingValues.length} match date range ${dateStart} to ${dateEnd}`);
    return matchingValues;
}
