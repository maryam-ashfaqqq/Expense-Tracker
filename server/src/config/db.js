import mysql from 'mysql2/promise'
import { Sequelize } from 'sequelize'

const host = process.env.DB_HOST || 'localhost'
const user = process.env.DB_USER || 'root'
const password = process.env.DB_PASSWORD ?? ''
const database = process.env.DB_NAME || 'aurum_ledger'.trim()


const port = Number(process.env.DB_PORT || 3306)

const ssl =
  process.env.DB_SSL === 'true'
    ? { minVersion: 'TLSv1.2' }
    : undefined

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('DB_NAME may only contain letters, numbers, and underscores')
}


export const sequelize = new Sequelize(database, user, password, {
  host,
  port,
  dialect: 'mysql',
  logging: false,
  timezone: '+05:00',
  dialectOptions: {
    ssl,
    dateStrings: true,
    typeCast(field, next) {
      if (field.type === 'DATE') return field.string()
      return next()
    },
  },
})

export async function 
connectDatabase() {
  await sequelize.authenticate()
  
}