import fs from 'node:fs';

const { PRODUCTS } = await import('../src/shared/products.ts');
const products = Object.values(PRODUCTS).map(({ sku, displayName, description, price, accountingType }) => ({
  sku,
  displayName,
  description,
  price,
  accountingType,
}));
const file = new URL('../src/products.json', import.meta.url);
fs.writeFileSync(file, JSON.stringify({ $schema: 'https://developers.reddit.com/schema/products.json', products }, null, 2) + '\n');
console.log(`Wrote ${products.length} products to src/products.json`);
