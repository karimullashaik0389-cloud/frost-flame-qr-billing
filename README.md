# Frost & Flame — QR Menu + Bill

Static customer page for Tark Limited / Frost & Flame (GitHub Pages).

- Customer: `https://karimullashaik0389-cloud.github.io/frost-flame-qr-billing/?table=4`
- Staff admin: `https://karimullashaik0389-cloud.github.io/frost-flame-qr-billing/admin.html`

Menu, prices and scratch-card odds are managed in Google Sheets via an Apps Script API.
See `api/DEPLOY.md` for the one-time deploy step, then set `FF_API_URL` in `js/config.js`.

Customer pages fall back to the built-in menu if the API is unreachable.
No customer personal data is stored on the static page.
