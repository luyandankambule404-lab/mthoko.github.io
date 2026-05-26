# Upload your photo to GitHub (fixes missing images)

Your site is live: **https://luyandankambule404-lab.github.io/mthoko.github.io/**

Photos are missing because `images/profile.png` is not on GitHub yet.

## Quick fix (2 minutes)

1. Open: https://github.com/luyandankambule404-lab/mthoko.github.io/upload  
2. Drag the folder **`images`** from your PC (`Desktop\website\images`)  
   - It must contain **`profile.png`**
3. Click **Commit changes**
4. Wait 1–2 minutes, then open:  
   https://luyandankambule404-lab.github.io/mthoko.github.io/images/profile.png  
   - If you see your photo, the whole site will show it.

## Or push from your computer

```powershell
cd "c:\Users\mthok\OneDrive\Desktop\website"
git branch -M main
git add -A
git commit -m "Add photos and site updates"
git remote add origin https://github.com/luyandankambule404-lab/mthoko.github.io.git
git push -u origin main
```

(If remote exists: `git remote set-url origin https://github.com/luyandankambule404-lab/mthoko.github.io.git`)
