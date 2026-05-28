# KMM Lifestyle

Premium accommodation website with client dashboard, admin panel, and SQLite backend.

## Run the site (required for bookings & accounts)

Data is stored in a **SQLite database** on the server — not in the browser.

From the project folder (`lifestyle`) — first time only, install server dependencies:

```bash
npm run install:server
```

Then start the site:

```bash
npm start
```

Or from the `server` folder:

```bash
cd server
npm install
npm start
```

Open **http://localhost:3000**

- Website: home, rooms, tours, booking, etc.
- **My Account**: http://localhost:3000/dashboard.html
- **Admin**: http://localhost:3000/admin.html (password: `kmmadmin2025`)

## Configuration

Copy `server/.env.example` to `server/.env` and set:

| Variable | Purpose |
|----------|---------|
| `PORT` | Server port (default `3000`) |
| `JWT_SECRET` | Secret for login tokens (change in production) |
| `ADMIN_PASSWORD` | Admin dashboard password |

Database file: `server/data/kmm.db` (created automatically)

## API

Base URL: `http://localhost:3000/api`

- `GET /health` — server status
- `POST /bookings` — create booking
- `GET /bookings` — list all (admin)
- `POST /auth/register`, `POST /auth/login` — client accounts
- `POST /admin/login` — admin session
- `POST /subscribe` — newsletter signups

## Opening HTML files directly

If you open `.html` files from disk (`file://`), the API will not work. Always use `npm start` in the `server` folder.
