# Fix photos on GitHub (2 minutes)

Your photo **is online** here (this link must open your picture):

https://luyandankambule404-lab.github.io/mthoko.github.io/profile.png

The website still looks for the wrong path. Do **one** of these:

---

## Easiest: upload one file to `images/`

1. Open: https://github.com/luyandankambule404-lab/mthoko.github.io/upload  
2. Upload **`images/profile.png`** from your PC  
   - Folder: `Desktop\website\images\profile.png`  
3. Commit  
4. Test: https://luyandankambule404-lab.github.io/mthoko.github.io/images/profile.png  
5. Hard-refresh your site: **Ctrl+F5**

---

## Or: upload the fix script

1. Open: https://github.com/luyandankambule404-lab/mthoko.github.io/upload  
2. Upload **`profile-fix.js`** from `Desktop\website\`  
3. Edit **`index.html`** on GitHub → before `</head>` add:

   ```html
   <script src="profile-fix.js?v=1"></script>
   ```

4. Commit, wait 2 minutes, **Ctrl+F5**

---

## Or: push everything from your PC

Double-click **`DEPLOY-TO-GITHUB.bat`** and push all files.
