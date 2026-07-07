import { chromium } from 'playwright';

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

	const traceData = await page.evaluate(() => {
		const node = document.querySelector('.timeline-node');
		if (!node) return 'No node found';
		const path = [];
		let current = node;
		while (current) {
			const rect = current.getBoundingClientRect();
			path.push({
				tag: current.tagName,
				id: current.id,
				className: current.className,
				style: current.getAttribute('style'),
				rect: {
					x: rect.x,
					y: rect.y,
					width: rect.width,
					height: rect.height
				}
			});
			current = current.parentElement;
		}
		return path;
	});

	console.log('Parent Path Trace:', JSON.stringify(traceData, null, 2));

	await browser.close();
}

main().catch(console.error);
