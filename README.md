# Vedakaru mobile app

## Run the backend

1. In `backend/src`, copy `.env.example` to `.env` and set `MONGO_URI` and a private `JWT_SECRET`.
2. From the `backend` directory, install dependencies and start the API:

   ```powershell
   npm install
   npm run dev
   ```

The API listens on port `3000` on all network interfaces. Keep MongoDB running and reachable.

## Run the mobile app

From the `mobile-app` directory:

```powershell
npm install
npx expo start
```

The app reads the Expo development host and connects to the backend on port `3000`. A physical phone and the development computer must be on the same network. Android emulators use their host loopback alias automatically. For a deployed backend, set `expo.extra.apiUrl` in `app.json` to the API base URL, including `/api`.
