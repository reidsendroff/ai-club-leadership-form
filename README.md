# AI Club Leadership Form

Standalone leadership application web app for the Northern Highlands AI Club.

It collects:
- applicant identity
- role interests and ranking
- best project submission
- tools used
- grit and presentation evidence
- June 15 demo availability
- leadership commitments
- resume upload

Submissions are stored in Postgres. Resume files are stored in Postgres as binary data so Railway's ephemeral filesystem is not a problem.

## Local Setup

```bash
npm install
cp .env.example .env
docker compose up -d
npm run init-db
npm run dev
```

Open:

```text
http://localhost:3000
```

## Railway Setup

1. Create a new Railway project.
2. Add a Postgres database.
3. Deploy this GitHub repo.
4. Set environment variables:
   - `DATABASE_URL`, Railway usually injects this from Postgres
   - `ADMIN_TOKEN`, choose a long random password
   - `MAX_RESUME_MB`, optional, defaults to 8
5. Run the database init command once:

```bash
npm run init-db
```

## Admin Links

Replace `YOUR_TOKEN` with `ADMIN_TOKEN`.

```text
/admin.html
/api/applications?token=YOUR_TOKEN
/api/export.csv?token=YOUR_TOKEN
/api/applications/:id/resume?token=YOUR_TOKEN
```

## Google Forms Backup

If school policy requires a native Google Form, use:

```text
google_forms/AI_Club_Leadership_Form_Generator.js
```

Paste it into Apps Script and run `createAIClubLeadershipApplication`.

