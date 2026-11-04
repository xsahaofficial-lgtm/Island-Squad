# Payments

Everything is sold with Reddit Gold and everything is a consumable. The game itself is free and complete without any of it.

## Free, per game, no refill

| Item | Free uses |
| --- | --- |
| Shield | 2 |
| Repair | 1 |
| Airstrike | 1 |
| Frigate | 1 (it also costs 260 coins each time) |
| 2X Gold | 1, offered after waves 4, 10, 15 and 20 |

Players start each game with 240 coins.

## What can be bought

| Product | What you get | Price | Most per game |
| --- | --- | --- | --- |
| `pu_shield` | +1 Shield | 25 Gold | 1 |
| `pu_repair` | +1 Repair | 25 Gold | 1 |
| `pu_airstrike` | +1 Airstrike | 25 Gold | 2 |
| `pu_frigate` | +1 Frigate | 25 Gold | 3 |
| `pu_doubler` | +1 use of 2X Gold | 25 Gold | 2 |
| `pu_revive` | Continue once after the castle falls | 50 Gold | 1 |
| `coins_200` | 200 coins (the small + next to the gold counter) | 25 Gold | 2 (400 coins) |
| `fill_5`, `fill_25`, `fill_50`, `fill_100` | Coins to cover what a purchase is missing, at 0.0625 Gold per coin | 5, 25, 50, 100 Gold (80, 400, 800, 1,600 coins) | no separate limit |

The per-game limits are checked on the server as well as in the game. A player can also hold at most 3 unused bought uses of any one item, and unused ones (a saved Continue too) carry over to the next game. If a Continue is already saved, the popup offers it for free.

2X Gold appears only after waves 4, 10, 15 and 20. The first use is free, then it costs 25 Gold, up to twice. Once both paid ones are bought and used the button never shows again. The button reads "2X GOLD" while a free or saved use is available and "2X GOLD · 25" when the next one has to be bought.

## What the power-up buttons look like

| State | Look | Meaning |
| --- | --- | --- |
| Ready | bright, cyan outline | usable right now |
| Needs coins | amber outline, dimmed icon, "Need $260", tag "x1 FREE" | the player still has a free use and only lacks the coins |
| Buy | gold outline, tag "BUY 25" | no uses left, one can be bought |
| Used up | grey, tag "USED UP" | no uses left and the buy limit for this game is reached |
| Disabled | dim | on cooldown, or not usable now (Airstrike with no enemies, for example) |

## Pricing the missing coins

When a purchase needs coins the player doesn't have (the Frigate needs 260), the popup works it out at 0.0625 Gold per coin. For a player with 0 coins and no Frigate uses left it looks like this:

```
Missing 260 coins    x 0.0625 = 16 Gold
400 coins (Reddit price tier)    25 Gold
140 spare coins stay yours
+1 Frigate use    25 Gold
TOTAL 50 Reddit Gold (2 checkouts)
```

Reddit only allows a fixed list of prices (5, 25, 50, 100, 150 and so on), so 16 Gold can't be charged. The game sells the smallest tier that covers the shortfall and the player keeps whatever is left over. This is `planCoinFill` in `src/shared/products.ts`, and a test checks that the coins delivered always cover the shortfall.

## Where things are

- `src/shared/products.ts` has the catalog, the prices, the per-game limits and the coin pricing. Change numbers here.
- `src/products.json` is the same catalog in the format Reddit reads. A test fails if the two disagree or if a price or type isn't allowed by Reddit's schema.
- `devvit.json` has a `payments` block pointing at that file and at the two webhooks.
- `src/server/routes/payments.ts` has the fulfill and refund webhooks.
- `src/server/core/inventory.ts` stores what players own and enforces the limits.
- `src/client/platform.ts` and `src/client/game/purchaseDialog.js` run the checkout and the popup.
- `src/client/game/GameScene.js` has the Continue flow and the 2X Gold schedule. `src/client/game/config.js` has the free uses, the starting coins and the wave list for 2X Gold.

## How a purchase goes

1. The player taps a power-up with no uses left, the + coin button, the paid 2X Gold button, or the castle falls. The popup lists what they're paying for.
2. Pay runs the checkouts one at a time. Coins are paid first and the item second, so nothing is lost if the second one is cancelled. The game is paused the whole time.
3. Reddit calls the fulfill webhook for each paid order. The server checks the order is paid, checks every product against the catalog, applies the limits (the order carries the id of the game it was bought in, and that game has to belong to the buyer), and applies the order exactly once.
4. The game never takes the checkout result at its word. It asks the server until the delivery shows up, and only then adds the coins or uses the item.
5. Bought coins wait in a server-side bank and are handed out once. If someone pays and closes the game right away, the coins show up at the start of their next game.
6. On a refund Reddit calls the refund webhook and the server takes back what that order delivered, never going below zero.

## Turning the shop off

`shop: { enabled: false }` at the top of `GAMECFG` in `src/client/game/config.js` switches every purchase off. The + button is hidden, a falling castle goes straight to the game over screen, power-ups that run out say "USED UP", and 2X Gold is only offered for the free use. Use it if you want to publish before payments are approved.

## Things to watch

- The SDK marks all payment functions as experimental. Test every purchase in Reddit's sandbox before each release.
- Reddit's webhook doesn't say who the buyer is. The game attaches the buyer's id to the order, and the server falls back to the user on the request. If it knows neither, it refuses to deliver. Check in the sandbox that deliveries land on the right account.
- Inventories are per community, because Devvit storage belongs to the install.
- Bought extras, coins and Continue can raise a score, so purchases can affect the leaderboard. Decide whether you're fine with that.
- Players who aren't logged in can't buy, so they never see the Continue offer.
- You can't sell anything until your account is eligible and the app and products are approved. Terms and privacy drafts are in `docs/TERMS.md` and `docs/PRIVACY.md`.
