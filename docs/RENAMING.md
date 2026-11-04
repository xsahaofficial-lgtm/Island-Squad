# Renaming the game

The name players see lives in one place, `src/shared/brand.ts`. One command changes it everywhere that matters:

```bat
npm run rename -- "Your New Name"
npm run build
npm run launch
```

It updates the title screen, the feed splash, the page titles, the pause menu, the post title, the share text, the checkout product names and descriptions (`src/products.json` is regenerated), the mod menu labels in `devvit.json`, the README, the docs and the license line. Add `--dry` to see what it would touch without changing anything.

Names are 3 to 30 characters: letters, numbers, spaces and `' & . ! -`. Long names shrink to fit on the title screen, and names with three or more words are split over two lines automatically.

## The Reddit app name is different

The `name` in `devvit.json` (for example `island-brawlers`) is the app's Reddit account and URL slug. Reddit fixes it when the app is created and there is no way to change it afterwards, so the command leaves it alone and players never see it in the game. If you haven't run `npx devvit upload` yet, you can still pick a different one:

```bat
npm run rename -- "Your New Name" --slug your-app-name
```

The slug is lowercase letters, numbers and hyphens, starting with a letter, up to 20 characters.

After renaming, run `npm run launch` so Reddit gets the new post title, product names and README. Posts that already exist keep the title they were created with.
