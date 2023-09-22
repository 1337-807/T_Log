<script>
	// @ts-nocheck
	import {
		Event,
		JoinEvent,
		LeaveEvent,
		AnonGiftEvent,
		TimestampSnapshot,
	} from "../giftdashboard/classes";
	import VirtualList from "svelte-virtual-list-ce";
	import { Chart, registerables } from "chart.js";
	import { onMount } from "svelte";
	let zoomPlugin;
	onMount(async () => {
		// Import the chartjs-plugin-zoom library dynamically
		try {
			const module = await import("chartjs-plugin-zoom");
			zoomPlugin = module.default;
		} catch (error) {
			console.error("Failed to import chartjs-plugin-zoom:", error);
		}
	});
	import annotationPlugin from "chartjs-plugin-annotation";
	import Select from "svelte-select";
	let timezoneList = [];
	let myChart = undefined;
	let cursorpos = undefined;
	let showSus = true;
	let shownotSus = true;
	let hardFilter = false;
	let eventScanRadius = 500;
	let timezoneOverride = undefined;
	let files = [];
	let logs = [];
	let snapshots = [];
	let mergedLogs = [];
	let joinLeaveGiftArray = [];
	let activeUsersArray = [];
	let eventsInScope = [];
	let joinEventsInScope = [];
	let leaveEventsInScope = [];
	let allUserNamesArray = [];
	let names = [];
	let name = "";
	let timestamps = [];
	let activeNumbers = [];
	let eventStart;
	let eventEnd;
	let eventFilter = "";
	let downsampledTimestamps = [];
	let downsampledActiveNumbers = [];

	let activeUsersStart;
	let activeUsersEnd;
	let activeUsersFilter = "";

	let joinsStart;
	let joinsEnd;
	let joinsFilter = "";

	let leavesStart;
	let leavesEnd;
	let leavesFilter = "";

	let usernamesStart;
	let usernamesEnd;
	let usernamesFilter = "";

	$: filteredActiveUsers = activeUsersArray.filter((i) =>
		i.includes(activeUsersFilter.toLocaleLowerCase())
	);
	$: filteredJoins = joinEventsInScope.filter((i) =>
		i.username.includes(joinsFilter.toLocaleLowerCase())
	);
	$: filteredLeaves = leaveEventsInScope.filter((i) =>
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
			? allUserNamesArray.filter((i) =>
					i.includes(usernamesFilter.toLocaleLowerCase())
			  )
			: [];

	function updateSleepingArrays() {
		filteredEvents = joinLeaveGiftArray.filter((i) =>
			i.username.includes(eventFilter.toLocaleLowerCase())
		);
		filteredUsernames = allUserNamesArray.filter((i) =>
			i.includes(usernamesFilter.toLocaleLowerCase())
		);
	}

	function addName() {
		if ((name != "") & (name != undefined)) {
			names = [...names, name.toLocaleLowerCase()];
			name = "";
		}
	}
	function deleteFromArray(string) {
		const index = names.indexOf(string);
		if (index > -1) {
			names.splice(index, 1);
		}
		names = names;
	}

	function getTimezoneOffset(timezone) {
		const now = new Date();
		const offset = now
			.toLocaleTimeString("en-US", {
				timeZone: timezone,
				timeZoneName: "short",
			})
			.split(" ")[2];
		return offset;
	}

	function getLocalTimezoneAndOffset() {
		const localTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		const localTimezoneOffset = getTimezoneOffset(localTimeZone);
		return `${localTimeZone} - ${localTimezoneOffset}`;
	}

	function getTimezoneAndOffset(timezone) {
		const timezoneOffset = getTimezoneOffset(timezone);
		return `${timezone} - ${timezoneOffset}`;
	}

	function fillTimezoneList() {
		let temparray = [{ value: "undefined", label: "Use local timezone" }];
		const timeZones = Intl.supportedValuesOf("timeZone", {
			type: "canonical",
		});
		for (const timezone of timeZones) {
			const offset = getTimezoneOffset(timezone);
			temparray.push({
				value: timezone,
				label: `${timezone} - ${offset}`,
			});
		}
		return temparray;
	}
	timezoneList = fillTimezoneList();

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
			const lines = fileContent.split("\n");
			if (currentFileName.includes("init")) {
				const initEvent = new Event("init", -1);
				lines.unshift(JSON.stringify(initEvent) + "\n");
				console.log("this is an init file");
			}

			const parsedData = parseLines(lines, previousTimestamp); // Pass previousTimestamp to parseLines
			console.log("parsed Data successfully");
			logs.push(parsedData);

			if (parsedData.length > 0) {
				previousTimestamp = parsedData[parsedData.length - 1].timestamp; // Update previousTimestamp
			}
		}

		console.log("All files read successfully");
		mergedLogs = logs.flat();
		calculateActiveUsers(mergedLogs);
	};

	const parseLines = (lines, previousTimestamp) => {
		let eventList = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (line === "") {
				console.log("line empty, skipping");
			} else {
				let event = JSON.parse(line);
				switch (event.type) {
					case "init":
						const timestamp = adjustInitTimestamp(
							previousTimestamp,
							lines,
							i
						);
						const initEvent = new Event("init", timestamp);
						eventList.push(initEvent);
						previousTimestamp = event.timestamp;
						break;
					case "join":
						const joinEvent = new JoinEvent(
							event.username,
							event.timestamp
						);
						if (!hardFilter) {
							eventList.push(joinEvent);
						} else {
							if (names.includes(joinEvent.username)) {
								eventList.push(joinEvent);
							}
						}
						previousTimestamp = event.timestamp;

						break;
					case "leave":
						const leaveEvent = new LeaveEvent(
							event.username,
							event.timestamp
						);
						if (!hardFilter) {
							eventList.push(leaveEvent);
						} else {
							if (names.includes(leaveEvent.username)) {
								eventList.push(leaveEvent);
							}
						}
						previousTimestamp = event.timestamp;
						break;
					case "anongift":
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
			if (event.type === "init") {
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
			const existingSnapshotIndex = snapshots.findIndex(
				(s) => s.timestamp === timestamp
			);

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
		allUserNamesArray.sort();
		createChart(snapshots, events);
		updateSleepingArrays();
	};

	const findClosestActiveUsers = (timestamp, snapshots) => {
		let closestSnapshot = snapshots[0];

		snapshots.forEach((snapshot) => {
			if (
				Math.abs(snapshot.timestamp - timestamp) <
				Math.abs(closestSnapshot.timestamp - timestamp)
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

	function downsampleData(timestamps, activeNumbers, windowSize) {
		downsampledTimestamps = [];
		downsampledActiveNumbers = [];
		const downsampledzeroTimestamps = [];
		const downsampledzeroActiveNumbers = [];

		const totalPoints = timestamps.length;

		for (let i = 0; i < totalPoints; i += 1) {
			if (activeNumbers[i] == 0 || activeNumbers[i] == 1) {
				downsampledzeroTimestamps.push(timestamps[i]);
				downsampledzeroActiveNumbers.push(activeNumbers[i]);
			}
		}

		for (let i = 0; i < totalPoints; i += windowSize) {
			downsampledTimestamps.push(timestamps[i]);
			downsampledActiveNumbers.push(activeNumbers[i]);
		}

		// Merge downsampledzeroTimestamps with downsampledTimestamps
		for (let i = 0; i < downsampledzeroTimestamps.length; i++) {
			const zeroTimestamp = downsampledzeroTimestamps[i];
			const zeroActiveNumber = downsampledzeroActiveNumbers[i];
			const foundIndex = downsampledTimestamps.findIndex(
				(timestamp) => timestamp === zeroTimestamp
			);

			if (foundIndex === -1) {
				const insertionIndex = downsampledTimestamps.findIndex(
					(timestamp) => timestamp > zeroTimestamp
				);

				if (insertionIndex === -1) {
					downsampledTimestamps.push(zeroTimestamp);
					downsampledActiveNumbers.push(zeroActiveNumber);
				} else {
					downsampledTimestamps.splice(
						insertionIndex,
						0,
						zeroTimestamp
					);
					downsampledActiveNumbers.splice(
						insertionIndex,
						0,
						zeroActiveNumber
					);
				}
			}
		}

		return [downsampledTimestamps, downsampledActiveNumbers];
	}

	const localTimeLabels = (() => {
		const date = new Date(); // Create a reusable Date object

		return (timestamp, timezoneOverride) => {
			const getOptions = () => {
				if (
					timezoneOverride == undefined ||
					timezoneOverride == "undefined"
				) {
					return {
						year: "numeric",
						month: "short",
						day: "numeric",
						hour: "numeric",
						minute: "numeric",
						second: "numeric",
						hour12: false,
					};
				} else {
					return {
						year: "numeric",
						month: "short",
						day: "numeric",
						hour: "numeric",
						minute: "numeric",
						second: "numeric",
						hour12: false,
						timeZone: timezoneOverride,
					};
				}
			};

			date.setTime(timestamp * 1000); // Update the Date object with the new timestamp
			return date.toLocaleTimeString("en-US", getOptions());
		};
	})();

	function updateDatasetOnZoom(chart) {
		let zoomArea =
			chart.chart._options.scales.x.max -
			chart.chart._options.scales.x.min;
		let windowSize = 0;

		if (zoomArea < 216000) {
			windowSize = 1;
		} else {
			windowSize = Math.round(zoomArea / 50000); //smaller Number = more aggresive downsampling
		}

		[downsampledTimestamps, downsampledActiveNumbers] = downsampleData(
			JSON.parse(JSON.stringify(timestamps)),
			JSON.parse(JSON.stringify(activeNumbers)),
			windowSize
		);

		// Update the dataset with the downsampled data
		myChart.data.labels = downsampledTimestamps;
		myChart.data.datasets[0].data = downsampledActiveNumbers;
		myChart.options.animation.duration = 0;

		// Update the chart with the new dataset
		myChart.update();
		myChart.options.animation.duration = 500;
	}

	const createChart = (snapshots, events) => {
		timestamps = snapshots.map((snapshot) => snapshot.timestamp);
		activeNumbers = snapshots.map((snapshot) => snapshot.activeNumber);
		activeUsersArray = findClosestActiveUsers(
			timestamps[timestamps.length / 2],
			snapshots
		);

		const anonGiftEvents = events.filter(
			(event) => event.type === "anongift"
		);
		const filteredEvents = events.filter(
			(event) => event.type === "join" || event.type === "leave"
		);
		// Register the necessary chart components
		Chart.register(...registerables);
		Chart.register(zoomPlugin);
		Chart.register(annotationPlugin);

		//Downsample the Chart Data if necessary
		let zoomArea = timestamps[timestamps.length - 1] - timestamps[0];
		let windowSize = 0;
		if (zoomArea < 216000) {
			windowSize = 1;
		} else {
			windowSize = Math.round(zoomArea / 50000); //smaller Number = more aggresive downsampling
		}
		[downsampledTimestamps, downsampledActiveNumbers] = downsampleData(
			JSON.parse(JSON.stringify(timestamps)),
			JSON.parse(JSON.stringify(activeNumbers)),
			windowSize
		);

		// Destroy Chart if already in use
		const canvasElement = document.getElementById("myChart");
		if (canvasElement && myChart !== undefined) {
			myChart.destroy();
		}

		// Create the chart
		const ctx = document.getElementById("myChart").getContext("2d");
		myChart = new Chart(ctx, {
			type: "line",
			data: {
				labels: downsampledTimestamps,
				datasets: [
					{
						label: "Number of Active Users",
						data: downsampledActiveNumbers,
						borderColor: "rgba(0, 123, 255, 1)",
						backgroundColor: "rgba(0, 123, 255, 0.1)",
					},
				],
			},
			options: {
				spanGaps: true,
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					y: {
						beginAtZero: true, // Adjust if necessary
						// Add any other y-axis options you need
						animation: {
							// Disable animation for x-axis scaling
							duration: 0,
						},
					},
					x: {
						type: "linear",
						beginAtZero: false,
						animation: {
							// Disable animation for x-axis scaling
							duration: 0,
						},
						ticks: {
							callback: function (value, index, ticks) {
								return localTimeLabels(value,timezoneOverride);
							},
						},
						minRotation: 0,
						maxRotation: 0,
					},
				},
				plugins: {
					zoom: {
						zoom: {
							wheel: {
								enabled: true, // Enable zooming using the mouse wheel
							},
							pinch: {
								enabled: true, // Enable zooming using pinch gestures on touch devices
							},
							mode: "x", // Enable zooming in x direction only
							onZoom: function (chart) {
								// Call the updateDatasetOnZoom function after the zoom is complete
								updateDatasetOnZoom(chart);
							},
						},
						pan: {
							enabled: true, // Enable panning
							mode: "x", // Enable panning in x direction only
						},
					},
					tooltip: {
						callbacks: {
							label: (context) => {
								const activeUsers =
									downsampledActiveNumbers[context.dataIndex];
								return `Active Users: ${activeUsers}`; // Adjust options for desired time format
							},
							title: (tooltipItems) => {
								const timestamp =
									downsampledTimestamps[
										tooltipItems[0].dataIndex
									];
								return localTimeLabels(timestamp,timezoneOverride);
							},
						},
					},
					annotation: {
						annotations: [],
					},
				},
				elements: {
					line: {
						borderWidth: 2, // Adjust the width of the line
					},
					point: {
						radius: 2, // Set point radius to 0 if you don't want to display data points
					},
				},
			},
		});
		cursorpos = timestamps[timestamps.length / 2];
		// add the annotations
		var annotations = [
			{
				type: "line",
				id: "cursor-radius",
				mode: "vertical",
				scaleID: "x",
				value: timestamps[timestamps.length / 2], // Set initial value to 0, you can update it dynamically based on cursor position
				borderColor: "rgba(0, 92, 190, 0.5)",
				borderWidth: 25,
				label: {
					content: "Cursor Position", // Customize label content
					enabled: true,
					position: "top",
				},
			},
			{
				type: "line",
				id: "cursor-line",
				mode: "vertical",
				scaleID: "x",
				value: timestamps[timestamps.length / 2], // Set initial value to 0, you can update it dynamically based on cursor position
				borderColor: "rgba(255, 207, 0, 0.9)",
				borderWidth: 3,
				label: {
					content: "Cursor Position", // Customize label content
					enabled: true,
					position: "top",
				},
			},
		];
		anonGiftEvents.forEach((event) => {
			const { timestamp, isSus, username } = event;
			const xValue = timestamp;
			const color = isSus ? "red" : "green";
			if (isSus & showSus || !isSus & shownotSus) {
				annotations.push({
					type: "line",
					mode: "vertical",
					scaleID: "x",
					value: xValue,
					borderColor: color,
					borderWidth: 5,
					borderDash: [10, 5],
					label: {
						display: (ctx) => ctx.hovered,
						backgroundColor: color,
						drawTime: "afterDatasetsDraw",
						content: (ctx) => `Gifted sub was to: ${username}`,
						position: (ctx) => ctx.hoverPosition,
					},
					enter(ctx, event) {
						ctx.hovered = true;
						ctx.hoverPosition =
							(event.y / ctx.chart.chartArea.height) * 100 + "%";
						ctx.chart.update();
					},
					leave(ctx, event) {
						ctx.hovered = false;
						ctx.chart.update();
					},
				});
			}
		});
		//add annotations for filtered username join and leave events
		filteredEvents.forEach((event) => {
			const { timestamp, type, username } = event;
			if (names.includes(username)) {
				const xValue = timestamp;
				const color = type == "leave" ? "orange" : "purple";
				annotations.push({
					type: "line",
					mode: "vertical",
					scaleID: "x",
					value: xValue,
					borderColor: color,
					borderWidth: 5,
					borderDash: [25, 10],
					label: {
						display: (ctx) => ctx.hovered,
						backgroundColor: color,
						drawTime: "afterDatasetsDraw",
						content: (ctx) => `${type}: ${username}`,
						position: (ctx) => ctx.hoverPosition,
					},
					enter(ctx, event) {
						ctx.hovered = true;
						ctx.hoverPosition =
							(event.y / ctx.chart.chartArea.height) * 100 + "%";
						ctx.chart.update();
					},
					leave(ctx, event) {
						ctx.hovered = false;
						ctx.chart.update();
					},
				});
			}
		});
		myChart.options.plugins.annotation.annotations = annotations;
		myChart.update();
		// Add event listener to update cursor position
		let isMouseOverChart = false;
		let timeoutId;

		ctx.canvas.addEventListener("mouseenter", () => {
			isMouseOverChart = true;
		});

		ctx.canvas.addEventListener("mouseleave", () => {
			isMouseOverChart = false;
		});

		ctx.canvas.addEventListener("mousemove", (event) => {
			clearTimeout(timeoutId);

			timeoutId = setTimeout(() => {
				if (!isMouseOverChart) {
					return; // Exit if the mouse is not over the chart
				}

				const chartArea = myChart.chartArea;
				const offsetX = event.offsetX;
				const chartX = myChart.scales.x.getValueForPixel(offsetX);
				const valueper1 =
					chartX - myChart.scales.x.getValueForPixel(offsetX - 1);
				const desiredWidth = (eventScanRadius * 2) / valueper1;
				cursorpos = chartX;

				//update the important arrays to reflect the change in the lists
				activeUsersArray = findClosestActiveUsers(chartX, snapshots);
				const filteredEvents = filterEventsByTime(
					events,
					chartX,
					eventScanRadius
				);
				eventsInScope = filteredEvents.allEvents;
				joinEventsInScope = filteredEvents.joinEvents;
				leaveEventsInScope = filteredEvents.leaveEvents;

				// Add a new variable `relationTimestamp` to each entry in eventsInScope
				eventsInScope = eventsInScope.map((event) => {
					return {
						...event,
						relationTimestamp: event.timestamp - chartX,
					};
				});

				// Add a new variable `relationTimestamp` to each entry in joinEventsInScope
				joinEventsInScope = joinEventsInScope.map((event) => {
					return {
						...event,
						relationTimestamp: event.timestamp - chartX,
					};
				});

				// Add a new variable `relationTimestamp` to each entry in leaveEventsInScope
				leaveEventsInScope = leaveEventsInScope.map((event) => {
					return {
						...event,
						relationTimestamp: event.timestamp - chartX,
					};
				});

				// Update the value of the vertical line annotation
				const cursorRadiusAnnotation =
					myChart.options.plugins.annotation.annotations.find(
						(annotation) => annotation.id === "cursor-radius"
					);
				const cursorLineAnnotation =
					myChart.options.plugins.annotation.annotations.find(
						(annotation) => annotation.id === "cursor-line"
					);
				if (cursorRadiusAnnotation) {
					cursorRadiusAnnotation.value = chartX;
					cursorRadiusAnnotation.borderWidth = desiredWidth;
					myChart.update();
				}
				if (cursorLineAnnotation) {
					cursorLineAnnotation.value = chartX;
					myChart.update();
				}
			}, 250); // Delay in milliseconds (1/4 a second)
		});
	};

	const readFile = (file) => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => {
				resolve(reader.result);
			};
			reader.onerror = () => {
				reject(new Error("Error reading file"));
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
		if (e.code === "F2") {
			navOpen = !navOpen;
		}
	}
</script>

<svelte:head>
	<title>Gift Dashboard</title>
	<meta name="description" content="The Dashboard" />
</svelte:head>

<div id="mySidenav" class="sidenav" class:open={navOpen}>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<!-- svelte-ignore a11y-missing-attribute -->
	<a class="closebtn" on:click={handleNav}>&times;</a>
	<h1>Show Gift Events</h1>
	<ul class="groupedOptions">
		<label>
			<input
				type="checkbox"
				class="inputCheckbox"
				bind:checked={showSus}
			/>
			Show suspicous gift events
		</label>
		<br />
		<label>
			<input
				type="checkbox"
				class="inputCheckbox"
				bind:checked={shownotSus}
			/>
			Show non-suspicous gift events
		</label>
	</ul>
	<h1>Show Events</h1>
	<ul class="groupedOptions">
		<label>
			<input
				type="checkbox"
				class="inputCheckbox"
				bind:checked={hardFilter}
			/>
			Only show join/leave with filtered name(s)
		</label>
	</ul>
	<h1>Scan Radius</h1>
	<label>
		<input type="number" bind:value={eventScanRadius} min="0" max="5000" />
		<input
			class="slider"
			type="range"
			bind:value={eventScanRadius}
			min="0"
			max="5000"
		/>
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
	<h1>Override Timezone</h1>
	<Select
		items={timezoneList}
		value="undefined"
		class="selector"
		bind:justValue={timezoneOverride}
	/>
	<h1>Apply Settings</h1>
	<div style="display: flex; justify-content: center;">
		<button class="redrawbutton" on:click={reRenderChart}
			>Redraw the chart</button
		>
		<button class="redrawbutton" on:click={handleFiles}
			>Reread the Data</button
		>
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

<p>
	<input type="file" bind:files multiple on:change={handleFiles} />select some
	log data
</p>
<div class="wrapper" style="width: inherit; height: 400px;">
	<canvas id="myChart" style="width: inherit; height: 400px;" />
</div>
{#if timezoneOverride == undefined || timezoneOverride == "undefined"}
	<p>Using local timezone: <strong>{getLocalTimezoneAndOffset()}</strong></p>
{:else}
	<p>
		Using timezone override: <strong
			>{getTimezoneAndOffset(timezoneOverride)}</strong
		>
	</p>
{/if}
{#if cursorpos != undefined}
	<h1>
		Cursor is at: {localTimeLabels(cursorpos,timezoneOverride)} - {parseFloat(
			cursorpos
		).toFixed(2)}
	</h1>
{/if}

<div class="row">
	<div class="col">
		<b style="margin: auto">All Events</b>
		<p>{eventStart} - {eventEnd} from {filteredEvents.length} total</p>
		<input
			type="text"
			bind:value={eventFilter}
			placeholder="filter name or event type"
		/>
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
					<p>{localTimeLabels(item.timestamp,timezoneOverride)}</p>
					<b style="margin: 6px">{item.username}</b>
				</div>
			</VirtualList>
		</div>
	</div>
	<div class="col">
		<b style="margin: auto">Active Users at Cursor</b>
		<p>
			{activeUsersStart} - {activeUsersEnd} from {filteredActiveUsers.length}
			total
		</p>
		<input
			type="text"
			bind:value={activeUsersFilter}
			placeholder="filter name"
		/>
		<div class="List">
			<VirtualList
				height="100%"
				items={filteredActiveUsers}
				bind:start={activeUsersStart}
				bind:end={activeUsersEnd}
				let:item
			>
				<div class="ListItem">
					<p>{item}</p>
				</div>
			</VirtualList>
		</div>
	</div>
	<div class="col">
		<b style="margin: auto">Joins in Scanradius</b>
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
					<p>{item.relationTimestamp.toFixed(0)}: {item.username}</p>
				</div>
			</VirtualList>
		</div>
	</div>
	<div class="col">
		<b style="margin: auto">Leaves in Scanradius</b>
		<p>{leavesStart} - {leavesEnd} from {filteredLeaves.length} total</p>
		<input
			type="text"
			bind:value={leavesFilter}
			placeholder="filter name"
		/>
		<div class="List">
			<VirtualList
				height="100%"
				items={filteredLeaves}
				bind:start={leavesStart}
				bind:end={leavesEnd}
				let:item
			>
				<div class="ListItem">
					<p>{item.relationTimestamp.toFixed(0)}: {item.username}</p>
				</div>
			</VirtualList>
		</div>
	</div>
	<div class="col">
		<b style="margin: auto">All Usernames</b>
		<p>
			{usernamesStart} - {usernamesEnd} from {filteredUsernames.length} total
		</p>
		<input
			type="text"
			bind:value={usernamesFilter}
			placeholder="filter name"
		/>
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
	:global(.selector) {
		color: black;
		margin-left: 1rem !important;
		margin-right: 1rem !important;
		width: auto !important;
	}
</style>
