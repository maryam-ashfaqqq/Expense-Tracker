# Aurum — Private Ledger

Expense and budget tracker with the Aurum frontend and a Node.js API. Each account sees only its own MySQL data. The green and gold screens are unchanged.

## What you need

- Node.js 18 or newer
- MySQL 8 running locally

## 1. Configure the database

`server/.env` is already set for this machine. If MySQL rejects the connection, copy the example and set your own password:

```powershell
copy server\.env.example server\.env
```

`server/.env` keys:

| Key | Purpose |
| --- | --- |
| `DB_HOST` | MySQL host, usually `localhost` |
| `DB_USER` | MySQL user, usually `root` |
| `DB_PASSWORD` | MySQL password |
| `DB_NAME` | Database name. The server creates `aurum_ledger` if it is missing |
| `JWT_SECRET` | Secret used to sign login tokens |
| `PORT` | API port. Keep this at `5000` |

The frontend reads `VITE_API_URL` from the project `.env`. It should stay `http://localhost:5000`.

## 2. Install

From the project folder:

```powershell
npm install
npm install --prefix server
```

## 3. Run both apps

Frontend: http://localhost:5173  
API: http://localhost:5000

Two terminals:

```powershell
npm run dev
```

```powershell
npm run server
```

Or both together:

```powershell
npm run dev:full
```

The API creates the tables on startup.

## Sign in

- **Create account** asks for name, email, and password. A new ledger is empty.
- **Sign in** asks for email and password.
- The JWT is stored in `localStorage` under `aurum-token`. Log out removes it.
- Passwords are stored as bcrypt hashes.

## Load Demo Data

The sidebar button **Load Demo Data** fills that account with sample income, expenses, budgets, and recurring charges for June through November 2026. It replaces that account’s current ledger. Other users are not affected.

## API

All ledger routes require `Authorization: Bearer <token>`.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/signup` | Create an account |
| POST | `/api/auth/login` | Sign in |
| GET | `/api/auth/me` | Current user |
| GET | `/api/transactions` | Search, filter, sort, and paginate. 10 per page |
| POST | `/api/transactions` | Add income or an expense |
| PUT | `/api/transactions/:id` | Update one entry |
| DELETE | `/api/transactions/:id` | Delete one entry |
| GET | `/api/budgets` | Category limits, spent amounts, and alerts |
| POST | `/api/budgets` | Save monthly limits |
| GET | `/api/recurring` | Monthly series |
| POST | `/api/recurring` | Add a monthly series |
| PUT | `/api/recurring/:id` | Edit, pause, or resume a series |
| DELETE | `/api/recurring/:id` | Remove a series. Past entries stay |
| GET | `/api/dashboard/stats` | Balance, income, spent, remaining, month-over-month change, charts, and budget alerts |
| POST | `/api/demo` | Load the June–November 2026 sample |

Transaction list query params:

`?search=&category=&method=&month=&sort=&page=`

`sort` may be `newest`, `oldest`, `amount-desc`, `amount-asc`, or `title`.

Budget alerts:

- spending above 80% of a limit returns a warning
- spending at or above 100% returns an alert

Recurring expenses post automatically on their day each month while the API is running, and again the next time that account loads the ledger.

## Tables

- `users` — id, name, email, password
- `transactions` — id, userId, type (`income` or `expense`), title, category, amount, date, method (`Cash`, `JazzCash`, `Bank`), note, recurring
- `budgets` — id, userId, category, monthlyLimit
- `recurring` — id, userId, title, amount, category, dayOfMonth, active

The ledger also stores `recurringId` on a transaction, and `method`, `note`, and `lastPosted` on a recurring series, so the existing screens can show payment method, notes, and the next charge date.
