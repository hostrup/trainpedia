import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import fs from 'fs';
import path from 'path';

export const GET: RequestHandler = async ({ params }) => {
	const mediaRoot = process.env.MEDIA_ROOT || 'data/media';
	const fileParam = params.file;
	if (!fileParam) {
		throw error(400, 'File parameter is required');
	}

	const filePath = path.resolve(mediaRoot, fileParam);
	const resolvedMediaRoot = path.resolve(mediaRoot);

	if (!filePath.startsWith(resolvedMediaRoot)) {
		throw error(403, 'Forbidden');
	}

	if (!fs.existsSync(filePath)) {
		throw error(404, 'Not found');
	}

	const fileBuffer = fs.readFileSync(filePath);
	const ext = path.extname(filePath).toLowerCase();
	let contentType = 'application/octet-stream';

	if (ext === '.webp') contentType = 'image/webp';
	else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
	else if (ext === '.png') contentType = 'image/png';
	else if (ext === '.svg') contentType = 'image/svg+xml';

	return new Response(fileBuffer, {
		headers: {
			'Content-Type': contentType,
			'Cache-Control': 'public, max-age=31536000, immutable'
		}
	});
};
