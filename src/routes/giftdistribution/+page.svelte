<script>
// @ts-nocheck
	import { Event, JoinEvent, LeaveEvent, AnonGiftEvent, TimestampSnapshot } from '../giftdistribution/classes';
	import VirtualList from '@sveltejs/svelte-virtual-list';
	import { Chart, registerables } from 'chart.js';
	import annotationPlugin from 'chartjs-plugin-annotation';
	let myChart = undefined;
	let myChart2 = undefined;
	let cursorpos = undefined;
	let showSus = true;
	let shownotSus = true;
	let hardFilter = false;
	let eventScanRadius = 500;
	let files = [];
	let logs = [];
	let snapshots = [];
	let mergedLogs = [];
	let joinLeaveGiftArray = [];
	let eventsNearSusArray = [];
	let eventsNearSusArrayDetailed = [];
	let activeUsersArray = [];
	let eventsInScope = [];
	let anonGiftEvents = [];
	let joinEventsInScope = [];
	let leaveEventsInScope = [];
	let susMemberMap = [];
	let allUserNamesArray = [];
	let susMemberArray = [];
	let names = [];
	let name = '';

	let eventStart;
	let eventEnd;
	let eventFilter = '';

	let activeUsersStart;
	let activeUsersEnd;
	let activeUsersFilter = '';

	let joinsStart;
	let joinsEnd;
	let joinsFilter = '';

	let leavesStart;
	let leavesEnd;
	let leavesFilter = '';

	let usernamesStart;
	let usernamesEnd;
	let usernamesFilter = '';

	$: filteredActiveUsers = susMemberArray.filter((i) =>
		i.username.includes(activeUsersFilter.toLocaleLowerCase())
	);
	$: filteredJoins = eventsNearSusArray.filter((i) =>
		i.username.includes(joinsFilter.toLocaleLowerCase())
	);
	$: filteredLeaves = eventsNearSusArrayDetailed.filter((i) =>
		i.username.includes(leavesFilter.toLocaleLowerCase())
	);
	$: filteredEvents =
		joinLeaveGiftArray.length > 0
			? joinLeaveGiftArray.filter(
					(i) =>
						i.username.includes(eventFilter.toLocaleLowerCase()) ||
						i.type.includes(eventFilter.toLocaleLowerCase())
			  )
			: [];
	$: filteredUsernames =
		allUserNamesArray.length > 0
			? allUserNamesArray.filter((i) => i.includes(usernamesFilter.toLocaleLowerCase()))
			: [];

	function updateSleepingArrays() {
		filteredEvents = joinLeaveGiftArray.filter((i) =>
			i.username.includes(eventFilter.toLocaleLowerCase())
		);
		filteredUsernames = allUserNamesArray.filter((i) =>
			i.includes(usernamesFilter.toLocaleLowerCase())
		);
		console.log('Updated sleeping Arrays');
	}

	function addName() {
		if ((name != '') & (name != undefined)) {
			names = [...names, name.toLocaleLowerCase()];
			name = '';
		}
	}
	function deleteFromArray(string) {
		const index = names.indexOf(string);
		if (index > -1) {
			names.splice(index, 1);
		}
		names = names;
	}

	function reRenderChart() {
		createChart(snapshots, mergedLogs);
	}

	const handleFiles = async () => {
		logs = [];
		let previousTimestamp = null;

		for (let i = 0; i < files.length; i++) {
			const file = files[i];
			const currentFileName = file.name;
			const fileContent = await readFile(file);

			console.log(currentFileName);
			const lines = fileContent.split('\n');
			if (currentFileName.includes('init')) {
				const initEvent = new Event('init', -1);
				lines.unshift(JSON.stringify(initEvent) + '\n');
				console.log('this is an init file');
			}

			const parsedData = parseLines(lines, previousTimestamp); // Pass previousTimestamp to parseLines
			console.log('parsedData successful');
			logs.push(parsedData);

			if (parsedData.length > 0) {
				previousTimestamp = parsedData[parsedData.length - 1].timestamp; // Update previousTimestamp
			}
		}

		console.log('All files read successfully');
		mergedLogs = logs.flat();
		calculateActiveUsers(mergedLogs);
	};

	const parseLines = (lines, previousTimestamp) => {
		let eventList = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line === '') {
				console.log('line empty, skipping');
			} else {
				let event = JSON.parse(line);
				switch (event.type) {
					case 'init':
						const timestamp = adjustInitTimestamp(previousTimestamp, lines, i);
						const initEvent = new Event('init', timestamp);
						eventList.push(initEvent);
						previousTimestamp = event.timestamp;
						break;
					case 'join':
						const joinEvent = new JoinEvent(event.username, event.timestamp);
						if (!hardFilter) {
							eventList.push(joinEvent);
						} else {
							if (names.includes(joinEvent.username)) {
								eventList.push(joinEvent);
							}
						}
						previousTimestamp = event.timestamp;

						break;
					case 'leave':
						const leaveEvent = new LeaveEvent(event.username, event.timestamp);
						if (!hardFilter) {
							eventList.push(leaveEvent);
						} else {
							if (names.includes(leaveEvent.username)) {
								eventList.push(leaveEvent);
							}
						}
						previousTimestamp = event.timestamp;
						break;
					case 'anongift':
						const anonGiftEvent = new AnonGiftEvent(
							event.username,
							event.timestamp,
							event.originId,
							event.id,
							event.tmiTimestamp,
							event.isSus
						);
						eventList.push(anonGiftEvent);
						previousTimestamp = event.timestamp;
						break;
					default:
						console.log(`Unknown event type: ${event.type}`);
				}
			}
		}

		return eventList;
	};
	const adjustInitTimestamp = (previousTimestamp, lines, currentIndex) => {
		if (previousTimestamp !== null) {
			return previousTimestamp + 1;
		} else if (currentIndex < lines.length - 1) {
			const nextEvent = JSON.parse(lines[currentIndex + 1]);
			return nextEvent.timestamp - 1;
		} else {
			// Handle the case when there is no previous event and no next event
			// You can set a default value or return null/undefined depending on your requirements
			return undefined;
		}
	};

	const calculateActiveUsers = (events) => {
		let activeUsers = []; // Array to store active users
		snapshots = []; // Array to store snapshots

		events.forEach((event) => {
			if (
				event instanceof JoinEvent ||
				event instanceof LeaveEvent ||
				event instanceof AnonGiftEvent
			) {
				joinLeaveGiftArray.push(event);
			}
			if (event.type === 'init') {
				activeUsers = [];
				const timestamp = Math.floor(event.timestamp);
				const newSnapshot = new TimestampSnapshot(timestamp, [], 0);
				snapshots.push(newSnapshot);
				return;
			}

			if (event instanceof JoinEvent) {
				const index = activeUsers.indexOf(event.username);
				if (!allUserNamesArray.includes(event.username)) {
					allUserNamesArray.push(event.username);
				}
				if (index == -1) {
					activeUsers.push(event.username);
				}
			} else if (event instanceof LeaveEvent) {
				const index = activeUsers.indexOf(event.username);
				if (!allUserNamesArray.includes(event.username)) {
					allUserNamesArray.push(event.username);
				}
				if (index !== -1) {
					activeUsers.splice(index, 1);
				}
			}

			const timestamp = Math.floor(event.timestamp); // Convert timestamp to seconds
			const existingSnapshotIndex = snapshots.findIndex((s) => s.timestamp === timestamp);

			if (existingSnapshotIndex !== -1) {
				const numberOfActiveUsers = activeUsers.length;
				const newSnapshot = new TimestampSnapshot(
					timestamp,
					activeUsers.slice(),
					numberOfActiveUsers
				);
				snapshots[existingSnapshotIndex] = newSnapshot; // Override existing snapshot
			} else {
				const numberOfActiveUsers = activeUsers.length;
				const newSnapshot = new TimestampSnapshot(
					timestamp,
					activeUsers.slice(),
					numberOfActiveUsers
				);
				snapshots.push(newSnapshot);
			}
		});
		console.log('Active Users calculated successfully');
		allUserNamesArray.sort();
		console.log('Calling create chart');
		createChart(snapshots, events);
		updateSleepingArrays();
	};

	const findClosestActiveUsers = (timestamp, snapshots) => {
		let closestSnapshot = snapshots[0];

		snapshots.forEach((snapshot) => {
			if (
				Math.abs(snapshot.timestamp - timestamp) < Math.abs(closestSnapshot.timestamp - timestamp)
			) {
				closestSnapshot = snapshot;
			}
		});

		const sortedUsers = closestSnapshot.activeUsers.slice().sort();

		return sortedUsers;
	};

	function filterEventsByTime(events, timestamp, deviation) {
		const startTime = timestamp - deviation;
		const endTime = timestamp + deviation;

		const allEvents = [];
		const joinEvents = [];
		const leaveEvents = [];

		events.forEach((event) => {
			if (event.timestamp >= startTime && event.timestamp <= endTime) {
				allEvents.push(event);
				if (event instanceof JoinEvent) {
					joinEvents.push(event);
				} else if (event instanceof LeaveEvent) {
					leaveEvents.push(event);
				}
			}
		});
		return { allEvents, joinEvents, leaveEvents };
	}

	const localTimeLabels = (() => {
		const date = new Date(); // Create a reusable Date object
		const options = {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			hour12: false
		};

		return (timestamp) => {
			date.setTime(timestamp * 1000); // Update the Date object with the new timestamp
			return date.toLocaleTimeString('en-US', options);
		};
	})();

	const createChart = (snapshots, events) => {
		const timestamps = snapshots.map((snapshot) => snapshot.timestamp);
		const activeNumbers = snapshots.map((snapshot) => snapshot.activeNumber);
		activeUsersArray = findClosestActiveUsers(timestamps[timestamps.length / 2], snapshots);

		anonGiftEvents = events.filter((event) => event.type === 'anongift');
		const filteredEvents = events.filter(
			(event) => event.type === 'join' || event.type === 'leave'
		);
		// Register the necessary chart components
		Chart.register(...registerables);
		Chart.register(annotationPlugin);

		// Destroy Chart if already in use
		const canvasElement = document.getElementById('myChart');
		if (canvasElement && myChart !== undefined) {
			myChart.destroy();
		}
		const canvasElement2 = document.getElementById('myChart2');
		if (canvasElement2 && myChart !== undefined) {
			myChart2.destroy();
		}

		// Create the chart1
		const ctx = document.getElementById('myChart').getContext('2d');
		const interval = 15; // Group events into 15-minute intervals
		const data = Array.from({ length: (24 * 60) / interval }, () => 0);

		anonGiftEvents.forEach((event) => {
			const date = new Date(event.timestamp * 1000);
			const hour = date.getHours();
			const minutes = date.getMinutes();
			const index = Math.floor((hour * 60 + minutes) / interval);

			data[index]++;
		});

		myChart = new Chart(ctx, {
			type: 'bar',
			data: {
				labels: Array.from({ length: (24 * 60) / interval }, (_, i) => {
					const startMinutes = i * interval;
					const endMinutes = (i + 1) * interval - 1;
					const startHour = Math.floor(startMinutes / 60);
					const startMins = startMinutes % 60;
					const endHour = Math.floor(endMinutes / 60);
					const endMins = endMinutes % 60;

					return `${startHour.toString().padStart(2, '0')}:${startMins
						.toString()
						.padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMins
						.toString()
						.padStart(2, '0')}`;
				}),
				datasets: [
					{
						label: 'Event Distribution',
						data,
						backgroundColor: 'rgba(75, 192, 192, 0.2)',
						borderColor: 'rgba(75, 192, 192, 1)',
						borderWidth: 1
					}
				]
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
						max: Math.max(...data) + 1 // Adjust the y-axis scale if needed
					}
				}
			}
		});
		// Create the chart2
		const ctx2 = document.getElementById('myChart2').getContext('2d');
		const data2 = Array.from({ length: (24 * 60) / interval }, () => 0);

		anonGiftEvents.forEach((event) => {
			if (event.isSus) {
				const date = new Date(event.timestamp * 1000);
				const hour = date.getHours();
				const minutes = date.getMinutes();
				const index = Math.floor((hour * 60 + minutes) / interval);

				data2[index]++;
			}
		});

		myChart2 = new Chart(ctx2, {
			type: 'bar',
			data: {
				labels: Array.from({ length: (24 * 60) / interval }, (_, i) => {
					const startMinutes = i * interval;
					const endMinutes = (i + 1) * interval - 1;
					const startHour = Math.floor(startMinutes / 60);
					const startMins = startMinutes % 60;
					const endHour = Math.floor(endMinutes / 60);
					const endMins = endMinutes % 60;

					return `${startHour.toString().padStart(2, '0')}:${startMins
						.toString()
						.padStart(2, '0')} - ${endHour.toString().padStart(2, '0')}:${endMins
						.toString()
						.padStart(2, '0')}`;
				}),
				datasets: [
					{
						label: 'Event Distribution',
						data: data2,
						backgroundColor: 'rgba(75, 192, 192, 0.2)',
						borderColor: 'rgba(75, 192, 192, 1)',
						borderWidth: 1
					}
				]
			},
			options: {
				scales: {
					y: {
						beginAtZero: true,
						max: Math.max(...data) + 1 // Adjust the y-axis scale if needed
					}
				}
			}
		});

		let susMemberMap = new Map();

		anonGiftEvents.forEach((event) => {
			if (event.isSus) {
				const activeUsersAtPoint = findClosestActiveUsers(event.timestamp, snapshots);
				activeUsersAtPoint.forEach((user) => {
					if (susMemberMap.has(user)) {
						susMemberMap.set(user, susMemberMap.get(user) + 1);
					} else {
						susMemberMap.set(user, 1);
					}
				});
			}
		});

		const sortedCounts = Array.from(susMemberMap.entries()).sort((a, b) => {
			if (b[1] === a[1]) {
				return a[0].localeCompare(b[0]);
			}
			return b[1] - a[1];
		});
		console.log(susMemberMap);
		//create susMemberArray where Member occurences are counted at sus gift events
		susMemberArray = sortedCounts.map(([username, count]) => ({ username, count }));

		eventsNearSusArray = [];
		eventsNearSusArrayDetailed = [];

		//create eventsNearSusArray & eventsNearSusArrayDetailed
		anonGiftEvents.forEach((event) => {
			if (event.isSus) {
				const filteredEvents = filterEventsByTime(events, event.timestamp, eventScanRadius);
				const eventsInScope = filteredEvents.allEvents;

				const userEventTypeCounts = {};
				const userEventTypeCountsBefore = {};
				const userEventTypeCountsAfter = {};

				eventsInScope.forEach((filteredEvent) => {
					if (filteredEvent instanceof JoinEvent || filteredEvent instanceof LeaveEvent) {
						const username = filteredEvent.username;
						const eventType = filteredEvent.type;

						// Count occurrences of event types for each user
						if (!userEventTypeCounts[username]) {
							userEventTypeCounts[username] = {};
						}
						if (!userEventTypeCounts[username][eventType]) {
							userEventTypeCounts[username][eventType] = 0;
						}
						userEventTypeCounts[username][eventType]++;

						// Count occurrences of event types before and after the timestamp for each user
						if (filteredEvent.timestamp < event.timestamp) {
							if (!userEventTypeCountsBefore[username]) {
								userEventTypeCountsBefore[username] = {};
							}
							if (!userEventTypeCountsBefore[username][eventType]) {
								userEventTypeCountsBefore[username][eventType] = 0;
							}
							userEventTypeCountsBefore[username][eventType]++;
						} else if (filteredEvent.timestamp > event.timestamp) {
							if (!userEventTypeCountsAfter[username]) {
								userEventTypeCountsAfter[username] = {};
							}
							if (!userEventTypeCountsAfter[username][eventType]) {
								userEventTypeCountsAfter[username][eventType] = 0;
							}
							userEventTypeCountsAfter[username][eventType]++;
						}
					}
				});

				// Push user event type counts to eventsNearSusArray
				for (const username in userEventTypeCounts) {
					for (const eventType in userEventTypeCounts[username]) {
						const count = userEventTypeCounts[username][eventType];
						// Check if an entry with the same username and eventType already exists
						const existingEntry = eventsNearSusArray.find(
							(entry) => entry.username === username && entry.eventType === eventType
						);

						if (existingEntry) {
							// Entry already exists, you can update the count or handle it as per your requirements
							existingEntry.count += count;
						} else {
							// Entry doesn't exist, add a new entry to the eventsNearSusArray array
							eventsNearSusArray.push({ username, eventType, count });
						}
					}
				}

				// Push user event type counts after to eventsNearSusArrayDetailed
				for (const username in userEventTypeCountsAfter) {
					for (const eventType in userEventTypeCountsAfter[username]) {
						const countAfter =
							userEventTypeCountsAfter[username] && userEventTypeCountsAfter[username][eventType];
						if (countAfter > 0) {
							const existingEntry = eventsNearSusArrayDetailed.find(
								(entry) =>
									entry.username === username &&
									entry.eventType === eventType &&
									entry.type === 'after'
							);
							if (existingEntry) {
								// Entry already exists, you can update the count or handle it as per your requirements
								existingEntry.count += countAfter;
							} else {
								// Entry doesn't exist, add a new entry to the eventsNearSusArrayDetailed array
								eventsNearSusArrayDetailed.push({
									username,
									eventType,
									type: 'after',
									count: countAfter
								});
							}
						}
					}
				}

				// Push user event type counts before to eventsNearSusArrayDetailed
				for (const username in userEventTypeCountsBefore) {
					for (const eventType in userEventTypeCountsBefore[username]) {
						const countBefore = userEventTypeCountsBefore[username][eventType];
						if (countBefore > 0) {
							const existingEntry = eventsNearSusArrayDetailed.find(
								(entry) =>
									entry.username === username &&
									entry.eventType === eventType &&
									entry.type === 'before'
							);
							if (existingEntry) {
								// Entry already exists, you can update the count or handle it as per your requirements
								existingEntry.count += countBefore;
							} else {
								// Entry doesn't exist, add a new entry to the eventsNearSusArrayDetailed array
								eventsNearSusArrayDetailed.push({
									username,
									eventType,
									type: 'before',
									count: countBefore
								});
							}
						}
					}
				}
			}
			console.log('Finished Create Chart');
		});

		// Sort eventsNearSusArray
		eventsNearSusArray.sort((a, b) => {
			if (b.count !== a.count) {
				return b.count - a.count;
			} else {
				return a.username.localeCompare(b.username);
			}
		});

		// Sort eventsNearSusArrayDetailed
		eventsNearSusArrayDetailed.sort((a, b) => {
			if (b.count !== a.count) {
				return b.count - a.count;
			} else {
				return a.username.localeCompare(b.username);
			}
		});

		console.log('trying to log Near Array');
		console.log(eventsNearSusArray);
		console.log('trying to log Near Array Detail');
		console.log(eventsNearSusArrayDetailed);
	};

	const readFile = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				resolve(reader.result);
			};
			reader.onerror = () => {
				reject(new Error('Error reading file'));
			};
			reader.readAsText(file);
		});
	};

	//all for Navbar
	let navOpen = false;

	function handleNav() {
		navOpen = !navOpen;
		// 	navWidth === 0 ? navWidth = 40 : navWidth = 0;
	}

	function handleNavWithKey(e) {
		if (e.code === 'F2') {
			navOpen = !navOpen;
		}
	}
</script>

<svelte:head>
	<title>Read Test</title>
	<meta name="description" content="About the Minecraft Server" />
</svelte:head>

<div id="mySidenav" class="sidenav" class:open={navOpen}>
	<a class="closebtn" on:click={handleNav}>&times;</a>
	<h1>Show Gift Events</h1>
	<ul class="groupedOptions">
		<label>
			<input type="checkbox" class="inputCheckbox" bind:checked={showSus} />
			Show suspicous gift events
		</label>
		<br />
		<label>
			<input type="checkbox" class="inputCheckbox" bind:checked={shownotSus} />
			Show non-suspicous gift events
		</label>
	</ul>
	<h1>Show Events</h1>
	<ul class="groupedOptions">
		<label>
			<input type="checkbox" class="inputCheckbox" bind:checked={hardFilter} />
			Only show join/leave with filtered name(s)
		</label>
	</ul>
	<h1>Scan Radius</h1>
	<label>
		<input type="number" bind:value={eventScanRadius} min="0" max="5000" />
		<input class="slider" type="range" bind:value={eventScanRadius} min="0" max="5000" />
	</label>
	<h1>Name Filter</h1>
	<ul class="groupedOptions">
		<input bind:value={name} placeholder="Enter a username" />
		<button on:click={addName}> Add name </button>

		<ul>
			{#each names as name}
				<li>
					{name}
					<button on:click={deleteFromArray(name)}> delete </button>
				</li>
			{/each}
		</ul>
	</ul>
	<h1>Apply Settings</h1>
	<div style="display: flex; justify-content: center;">
		<button class="redrawbutton" on:click={reRenderChart}>Redraw the chart</button>
		<button class="redrawbutton" on:click={handleFiles}>Reread the Data</button>
	</div>
</div>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="container" class:change={navOpen} on:click={handleNav}>
	<div class="bar1" />
	<div class="bar2" />
	<div class="bar3" />
</div>

<!-- Use keyboard to handle the sidenav -->
<svelte:window on:keydown={handleNavWithKey} />


<p><input type="file" bind:files multiple on:change={handleFiles} />select some log data</p>
<h1>All Anon Gift Events</h1>
<div class="wrapper" style="width: 1600px; height: 400px;">
	<canvas id="myChart" style="width: 1600px; height: 400px;" />
</div>
<h1>Only sus Gift Events</h1>
<div class="wrapper" style="width: 1600px; height: 400px;">
	<canvas id="myChart2" style="width: 1600px; height: 400px;" />
</div>
<!--
{#if cursorpos != undefined}
	<h1>Cursor is at: {localTimeLabels(cursorpos)} - {parseFloat(cursorpos).toFixed(2)}</h1>
{/if}
-->

<div class="row">
	<div class="col">
		<b style="margin: auto">All Events</b>
		<p>{eventStart} - {eventEnd} from {filteredEvents.length} total</p>
		<input type="text" bind:value={eventFilter} placeholder="filter name or event type" />
		<div class="List">
			<VirtualList
				class="VirtualList"
				height="100%"
				items={filteredEvents}
				bind:start={eventStart}
				bind:end={eventEnd}
				let:item
			>
				<div class="ListItem">
					<strong>{item.type}</strong>
					<p>{localTimeLabels(item.timestamp)}</p>
					<b style="margin: 6px">{item.username}</b>
				</div>
			</VirtualList>
		</div>
	</div>
	<!--
				for (const [username, count] of sortedCounts) {
			console.log(`Username: ${username}, Count: ${count}`);
		}
	-->
	<div class="col">
		<b style="margin: auto">No. User was active at sus Gift Event</b>
		<p>{activeUsersStart} - {activeUsersEnd} from {filteredActiveUsers.length} total</p>
		<input type="text" bind:value={activeUsersFilter} placeholder="filter name" />
		<div class="List">
			<VirtualList
				height="100%"
				items={filteredActiveUsers}
				bind:start={activeUsersStart}
				bind:end={activeUsersEnd}
				let:item
			>
				<div class="ListItem">
					<strong>{item.count}</strong>
					<p>{item.username}</p>
				</div>
			</VirtualList>
		</div>
	</div>
	<div class="col">
		<b style="margin: auto">Events at sus Gift Events in Scanradius</b>
		<p>{joinsStart} - {joinsEnd} from {filteredJoins.length} total</p>
		<input type="text" bind:value={joinsFilter} placeholder="filter name" />
		<div class="List">
			<VirtualList
				height="100%"
				items={filteredJoins}
				bind:start={joinsStart}
				bind:end={joinsEnd}
				let:item
			>
				<div class="ListItem">
					<strong>{item.count}</strong>
					<p>{item.username}: {item.eventType}</p>
				</div>
			</VirtualList>
		</div>
	</div>
	<div class="col">
		<b style="margin: auto">Grouped Events at sus in Scanradius</b>
		<p>{leavesStart} - {leavesEnd} from {filteredLeaves.length} total</p>
		<input type="text" bind:value={leavesFilter} placeholder="filter name" />
		<div class="List">
			<VirtualList
				height="100%"
				items={filteredLeaves}
				bind:start={leavesStart}
				bind:end={leavesEnd}
				let:item
			>
				<div class="ListItem">
					<strong>{item.count} - {item.type}</strong>
					<p>{item.username}: {item.eventType} </p>
				</div>
			</VirtualList>
		</div>
	</div>
	<div class="col">
		<b style="margin: auto">All Usernames</b>
		<p>{usernamesStart} - {usernamesEnd} from {filteredUsernames.length} total</p>
		<input type="text" bind:value={usernamesFilter} placeholder="filter name" />
		<div class="List">
			<VirtualList
				height="100%"
				items={filteredUsernames}
				bind:start={usernamesStart}
				bind:end={usernamesEnd}
				let:item
			>
				<div class="ListItem">
					<p>{item}</p>
				</div>
			</VirtualList>
		</div>
	</div>
</div>

<h1>All Anongift</h1>
<table>
	<thead>
		<tr>
			<th>Type</th>
			<th>Username</th>
			<th>Timestamp</th>
			<th>Suspicous</th>
			<th>OriginID</th>
			<th>ID</th>
			<th>TMI-Timestamp</th>
		</tr>
	</thead>
	<tbody>
		{#each anonGiftEvents as event}
			<tr>
				<td>{event.type}</td>
				<td>{event.username}</td>
				<td>{localTimeLabels(event.timestamp)}</td>
				<td>{event.isSus}</td>
				<td>{event.originId}</td>
				<td>{event.id}</td>
				<td>{event.tmiTimestamp}</td>
			</tr>
		{/each}
	</tbody>
</table>
<h1>Only Suspicous</h1>
<table>
	<thead>
		<tr>
			<th>Type</th>
			<th>Username</th>
			<th>Timestamp</th>
			<th>Suspicous</th>
			<th>OriginID</th>
			<th>ID</th>
			<th>TMI-Timestamp</th>
		</tr>
	</thead>
	<tbody>
		{#each anonGiftEvents.filter((event) => event.isSus) as event}
			<tr>
				<td>{event.type}</td>
				<td>{event.username}</td>
				<td>{localTimeLabels(event.timestamp)}</td>
				<td>{event.isSus}</td>
				<td>{event.originId}</td>
				<td>{event.id}</td>
				<td>{event.tmiTimestamp}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	/* Hamburger Menu icon */
	.container {
		position: absolute;
		left: 27%;
		display: inline-block;
		cursor: pointer;
	}

	.bar1,
	.bar2,
	.bar3 {
		width: 35px;
		height: 5px;
		background-color: #333;
		margin: 6px 0;
		transition: 0.4s;
	}

	.change .bar1 {
		-webkit-transform: rotate(-45deg) translate(-9px, 6px);
		transform: rotate(-45deg) translate(-9px, 6px);
	}

	.change .bar2 {
		opacity: 0;
	}

	.change .bar3 {
		-webkit-transform: rotate(45deg) translate(-8px, -8px);
		transform: rotate(45deg) translate(-8px, -8px);
	}

	/* span {
		position: absolute;
		right: 20%;
		display: inline-block;
		cursor: pointer;
	}	 */

	/* The side navigation menu */
	.sidenav {
		height: 100%;
		width: 0; /* 0 width - change this with JavaScript */
		position: fixed;
		z-index: 1;
		top: 0;
		left: 0;
		background-color: #111111ef;
		overflow-x: hidden; /* Disable horizontal scroll */
		padding-top: 60px;
		transition: 0.5s;
	}

	/* The navigation menu links */
	.sidenav a {
		padding: 8px 8px 8px 32px;
		text-decoration: none;
		font-size: 25px;
		color: #818181;
		display: block;
		transition: 0.3s;
	}

	/* When you mouse over the navigation links, change their color */
	.sidenav a:hover {
		color: #f1f1f1;
	}

	.sidenav {
		color: white;
	}
	.groupedOptions {
		border-radius: 10px;
		border: 2px solid white;
	}

	/* Position and style the close button (top right corner) */
	.sidenav .closebtn {
		position: absolute;
		top: 0;
		right: 25px;
		font-size: 36px;
		margin-left: 50px;
	}

	label {
		color: white;
	}

	.open {
		width: 25%;
	}

	/* On smaller screens, where height is less than 450px, change the style of the sidenav (less padding and a smaller font size) */
	@media screen and (max-height: 450px) {
		.sidenav {
			padding-top: 15px;
		}
		.sidenav a {
			font-size: 18px;
		}
	}
	label {
		display: flex;
	}
	p {
		margin: 6px;
	}
	.inputCheckbox {
		transform: scale(1.5);
	}
	.slider {
		width: 100%;
	}
	.redrawbutton {
		background-color: #9e4caf;
		border: none;
		color: white;
		padding: 15px 32px;
		text-align: center;
		text-decoration: none;
		display: inline-block;
		font-size: 16px;
		margin: 4px 2px;
		cursor: pointer;
		width: 90%;
	}
	:global(body) {
		display: flex;
		flex-flow: column;
	}
	.row {
		flex: 1;
		display: flex;
		justify-content: space-between;
		min-height: 250px;
		width: inherit;
	}
	.col {
		flex: 1;
		display: flex;
		flex-flow: column;
		padding: 0.5rem 0.5rem 0 0.5rem;
		margin: 0 0.2rem;
		border: 1px solid;
		overflow: hidden;
	}
	.col :global(.List) {
		flex: 1;
	}
	.List {
		max-height: 30rem;
	}
	.ListItem {
		position: relative;
		margin: 0.2em 0;
		padding: 0.2em;
		border: 1px solid #a0a0a0;
		min-height: 2rem;
		height: auto; /* without this is unstable */
		overflow: wrap;
		overflow-wrap: anywhere;
	}
	table {
		border-collapse: collapse;
		width: 100%;
	}
	th,
	td {
		border: 1px solid #ddd;
		padding: 8px;
		text-align: left;
	}
	th {
		background-color: #f2f2f2;
	}
</style>
