# Last Man Standing mobile app

This directory is reserved for the native iOS and Android app implementation. The existing Next.js app remains the source of truth for league rules, picks, results, player identity, and progression.

## Release goals

- Publish to Apple App Store and Google Play.
- Let organisers create new leagues in-app.
- Let players join with a league code or share link and enter their player name.
- Preserve the existing website and all active website leagues.
- Use the existing backend for game rules and automatic result/round processing.

## Important architecture constraint

The web app is a server-rendered Next.js application. It uses Server Actions, API routes, and HTTP-only cookies. It cannot be safely converted into a static export just to satisfy a native wrapper's local asset requirement.

Do not configure a production release with Capacitor's `server.url` pointed at the live website. The development server URL option is for live reload, not the production distribution strategy, and a thin remote website wrapper may fail app-store review.

## Safe implementation sequence

1. Provision an isolated staging environment (separate Render service and separate Supabase project/database, or an explicitly approved isolated test backend). Never test league creation, joining, recovery, or picks against live league data.
2. Decide and test the mobile session strategy for the current HTTP-only player cookies and Supabase PKCE authentication.
3. Implement app/universal links so league invites open the installed app and fall back to the website if it is not installed.
4. Add native app value beyond a WebView wrapper (for example native sharing and opt-in push notifications for round deadlines/results).
5. Add Capacitor/native projects only after the server and cookie strategy is validated.
6. Test create league, join league, rejoin/recovery, make a pick, hide current-round picks, previous-round history, Multi Chip, winner detection, and admin access on iOS and Android.
7. Review the full branch diff and release build. Do not merge or change Render production configuration without explicit approval.

## Current status

No native app has been generated yet. This directory is planning scaffolding only until an isolated staging backend and device-session approach are available.
