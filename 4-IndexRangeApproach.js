const levelup = require('levelup');
const leveldown = require('leveldown');
const encode = require('encoding-down');
const dataGenerator = require('./utility/dataGenerator');
const SalesOrder = require('./models/salesOrder');

const today = Date.now();
const oneDayAgo = today - 1 * (24 * 60 * 60 * 1000);
const twoDaysAgo = today - 2 * (24 * 60 * 60 * 1000);
const threeDaysAgo = today - 3 * (24 * 60 * 60 * 1000);

class IndexedDataStore {
    constructor() {
        this._db = levelup(encode(leveldown(`./data/datastore-4`), { valueEncoding: 'json' }));
        this._db.getOrDefault = async (key, def) => {
            try {
                return await this._db.get(key);
            }
            catch (e) {
                if (e.notFound) {
                    return def;
                }
                else {
                    throw e;
                }
            }
        }
    }

    async put(item) {
        const getItemKey = (i) => `sales-order:${i.id}`;
        const getIndexKey = (i) => `index:sales-order-by-date:${i.date}:${i.id}`;
            
        const operations = [
            // add the item
            { type: 'put', key: getItemKey(item), value: item },
            // add an index entry
            { type: 'put', key: getIndexKey(item), value: getItemKey(item) }
        ];

        // do we need to remove a prior index?
        const oldItem = await this._db.getOrDefault(item.id, null);
        if (oldItem != null && oldItem.date != item.date) {
            operations.push({ type: 'del', key: getIndexKey(oldItem) });
        }

        // apply them
        await this._db.batch(operations);
    }

    async findByDate(startDate, endDate) {
        // index name prefixes
        const indexStart = `index:sales-order-by-date:${startDate}`;
        const indexEnd = `index:sales-order-by-date:${endDate}`;

        // search the index
        const index = await new Promise((resolve, reject) => {
            const indexValues = [];
            this._db.createReadStream({
                gte: indexStart,
                lt: indexEnd,
                keys: true,
                values: true
            })
                .on('data', (data) => {
                    indexValues.push(data.value);
                })
                .on('error', (error) => {
                    reject(error);
                })
                .on('close', () => { })
                .on('end', () => {
                    resolve(indexValues);
                });
        });
        // return the individual records
        return Promise.all(index.map(key => this._db.get(key)));
    }

    async count() {
        const index = await this._db.getOrDefault('sales-order:index', []);
        return index.length;
    }

}

const store = new IndexedDataStore();
let recordsInStore = 0;

Promise.resolve()
    .then(async () => {
        await dataGenerator.generateSampleData(store._db, threeDaysAgo, today, 100, (i) => store.put(i));

        recordsInStore = await store.count();
        console.log(`${recordsInStore} records stored in index`);

        // add a record
        await store.put(new SalesOrder({ id: 'sales-order-123', date: today, totalAmount: 123.45 }));

        recordsInStore = await store.count();
        console.log(`${recordsInStore} records stored in index`);

        // find a set of records
        const results = await store.findByDate(twoDaysAgo, oneDayAgo);
        console.log(`${results.length} records found between ${twoDaysAgo} and ${oneDayAgo}`);
    });

