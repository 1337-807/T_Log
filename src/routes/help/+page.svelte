<script>
	import { base } from "$app/paths";
</script>

<svelte:head>
	<title>Help</title>
	<meta name="description" content="The help site" />
</svelte:head>

<div class="text-column">
	<h1>Help</h1>

	<h2>Selecting Log Data</h2>

	<p>
		At the top of the <a href="{base}/giftdashboard">dashboard</a> or the
		<a href="{base}/giftdistribution">gift distribution</a> page, you can select
		log data to read. You should select all files you want to read in one selection.
		Files should be in the JSON format.
	</p>

	<h2>The Cursor</h2>

	<p>
		The cursor is a yellow line. It should show up when you hover over the
		graph. In the case it does not show up, move the mouse away from the
		graph area, wait for a second, then place it on the graph again. For the
		cursor to change position, you'll need to hold the mouse cursor still at
		that spot for one second. The blue area around the cursor is the scan
		area, it will scale when you increase the scan radius using the scan
		radius setting or zoom in/out. The current date and time the cursor is
		at, with the corresponding unix timestamp in seconds, is shown
		underneath the graph.
	</p>

	<h2>Browsing Log Data</h2>

	<p>
		Using the graph/timeline, you can zoom and scroll through the data. When
		you zoom out further than a certain point, the data points will scale
		down to improve performance. They will load back in when you zoom back
		in.
	</p>

	<h2>Options</h2>

	<p>
		The options on the <a href="{base}/giftdashboard">gift dashboard</a> or
		the <a href="{base}/giftdistribution">gift distribution</a> site can be accessed
		by either pressing on the burger menu up top or pressing <strong>F2</strong> on your keyboard.<br>
		<strong>It is recommended to adjust the options to your liking before reading any
		log data.</strong>
	</p>

	<h2>Scanradius</h2>

	<p>
		The scan radius can be adjusted either by dragging the slider or typing
		in a value. The scan radius is in seconds, meaning that if an event
		happened at 1200 and your scan radius is 500 you'll see events around
		that event from 500 to 1700. The scan radius also controls how many
		events will be taken into consideration when calculating the lists for
		the <a href="{base}/giftdistribution">gift distribution</a>.
	</p>

	<h2>Name Filter</h2>

	<p>
		In the name filter, you can add one or multiple names by typing in a
		username and pressing the "Add name" button. Events where the username
		matches names added to the name filter will be highlighted. Added names
		will be shown in a list underneath the "Add name" button.
	</p>

	<h2>Timezone override</h2>

	<p>
		Events are saved using a unix timestamp. To convert this timestamp to a
		date and time, your local timezone is used by default. If you want to
		show the events in a specific timezone other than your local time, maybe
		because you work with someone in another timezone, you can override the
		timezone by selecting one from the list.
	</p>

	<h2>Apply Settings</h2>

	<p>
		The buttons underneath "Apply Settings" should only be used if you have
		already loaded some log data and want to change settings after loading
		this. You have two options to apply settings. Redraw the chart or reread
		the data.
	</p>

	<p>
		If you have any further questions you can ask me on Discord, because i
		assume that, if you've found this page, you know me.
	</p>
</div>

<style>
	h1 {
		width: 100%;
	}
</style>
