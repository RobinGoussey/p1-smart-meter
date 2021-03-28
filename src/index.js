const P1Reader = require('p1-reader');
const { Pool, Client } = require('pg')
const dotenv = require("dotenv")

const options={
    path: '../.env'
}

dotenv.config()

const p1Reader = new P1Reader({
    port: '/dev/ttyUSB0',
    baudRate: 115200,
    parity: "even",
    dataBits: 7,
    stopBits: 1
});

const client = new Client({
    user: process.env.db_username,
    host: process.env.db_host, 
    database: process.env.db_database,
    password: process.env.db_password,
    port: process.env.db_post,
})
client.connect()

p1Reader.on('reading', data => {
    let production = 0;
    if(data.electricity.received.actual.reading>0) //consuming
    {
        production=-data.electricity.received.actual.reading
    } else if(data.electricity.delivered.actual.reading>0) //consuming
    {
        production=data.electricity.delivered.actual.reading
    }
    if(production===0){
        console.warn("We got a problem, production is exactly 0, consumtion, production",data.electricity.received.actual.reading,data.electricity.delivered.actual.reading)
    } else {
        values=[(new Date()).toISOString(),production]
        client.query('insert into production(time_stamp,production) values ($1,$2) returning *;',values, (err, res) => {
            if(err){
                console.error("Error occured writing to database: ",err)
                client.end() //Stop connection to db
                process.exit(1) //crash container, should restart.
            }
        });
    }
}
);

p1Reader.on('error', err => {
    console.log('Error while reading: ' + err);
});