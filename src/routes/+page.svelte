<script>
	import { base } from "$app/paths";
</script>

<svelte:head>
	<title>Home</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<h1>Welcome to the T_Log Twitch Log-Explorer Site.</h1>

<img class="logo" src="{base}/Tlog.svg" alt="Tlog SVG" />

<p>
	If you're not sure why this page was created or if you want to learn more
	about it, i suggest you visit the <a href="{base}/about">about</a> page.
</p>
<p>
	In case you're familiar with the concept, but have some questions that are
	of technical nature, you should visit the <a href="{base}/help">help</a> page.
</p>
<p>
	If you have any further questions you can ask me on Discord, because i
	assume that, if you've found this page, you know me.
</p>
<p>Happy browsing.</p>

<style>
	h1 {
		width: 100%;
	}
	.logo {
		max-width: 25%;
		max-height: 25%;
		padding: 5rem;
	}
	@media screen and (max-width: 750px) {
		.logo {
			max-height: 50%;
			max-width: 50%;
			padding: 2rem;
		}
	}
</style>
