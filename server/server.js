// SERVER
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const http = require('http');
const https = require('https');
const compression = require('compression');
const bodyParser = require('body-parser')
const path = require('path');
const _ = require('underscore');
const { db_collection } = require('./db_collection.js');
const { db_vector } = require('./db_vector.js');

// APP CONSTS
_.templateSettings = {
    evaluate:    /\{\{\{(.+?)\}\}\}/g,
    interpolate: /\{\{\{\=(.+?)\}\}\}/g,
};

let db_collection_client;

const setup_db = async () => {
	db_collection_client = await db_collection();
}
setup_db();

// EXPRESS SETUP
const app = express();

function shouldCompress(req, res) {
    if (req.headers['x-no-compression']) {
        return false
    }
    return compression.filter(req, res)
}

app.use(compression({ filter: shouldCompress }));
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use(cors());

// SERVER ACTIONS
app.get('/images/:file_name', (req, res) => {
    res.sendFile(path.join(process.cwd() + `/../images/${req.params.file_name}`));
});

app.get('/', (req, res) => {
	// get collection
	const html = fs.readFileSync(`./public/index.html`, 'utf-8');
	const tmp = _.template(html);
    res.send(tmp({ data: false }));
});

app.get('/:collection_name', async (req, res) => {
	if (req.params.collection_name === 'favicon.ico') return res.json({ success: false });

	// get collection
	const html = fs.readFileSync(`./public/index.html`, 'utf-8');
	const tmp = _.template(html);
	const data = await db_collection_client.get(req.params.collection_name);
	
	if (data.collection_name) { // NEW OBJECT
		return res.send(tmp({ data: data }));
	}

	console.log('/:collection_name() collection_name', req.params.collection_name);
	await db_collection_client.insert(req.params.collection_name);
	let new_data = await db_collection_client.get(req.params.collection_name);
	console.log('/:collection_name() new_data', new_data);

	return res.send(tmp({ data: new_data }));
});

app.post('/subject_search', async (req, res) => {
	let pattern = /^\d+$/;
    let is_number = pattern.test(req.body.search_subject_id); 

	if (is_number) {
		// 43515802 || J000044.97+080929.0
		const spawn = require("child_process").spawn;
		const pythonProcess = spawn('python3',["./panoptes_test.py", req.body.search_subject_id]);
		pythonProcess.stdout.on('data', async data => {
			// Do something with the data returned from python script
			let iauname = data.toString('utf8');

			if (iauname == 'false') {
				return res.json({ error: 'Could not find a subject with that id in Panoptes'});
			}

			console.log('iauname', iauname);

			// check DB for subject
			const db_vector_client = await db_vector(req.body.db_type, 343128, 64);
			const db_row = await db_vector_client.row.get(iauname)
			if (!db_row.vector) {
				return res.json({ error: 'Could not find a subject with that id in the Astrovector DB'});
			}

			// if subject exists, get nn
			const nn_results = await db_vector_client.row.nn(db_row.item_id, req.body.nn_size);
			console.log('NN results', nn_results);

			// setup new data
			let resp_data = {};
			_.extend(resp_data, req.body, {
				active_subject_id: db_row.item_id,
				nn_subject_ids: nn_results,
			});

			// save update
			let update = await db_collection_client.update(resp_data.collection_name, resp_data);
			console.log('update', update);

			return res.json(resp_data);
		});
	} else {
		console.log('/subject_search(), post data', req.body);
		// check DB for subject
		const db_vector_client = await db_vector(req.body.db_type, 343128, 64);
		const db_row = await db_vector_client.row.get(req.body.search_subject_id);
		if (!db_row.vector) {
			return res.json({ error: 'Could not find a subject with that id in the Astrovector DB'});
		}
		
		console.log('db_vector_row', db_row);

		// if subject exists, get nn
		const nn_results = await db_vector_client.row.nn(db_row.item_id, req.body.nn_size);
		console.log('NN results', nn_results);

		// setup new data
		let resp_data = {};
		_.extend(resp_data, req.body, {
			active_subject_id: db_row.item_id,
			nn_subject_ids: nn_results,
		});

		// save update
		console.log('update resp', resp_data);
		let update = await db_collection_client.update(resp_data.collection_name, resp_data);
		
		return res.json(resp_data);
	}
});

app.post('/save', async (req, res) => {
	console.log('save data', req.body);

	// save update
	let update = await db_collection_client.update(req.body.collection_name, req.body);
	console.log('save update', update);
	
	return res.json(req.body);
});

app.use(express.static('public'));

const httpServer = http.createServer(app);

if (process.env.USER == 'traviskiefer') {
	httpServer.listen(3000);
} else {
	// SSL / HTTPS
	const httpsServer = https.createServer({
		key: fs.readFileSync('/etc/letsencrypt/live/astrovector.zooniverse.org/privkey.pem', 'utf8'),
		cert: fs.readFileSync('/etc/letsencrypt/live/astrovector.zooniverse.org/cert.pem', 'utf8'),
		ca: fs.readFileSync('/etc/letsencrypt/live/astrovector.zooniverse.org/chain.pem', 'utf8')
	}, app);

	httpServer.listen(80);
	httpsServer.listen(443);
}
