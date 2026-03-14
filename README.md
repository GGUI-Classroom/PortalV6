# G.GUI Dev Portal

A lightweight internal dev portal for the **G.GUI** unblocked gaming site. Employees can submit website suggestions, feature ideas, and code snippets. The owner has a private admin dashboard to review all submissions.

Built with **Node.js + Express + EJS**. Uses JSON file storage — no database required.

---

## 📁 File Structure

```
ggui-portal/
├── server.js               # App entry point
├── package.json
├── README.md
├── routes/
│   ├── auth.js             # Login / logout
│   ├── employee.js         # Employee submission routes
│   ├── owner.js            # Owner dashboard routes
│   ├── middleware.js        # Auth middleware
│   └── helpers.js          # ID generation, sanitize, validation
├── views/
│   ├── login.ejs
│   ├── 403.ejs
│   ├── 404.ejs
│   ├── error.ejs
│   ├── partials/
│   │   ├── head.ejs
│   │   ├── sidebar-employee.ejs
│   │   └── sidebar-owner.ejs
│   ├── employee/
│   │   ├── suggest-website.ejs
│   │   ├── suggest-feature.ejs
│   │   └── submit-snippet.ejs
│   └── owner/
│       ├── dashboard.ejs
│       ├── websites.ejs
│       ├── features.ejs
│       ├── snippets.ejs
│       └── combined.ejs
├── public/
│   └── css/
│       └── portal.css
└── data/
    ├── db.js               # JSON read/write helpers
    ├── suggestions.json    # Website suggestions
    ├── features.json       # Feature suggestions
    └── snippets.json       # Code snippets
```

---

## 🖥️ Running Locally

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/ggui-portal.git
cd ggui-portal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set environment variables

Create a `.env` file **or** set them in your shell. The app reads these at runtime:

| Variable          | Description                   | Default (dev fallback) |
|-------------------|-------------------------------|------------------------|
| `OWNER_USERNAME`  | Owner login username          | `owner`                |
| `OWNER_PASSWORD`  | Owner login password          | `ownerpass`            |
| `EMP_USERNAME`    | Shared employee username      | `employee`             |
| `EMP_PASSWORD`    | Shared employee password      | `emppass`              |
| `SESSION_SECRET`  | Secret for session signing    | `ggui-portal-secret-change-me` |
| `PORT`            | Port to run on                | `3000`                 |

> ⚠️ **Always set real secrets in production — never use the dev fallbacks on a live server.**

To set them temporarily in your shell:

```bash
export OWNER_USERNAME=myowner
export OWNER_PASSWORD=supersecret
export EMP_USERNAME=myemployee
export EMP_PASSWORD=emppassword
export SESSION_SECRET=some-long-random-string
```

### 4. Start the server

```bash
npm start
# or
node server.js
```

Visit: **http://localhost:3000**

---

## 🔐 Auth & Roles

- **No registration** — accounts are configured via environment variables only.
- **Owner** logs in with `OWNER_USERNAME` / `OWNER_PASSWORD` → lands on the admin dashboard.
- **Employee** logs in with `EMP_USERNAME` / `EMP_PASSWORD` → lands on the suggestion form.
- Employee routes require any logged-in user.
- Owner dashboard routes require owner role specifically (employees get a 403 if they try to access).

---

## 🚀 Deploying to Render (Free Tier)

### ✅ Render Free Tier Quick Deploy Checklist

1. **Push this repo to GitHub** (or GitLab/Bitbucket).

2. Go to [render.com](https://render.com) → **New → Web Service**.

3. **Connect your repo** from GitHub.

4. Choose **Free** plan in the "Plan" section.

5. Set these environment variables in the **"Environment"** tab:

   | Key               | Value              |
   |-------------------|--------------------|
   | `OWNER_USERNAME`  | your owner username |
   | `OWNER_PASSWORD`  | a strong password   |
   | `EMP_USERNAME`    | your employee username |
   | `EMP_PASSWORD`    | a strong password   |
   | `SESSION_SECRET`  | a long random string (e.g. `openssl rand -hex 32`) |

6. Set **Build command**: `npm install`

7. Set **Start command**: `node server.js`

8. Click **Create Web Service**. Render will build and deploy automatically.

---

### ⚠️ Important: Free Tier Data Persistence

> Render's **free tier does NOT provide a persistent disk**. This means:
>
> - The `data/*.json` files are stored on the **ephemeral filesystem**.
> - **Every time the server restarts or redeploys, all submitted data will be lost.**

**This is expected for a dev/hobby portal.** If you need data to survive restarts, you have two options:

- **Upgrade to a paid Render plan** and attach a Persistent Disk.
- **Export to an external store** (e.g., a free MongoDB Atlas cluster) — which would require modifying `data/db.js`.

For internal team use on the free tier, just be aware that data resets on restarts.

---

### 📋 Render Free Tier Limits (Know Before You Deploy)

| Limit | Detail |
|-------|--------|
| Instance hours | ~750 free hours/month (enough for one always-on service) |
| RAM | 512 MB |
| Disk | Ephemeral (no persistence between deploys/restarts) |
| Sleep | Free services **spin down after 15 minutes of inactivity** — the first request after sleep takes ~30–60 seconds to respond. |
| Custom domain | Supported on free tier |
| HTTPS | Automatic (Render provides SSL) |

> 📢 **Tell your employees:** This is a hobby/dev portal. It may sleep when not in use. The first visit after inactivity may be slow. Data submitted may be lost on redeploys.

---

## 🎨 Customizing the Branding (portal.css)

All colors and fonts are defined as **CSS variables** at the top of `public/css/portal.css`.

### Key variables to tweak:

```css
:root {
  /* Main accent — change this to match G.GUI's primary color */
  --accent:        #00e5a0;   /* electric green-cyan */
  --accent-dim:    #00c488;   /* slightly darker for hover */

  /* Owner dashboard accent */
  --owner-accent:  #f5a623;   /* amber/gold */

  /* Background layers */
  --bg-base:       #0d0f14;   /* page background */
  --bg-surface:    #12151c;   /* slightly lighter surfaces */
  --bg-card:       #181c26;   /* card backgrounds */
  --bg-sidebar:    #0b0d12;   /* sidebar background */
}
```

### To match your G.GUI main site more closely:
1. Open your main site's DevTools and sample the exact hex codes from the homepage.
2. Replace `--accent`, `--bg-base`, and `--bg-sidebar` in `portal.css` with those colors.
3. If your site uses a different font, replace the Google Fonts import in `views/partials/head.ejs` and update `--font-ui` and `--font-mono`.

---

## 📦 Dependencies

| Package           | Purpose                        |
|-------------------|-------------------------------|
| `express`         | HTTP server framework          |
| `express-session` | Session-based auth             |
| `ejs`             | Server-side HTML templating    |
| `cookie-parser`   | Parse cookies                  |

No database. No heavy ORM. Total install size is minimal and well within Render's 512 MB free RAM limit.

---

## 🛠️ Adding Features Later

The codebase is structured to make future extensions easy:

- **Edit/delete submissions**: Add `PUT /owner/websites/:id` and `DELETE /owner/websites/:id` routes in `routes/owner.js`, then add update/delete functions to `data/db.js`.
- **Multiple employees**: Add an array of `{username, password}` objects to a `data/users.json` file and update the login logic in `routes/auth.js`.
- **Persistent database**: Replace `data/db.js` with MongoDB Atlas (using the official `mongodb` npm package) — all route files stay the same since they only call `db.*` functions.
- **Email notifications**: Add `nodemailer` and call it from the POST handlers in `routes/employee.js` after saving an entry.
