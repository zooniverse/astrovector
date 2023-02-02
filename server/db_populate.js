let data_sizes = [1024, 10000, 100000, 343128];
let vector_sizes = [8, 16, 32, 64];
let perms = [];
data_sizes.forEach((ds) => {
	vector_sizes.forEach((fs) => {
		perms.push({
			data_size: ds,
			vector_size: fs
		});
	});
});

perms.splice(0, 11);
perms.pop();
perms.pop();
perms.pop();
perms.pop();

console.log('perms', perms);

const init_db = async () => {
	let {data_size, vector_size} = perms.shift();
	const file_names = fs.readFileSync(`./csv_data/${data_size}_lines_files.csv`, 'utf-8').split('\n');
	let client = await db_connect('vector', data_size, vector_size);

	// let resp = await client.table.drop();
	// console.log(`Drop Table: ${data_size}, ${vector_size}`, resp);

	let resp2 = await client.table.create();
	console.log(`Create Table: ${data_size}, ${vector_size}`, resp2);

	// INSERT FILES BY ROW
	for (var i = 0; i < data_size; i++) {
		let file_data = fs.readFileSync(`./csv_${data_size}_${vector_size}/${i}.csv`, 'utf-8');
		let resp3 = await client.row.insert(file_names[i], file_data);
		if (i % 1000 == 0) {
			console.log('bulk insert #', i);
		}
	}

	// let resp4 = await client.row.nn(file_data[0], 5);
	// console.log(resp4);

	if (perms.length > 0) {
		init_db();
	}
}

// uncomment to perform database operations
// init_db();