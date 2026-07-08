import { expect, test } from '@playwright/test';

test('Home page (Great Hall) loads without console errors', async ({ page }) => {
	const consoleErrors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			consoleErrors.push(msg.text());
			console.error(`Browser console error: ${msg.text()}`);
		}
	});

	page.on('pageerror', (err) => {
		consoleErrors.push(err.message);
		console.error(`Browser page error: ${err.stack || err.message}`);
	});

	await page.goto('/');
	await page.waitForLoadState('networkidle');
	await page.waitForTimeout(1000);

	// Assert no console errors
	expect(consoleErrors).toEqual([]);

	// Great Hall: hero heading
	const heading = page.locator('h1');
	await expect(heading).toContainText('Trainpedia');

	// Stat tiles present
	const statTiles = page.locator('text=Classes');
	expect(await statTiles.count()).toBeGreaterThan(0);

	// Featured exhibits section
	const featured = page.locator('text=Featured Exhibits');
	expect(await featured.count()).toBeGreaterThan(0);

	// Record Books section
	const records = page.locator('text=The Record Books');
	expect(await records.count()).toBeGreaterThan(0);

	// Search input present
	const searchInput = page.locator('input[aria-label="Search the collection"]');
	await expect(searchInput).toBeVisible();
});
