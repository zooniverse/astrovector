const { Client } = require("pg")

const db_vector_dev = async (type, data_size, vector_size) => {
	return {
		row: {
			get: async (row_name) => {
				return {
					item_id: 'J000106.48+010357.8',
					vector: [],
				}
			},
			nn: async (row_name, limit) => {
				return [
					'J000106.48+010357.8',
					'J000149.87-005925.9',
					'J000237.55-002227.3',
					'J000311.02+134639.4',
					'J000343.32-045224.2',
				];
			}
		},
	};
}

const db_vector_prod = async (type, data_size, vector_size) => {

	let ports = {
		vector: '5432',
		cube: '5433'
	};

	const table_name = `l_${data_size}_v_${vector_size}`;
	const client = new Client({
		user: 'postgres',
		host: 'localhost',
		database: 'postgres',
		password: 'astrovector',
		port: ports[type]
	});

	await client.connect()

	const db_obj = {
		table: {
			create: async () => {
				let _query;
				if (type == 'vector') {
					_query = `CREATE TABLE IF NOT EXISTS ${table_name} (item_id VARCHAR(100) UNIQUE, vector vector(${vector_size}));`;
				} else {
					_query = `CREATE TABLE IF NOT EXISTS ${table_name} (item_id VARCHAR(100) UNIQUE, vector cube);`;
				}
				return await client.query(_query);
			},
			drop: async () => {
				return await client.query(`DROP TABLE IF EXISTS ${table_name};`);
			},
			empty: async () => {
				return await client.query(`TRUNCATE ${table_name};`);
			},
			size: async () => {
				return await client.query(`SELECT vector FROM ${table_name}`);
			}
		},
		row: {
			insert: async (row_name, row_data) => {
				let _query;
				if (type == 'vector') {
					_query = `INSERT INTO ${table_name} VALUES ('${row_name}', '[${row_data}]') ON CONFLICT DO NOTHING`;
				} else {
					_query = `INSERT INTO ${table_name} VALUES ('${row_name}', '(${row_data})') ON CONFLICT DO NOTHING`;
				}
				return await client.query(_query);
			},
			get: async (row_name) => {
				let results = await client.query(`SELECT * FROM ${table_name} WHERE item_id='${row_name}\r'`);
				console.log('db_vector.get() row_name', row_name);
				console.log('db_vector.get() results', results);
				if (results.rows.length == 0)
					return {};

				let r = results.rows[0];
				r.item_id = r.item_id.replace('\r','');
				return r;
			},
			nn: async (row_name, limit) => {
				let row_data = await db_obj.row.get(row_name);
				let _query;
				if (type == 'vector') {
					_query = `SELECT * FROM ${table_name} ORDER BY vector <-> '${row_data.vector}' LIMIT ${limit};`;
				} else {
					console.log('db_vector.nn() cube vector', row_data.vector);
					
					_query = `SELECT * FROM ${table_name} ORDER BY vector <=> '${row_data.vector}'::cube LIMIT ${limit};`;
				}
				const results = await client.query(_query);
				console.log('db_vector.nn()', results);

				const result_ids = results.rows.map(row => row.item_id.replace('\r',''));
				return result_ids;
			}
		},
	};

	return db_obj;
}

if ( process.env.USER == 'traviskiefer') {
	exports.db_vector = db_vector_dev;
} else {
	exports.db_vector = db_vector_prod;
}
