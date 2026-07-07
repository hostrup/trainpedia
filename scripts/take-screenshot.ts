import { chromium } from 'playwright';
import path from 'path';

async function main() {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		ignoreHTTPSErrors: true
	});
	const page = await context.newPage();
	await page.setViewportSize({ width: 1280, height: 720 });

	console.log('Navigating to https://tog.hostrup.org...');
	await page.goto('https://tog.hostrup.org/', { waitUntil: 'networkidle' });

	await page.waitForTimeout(3000);

	// Inspect DOM elements
	const nodesData = await page.evaluate(() => {
		const elts = Array.from(document.querySelectorAll('.timeline-node'));
		return elts.map((el) => {
			const rect = el.getBoundingClientRect();
			return {
				tag: el.tagName,
				text: el.textContent?.trim(),
				style: el.getAttribute('style'),
				className: el.getAttribute('class'),
				rect: {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height
				}
			};
		});
	});
	console.log('Nodes in DOM:', JSON.stringify(nodesData, null, 2));

	const screenshotPath = path.resolve('static/screenshot-test.png');
	await page.screenshot({ path: screenshotPath });
	await browser.close();
}

main().catch(console.error);
