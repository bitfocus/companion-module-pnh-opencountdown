const bent = require('bent')
const { InstanceStatus, InstanceBase, runEntrypoint, combineRgb } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')

/**
 * Known issues:
 * - The presets are somewhat broken
 */

class opencountdownInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	init(config) {
		let tThis = this
		this.config = config
		this.actions() // export actions
		this.initPresets() // export presets
		this.initFeedback() // export feedback
		this.variables() // export variables
		this.updateStatus(InstanceStatus.Connecting) // set inital state
		//this.isReady = false // flag for functions that need to wait for the module to be ready
		if (this.config.host != undefined) { // basic check if config is valid
			// check if connection works
			bent('GET', 200, 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1/data', 'json')().then(
				function handleList(body) {
					tThis.updateStatus(InstanceStatus.ok, 'Connected')
					tThis.log('Connected to ' + tThis.config.host)
					tThis.isReady = true
					tThis.lastData = body
				}
			).catch(function handleError(err) {
				tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
			})
		}

		// Pull new data 
		this.intervalId = setInterval(function handleInterval() {
			tThis.updateDataFrame()
		}, this.config.refreshTime | 1000)

		// Regularly update variables
		this.interval2 = setInterval(function updateFas() {
			// tThis.updateVariables()
		}, this.config.recalcTime | 500)

	}

	updateDataFrame() {
		let tThis = this
		if (this.isReady) {
			bent('GET', 200, 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1/data', 'json')()
				.then(function handleList(body) {
					tThis.updateStatus(InstanceStatus.ok, 'Connected')
					tThis.lastData = body
					tThis.checkFeedbacks()
					tThis.updateVariables()
				})
				.catch(function handleError(err) {
					tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
				})
		}
	}

	/**
	 * Makes sure connection is working
	 */
	checkConnection() {
		if (this.isReady) {
			bent('GET', 200, 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1/data', 'json')()
				.then(function handleList(body) {
					tThis.updateStatus(InstanceStatus.ok, 'Connected')
					tThis.lastData = body
				})
				.catch(function handleError(err) {
					tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
				})
		}
	}

	/**
	 * Converts milliseconds into a timestamp
	 *
	 * @param {Number} s - the amount of milliseconds to parse
	 * @returns {List} - a list containing [compound, hours, minutes, seconds, milliseconds], where compound is everything together
	 */
	msToTime(s) {
		let isSmallerThenZero = false
		if (s < 0) {
			isSmallerThenZero = true
		}

		var ms = s % 1000
		s = (s - ms) / 1000
		var secs = s % 60
		s = (s - secs) / 60
		var mins = s % 60
		var hrs = (s - mins) / 60
		let out = ''

		out =
			('00' + Math.abs(hrs)).slice(-2) +
			':' +
			('00' + Math.abs(mins)).slice(-2) +
			':' +
			('00' + Math.abs(secs)).slice(-2) +
			'.' +
			('000' + Math.abs(ms)).slice(-3)

		if (isSmallerThenZero) {
			// Append a "-" if the time is negative (only for compound)
			out = '-' + out
		}
		return [out, hrs, mins, secs, ms]
	}

	variables() {
		let varDefs = [] // list containing all variable definitions
		varDefs.push({
			variableId: 'timeRemainingHours',
			name: 'Time remaining (Hours)',
		})
		varDefs.push({
			variableId: 'timeRemainingMins',
			name: 'Time remaining (Minutes)',
		})
		varDefs.push({
			variableId: 'timeRemainingSecs',
			name: 'Time remaining (Seconds)',
		})
		varDefs.push({
			variableId: 'timeRemainingMillis',
			name: 'Time remaining (Milliseconds)',
		})
		varDefs.push({
			variableId: 'timeRemaining',
			name: 'Time remaining (Compound)',
		})
		this.setVariableDefinitions(varDefs)

		// Zero-out all variables
		this.setVariableValues({
			'timeRemainingHours': '0',
			'timeRemainingMins': '0',
			'timeRemainingSecs': '0',
			'timeRemainingMillis': '0',
			'timeRemaining': '0'
		})

		// this.updateVariables()
	}

	updateVariables() {
		if (this.isReady) {
			const now = new Date()
			const diff = this.lastData.countdownGoal - now.getTime() // Get difference between now and timer goal, this can be negative
			const timeVar = this.msToTime(diff)
			if (this.lastData.timerRunState) {
				// Only update variables if timer is running, this is the same way the main app handles it
				this.setVariableValues({
					'timeRemaining': timeVar[0],
					'timeRemainingHours': timeVar[1],
					'timeRemainingMins': timeVar[2],
					'timeRemainingSecs': timeVar[3],
					'timeRemainingMillis': timeVar[4],
				})
			}
		}
	}

	initPresets() {
		var presets = {}

		// Play presets
		presets["play"] = {
			category: 'Play Controls',
			type: 'button',
			label: '',
			style: {
				style: 'text',
				text: 'Play',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'playCtrls',
							options: {
								id: 'play',
							},
						}
					]
				},
			],
			feedbacks: [
				{
					type: 'run_state',
					options: {
						booleanSelection: true,
					},
					style: {
						bgcolor: (0, 255, 0),
						color: (255, 255, 255),
					},
				},
			],
		}

		presets["pause"] = {
			category: 'Play Controls',
			type: 'button',
			label: '',
			style: {
				style: 'text',
				text: 'Pause',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'playCtrls',
							options: {
								id: 'pause',
							},
						}
					]
				},
			],
			feedbacks: [
				{
					type: 'run_state',
					options: {
						booleanSelection: false,
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
		}

		presets["restart"] = {
			type: 'button',
			category: 'Play Controls',
			label: '',
			style: {
				style: 'text',
				text: 'Restart',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'playCtrls',
							options: {
								id: 'restart',
							},
						},
					],
				},
			],
			feedbacks: []
		}

		// Mode presets
		presets["setToTimer"] = {
			category: 'Mode Controls',
			type: 'button',
			label: '',
			style: {
				style: 'text',
				text: 'Set to timer',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'setMode',
							options: {
								id: 'timer',
							},
						}
					]
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'timer',
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
		}

		presets["setToClock"] = {
			category: 'Mode Controls',
			type: 'button',
			label: '',
			style: {
				style: 'text',
				text: 'Set to clock',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'setMode',
							options: {
								modeDropdown: 'clock',
							},
							style: {
								bgcolor: combineRgb(0, 255, 0),
								color: combineRgb(255, 255, 255),
							},
						}
					]
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'clock',
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
		}

		presets["setToEmpty"] = {
			category: 'Mode Controls',
			type: 'button',
			label: '',
			style: {
				style: 'text',
				text: 'Set to Empty (Black)',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'setMode',
							options: {
								modeDropdown: 'black',
							},
						}
					]
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'black',
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
			feedbacks: []
		}

		presets["setToTest"] = {
			category: 'Mode Controls',
			type: 'button',
			label: '',
			style: {
				style: 'text',
				text: 'Set to test image',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'setMode',
							options: {
								id: 'test',
							},
						}
					]
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'test',
					},
					style: {
						bgcolor: combineRgb(0, 255, 0),
						color: combineRgb(255, 255, 255),
					},
				},
			],
			feedbacks: []
		}

		// Add to time presets
		presets["addTime5000"] = {
			category: 'Add to timer',
			type: 'button',
			label: 'Add 5 seconds',
			style: {
				style: 'text',
				text: 'Add 5 sec',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'addRelativ',
							options: {
								addTime: 5000,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		presets["addTime30s"] = {
			category: 'Add to timer',
			type: 'button',
			label: 'Add 30 seconds',
			style: {
				style: 'text',
				text: 'Add 30 sec',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'addRelativ',
							options: {
								addTime: 30000,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		presets["addTime60s"] = {
			category: 'Add to timer',
			type: 'button',
			label: 'Add 1 minute',
			style: {
				style: 'text',
				text: 'Add 1 min',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'addRelativ',
							options: {
								addTime: 60 * 1000,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		presets["addTime5m"] = {
			category: 'Add to timer',
			type: 'button',
			label: 'Add 5 minutes',
			style: {
				style: 'text',
				text: 'Add 5 mins',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'addRelativ',
							options: {
								addTime: 5 * 60 * 1000,
							},
						},
					],
				},
			],
			feedbacks: []
		}

		presets["addTime10m"] = {
			category: 'Add to timer',
			type: 'button',
			label: 'Add 10 minutes',
			style: {
				style: 'text',
				text: 'Add 10 mins',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'addRelativ',
							options: {
								addTime: 10 * 60 * 1000,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		presets["addTime30m"] = {
			category: 'Add to timer',
			type: 'button',
			label: 'Add 30 minutes',
			style: {
				style: 'text',
				text: 'Add 30 mins',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'addRelativ',
							options: {
								addTime: 30 * 60 * 1000,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		// Set time
		presets["setTime30m"] = {
			category: 'Set to time',
			type: 'button',
			label: 'Set to 30 mins',
			style: {
				style: 'text',
				text: 'Set 30 mins',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'setTime',
							options: {
								addTimeMillis: 0,
								addTimeSec: 0,
								addTimeMins: 30,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		presets["setTime15m"] = {
			category: 'Set to time',
			type: 'button',
			label: 'Set to 15 mins',
			style: {
				style: 'text',
				text: 'Set 15 mins',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'setTime',
							options: {
								addTimeMillis: 0,
								addTimeSec: 0,
								addTimeMins: 15,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		presets["setTime5m"] = {
			category: 'Set to time',
			label: 'Set to 5 mins',
			type: 'button',
			style: {
				style: 'text',
				text: 'Set 5 mins',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'setTime',
							options: {
								addTimeMillis: 0,
								addTimeSec: 0,
								addTimeMins: 5,
							},
						}
					]
				},
			],
			feedbacks: []
		}

		// Message presets
		presets["hideMessage"] = {
			category: 'Messaging',
			label: 'Hide the message',
			type: 'button',
			style: {
				style: 'text',
				text: 'Hide message',
				size: '17',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'hideMessage',

						}
					]
				},
			],
			feedbacks: []
		}

		presets["showMessageHeyWait"] = {
			category: 'Messaging',
			label: 'Send a message',
			type: 'button',
			style: {
				style: 'text',
				text: 'Hey! Wait',
				size: '18',
				color: '16777215',
			},
			steps: [
				{
					down: [
						{
							actionId: 'sendMessage',
							options: {
								message: 'Hey! Please wait!',
							},
						}
					]
				},
			],
			feedbacks: []
		}
		this.setPresetDefinitions(presets)
	}

	initFeedback() {
		let tThis = this
		const feedbacks = {}
		feedbacks['mode_state'] = {
			type: 'boolean', // Feedbacks can either a simple boolean, or can be an 'advanced' style change (until recently, all feedbacks were 'advanced')
			name: 'Is a certain mode active',
			description: 'Gives feedback depending on the servers mode',
			defaultStyle: {
				// The default style change for a boolean feedback
				// The user will be able to customise these values as well as the fields that will be changed
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			// options is how the user can choose the condition the feedback activates for
			options: [
				{
					type: 'dropdown',
					label: 'Control the countdown',
					id: 'modeDropdown',
					default: 'timer',
					tooltip: '',
					choices: [
						{ id: 'timer', label: 'Timer' },
						{ id: 'clock', label: 'Clock' },
						{ id: 'black', label: 'Black' },
						{ id: 'test', label: 'Testimage' },
						{ id: 'screensaver', label: 'Screensaver' },
					],
					minChoicesForSearch: 0,
				},
			],
			callback: function (feedback) {
				// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
				try {
					if (tThis.lastData.mode == feedback.options.modeDropdown) {
						return true
					} else {
						return false
					}
				} catch (error) {
					tThis.log('error', 'Error in feedback callback: ' + error)
				}

			},
		}

		feedbacks['run_state'] = {
			type: 'boolean', // Feedbacks can either a simple boolean, or can be an 'advanced' style change (until recently, all feedbacks were 'advanced')
			name: 'Is the countdown running',
			description: 'Gives feedback depending on wether the countdown is running or not',
			defaultStyle: {
				// The default style change for a boolean feedback
				// The user will be able to customise these values as well as the fields that will be changed
				color: combineRgb(0, 0, 0),
				bgcolor: combineRgb(0, 255, 0),
			},
			// options is how the user can choose the condition the feedback activates for
			options: [
				{
					type: 'checkbox',
					label: 'Trigger when active',
					id: 'booleanSelection',
					default: 'timer',
					tooltip: '',
				},
			],
			callback: function (feedback) {
				// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
				try {
					if (tThis.lastData.timerRunState == feedback.options.booleanSelection) {
						return true
					} else {
						return false
					}
				} catch (error) {
					tThis.log('error', 'Error in feedback callback: ' + error)
				}

			},
		}
		this.setFeedbackDefinitions(feedbacks)
	}

	async actions() {
		const baseUrl = 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1'
		let tThis = this
		let tTemp = this
		this.setActionDefinitions({
			setMode: {
				name: 'Set the mode to the timer',
				options: [
					{
						type: 'dropdown',
						label: 'Select a mode',
						id: 'modeDropdown',
						default: 'timer',
						tooltip: 'Please select a mode',
						choices: [
							{ id: 'timer', label: 'Timer' },
							{ id: 'clock', label: 'Clock' },
							{ id: 'black', label: 'Black' },
							{ id: 'test', label: 'Testimage' },
							{ id: 'screensaver', label: 'Screensaver' },
						],
						minChoicesForSearch: 0,
					},
				],
				callback: (action) => {
					bent('GET', 200, baseUrl + '/set/mode?mode=' + action.options.modeDropdown, 'json')().then(function handleList(
						body
					) {
						console.log(body)
						tThis.updateStatus(InstanceStatus.ok, 'Connected')
						tThis.checkFeedbacks()
					}).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			playCtrls: {
				name: 'Play controls',
				options: [
					{
						type: 'dropdown',
						label: 'Control the countdown',
						id: 'controlDropdown',
						default: 'play',
						tooltip: '',
						choices: [
							{ id: 'pause', label: 'Pause' },
							{ id: 'play', label: 'Play' },
							{ id: 'restart', label: 'Restart' },
						],
						minChoicesForSearch: 0,
					},
				],
				callback: (action) => {
					console.log(action.options.controlDropdown)
					bent('GET', 200, baseUrl + '/ctrl/timer/' + action.options.controlDropdown, 'json')().then(function handleList(body) {
						tThis.updateStatus(InstanceStatus.ok, 'Connected')
						tTemp.checkFeedbacks()
					}).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			setShowTime: {
				name: 'Style: Show time on timer',
				options: [
					{
						type: 'checkbox',
						label: 'Show current time',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the time on the timer',
					},
				],
				callback: (action) => {
					bent('GET', 200, baseUrl + '/set/layout/showTime?show=' + action.options.showTime, 'json')().then(
						function handleList(body) {
							tThis.updateStatus(InstanceStatus.ok, 'Connected')
							tTemp.log(body)
						}
					).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			setShowMillis: {
				name: 'Style: Show milliseconds on timer',
				options: [
					{
						type: 'checkbox',
						label: 'Show Milliseconds',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the milliseconds on the timer page',
					},
				],
				callback: (action) => {
					bent('GET', 200, baseUrl + '/set/layout/showMillis?show=' + action.options.showTime, 'json')().then(
						function handleList(body) {
							tThis.updateStatus(InstanceStatus.ok, 'Connected')
							tTemp.log(body)
						}
					).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			setShowProgressbar: {
				name: 'Style: Show the progressbar',
				options: [
					{
						type: 'checkbox',
						label: 'Show progressbar',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the progress bar',
					},
				],
				callback: (action) => {
					bent('GET', 200, baseUrl + '/set/progressbar/show?show=' + action.options.showTime, 'json')().then(
						function handleList(body) {
							tThis.updateStatus(InstanceStatus.ok, 'Connected')
							tTemp.log(body)
						}
					).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			setShowTextColor: {
				name: 'Style: Show the text in color',
				options: [
					{
						type: 'checkbox',
						label: 'Show color on text',
						id: 'showTime',
						default: false,
						tooltip: 'Show the text in a fitting color to the progress bar',
					},
				],
				callback: (action) => {
					bent('GET', 200, baseUrl + '/set/text/enableColoring?enable=' + action.options.showTime, 'json')().then(
						function handleList(body) {
							tThis.updateStatus(InstanceStatus.ok, 'Connected')
							tTemp.log(body)
						}
					).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			addRelativ: {
				name: 'Timer: Add time to the timer',
				options: [
					{
						type: 'number',
						label: 'Amount of time in milliseconds to add. ',
						id: 'addTime',
						default: 5000,
						tooltip: 'The amount of milliseconds to add to the timer. 1000 ms = 1 second',
					},
				],
				callback: (action) => {
					bent('GET', 200, baseUrl + '/set/relativAddMillisToTimer?time=' + action.options.addTime, 'json')().then(
						function handleList(body) {
							tThis.updateStatus(InstanceStatus.ok, 'Connected')
						}
					).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			setTime: {
				name: 'Timer: Set the timer to a certain time',
				options: [
					{
						type: 'number',
						label: 'Amount of time in milliseconds to set. ',
						id: 'addTimeMillis',
						default: 0,
						tooltip: 'The amount of milliseconds to set to the timer. 1000 ms = 1 second',
					},
					{
						type: 'number',
						label: 'Amount of time in seconds to set. ',
						id: 'addTimeSec',
						default: 30,
						tooltip: 'The amount of seconds to set to the timer.',
					},
					{
						type: 'number',
						label: 'Amount of time in minutes to set.',
						id: 'addTimeMins',
						default: 1,
						tooltip: 'The amount of minutes to set to the timer.',
					},
				],
				callback: (action) => {
					let timeAmount =
						action.options.addTimeMillis + action.options.addTimeSec * 1000 + action.options.addTimeMins * 60 * 1000
					bent('GET', 200, baseUrl + '/set/addMillisToTimer?time=' + timeAmount, 'json')().then(function handleList(
						body
					) {
						tThis.updateStatus(InstanceStatus.ok, 'Connected')
					}).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			sendMessage: {
				name: 'Messaging: Send a message',
				options: [
					{
						type: 'textinput',
						label: 'The message to be displayed',
						id: 'message',
						default: 'Hello World',
						tooltip: 'The message which will be displayed',
					},
				],
				callback: (action) => {
					bent('GET', 200, baseUrl + '/ctrl/message/show?msg=' + action.options.message, 'json')().then(
						function handleList(body) {
							tThis.updateStatus(InstanceStatus.ok, 'Connected')
						}
					).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				}
			},
			hideMessage: {
				name: 'Messaging: Hide the message',
				callback: (action) => {
					bent('GET', 200, baseUrl + '/ctrl/message/hide', 'json')().then(function handleList(body) {
						tThis.updateStatus(InstanceStatus.ok, 'Connected')
					}).catch(function handleError(err) {
						tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
					})
				},
				options: []
			},
		})
	}

	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: this.REGEX_IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target Port',
				width: 4,
				default: 4449,
				regex: this.REGEX_PORT,
			},
			{
				type: 'number',
				id: 'refreshTime',
				label: 'Update interval (Poling)',
				width: 4,
				default: 1000,
			},
			{
				type: 'number',
				id: 'recalcTime',
				label: 'Update interval (Recalculation)',
				width: 4,
				default: 400,
			},
			/*{
				type: 'text',
				id: 'notice',
				width: 12,
				label: '',
				value: `<span style="color: #404040">
							<h5>Features under development</h5>
							The feature(s) below this line are currently under development. They might require a restart. They might not work properly.
							<br>
							Allow variables will enable variables for button text.
						</span>`,
			},
			{
				type: 'checkbox',
				id: 'allowVariables',
				label: 'Allow variables',
				default: false,
				width: 400,
			},*/
		]
	}

	configUpdated(config) {
		this.config = config
		const tThis = this
		this.isReady = false
		this.updateStatus(InstanceStatus.Connecting, 'Connecting after config update')
		// console.log(this.config)
		if (this.config.host != undefined && this.config.port != undefined) {
			this.log('info', 'Connecting to http://' + this.config['host'] + ':' + this.config['port'])
			bent('GET', 200, 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1/system', 'json')().then(
				function handleList(body) {
					tThis.updateStatus(InstanceStatus.ok, 'Connected')
					this.isReady = true
				}
			).catch(function handleError(err) {
				tThis.updateStatus(InstanceStatus.ConnectionFailure, 'Not connected (Failed)')
			})
		} else {
			this.updateStatus(InstanceStatus.BadConfig, 'No host or port specified')
		}
		setTimeout(this.checkConnection, 1000)
		this.checkConnection()
	}

	destroy() {
		clearInterval(this.intervalId)
		clearInterval(this.interval2)
		this.debug('destroy')
	}
}
runEntrypoint(opencountdownInstance, UpgradeScripts)
