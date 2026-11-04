# Deploying Island Squad

Most of this needs your own Reddit account or a real phone, so the code can't do it for you.

## 1. Set up

You need Node 24 or newer (`node --version`). In a Windows command prompt, run these one at a time. The proxy lines are only for a local proxy, so skip them if you don't use one.

```bat
set HTTP_PROXY=http://127.0.0.1:10808
set HTTPS_PROXY=http://127.0.0.1:10808
set ALL_PROXY=http://127.0.0.1:10808
set NODE_USE_ENV_PROXY=1
npm config set proxy http://127.0.0.1:10808
npm config set https-proxy http://127.0.0.1:10808

npm install
npx devvit login --copy-paste
npx devvit upload --copy-paste
npm run dev
npm run build
npm run type-check
npm run test:unit
npm run launch
```

The `npx devvit upload --copy-paste` line in that list is the one-time step that creates your app on Reddit. `npm run dev` can't work until it has run once, and you can skip it on later runs. It prints a link. Open it, pick the app name in the web page (`island-brawlers` is what's in `devvit.json`, it has to be lowercase and at most 20 characters, and it can't be changed later; if it's taken, choose another and the tool writes it into `devvit.json` for you) and paste only the code the page shows. The upload then creates the app and a small test community and installs the app there.

### If something goes wrong

| What you see | What it means | What to do |
| --- | --- | --- |
| `HTTP error 400: Bad Request` at "Paste the code" | something other than the code was pasted | run `npx devvit login --copy-paste` again and paste only the code |
| `npm run dev` says "Your app doesn't exist yet... run 'npx devvit init'" | the app isn't on Reddit yet | run `npx devvit upload --copy-paste`, not `init` |
| `npx devvit init` says "Your app was already initialized" | it only looks at the name in your local `devvit.json` | ignore it and don't use `--force` |
| `Failed to watch for first build: EPERM` on Windows | usually a file watcher permission problem (antivirus, synced or protected folder). Playtest still runs | if edits don't rebuild by themselves, run `npm run build` after changing code |
| `npm warn install-scripts` for esbuild and protobufjs | npm warning about install scripts it didn't run | fine as long as `npm run build` works |
| `upload` complains about payments | your account may not be eligible for payments yet | take the `payments` block out of `devvit.json` and turn the shop off (see section 5) |

## 2. Playtest on Reddit

Use a small test community and turn off its reputation filter, then run `npm run dev` and open the playtest link. Go through these:

- The post shows your name, your best score and today's top three. Play opens the game.
- Finish a game. The score saves, your rank shows up and the leaderboards list it (Today and All-time). Play again straight away works.
- Share opens the share sheet. In a private window the game still plays and offers a login.
- Mod menu: create a post, remove a player, reset leaderboards (on the test community only).
- On a real phone, upright and sideways, in the Reddit app. Check the frame rate, that turrets land where you tap, and that nothing scrolls.
- Desktop in Chrome and in Safari or Firefox.

## 3. Before you submit

- `npm run type-check`, `npm run test:unit` and `npm run build` all pass.
- Read Reddit's current Devvit rules and launch guide again, because they change.
- Share the playtest link in the Reddit developers Discord and in r/Devvit. For games, also r/GamesOnReddit.

## 4. Submit

- `npm run launch` runs the checks, uploads, then publishes. Add `--public` to `devvit publish` if you want it in the public directory.
- Every update needs another review, so batch your changes.
- Being featured is a curated decision. A good first screen, a quick load and smooth play on phones help.

## 5. Payments

Only if you keep the shop. Read `docs/PAYMENTS.md` first, since the payment functions are experimental.

If payments aren't approved yet, publish with the shop off: in `src/client/game/config.js` set `shop: { enabled: false }`, and remove the shop paragraph from `README.md`. The + button, the Continue offer and every Buy button disappear, free uses still work, and 2X Gold only shows up for the free use. Switch it back on once Reddit approves your products.

- Your account is eligible and verified for payments.
- Try every kind of purchase in the sandbox: a power-up use up to its limit, 2X Gold twice (the third is refused), the coin pack twice (the third is refused), a Frigate with 0 coins (two checkouts), the Continue (a second one in the same game is refused), a cancelled second checkout, a repeated callback, a refund, and a relaunch (extras and a saved Continue stay, coins arrive once).
- Deliveries reach the account that paid.
- `docs/TERMS.md` and `docs/PRIVACY.md` are reviewed and linked from the app listing.
- The app and all 11 products are approved.
- You've decided whether bought extras, coins and Continue should count on the shared leaderboard.
