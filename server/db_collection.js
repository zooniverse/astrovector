const { db_vector } = require('./db_vector.js');
const { Client } = require("pg")

const db_collection_dev = async () => {
	let collection_test = {
		collection_name: 'test_collection',
		collection_subject_ids: [
			'J000044.97+080929.0',
			'J000127.04-005605.6',
			'J000216.90+005433.5',
			'J000254.57-052434.5',
			'J000327.69+020700.0'
		],
		active_subject_id: false,
		db_type: 'cube',
		nn_size: 10,
		nn_subject_ids: [],
	};
	
	return {
		insert: async (collection_name, data) => {
			return collection_test;
		},
		update: async (collection_name, data) => {
			return collection_test;
		},
		get: async (collection_name) => {
			return collection_test;
		},
	}
};

const db_collection_prod = async () => {
	const client = new Client({
		user: 'postgres',
		host: 'localhost',
		database: 'postgres',
		password: 'astrovector',
		port: '5434'
	});
	
	await client.connect()

	const db_obj = {
		insert: async (collection_name) => {
			// only going to be a collection name
			let data = {
				collection_name: collection_name,
				collection_subject_ids: [],
				active_subject_id: false,
				db_type: 'cube',
				nn_size: 10,
				nn_subject_ids: [],
			};

			let res = await client.query(`INSERT INTO collection VALUES ('${collection_name}', '${JSON.stringify(data)}') ON CONFLICT DO NOTHING`);
			console.log('collection insert', res);
			return data;
		},
		update: async (collection_name, data) => {
			let res = await client.query(`UPDATE collection SET data='${JSON.stringify(data)}' WHERE item_id='${collection_name}'`);
			console.log('collection update', res);
			return data;
		},
		get: async (collection_name, db_type) => {
			let res = await client.query(`SELECT * FROM collection WHERE item_id='${collection_name}';`);
			if (res.rows.length == 0) {
				return {};
			} else {
				let results = res.rows[0].data;

				console.log('db.collection.get() row data', res.rows[0]);
				console.log('db.collection.get() results', results);
				if (!results.collection_subject_ids) results.collection_subject_ids = [];
				const db_vector_client = await db_vector(results.db_type, 343128, 64);

				if (results.active_subject_id !== false && results.active_subject_id !== 'false') {
					const nn_results = await db_vector_client.row.nn(results.active_subject_id, results.nn_size);
					results.nn_subject_ids = nn_results;
				} else {
					results.nn_subject_ids = [];
				}

				return results;
			}
		}
	};

	return db_obj;
}

if (process.env.USER == 'traviskiefer') {
	exports.db_collection = db_collection_dev;
} else {
	exports.db_collection = db_collection_prod;
}

