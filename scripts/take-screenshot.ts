import { chromium } from 'playwright';

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

	console.log('Client-side page errors:', JSON.stringify(pageErrors, null, 2));
	console.log('Client-side console logs:', JSON.stringify(consoleMessages, null, 2));

	await browser.close();
}

main().catch(console.error);
