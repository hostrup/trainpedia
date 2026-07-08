<script lang="ts">
	import type { MediaAsset } from '$lib/types.js';

	let {
		photos = [],
		media,
		onClose
	} = $props<{
		photos?: MediaAsset[];
		media: MediaAsset;
		onClose: () => void;
	}>();

	// Find the initial index of the media inside photos
	let activeIndex = $state(0);

	$effect.pre(() => {
		const idx = photos.findIndex((p: MediaAsset) => p.localPath === media.localPath);
		if (idx !== -1) {
			activeIndex = idx;
		}
	});

	let currentMedia = $derived(photos[activeIndex] ?? media);

	let dialogEl = $state<HTMLElement | null>(null);

	function goNext() {
		if (photos.length <= 1) return;
		activeIndex = (activeIndex + 1) % photos.length;
	}

	function goPrev() {
		if (photos.length <= 1) return;
		activeIndex = (activeIndex - 1 + photos.length) % photos.length;
	}

	$effect(() => {
		if (!dialogEl) return;

		const focusableElements = dialogEl.querySelectorAll<HTMLElement>(
			'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
		);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (firstElement) {
			firstElement.focus();
		}

		const handleKeydown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				onClose();
				return;
			}

			if (e.key === 'ArrowRight' || e.key === 'Right') {
				goNext();
				return;
			}

			if (e.key === 'ArrowLeft' || e.key === 'Left') {
				goPrev();
				return;
			}

			if (e.key === 'Tab') {
				if (focusableElements.length === 0) {
					e.preventDefault();
					return;
				}

				if (e.shiftKey) {
					if (document.activeElement === firstElement) {
						lastElement.focus();
						e.preventDefault();
					}
				} else {
					if (document.activeElement === lastElement) {
						firstElement.focus();
						e.preventDefault();
					}
				}
			}
		};

		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div
	bind:this={dialogEl}
	class="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col justify-between p-6 overflow-y-auto outline-none"
	role="dialog"
	aria-modal="true"
	tabindex="-1"
>
	<!-- Top Bar -->
	<div class="flex justify-between items-center w-full max-w-7xl mx-auto flex-shrink-0">
		<div class="flex flex-col">
			<h3 class="text-sm font-bold text-zinc-100 font-mono tracking-wider uppercase">
				Cinematic Media Inspector
			</h3>
			<div class="flex items-center gap-3 text-xs text-zinc-400 mt-1">
				{#if photos.length > 1}
					<span class="font-semibold text-white bg-white/10 px-2 py-0.5 rounded font-mono">
						{activeIndex + 1} / {photos.length}
					</span>
				{/if}
				{#if currentMedia.title}
					<span class="max-w-xl truncate">{currentMedia.title}</span>
				{/if}
			</div>
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
	<div
		class="flex-1 flex items-center justify-between max-w-7xl mx-auto py-8 w-full min-h-[50vh] gap-4"
	>
		<!-- Left Arrow -->
		{#if photos.length > 1}
			<button
				onclick={goPrev}
				class="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-black flex items-center justify-center text-white transition-all cursor-pointer font-bold text-lg select-none hover:scale-105 active:scale-95"
				aria-label="Previous image"
			>
				◀
			</button>
		{:else}
			<div class="w-10 h-10 md:w-12 md:h-12"></div>
		{/if}

		<div
			class="relative max-h-[70vh] max-w-[80%] group shadow-[0_30px_60px_rgba(0,0,0,0.8)] rounded-lg overflow-hidden border border-white/10 flex items-center justify-center bg-black/40"
		>
			{#if currentMedia.kind === 'VIDEO'}
				<!-- eslint-disable-next-line jsx-a11y/media-has-caption -->
				<video
					src="/{currentMedia.localPath}"
					controls
					autoplay
					class="max-h-[70vh] max-w-full object-contain"
				>
					<track kind="captions" />
				</video>
			{:else}
				<img
					src="/{currentMedia.localPath}"
					alt={currentMedia.title || 'Locomotive Class Asset'}
					class="max-h-[70vh] max-w-full object-contain select-none"
				/>
			{/if}
		</div>

		<!-- Right Arrow -->
		{#if photos.length > 1}
			<button
				onclick={goNext}
				class="w-10 h-10 md:w-12 md:h-12 rounded-full border border-white/20 bg-white/5 hover:bg-white hover:text-black flex items-center justify-center text-white transition-all cursor-pointer font-bold text-lg select-none hover:scale-105 active:scale-95"
				aria-label="Next image"
			>
				▶
			</button>
		{:else}
			<div class="w-10 h-10 md:w-12 md:h-12"></div>
		{/if}
	</div>

	<!-- Bottom Metadata Bar -->
	<div
		class="w-full max-w-4xl mx-auto flex-shrink-0 bg-zinc-950/60 border border-white/5 backdrop-blur rounded-2xl p-6 space-y-4"
	>
		<!-- Anecdote & Historical context -->
		{#if currentMedia.anecdote}
			<div class="space-y-1">
				<span
					class="text-[9px] font-mono tracking-widest uppercase"
					style="color: var(--line-color);">Historical Context</span
				>

				<p class="text-sm text-zinc-200 leading-relaxed font-serif">
					{currentMedia.anecdote}
				</p>
			</div>
		{/if}

		<div class="h-px bg-white/5 my-2"></div>

		<!-- Photographic Metadata -->
		<div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-mono">
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">Attribution</span>
				<span class="text-zinc-300 font-semibold mt-1 truncate">
					{currentMedia.attribution || 'Unknown Photographer'}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">License</span>
				<span class="text-zinc-300 font-semibold mt-1">
					{currentMedia.license}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">Year Taken</span>
				<span class="text-zinc-300 font-semibold mt-1 tabular-nums">
					{currentMedia.year || 'Unknown'}
				</span>
			</div>
			<div class="flex flex-col">
				<span class="text-[9px] text-zinc-500 uppercase">Wikimedia link</span>
				<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
				<a
					href={currentMedia.commonsUrl}
					target="_blank"
					rel="external noopener noreferrer"
					class="mt-1 truncate hover:underline"
					style="color: var(--line-color);"
				>
					View Original Source ➔
				</a>
			</div>
		</div>
	</div>
</div>
