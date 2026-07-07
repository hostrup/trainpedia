import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';

async function main() {
	const browser = await chromium.launch();
	const context = await browser.newContext({
		ignoreHTTPSErrors: true
	});
	const page = await context.newPage();
	await page.setViewportSize({ width: 1280, height: 720 });

	console.log('Navigating to https://tog.hostrup.org...');
	await page.goto('https://tog.hostrup.org/', { waitUntil: 'networkidle' });
	await page.waitForTimeout(5000); // 5 seconds wait to be absolutely sure GSAP is ready

	const screenshotPath = path.resolve('static/screenshot-real.png');
	if (fs.existsSync(screenshotPath)) {
		fs.unlinkSync(screenshotPath);
	}

	console.log(`Taking screenshot and saving to ${screenshotPath}...`);
	await page.screenshot({ path: screenshotPath });

	console.log(`Saved screenshot successfully. File exists: ${fs.existsSync(screenshotPath)}`);
	await browser.close();
}

main().catch(console.error);
