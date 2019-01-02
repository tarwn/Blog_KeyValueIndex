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
        this._db = levelup(encode(leveldown(`./data/datastore-3`), { valueEncoding: 'json' }));
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
        // get the index
        const index = await this._db.getOrDefault('sales-order:index', []);

        // filter out the item if it's already here
        const filteredIndex = index.filter((i) => i.id != item.id);
            
        // add an entry
        filteredIndex.push({ id: item.id, date: item.date });

        // write the index + new record
        await this._db.batch([
            { type: 'put', key: 'sales-order:index', value: filteredIndex },
            { type: 'put', key: item.id, value: item }
        ]);
    }

    async findByDate(startDate, endDate) {
        // open the index
        const index = await this._db.getOrDefault('sales-order:index', []);

        // search it
        const matchingIndexEntries = index.filter((i) => {
            return i.date >= startDate && i.date <= endDate;
        });

        // retrieve those items
        return Promise.all(matchingIndexEntries.map((i) => { 
            return this._db.get(i.id);
        }));
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

