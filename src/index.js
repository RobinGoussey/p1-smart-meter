const P1Reader = require('p1-reader');
const { Pool, Client } = require('pg')
const dotenv = require("dotenv")

const options = {
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
    if (data.electricity.received.actual.reading > 0) //consuming
    {
        production = -data.electricity.received.actual.reading
    } else if (data.electricity.delivered.actual.reading > 0) //consuming
    {
        production = data.electricity.delivered.actual.reading
    }
    let tariff1kWhReceived=data.electricity.received.tariff1.reading;
    let tariff2kWhReceived=data.electricity.received.tariff2.reading;
    let tariff1kWhDelivered=data.electricity.delivered.tariff1.reading;
    let tariff2kWhDelivered=data.electricity.delivered.tariff2.reading;
    let tariffIndicator = data.electricity.tariffIndicator;
    console.log(tariffIndicator,tariff1kWhDelivered,tariff2kWhDelivered,tariff1kWhReceived,tariff2kWhReceived)
    if (production === 0) {
        console.eror("We got a problem, production is exactly 0, consumtion, production", data.electricity.received.actual.reading, data.electricity.delivered.actual.reading)
        process.exit(1) //crash container, should restart.

    }
    values = [(new Date()).toISOString(), production,tariff1kWhDelivered,tariff2kWhDelivered,tariff1kWhReceived,tariff2kWhReceived,tariffIndicator]
    client.query('insert into production(time_stamp,production,tariff1_produced,tariff2_produced,tariff1_consumed,tariff2_consumed,tariff_indicator) values ($1,$2,$3,$4,$5,$6,$7) returning *;', values, (err, res) => {
        if (err) {
            console.error("Error occured writing to database: ", err)
            client.end() //Stop connection to db
            process.exit(1) //crash container, should restart.
        }
    });
}
);

p1Reader.on('eror', er => {
    console.log('Eror while reading: ' + er);
});