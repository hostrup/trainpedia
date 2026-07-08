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

test('Browse page lenses flow', async ({ page }) => {
	// Go to browse
	await page.goto('/browse');
	await page.waitForLoadState('networkidle');

	// Switch to Table lens
	await page.click('button:has-text("Table")');
	await page.waitForTimeout(300);
	const tableHeader = page.locator('th');
	expect(await tableHeader.count()).toBeGreaterThan(0);

	// Switch to Timeline lens
	await page.click('button:has-text("Timeline")');
	await page.waitForTimeout(300);
	const timelineSvg = page.locator('svg');
	expect(await timelineSvg.count()).toBeGreaterThan(0);

	// Switch to Chart lens
	await page.click('button:has-text("Chart")');
	await page.waitForTimeout(300);
	const chartControls = page.locator('text=X-Axis');
	expect(await chartControls.count()).toBeGreaterThan(0);
});

test('Records and Survivors pages load', async ({ page }) => {
	// Go to records
	await page.goto('/records');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('h1')).toContainText('The Record Books');

	// Go to survivors
	await page.goto('/survivors');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('h1')).toContainText('Preserved Survivors');
});

test('The Workshop compare flow', async ({ page }) => {
	await page.goto('/compare');
	await page.waitForLoadState('networkidle');
	await expect(page.locator('h1')).toContainText('The Workshop');

	const selector = page.locator('#class-add-select');
	await expect(selector).toBeVisible();
});

test('Era Room Card and filtering on browse page', async ({ page }) => {
	await page.goto('/browse?era=big-four');
	await page.waitForLoadState('networkidle');

	const eraCard = page.locator('.era-room-card.full');
	await expect(eraCard).toBeVisible();
	await expect(eraCard.locator('h2')).toContainText('The Big Four');
	await expect(eraCard.locator('text=Wikipedia')).toBeVisible();
	await expect(eraCard.locator('text=oldid')).toBeVisible();

	const readMoreBtn = eraCard.locator('button:has-text("Read more")');
	if (await readMoreBtn.isVisible()) {
		await readMoreBtn.click();
		await expect(eraCard.locator('button:has-text("Read less")')).toBeVisible();
	}
});

test('Quick-view to full chronicle flow', async ({ page }) => {
	await page.goto('/browse');
	await page.waitForLoadState('networkidle');

	const classCard = page.locator('a.timeline-row, a.group').first();
	await classCard.click();

	const fullChronicleLink = page.locator('a:has-text("Open full chronicle")');
	await expect(fullChronicleLink).toBeVisible();
	await expect(page.locator('text=Source: Wikipedia')).toBeVisible();

	await Promise.all([page.waitForURL('**/class/Q*'), fullChronicleLink.click()]);

	expect(page.url()).toContain('/class/Q');
	await expect(page.locator('h1')).toBeVisible();
	await expect(page.locator('text=Source: Wikipedia')).toBeVisible();
});

test('Typeahead search click flow', async ({ page }) => {
	await page.goto('/');
	await page.waitForLoadState('networkidle');

	const searchInput = page.locator('input[aria-label="Search locomotive classes"]');
	await searchInput.focus();
	await searchInput.pressSequentially('Class 37', { delay: 60 });
	await page.waitForTimeout(1000);

	const dropdown = page.locator('.search-container div').first();
	await expect(dropdown).toBeVisible();

	const firstResult = dropdown.locator('a').first();
	await Promise.all([page.waitForURL('**/class/Q*'), firstResult.click()]);

	await expect(page.url()).toContain('/class/Q');
});

test('Locomotive details page loads with provenance', async ({ page }) => {
	await page.goto('/loco/D6700');
	await page.waitForLoadState('networkidle');

	await expect(page.locator('h1')).toBeVisible();
	await expect(page.locator('text=Preserved').first()).toBeVisible();
	await expect(page.locator('text=Source: Wikipedia')).toBeVisible();
});
