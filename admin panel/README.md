# Standalone Admin Panel for Mobile App

This project is a standalone administrative panel created to manage and remove job listings directly from the mobile app's database.

## Architecture & Structure

```
admin panel/
├── server/                     # Standalone Express backend
│   ├── models/
│   │   └── Job.js              # Standalone Mongoose Job model (matches mobile app schema)
│   ├── .env                    # MongoDB URI and port configuration
│   ├── package.json            # Express, Mongoose, Cors, Dotenv
│   └── server.js               # API Server with DB connection & delete listing routes
│
└── client/                     # Standalone React frontend (Vite)
    ├── src/
    │   ├── App.jsx             # Admin dashboard with listing cards, search, filters & delete modal
    │   ├── App.css             # Glassmorphism dark mode aesthetic & responsive UI styles
    │   ├── index.css           # Global typography & color variables
    │   └── main.jsx            # React root
    ├── package.json
    └── vite.config.js
```

---

## Prerequisites & MongoDB Atlas IP Whitelist

If using MongoDB Atlas, make sure your current public IP is added to your MongoDB Atlas **Network Access** IP Access List (or allow `0.0.0.0/0` for development).

---

## Running the Admin Panel

### 1. Start the Standalone Express Backend
Open a terminal in `admin panel/server`:
```bash
cd "admin panel/server"
npm install
npm start
```
The server will run on `http://localhost:5000`.

### 2. Start the Standalone React Frontend
Open a second terminal in `admin panel/client`:
```bash
cd "admin panel/client"
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## API Endpoints Provided

- `GET /api/health` - Check server and MongoDB connection status.
- `GET /api/listings` - Retrieve all job listings directly from the database.
- `GET /api/listings/:id` - Fetch details for a specific listing.
- `DELETE /api/listings/:id` - Permanently delete a listing from MongoDB (instantly removes it from the mobile app).
