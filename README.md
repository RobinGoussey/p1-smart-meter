# p1-smart-meter
A repository to measure current belgian/dutch smart electricity/gas meter.
Built to run on linux/deployed on raspberry pi model 4.

It runs a grafana, no login. A postgres database with root/password, and a nodejs (javascript) container that reads our smart meter.
The raspberry pi is connected with the p1 port through a usb cable.

After running this, you can surf to the the ip adres, and grafana should run on the default port (80),
so if the ip adres of the raspberry pi is 192.168.0.165, that is where you can see it on your local network.

## Deploying
You will need docker-compose to deploy. Once installed, run:
```
#When in this directory (p1-smart-meter/$)
docker-compose build
docker-compose up -d
```

Now you can login to grafana, which should run on localhost.
You can login with admin/admin, and will then be asked to change the password. Then login again if logged out.
Then add a datasource, you should see this on home page, or on the left configuration and datasources.
Add a datasource:
```
#Don't make this public without changing passwords.
address: postgres:5432
database: root
username: root
password: password
Don't forget to disable ssl checking (it will complain otherwise)
```
Once done, you can import the dashboard:
Go to dashboards/manage, and you should see an import.
There you go to this project, and in the docker folder you'll see a Productie-xx...xx.json file, import this and select the postgres datasource. Now you should have a nice dashboard. 

An example of the dashboard:
![dashboard screenshot](img/dashboard.png)


## Requirements
### Deploying 
docker
docker-compose
### Development
npm
nodejs
docker
docker-compose

## Deployment
It's is build so all you have to do, is:
```
docker-compose up -d
```

This will start 3 docker containers, which starts a postgres sql database, grafana, and a nodejs container, that reads /dev/ttyUSB0.

The db folder contains the scripts that should auto create the database and index. If not:
´´´
docker exec -it postgres psql -U root
´´´

And then copy the sql in db, and paste it there.

## Useful queries

### Get daily kwh netto production
This is a non optimized query #TODO. It gives you the results per day, between the first postive, and the last positive value. It gets kwh produced and consumed.
```psql
with cte_with_day as (
	SELECT *, DATE(production.time_stamp) as day_column
	FROM production
	where production.production>0
),
cte_first_production as (
	select time_stamp,day_column,tariff1_produced+tariff2_produced as produced,tariff1_consumed+tariff2_consumed as consumed,
	ROW_NUMBER() OVER(PARTITION BY day_column
                                 ORDER BY time_stamp) AS rn
	from cte_with_day
),
cte_last_production as (
	select time_stamp,day_column,tariff1_produced+tariff2_produced as produced,tariff1_consumed+tariff2_consumed as consumed,
	ROW_NUMBER() OVER(PARTITION BY day_column
					  ORDER BY time_stamp DESC) AS rn
	from cte_with_day
),
cte_first_per_day_production as (
select * from cte_first_production
where rn = 1
),
cte_last_per_day_production as (
select * from cte_last_production
where rn = 1
)

select cte_first_per_day_production.time_stamp as start_dag, cte_last_per_day_production.time_stamp as einde_dag,
cte_first_per_day_production.day_column,
ROUND((cte_last_per_day_production.produced - cte_first_per_day_production.produced)::numeric,2) as productie,
ROUND((cte_last_per_day_production.consumed - cte_first_per_day_production.consumed)::numeric,2) as consumptie,
ROUND(((cte_last_per_day_production.produced - cte_first_per_day_production.produced)-(cte_last_per_day_production.consumed - cte_first_per_day_production.consumed))::numeric,2) as netto_productie
from cte_first_per_day_production
join cte_last_per_day_production on cte_first_per_day_production.day_column = cte_last_per_day_production.day_column

```

More efficient query (change if need be) to get the consumption kwh every night (last and first postive value) 

```
With first_and_last_timestamp_cte as (
	SELECT time_stamp,
		round((tariff1_produced+tariff2_produced)::numeric,2) as produced,
		round((tariff1_consumed+tariff2_consumed)::numeric,2) as consumed,
		DATE(production.time_stamp) as day_column,
		FIRST_VALUE(time_stamp) OVER (PARTITION BY DATE(production.time_stamp)
                                 ORDER BY time_stamp) as first_positive_value,
		FIRST_VALUE(time_stamp) OVER (PARTITION BY DATE(production.time_stamp)
                                 ORDER BY time_stamp desc) as last_positive_value		 
	FROM production
	where production.production>0 
),
first_timestamp_cte_filtered as (
	select distinct * from first_and_last_timestamp_cte
	where time_stamp = first_positive_value
),
last_timestamp_cte_filtered as (
	select distinct * from first_and_last_timestamp_cte
	where time_stamp = last_positive_value
)
select last_timestamp_cte_filtered.day_column as "consumptie nacht",
first_timestamp_cte_filtered.consumed-last_timestamp_cte_filtered.consumed as consumptie
from first_timestamp_cte_filtered
join last_timestamp_cte_filtered on last_timestamp_cte_filtered.day_column::date+'1 day'::interval = first_timestamp_cte_filtered.day_column::date
```


#Disclaimer
It is by no means production code/secure, but we wanted to see our production/consumption live. So don't open it to the public (port forward it).
We run it on our local network, but you cannot see grafana on the outside world.

