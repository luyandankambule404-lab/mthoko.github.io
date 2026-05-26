# Fix GitHub Pages 404 — step by step

The **404 "There isn't a GitHub Pages site here"** message means Pages is not enabled or nothing has been deployed yet.

## 1. Create a public repository on GitHub

1. Go to [github.com/new](https://github.com/new)
2. Name it (example: `my-website`)
3. Choose **Public** (required for free GitHub Pages)
4. Do **not** add a README if you already have files locally
5. Click **Create repository**

## 2. Upload your website from your PC

Open **PowerShell** in your website folder and run (replace `YOUR-USERNAME` and `YOUR-REPO`):

```powershell
cd "c:\Users\mthok\OneDrive\Desktop\website"
git branch -M main
git add -A
git commit -m "Publish website"
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

If `git remote add` says the remote already exists:

```powershell
git remote set-url origin https://github.com/YOUR-USERNAME/YOUR-REPO.git
git push -u origin main
```

Or double-click **`DEPLOY-TO-GITHUB.bat`** in this folder.

## 3. Turn on GitHub Pages (important)

1. Open your repo on GitHub
2. **Settings** → **Pages** (left sidebar)
3. Under **Build and deployment** → **Source**, choose **GitHub Actions**
4. Save (no other setting needed if you use the workflow in this repo)

## 4. Wait for the deploy

1. Open the **Actions** tab in your repo
2. Wait until **Deploy to GitHub Pages** shows a green checkmark (1–3 minutes)
3. Go back to **Settings** → **Pages** — you will see your live URL

## 5. Your site URL

For a repo named `my-website` under user `johndoe`:

**https://johndoe.github.io/my-website/**

Open **index.html** via the root URL above (not a random github.io link without your repo name).

## Photos

Make sure **`images/profile.png`** is in the repo on GitHub (folder `images` at the top level next to `index.html`).

## Still 404?

- Repo must be **Public**
- Wait 5 minutes after the first green Action run
- Use the exact URL from **Settings → Pages**
- Do not use `username.github.io` unless your repo is named **`username.github.io`**
