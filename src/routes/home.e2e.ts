import { expect, test } from '@playwright/test';

test('Home page loads without console errors and displays the tube map', async ({ page }) => {
	const consoleErrors: string[] = [];
	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			consoleErrors.push(msg.text());
			console.error(`Browser console error: ${msg.text()}`);
		} else {
			console.log(`Browser console ${msg.type()}: ${msg.text()}`);
		}
	});

	page.on('pageerror', (err) => {
		consoleErrors.push(err.message);
		console.error(`Browser page error: ${err.stack || err.message}`);
	});

	// Visit the home page
	await page.goto('/');

	// Wait for the page to load
	await page.waitForLoadState('networkidle');

	// Wait a bit for potential async rendering/hydration
	await page.waitForTimeout(2000);

	// Take a screenshot of the page and save it
	await page.screenshot({ path: 'playwright-screenshots/home-page.png', fullPage: true });

	// Assert that there are no console errors during page load and hydration
	expect(consoleErrors).toEqual([]);

	// Check if the tube map or main SVG is visible
	const svg = page.locator('svg.absolute.inset-0');
	await expect(svg).toBeVisible();

	// Check if we have visible stations (circles or text elements)
	const circles = page.locator('svg circle');
	expect(await circles.count()).toBeGreaterThan(0);
});
