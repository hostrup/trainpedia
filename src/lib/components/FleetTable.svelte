<script lang="ts">
	import { resolve } from '$app/paths';

	interface FleetRow {
		currentNumber: string;
		currentName: string | null;
		status: string;
		location: string | null;
	}

	let { fleet }: { fleet: FleetRow[] } = $props();

	const STATUS_LABELS: Record<string, string> = {
		IN_SERVICE: 'In service',
		STORED: 'Stored',
		PRESERVED: 'Preserved',
		SCRAPPED: 'Scrapped',
		EXPORTED: 'Exported',
		UNKNOWN: 'Unknown'
	};

	const QUICK_FILTERS: { label: string; status: string | null }[] = [
		{ label: 'All', status: null },
		{ label: 'Preserved', status: 'PRESERVED' },
		{ label: 'In service', status: 'IN_SERVICE' }
	];

	let query = $state('');
	let statusFilter = $state<string | null>(null);
	let sortKey = $state<'currentNumber' | 'status'>('currentNumber');
	let sortAsc = $state(true);

	const filtered = $derived.by(() => {
		let rows = fleet;
		if (statusFilter) rows = rows.filter((r) => r.status === statusFilter);
		const q = query.trim().toLowerCase();
		if (q) {
			rows = rows.filter(
				(r) =>
					r.currentNumber.toLowerCase().includes(q) ||
					(r.currentName?.toLowerCase().includes(q) ?? false)
			);
		}
		const sorted = [...rows].sort((a, b) => {
			const av = a[sortKey] ?? '';
			const bv = b[sortKey] ?? '';
			return av < bv ? -1 : av > bv ? 1 : 0;
		});
		return sortAsc ? sorted : sorted.reverse();
	});

	function toggleSort(key: typeof sortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = true;
		}
	}
</script>

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-3">
		<input
			type="search"
			bind:value={query}
			placeholder="Search number or name…"
			aria-label="Search the fleet"
			class="rounded-full border px-3.5 py-1.5 text-sm outline-none"
			style="background: var(--map-zone); border-color: var(--map-zone); color: var(--map-ink);"
		/>
		<div class="flex items-center gap-1.5">
			{#each QUICK_FILTERS as f (f.label)}
				<button
					onclick={() => (statusFilter = f.status)}
					class="rounded-full border px-3 py-1 text-xs transition-colors"
					style={statusFilter === f.status
						? 'background: var(--line-color); border-color: var(--line-color); color: white; font-weight: 600;'
						: 'border-color: var(--map-zone); color: var(--map-ink-soft);'}
				>
					{f.label}
				</button>
			{/each}
		</div>
		<span class="text-xs" style="color: var(--map-ink-soft);"
			>{filtered.length} of {fleet.length}</span
		>
	</div>

	<div class="overflow-x-auto rounded-xl border" style="border-color: var(--map-zone);">
		<table class="w-full text-left text-sm">
			<thead>
				<tr style="background: var(--map-zone);">
					<th class="px-4 py-2">
						<button
							onclick={() => toggleSort('currentNumber')}
							class="text-[11px] font-bold tracking-widest uppercase"
							style="color: var(--map-ink-soft);"
						>
							Number{sortKey === 'currentNumber' ? (sortAsc ? ' ▲' : ' ▼') : ''}
						</button>
					</th>
					<th
						class="px-4 py-2 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);">Name</th
					>
					<th class="px-4 py-2">
						<button
							onclick={() => toggleSort('status')}
							class="text-[11px] font-bold tracking-widest uppercase"
							style="color: var(--map-ink-soft);"
						>
							Status{sortKey === 'status' ? (sortAsc ? ' ▲' : ' ▼') : ''}
						</button>
					</th>
					<th
						class="px-4 py-2 text-[11px] font-bold tracking-widest uppercase"
						style="color: var(--map-ink-soft);">Location</th
					>
				</tr>
			</thead>
			<tbody>
				{#each filtered as loco (loco.currentNumber)}
					<tr class="border-t" style="border-color: var(--map-zone);">
						<td class="px-4 py-2 font-mono tabular-nums" style="color: var(--map-ink);">
							<a
								href={resolve('/loco/[number]', { number: loco.currentNumber })}
								class="hover:underline"
								style="color: var(--line-color);">{loco.currentNumber}</a
							>
						</td>
						<td class="px-4 py-2" style="color: var(--map-ink);"
							>{loco.currentName ? `“${loco.currentName}”` : '—'}</td
						>
						<td class="px-4 py-2">
							<span
								class="rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase"
								style="background: color-mix(in srgb, var(--line-color) 12%, white); color: var(--line-color);"
							>
								{STATUS_LABELS[loco.status] ?? loco.status}
							</span>
						</td>
						<td class="px-4 py-2" style="color: var(--map-ink-soft);">{loco.location ?? '—'}</td>
					</tr>
				{:else}
					<tr>
						<td
							colspan="4"
							class="px-4 py-8 text-center text-xs uppercase"
							style="color: var(--map-ink-soft);">No individuals match your search</td
						>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
