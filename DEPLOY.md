# Deploying HappyCart

HappyCart ships as **one service**: the Go binary serves both the REST API
(under `/api`) and the built React frontend. You need two things online:

1. **MongoDB Atlas** — a free managed database (replaces your local MongoDB).
2. **Render** — hosts the Go+React service, built from the `Dockerfile`.

---

## 1. Create the database (MongoDB Atlas)

1. Sign up at <https://www.mongodb.com/cloud/atlas> and create a **free M0 cluster**.
2. **Database Access** → add a database user (username + password). Save these.
3. **Network Access** → Add IP Address → **Allow access from anywhere** (`0.0.0.0/0`).
   (Render's outbound IPs aren't fixed on the free plan, so this is required.)
4. **Connect → Drivers** → copy the connection string. It looks like:
   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
   Replace `<user>` and `<password>` with the credentials from step 2.
   This is your **`MONGODB_URI`**.

---

## 2. Push the code to GitHub

Render deploys from a Git repo. From the project root:

```bash
git add .
git commit -m "Add deployment config (Docker + Render)"
git push origin main        # or: git push origin dev
```

---

## 3. Deploy on Render

**Option A — Blueprint (uses `render.yaml`, easiest):**

1. Go to <https://dashboard.render.com> → **New → Blueprint**.
2. Connect your GitHub repo. Render reads `render.yaml` and proposes the service.
3. When prompted, fill in the secret env vars (see the table below).
4. Click **Apply**. First build takes a few minutes.

**Option B — Manual:**

1. **New → Web Service** → connect the repo.
2. Runtime: **Docker** (Render auto-detects the `Dockerfile`).
3. Instance type: **Free**.
4. Add the environment variables below, then **Create Web Service**.

### Environment variables

| Variable      | Value                                                        | Required |
|---------------|-------------------------------------------------------------|----------|
| `MONGODB_URI` | Your Atlas connection string from step 1                    | ✅ yes |
| `JWT_SECRET`  | A long random string (Blueprint auto-generates one)         | ✅ yes |
| `ADMIN_USER`  | Your admin login username                                   | recommended |
| `ADMIN_PASS`  | A **strong** admin password (not `admin`!)                  | ✅ yes |
| `DB_NAME`     | `happycart` (default — only set to override)                | no |
| `PORT`        | Leave unset — Render provides it automatically              | no |

> On first startup the app seeds an admin account from `ADMIN_USER` / `ADMIN_PASS`.
> Set a strong `ADMIN_PASS` **before** the first deploy, or anyone could log in
> with `admin` / `admin`.

---

## 4. Verify

When the deploy is live, Render gives you a URL like `https://happycart.onrender.com`.

- Open it → the storefront loads.
- Go to `/admin/login` → sign in with your `ADMIN_USER` / `ADMIN_PASS`.
- The API is reachable under `/api`, e.g. `https://happycart.onrender.com/api/products`.

---

## Notes & gotchas

- **Free plan sleeps.** After ~15 min idle the service spins down; the next
  request takes ~30s to wake it. Upgrade to a paid instance to keep it warm.
- **Seeding products.** The catalog starts empty. Add products from the admin
  dashboard, or POST to `/api/products` with an admin token.
- **Local dev is unchanged.** Run `go run .` (backend) and `npm run dev` in
  `web/` (frontend) as before — the Vite proxy forwards `/api` to `:8080`.
- **Rebuilding after frontend changes for a local production test:**
  `cd web && npm run build`, then run the Go binary — it serves `web/dist`.
