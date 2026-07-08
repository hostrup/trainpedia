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
	let currentPage = $state(0);
	const pageSize = 25;

	function handleQueryInput(e: Event) {
		query = (e.currentTarget as HTMLInputElement).value;
		currentPage = 0;
	}

	function setStatusFilter(status: string | null) {
		statusFilter = status;
		currentPage = 0;
	}

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

	const paginated = $derived.by(() => {
		const start = currentPage * pageSize;
		return filtered.slice(start, start + pageSize);
	});

	const totalPages = $derived(Math.ceil(filtered.length / pageSize));

	const visiblePages = $derived.by(() => {
		const pages: (number | string)[] = [];
		for (let i = 0; i < totalPages; i++) {
			if (i === 0 || i === totalPages - 1 || Math.abs(i - currentPage) <= 1) {
				pages.push(i);
			} else if (pages[pages.length - 1] !== '...') {
				pages.push('...');
			}
		}
		return pages;
	});

	function toggleSort(key: typeof sortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = true;
		}
	}

	const statusCounts = $derived.by(() => {
		const counts: Record<string, number> = {};
		for (const loco of fleet) {
			counts[loco.status] = (counts[loco.status] || 0) + 1;
		}
		return counts;
	});

	const totalFleet = $derived(fleet.length);

	const statusColors: Record<string, string> = {
		IN_SERVICE: '#1b8a5a',
		STORED: '#d97706',
		PRESERVED: '#0078ff',
		SCRAPPED: '#6b7280',
		EXPORTED: '#8b5cf6',
		UNKNOWN: '#9ca3af'
	};
</script>

<div class="space-y-4">
	<!-- Stacked bar over the fleet table -->
	{#if fleet.length > 0}
		<div
			class="space-y-1.5 rounded-xl border p-4 bg-[var(--map-bg)]"
			style="border-color: var(--map-zone);"
		>
			<div class="text-[10px] font-semibold uppercase tracking-widest text-[var(--map-ink-soft)]">
				Fleet Status Stacked Summary
			</div>
			<div
				class="h-6 w-full flex rounded-lg overflow-hidden border border-[var(--map-zone)] bg-[var(--map-zone)]"
			>
				{#each Object.entries(statusCounts) as [status, count] (status)}
					{@const pct = (count / totalFleet) * 100}
					<button
						onclick={() => setStatusFilter(statusFilter === status ? null : status)}
						class="h-full transition-all hover:brightness-95 flex items-center justify-center text-[10px] font-bold text-white relative group"
						style="width: {pct}%; background: {statusColors[status] || '#9ca3af'};"
						title="{STATUS_LABELS[status] || status}: {count} ({pct.toFixed(1)}%)"
					>
						{#if pct > 8}
							<span class="truncate px-1 font-mono">{count}</span>
						{/if}
						<span
							class="absolute bottom-full mb-1 scale-0 transition-all rounded bg-gray-900 px-2 py-1 text-[10px] text-white group-hover:scale-100 whitespace-nowrap z-10"
						>
							{STATUS_LABELS[status] || status}: {count} ({pct.toFixed(0)}%)
						</span>
					</button>
				{/each}
			</div>
			<!-- Status Legend -->
			<div
				class="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[10px]"
				style="color: var(--map-ink-soft);"
			>
				{#each Object.entries(statusCounts) as [status, count] (status)}
					<button
						onclick={() => setStatusFilter(statusFilter === status ? null : status)}
						class="flex items-center gap-1.5 hover:underline"
						style={statusFilter === status ? 'font-weight: bold; color: var(--map-ink);' : ''}
					>
						<span
							class="h-2 w-2 rounded-full"
							style="background: {statusColors[status] || '#9ca3af'};"
						></span>
						<span>{STATUS_LABELS[status] || status} ({count})</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<div class="flex flex-wrap items-center gap-3">
		<input
			type="search"
			value={query}
			oninput={handleQueryInput}
			placeholder="Search number or name…"
			aria-label="Search the fleet"
			class="rounded-full border px-3.5 py-1.5 text-sm outline-none"
			style="background: var(--map-zone); border-color: var(--map-zone); color: var(--map-ink);"
		/>
		<div class="flex items-center gap-1.5">
			{#each QUICK_FILTERS as f (f.label)}
				<button
					onclick={() => setStatusFilter(f.status)}
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
				{#each paginated as loco (loco.currentNumber)}
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

	<!-- Pagination controls -->
	{#if totalPages > 1}
		<div class="flex justify-between items-center pt-2 text-xs" style="color: var(--map-ink-soft);">
			<span
				>Showing {currentPage * pageSize + 1} – {Math.min(
					(currentPage + 1) * pageSize,
					filtered.length
				)} of {filtered.length} entries</span
			>
			<div class="flex items-center gap-1">
				<button
					disabled={currentPage === 0}
					onclick={() => currentPage--}
					class="px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
					style="background: var(--map-zone); border-color: var(--map-zone); color: var(--map-ink);"
				>
					Prev
				</button>
				{#each visiblePages as p (p)}
					{#if p === '...'}
						<span class="px-1 text-xs">...</span>
					{:else}
						<button
							onclick={() => (currentPage = p as number)}
							class="h-6 w-6 rounded-md border text-center transition-colors text-[10px] font-bold"
							style={currentPage === p
								? 'background: var(--line-color); border-color: var(--line-color); color: white;'
								: 'background: var(--map-zone); border-color: var(--map-zone); color: var(--map-ink);'}
						>
							{(p as number) + 1}
						</button>
					{/if}
				{/each}
				<button
					disabled={currentPage === totalPages - 1}
					onclick={() => currentPage++}
					class="px-2.5 py-1 rounded-md border text-[11px] font-bold tracking-wider uppercase transition-colors disabled:opacity-50"
					style="background: var(--map-zone); border-color: var(--map-zone); color: var(--map-ink);"
				>
					Next
				</button>
			</div>
		</div>
	{/if}
</div>
