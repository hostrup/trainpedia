<script lang="ts">
	import type { Specification } from '$lib/types.js';

	let { specs } = $props<{ specs: Specification[] }>();

	// Sort specs by sortIndex
	const sortedSpecs = $derived([...specs].sort((a, b) => a.sortIndex - b.sortIndex));
</script>

<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
	{#each sortedSpecs as spec (spec.id)}
		<div
			class="bg-zinc-900/40 border border-white/5 hover:border-white/10 hover:bg-zinc-900/60 p-4 rounded-xl flex flex-col justify-between transition duration-200"
		>
			<span class="text-[10px] font-mono tracking-wider text-zinc-500 uppercase">
				{spec.key}
			</span>
			<div class="flex items-baseline justify-between mt-2 gap-2">
				<span class="text-sm font-semibold text-zinc-100 font-mono tracking-wide break-all">
					{spec.value}
				</span>
				{#if spec.unit}
					<span class="text-xs font-mono text-zinc-400 font-normal lowercase tracking-wide">
						{spec.unit}
					</span>
				{/if}
			</div>
		</div>
	{:else}
		<div
			class="col-span-full py-8 text-center text-zinc-500 text-xs font-mono uppercase tracking-wider"
		>
			No specifications recorded for this locomotive class.
		</div>
	{/each}
</div>
