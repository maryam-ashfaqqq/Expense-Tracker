import mysql from 'mysql2/promise'
import { Sequelize } from 'sequelize'

const host = process.env.DB_HOST || 'localhost'
const user = process.env.DB_USER || 'root'
const password = process.env.DB_PASSWORD ?? ''
const database = process.env.DB_NAME || 'aurum_ledger'

if (!/^[A-Za-z0-9_]+$/.test(database)) {
  throw new Error('DB_NAME may only contain letters, numbers, and underscores')
}

export const sequelize = new Sequelize(database, user, password, {
  host,
  dialect: 'mysql',
  logging: false,
  timezone: '+05:00',
  dialectOptions: {
    dateStrings: true,
    typeCast(field, next) {
      if (field.type === 'DATE') return field.string()
      return next()
    },
  },
})

export async function connectDatabase() {
  const connection = await mysql.createConnection({ host, user, password })
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  )
  await connection.end()
  await sequelize.authenticate()
}
