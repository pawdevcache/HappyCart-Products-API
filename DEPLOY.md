# Deploying HappyCart (Frontend on Vercel + Backend on Render)

HappyCart has three parts, hosted in two places:

| Part | Host | Why |
|------|------|-----|
| **MongoDB** | MongoDB Atlas (free) | Managed database — can't ship your localhost DB |
| **Go API** | Render (Docker) | Runs a persistent server; Vercel cannot |
| **React frontend** | Vercel (static/CDN) | Vercel is great at serving static sites |

The frontend calls `/api/...` and Vercel **rewrites** those requests to the
Render backend server-side — so there's **no CORS setup** and the frontend code
is identical to local dev.

> **Deploy the backend FIRST** — you need its URL to configure the frontend.

---

## 1. Create the database (MongoDB Atlas)

1. Sign up at <https://www.mongodb.com/cloud/atlas> and create a **free M0 cluster**.
2. **Database Access** → add a database user (username + password). Save these.
3. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`).
4. **Connect → Drivers** → copy the connection string:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Fill in your user/password. This is your **`MONGODB_URI`**.

---

## 2. Push the code to GitHub

```bash
git add .
git commit -m "Add deployment config (Render backend + Vercel frontend)"
git push
```

---

## 3. Deploy the BACKEND on Render

1. <https://dashboard.render.com> → **New → Web Service** → connect your repo
   (`HappyCart-Products-API`).
2. Runtime: **Docker** (auto-detected from the `Dockerfile`). Instance: **Free**.
3. Add these environment variables:

   | Variable      | Value                                      |
   |---------------|--------------------------------------------|
   | `MONGODB_URI` | Your Atlas string from step 1              |
   | `JWT_SECRET`  | A long random string                       |
   | `ADMIN_USER`  | Your admin username                        |
   | `ADMIN_PASS`  | A **strong** password (not `admin`!)       |

4. **Create Web Service.** When it's live, copy its URL, e.g.
   `https://happycart-api.onrender.com`. **You need this for the next step.**
5. Sanity check: open `https://<your-render-url>/api/products` — it should
   return `[]` (or a JSON list), not a 404.

---

## 4. Point the frontend at your backend

Edit **`web/vercel.json`** and replace the placeholder host with your real
Render URL from step 3:

```json
"destination": "https://happycart-api.onrender.com/api/:path*"
```

Then commit and push:

```bash
git add web/vercel.json
git commit -m "Point frontend at Render backend"
git push
```

---

## 5. Deploy the FRONTEND on Vercel

1. <https://vercel.com/new> → import the same GitHub repo.
2. **Important — set the Root Directory to `web`.**
   (Click *Edit* next to Root Directory and choose the `web` folder.)
   Vercel auto-detects Vite; leave build command / output as detected.
3. Click **Deploy.**
4. Open the Vercel URL → the store loads, and API calls flow through to Render.

---

## 6. Verify

- Vercel URL (e.g. `https://happy-cart.vercel.app`) → storefront loads.
- `/admin/login` → sign in with your `ADMIN_USER` / `ADMIN_PASS`.
- Products/users load → the Vercel→Render rewrite is working.

---

## Notes & gotchas

- **Render free instances sleep** after ~15 min idle. The first request after
  that takes ~30–50s to wake the server, so the first page load may be slow or
  time out once — refresh and it works. Upgrade to a paid instance to avoid this.
- **Set `ADMIN_PASS` before the first backend deploy.** The app seeds an admin
  account on first startup from `ADMIN_USER`/`ADMIN_PASS`; if you leave the
  defaults, anyone could log in with `admin`/`admin`.
- **Changed the backend URL?** Update `web/vercel.json` and push — Vercel
  redeploys automatically.
- **Local dev is unchanged.** `go run .` + `npm run dev` in `web/`. The Vite
  proxy handles `/api` locally; `vercel.json` handles it in production.
- The Render backend also serves a copy of the frontend at its own URL — handy
  for testing the API in isolation, but your real site is the Vercel URL.
