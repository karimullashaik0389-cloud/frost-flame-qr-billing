# Deploy Frost & Flame Admin API (one-time, ~2 minutes)

The Google Sheet backend is already created and filled (owned by karimulla.shaik0389@gmail.com):
https://docs.google.com/spreadsheets/d/1MJXSMHAB5EqHMkyLoFH26K3fx0gE5ISsXcEaC_u1vsI/edit

Apps Script source to paste: `api/Code.gs` in this repo
(or Drive copy: https://drive.google.com/file/d/1P6ZRtliUucOcEXmjjHQq9zkFp-iGZ0L3/view )

## Single step you must do

1. Sign into Google as **karimulla.shaik0389@gmail.com** (the Drive account that owns the Sheet).
2. Open https://script.google.com/home/projects/create
3. Delete any default code. Paste the full contents of `api/Code.gs`.
4. Click **Deploy** → **New deployment**.
5. Gear ⚙️ next to "Select type" → **Web app**.
6. Settings:
   - Description: `Frost Flame API`
   - Execute as: **Me**
   - Who has access: **Anyone**
7. Click **Deploy**. Approve Google permissions if asked.
8. Copy the **Web app URL** (ends in `/exec`).
9. Reply to Bujji with that URL (or paste it into `js/config.js` as `window.FF_API_URL = '…'` and push).

Admin page (after Pages rebuild):  
https://karimullashaik0389-cloud.github.io/frost-flame-qr-billing/admin.html

Login credentials are in the bot store file (not in git). Ask Bujji for the path if needed.

## After deploy

- Staff use `/admin.html` on a phone/tablet.
- Customer QR pages load menu + scratch from the API.
- If the API is down, customers still see the built-in fallback menu.
- To change odds later: Admin → Scratch → edit counts → Save odds → Refill pool.
