--create table
create table if not exists production(
    time_stamp timestamptz, -- time_stamp because some words are sql reserved or could create weird results
    production double precision,
    tariff1_produced double precision,
    tariff2_produced double precision,
    tariff1_consumed double precision,
    tariff2_consumed double precision,
    tariff_indicator int
);


--create index, to make searching on time_stamp faster
CREATE INDEX production_time_stamp_index ON production
(
    time_stamp
);