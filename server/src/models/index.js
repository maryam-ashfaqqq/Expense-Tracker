import { DataTypes } from 'sequelize'
import { sequelize } from '../config/db.js'

export const User = sequelize.define(
  'User',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(80), allowNull: false },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    password: { type: DataTypes.STRING(255), allowNull: false },
  },
  { tableName: 'users' },
)

export const Budget = sequelize.define(
  'Budget',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    category: { type: DataTypes.STRING(40), allowNull: false },
    monthlyLimit: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  },
  {
    tableName: 'budgets',
    indexes: [{ unique: true, fields: ['userId', 'category'] }],
  },
)

export const Recurring = sequelize.define(
  'Recurring',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    title: { type: DataTypes.STRING(80), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    category: { type: DataTypes.STRING(40), allowNull: false },
    dayOfMonth: { type: DataTypes.INTEGER, allowNull: false },
    active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    method: { type: DataTypes.ENUM('Cash', 'JazzCash', 'Bank'), allowNull: false, defaultValue: 'Bank' },
    note: { type: DataTypes.STRING(180), allowNull: false, defaultValue: '' },
    lastPosted: { type: DataTypes.STRING(7), allowNull: true },
  },
  { tableName: 'recurring' },
)

export const Transaction = sequelize.define(
  'Transaction',
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM('income', 'expense'), allowNull: false },
    title: { type: DataTypes.STRING(80), allowNull: false },
    category: { type: DataTypes.STRING(40), allowNull: false },
    amount: { type: DataTypes.INTEGER, allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    method: { type: DataTypes.ENUM('Cash', 'JazzCash', 'Bank'), allowNull: false },
    note: { type: DataTypes.STRING(180), allowNull: false, defaultValue: '' },
    recurring: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    recurringId: { type: DataTypes.INTEGER, allowNull: true },
    demo: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  {
    tableName: 'transactions',
    indexes: [{ fields: ['userId', 'date'] }, { fields: ['userId', 'category'] }],
  },
)

User.hasMany(Transaction, { foreignKey: 'userId', onDelete: 'CASCADE' })
User.hasMany(Budget, { foreignKey: 'userId', onDelete: 'CASCADE' })
User.hasMany(Recurring, { foreignKey: 'userId', onDelete: 'CASCADE' })
Transaction.belongsTo(User, { foreignKey: 'userId' })
Budget.belongsTo(User, { foreignKey: 'userId' })
Recurring.belongsTo(User, { foreignKey: 'userId' })
Recurring.hasMany(Transaction, { foreignKey: 'recurringId', onDelete: 'SET NULL' })
Transaction.belongsTo(Recurring, { foreignKey: 'recurringId' })

export async function syncModels() {
  await sequelize.sync({ alter: true })
}
