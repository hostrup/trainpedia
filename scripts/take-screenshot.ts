import { chromium } from 'playwright';
import path from 'path';

async function main() {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		ignoreHTTPSErrors: true
	});
	const page = await context.newPage();
	await page.setViewportSize({ width: 1280, height: 720 });

	const pageErrors: { message: string; stack?: string }[] = [];
	const consoleMessages: { type: string; text: string }[] = [];

	page.on('pageerror', (err) => {
		pageErrors.push({ message: err.message, stack: err.stack });
	});

	page.on('console', (msg) => {
		consoleMessages.push({ type: msg.type(), text: msg.text() });
	});

	console.log('Navigating to https://tog.hostrup.org...');
	await page.goto('https://tog.hostrup.org/', { waitUntil: 'networkidle' });
	await page.waitForTimeout(3000);

	// 1. Check for visible station nodes
	const nodesCount = await page.evaluate(() => document.querySelectorAll('.timeline-node').length);
	console.log(`Found ${nodesCount} station nodes in DOM.`);

	if (nodesCount > 0) {
		// 2. Click the first station node
		console.log('Clicking the first station node...');
		// Select the actual button representing the station node circle
		await page.click('.timeline-node button');
		await page.waitForTimeout(2000);

		// Check if Museum Placard drawer is visible
		const placardText = await page.evaluate(() => {
			const heading = document.querySelector('h2.font-display');
			return heading ? heading.textContent : 'Placard heading not found';
		});
		console.log(`Museum Placard Heading: "${placardText}"`);

		// Take screenshot of the open Placard
		const placardScreenshotPath = path.resolve('static/screenshot-placard.png');
		await page.screenshot({ path: placardScreenshotPath });
		console.log(`Placard screenshot saved to ${placardScreenshotPath}`);

		// 3. Click the Showcase Detail Gallery button
		const hasShowcaseBtn = await page.evaluate(() => {
			const buttons = Array.from(document.querySelectorAll('button'));
			return buttons.some((b) => b.textContent?.includes('Showcase Detail Gallery'));
		});
		console.log('Has Showcase Button in Placard:', hasShowcaseBtn);

		if (hasShowcaseBtn) {
			console.log('Clicking the Showcase Detail Gallery button...');
			await page.click('button:has-text("Showcase Detail Gallery")');
			await page.waitForTimeout(2000);

			const galleryText = await page.evaluate(() => {
				const title = document.querySelector('h1.font-display');
				return title ? title.textContent : 'Gallery title not found';
			});
			console.log(`Showcase Gallery Title: "${galleryText}"`);

			// Take screenshot of the open Showcase Gallery
			const galleryScreenshotPath = path.resolve('static/screenshot-gallery.png');
			await page.screenshot({ path: galleryScreenshotPath });
			console.log(`Gallery screenshot saved to ${galleryScreenshotPath}`);
		}
	}

	console.log('Client-side page errors:', JSON.stringify(pageErrors, null, 2));
	console.log('Client-side console logs:', JSON.stringify(consoleMessages, null, 2));

	await browser.close();
}

main().catch(console.error);
