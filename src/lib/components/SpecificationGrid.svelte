<script lang="ts">
	import type { Specification } from '$lib/types.js';

	let { specs } = $props<{ specs: Specification[] }>();

	// Sort specs by sortIndex
	const sortedSpecs = $derived([...specs].sort((a, b) => a.sortIndex - b.sortIndex));
</script>

<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
	{#each sortedSpecs as spec (spec.id)}
		<div
			class="flex flex-col justify-between rounded-xl border-l-4 p-4 transition duration-200"
			style="background: var(--map-zone); border-left-color: var(--line-color);"
		>
			<span
				class="font-mono text-[10px] tracking-wider uppercase"
				style="color: var(--map-ink-soft);"
			>
				{spec.key}
			</span>
			<div class="mt-2 flex items-baseline justify-between gap-2">
				<span
					class="min-w-0 font-mono text-sm font-semibold tracking-wide break-words"
					style="color: var(--map-ink);"
				>
					{spec.value}
				</span>
				{#if spec.unit}
					<span
						class="flex-shrink-0 font-mono text-xs font-normal lowercase tracking-wide"
						style="color: var(--map-ink-soft);"
					>
						{spec.unit}
					</span>
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="col-span-full py-8 text-center font-mono text-xs tracking-wider uppercase"
			style="color: var(--map-ink-soft);"
		>
			No specifications recorded for this locomotive class.
		</div>
	{/each}
</div>
