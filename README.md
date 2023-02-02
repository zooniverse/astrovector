# AstroVector

AstroVector is an experimental Zooniverse project to explore new ways of discovering new or rare cosmology. How this is accomplished is a Postgres database with 350K entries of Galaxy Zoo vector data comprised of 1,280 features per entry. The feature set has been reduced so that a performant nearest neighbor search can be conducted with two different nearest neighbor search extensions - Cube and PGVector. One research question for this project is determining which nearest neighbor search surfaces new, interesting, or rare cosmological phenomena. This README outlines the steps performed to setup the server, database, image processing, and web interface to explore the data.

## Server Setup

The current server is a bare Azure Ubuntu VM with 1GB RAM. Future iterations will likely benefit from an increase in memory capacity. The below linux commands were used to configure the server, database, and web server.

```
sudo apt update
sudo apt upgrade
sudo apt install postgresql postgresql-contrib
ls -R /etc/postgresql
sudo pg_ctlcluster 12 main status
sudo systemctl stop postgresql@12-main
sudo pg_createcluster 12 cube
sudo systemctl daemon-reload
sudo pg_ctlcluster 12 cube status
sudo systemctl start postgresql@12-cube
sudo pg_ctlcluster 12 cube status
git clone --branch v0.3.0 https://github.com/pgvector/pgvector.git
cd pgvector/
sudo apt install make
sudo apt-get install gcc
sudo apt install postgresql-server-dev-12
sudo make install
sudo vim /usr/include/postgresql/12/server/extension/cube/cubedata.h 
sudo vim /home/<username>/pgvector/src/vector.h
sudo apt install nodejs
npm install pg
sudo apt install npm
```

After the basic server configuration has been performed, its time to configure the databases. The two different databases run on port 5432 and 5433 by default. The below commands get into psql mode so that postgres db commands can be run. We need to set the password so that it can be connected to by a web server. Repeat the below commands replacing 5432 with 5433 to connect to the second database.

```
sudo -u postgres psql -p 5432
ALTER USER postgres PASSWORD 'astrovector';
EXIT;
```

If all went well, the server is now setup with two running instances of the postgres database with the cube extension installed on one and the pgvector installed on the other. After the database is running properly, we'll now make the web server operational. In this repository, the server folder contains all the files required for a nodejs server to connect to the database and provide a web interface for the databases. To install all the dependencies, navigate to the server folder in the command line and then run the below command to install all the dependency requirements.

```
npm install
```

After installed, to get the server running on port 80 and 443, you'll need to start the server. Note that the server.js file will need to be updated to 

```
forever start server.js
````

## Server Notes

- The images and vector data are currently stored outside of the repository due to their multi-gigabyte file size. 
- The db_populate.js file is used to populate the database from the post-processed Galaxy Zoo data mentioned in the previous line.
- This code is extremely experimental. There are likely several bugs and details I forgot to outline above.