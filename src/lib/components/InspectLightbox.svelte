<script lang="ts">
	import type { MediaAsset } from '$lib/types.js';

	let { media, onClose } = $props<{
		media: MediaAsset;
		onClose: () => void;
	}>();

	$effect(() => {
		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') onClose();
		};
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div
	class="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col justify-between p-6 overflow-y-auto"
	role="dialog"
	aria-modal="true"
>
	<!-- Top Bar -->
	<div class="flex justify-between items-center w-full max-w-7xl mx-auto flex-shrink-0">
		<div class="flex flex-col">
			<h3 class="text-sm font-bold text-zinc-100 font-mono tracking-wider uppercase">
				Cinematic Media Inspector
			</h3>
			{#if media.title}
				<span class="text-xs text-zinc-400 mt-1 max-w-xl truncate">{media.title}</span>
			{/if}
		</div>
		<button
			onclick={onClose}
			class="w-10 h-10 rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-black flex items-center justify-center text-white transition-all cursor-pointer font-semibold"
			aria-label="Close lightbox"
		>
			✕
		</button>
	</div>

	<!-- Image Showcase Area -->
	<div class="flex-1 flex items-center justify-center max-w-7xl mx-auto py-8 w-full min-h-[50vh]">
		<div
			class="relative max-h-full max-w-full group shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden border border-white/10"
		>
			<img
				src="/{media.localPath}"
				alt={media.title || 'Locomotive Class Asset'}
				class="max-h-[70vh] max-w-full object-contain"
			/>
		</div>
	</div>

	<!-- Bottom Metadata Bar -->
	<div
		class="w-full max-w-4xl mx-auto flex-shrink-0 bg-zinc-950/60 border border-white/5 backdrop-blur rounded-2xl p-6 space-y-4"
	>
		<!-- Anecdote & Historical context -->
		{#if media.anecdote}
			<div class="space-y-1">
				<span class="text-[9px] font-mono tracking-widest text-amber-400 uppercase"
					>Historical Context</span
				>
				<p class="text-sm text-zinc-200 leading-relaxed font-serif">
					{media.anecdote}
				</p>
			</div>
		{/if}

		<div class="h-px bg-white/5 my-2"></div>

		<!-- Photographic Metadata -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">Attribution</span>
				<span class="text-zinc-300 font-semibold mt-1 truncate">
					{media.attribution || 'Unknown Photographer'}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">License</span>
				<span class="text-zinc-300 font-semibold mt-1">
					{media.license}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">Year Taken</span>
				<span class="text-zinc-300 font-semibold mt-1 tabular-nums">
					{media.year || 'Unknown'}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">Wikimedia link</span>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={media.commonsUrl}
					target="_blank"
					rel="external noopener noreferrer"
					class="text-amber-400 hover:underline mt-1 truncate"
				>
					View Original Source ➔
				</a>
			</div>
		</div>
	</div>
</div>
