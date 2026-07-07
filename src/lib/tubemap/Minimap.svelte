<script lang="ts">
	import type { LayoutPath } from './layout.js';
	import { lineColorVar } from './colors.js';

	let {
		width,
		height,
		paths,
		viewport,
		onNavigate
	}: {
		width: number;
		height: number;
		paths: LayoutPath[];
		viewport: { x: number; y: number; w: number; h: number };
		onNavigate: (layoutX: number, layoutY: number) => void;
	} = $props();

	const MINIMAP_W = 180;
	const MINIMAP_H = 120;
	const scale = $derived(Math.min(MINIMAP_W / Math.max(width, 1), MINIMAP_H / Math.max(height, 1)));

	function handleClick(e: MouseEvent) {
		const target = e.currentTarget as SVGSVGElement;
		const rect = target.getBoundingClientRect();
		const localX = e.clientX - rect.left;
		const localY = e.clientY - rect.top;
		onNavigate(localX / scale, localY / scale);
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onNavigate(width / 2, height / 2);
		}
	}
</script>

<svg
	width={MINIMAP_W}
	height={MINIMAP_H}
	viewBox="0 0 {MINIMAP_W} {MINIMAP_H}"
	class="cursor-pointer rounded"
	style="background: var(--map-zone); border: 1px solid var(--map-ink-soft);"
	onclick={handleClick}
	onkeydown={handleKeydown}
	role="button"
	tabindex="0"
	aria-label="Minikort — klik for at navigere til et område af kortet"
>
	<g transform="scale({scale})">
		{#each paths as path (path.traction)}
			<line
				x1={path.x0}
				y1={path.y}
				x2={path.x1}
				y2={path.y}
				stroke={lineColorVar(path.traction)}
				stroke-width={3 / scale}
			/>
		{/each}
		<rect
			x={viewport.x}
			y={viewport.y}
			width={Math.max(0, viewport.w)}
			height={Math.max(0, viewport.h)}
			fill="none"
			stroke="var(--tfl-blue)"
			stroke-width={2 / scale}
		/>
	</g>
</svg>
