# Mobile acceptance test plan

Run only against an isolated staging backend and a dedicated test league.

## Onboarding
- [ ] Open app to home screen.
- [ ] Create a new league with a name and organiser/player name.
- [ ] Confirm the league code and share link are shown.
- [ ] Share the invite link to another device.
- [ ] Join via code and via link; verify the player can enter a name.
- [ ] Reopen a shared link with the app installed and without the app installed.

## Player identity and persistence
- [ ] App restart preserves the correct league/player identity.
- [ ] Switching between two leagues selects the correct player entry for each league.
- [ ] Recovery flow restores the intended player without changing another entry.
- [ ] Invalid recovery details fail safely.
- [ ] PKCE/password-reset flow works or is deliberately routed through a secure browser fallback.

## Game rules
- [ ] A valid pick saves once.
- [ ] Duplicate team selection is rejected.
- [ ] Draw/loss elimination and win progression follow the existing backend rules.
- [ ] Current live-round picks remain hidden from other players.
- [ ] Previous-round picks and statuses can be viewed.
- [ ] Multi Chip works once per season and either winning selection advances the player.
- [ ] Round processing and result sync remain server-driven.
- [ ] Winner detection and season reset behave as on the website.
- [ ] Season winner history remains visible.

## Security and release
- [ ] Admin pages/actions remain restricted.
- [ ] No service-role key or football-data API key is bundled into the app.
- [ ] No production league or player records are touched during testing.
- [ ] iOS and Android builds tested on physical devices.
- [ ] Accessibility, external links, back navigation, offline/error states, and app-store requirements reviewed.
