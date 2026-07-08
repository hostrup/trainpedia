<svelte:head>
	<title>About Trainpedia — Data Principles & Licensing</title>
	<meta
		name="description"
		content="Learn about Trainpedia's data principles, strict factuality, Wikipedia sourcing, and licensing."
	/>
</svelte:head>

<div class="mx-auto max-w-4xl px-4 py-12 sm:px-6">
	<header class="mb-10 border-b pb-6 border-[var(--map-zone)]">
		<h1
			class="text-4xl font-semibold tracking-tight text-[var(--map-ink)]"
			style="font-family: var(--font-map);"
		>
			About Trainpedia
		</h1>
		<p class="mt-2 text-sm text-[var(--map-ink-soft)] font-mono uppercase tracking-wider">
			Data Principles · Provenance · Licensing
		</p>
	</header>

	<div
		class="space-y-8 font-serif text-lg leading-relaxed text-[var(--map-ink)]"
		style="font-family: var(--font-narrative);"
	>
		<section class="space-y-3">
			<h2
				class="text-2xl font-semibold font-sans tracking-tight"
				style="font-family: var(--font-map);"
			>
				The Sourcing Principle
			</h2>
			<p>
				Trainpedia is designed as a digital museum archive. Under the directive of <strong
					>Strict Factuality</strong
				>, every biography, specification, date, and historical anecdote displayed on this site is
				retrieved directly from structured public databases:
				<a
					href="https://www.wikidata.org"
					target="_blank"
					rel="noopener noreferrer"
					class="underline hover:text-[var(--tfl-blue)]">Wikidata</a
				>,
				<a
					href="https://en.wikipedia.org"
					target="_blank"
					rel="noopener noreferrer"
					class="underline hover:text-[var(--tfl-blue)]">Wikipedia</a
				>, and
				<a
					href="https://commons.wikimedia.org"
					target="_blank"
					rel="noopener noreferrer"
					class="underline hover:text-[var(--tfl-blue)]">Wikimedia Commons</a
				>.
			</p>
			<p>
				If a technical detail or historical date is unverified or missing in the source database,
				the corresponding field is left empty or marked as "unknown". We do <strong>not</strong> use generative
				AI models to guess, rewrite, or extrapolate historical details.
			</p>
		</section>

		<section class="space-y-3">
			<h2
				class="text-2xl font-semibold font-sans tracking-tight"
				style="font-family: var(--font-map);"
			>
				Provenance & Oldid Tracking
			</h2>
			<p>
				To ensure transparency, all historical narratives and locomotive class listings display a
				precise kilde-link showing the exact Wikipedia article revision (using the <code>oldid</code
				> URL parameter) that was parsed. This allows you to verify every claim against the exact version
				of the Wikipedia entry that supplied the text.
			</p>
		</section>

		<section class="space-y-3">
			<h2
				class="text-2xl font-semibold font-sans tracking-tight"
				style="font-family: var(--font-map);"
			>
				Licensing & Creative Commons
			</h2>
			<p>
				All text excerpts parsed from Wikipedia are licensed under the <a
					href="https://en.wikipedia.org/wiki/Wikipedia:Text_of_the_Creative_Commons_Attribution-ShareAlike_4.0_International_License"
					target="_blank"
					rel="noopener noreferrer"
					class="underline hover:text-[var(--tfl-blue)]"
					>Creative Commons Attribution-ShareAlike 4.0 License</a
				> (CC BY-SA).
			</p>
			<p>
				Media assets (photographs, blueprints, and diagrams) are sourced from Wikimedia Commons and
				are either in the <strong>Public Domain</strong> or published under free licenses (CC BY, CC BY-SA,
				or GNU FDL). In compliance with these licensing terms, every image features complete author and
				source attribution, accessible through the cinematic inspection lightbox.
			</p>
		</section>

		<section class="space-y-3">
			<h2
				class="text-2xl font-semibold font-sans tracking-tight"
				style="font-family: var(--font-map);"
			>
				Database Synchronization & Cadence
			</h2>
			<p>
				The Trainpedia database is seeded using automated, idempotent scraping pipelines. These
				scripts parse and clean raw Wikidata queries, normalise manufacturer naming conventions, and
				downscale media assets for web presentation. The database undergoes quarterly sync runs to
				capture new preservation logs and correct historical updates.
			</p>
		</section>
	</div>
</div>
