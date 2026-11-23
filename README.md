# QuizRoom

A Kahoot-style live quiz for internal office use. Next.js + Upstash Redis, no WebSocket server needed, so it runs on Vercel.

## Deploy
1. Push this folder to GitHub and import it in Vercel.
2. In the Vercel project: Storage > Marketplace > Upstash Redis > create and connect. The env vars are injected automatically.
3. Redeploy.

## Use
- Admin: open `/admin` to create, edit, duplicate and delete quizzes. Set `ADMIN_PASSWORD` to require a password for `/admin` and `/host`.
- Host: open `/host`, pick a saved quiz, click Host, project the screen.
- Players: open the site on their phones, enter the PIN and a name.

## Local dev
Copy `.env.example` to `.env.local`, fill in the Upstash REST URL and token, then `npm install && npm run dev`.

## Notes
- Real time is done by polling every second, fine for a few hundred players.
- Games expire after 6 hours.
- To limit who can host, put Vercel Deployment Protection or SSO in front of `/host`.

## Docker (self-hosted)
```
echo "REDIS_REST_TOKEN=$(openssl rand -hex 16)" > .env
docker compose up -d --build
```
Open `http://<server>:3000` (host at `/host`). Change the port with `PORT=8080` in `.env`.
Compose runs Redis plus `serverless-redis-http`, which exposes the REST API the app expects, so no code changes are needed.
Put it behind your office reverse proxy or VPN, since `/host` has no login.
