--create table
create table if not exists production(
    time_stamp timestamptz, -- time_stamp because some words are sql reserverd or could create weird results
    production double precision
);


--create index, to make searching on time_stamp faster
CREATE INDEX production_time_stamp_index ON production
(
    time_stamp
);