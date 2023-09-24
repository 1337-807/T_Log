<script>
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>About</title>
	<meta name="description" content="About this app" />
</svelte:head>

<div class="text-column">
	<h1>About this app</h1>

	<h2>Why?</h2>

	<p>
		Looking at log data manually in a program like Notepad++ or something
		similar can be quite difficult and confusing. Especially, finding
		specific events or messages can be an annoying task. Even when using
		CTRL+F, some events or connections can be difficult to grasp when the
		amount of data you're looking at is text-only. Because of this, finding
		patterns or comparing two similar events to another can be quite
		challenging. To solve this issue, this site was created. It should help
		you prepare certain events and find patterns easier, while providing a
		UI in which you can easily navigate the log data to further look into
		details of the events. While some of the features of this site could be
		emulated with Excel, Google sheets or another spreadsheet program, the
		advantage of this site is the simplicity and usability it provides along
		with some other specific features specifically designed for this type of
		log data.
	</p>

	<h2>How it works</h2>

	<p>
		The concept of this site is, bring your own logs. This means that,
		mostly because of privacy concerns, every data entry shown and analyzed
		by this site must be provided by yourself. This also means that this
		site won't be useful to you, if you don't have any log data. This site
		does not provide any sample/placeholder/mock data. Your data will be
		processed locally on your machine using JavaScript and will <strong>NOT</strong> be
		uploaded to any servers or analyzed or used by another party other than
		yourself.
	</p>

	<p>
		If you have questions about how to use the site, you should visit the
		<a href="{base}/help">help page</a>.
	</p>
</div>
