# The Fork & Flame — Restaurant Reservation & Online Ordering

Full-stack B.E. CSE project using React + Vite, Node.js/Express and MySQL.

## Requirements
- Node.js 18+
- MySQL 8+

## 1. Database
Create the database and tables:

```bash
mysql -u root -p < database/schema.sql
```

Or open `database/schema.sql` in MySQL Workbench and execute it.

## 2. Backend
```bash
cd backend
npm install
```

Create `.env` from `.env.example` and update your MySQL password.

```bash
npm run seed
npm run dev
```

Backend: http://localhost:5000

Health check: http://localhost:5000/api/health

## 3. Frontend
Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend: http://localhost:5173

## Demo accounts
Staff:
- admin@restaurant.com
- Admin@123

Customer:
- customer@example.com
- Customer@123

## Important
Do NOT open `frontend/index.html` by double-clicking it. React/Vite must be started with `npm run dev`.
