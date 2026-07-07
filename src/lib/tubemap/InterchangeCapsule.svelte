<script lang="ts">
	import type { LayoutInterchange } from './layout.js';
	import { GEOMETRY } from './layout.js';

	let {
		interchange,
		name,
		labelSide = 'above',
		isSelected = false,
		onSelect
	}: {
		interchange: LayoutInterchange;
		name: string;
		labelSide?: 'above' | 'below';
		isSelected?: boolean;
		onSelect: () => void;
	} = $props();

	const top = $derived(Math.min(interchange.yA, interchange.yB));
	const bottom = $derived(Math.max(interchange.yA, interchange.yB));
	// Kapslens bredde matcher landmark-ringens diameter, så ikonografien er visuelt ensartet.
	const capsuleWidth = GEOMETRY.landmarkRingRadius * 2 + 4;
	const labelY = $derived(
		labelSide === 'above' ? top - capsuleWidth / 2 - 8 : bottom + capsuleWidth / 2 + 18
	);

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelect();
		}
	}
</script>

<rect
	x={interchange.x - capsuleWidth / 2}
	y={top - capsuleWidth / 2}
	width={capsuleWidth}
	height={bottom - top + capsuleWidth}
	rx={capsuleWidth / 2}
	fill="var(--map-bg)"
	stroke="var(--map-ink)"
	stroke-width={GEOMETRY.interchangeCapsuleStroke}
/>

<circle
	cx={interchange.x}
	cy={(top + bottom) / 2}
	r="16"
	fill="transparent"
	class="cursor-pointer"
	role="button"
	tabindex="0"
	aria-label={name}
	onclick={onSelect}
	onkeydown={handleKeydown}
/>

<text
	x={interchange.x}
	y={labelY}
	text-anchor="middle"
	class="pointer-events-none select-none"
	style="font-family: var(--font-map); font-size: 13px; fill: {isSelected
		? 'var(--tfl-blue)'
		: 'var(--map-ink)'}; font-weight: {isSelected ? 700 : 500};"
>
	{name}
</text>
