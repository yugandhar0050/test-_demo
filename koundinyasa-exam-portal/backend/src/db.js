import pg from 'pg'; import dotenv from 'dotenv'; dotenv.config();
const {Pool}=pg;
export const pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.DATABASE_URL?.includes('localhost')||process.env.DATABASE_URL?.includes('127.0.0.1')?false:{rejectUnauthorized:true},max:10,connectionTimeoutMillis:10000});
pool.on('error',e=>console.error('PostgreSQL pool error:',e.message));
export const query=(sql,params=[])=>pool.query(sql,params);
