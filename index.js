const instance_skel = require('../../instance_skel')
const bent = require('bent')

class instance extends instance_skel {
	/**
	 * Create an instance of the module
	 *
	 * @param {EventEmitter} system - the brains of the operation
	 * @param {string} id - the instance ID
	 * @param {Object} config - saved user configuration parameters
	 * @since 1.0.0
	 */

	constructor(system, id, config) {
		super(system, id, config)
		this.lastData = {}
	}

	init() {
		let tThis = this

		this.actions() // export actions
		this.initPresets() // export presets
		this.initFeedback() // export feedback
		this.init_variables() // export
		this.status(this.STATUS_WARNING, 'Connecting') // set inital state
		this.isReady = false // flag for functions that need to wait for the module to be ready
		if (this.config.host != undefined) { // basic check if config is valid
			// check if connection works
			bent('GET', 200, 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1/data', 'json')().then(
				function handleList(body) {
					tThis.status(tThis.STATUS_OK, 'Connected')
					tThis.log('Connected to ' + tThis.config.host)
					tThis.isReady = true
					tThis.lastData = body
				}
			)
		}

		// Pull new data 
		this.intervalId = setInterval(function handleInterval() {
			tThis.updateDataFrame()
		}, this.config.refreshTime | 1000)

		// Regularly update variables
		this.interval2 = setInterval(function updateFas() {
			tThis.updateVariables()
		}, this.config.recalcTime | 500)

	}

	updateDataFrame() {
		let tThis = this
		if (this.isReady) {
			bent('GET', 200, 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1/data', 'json')()
				.then(function handleList(body) {
					tThis.status(tThis.STATUS_OK, 'Connected')
					tThis.lastData = body
					tThis.checkFeedbacks()
					tThis.updateVariables()
				})
				.catch(function handleError(err) {
					tThis.status(tThis.STATUS_ERROR, 'Not connected (Failed)')
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
					tThis.status(tThis.STATUS_OK, 'Connected')
					tThis.lastData = body
				})
				.catch(function handleError(err) {
					tThis.status(tThis.STATUS_ERROR, 'Not connected (Failed)')
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

	init_variables() {
		let varDefs = [] // list containing all variable definitions
		varDefs.push({
			name: 'timeRemainingHours',
			label: 'Time remaining (Hours)',
		})
		varDefs.push({
			name: 'timeRemainingMins',
			label: 'Time remaining (Minutes)',
		})
		varDefs.push({
			name: 'timeRemainingSecs',
			label: 'Time remaining (Seconds)',
		})
		varDefs.push({
			name: 'timeRemainingMillis',
			label: 'Time remaining (Milliseconds)',
		})
		varDefs.push({
			name: 'timeRemaining',
			label: 'Time remaining (Compound)',
		})
		this.setVariableDefinitions(varDefs)

		// Zero-out all variables
		this.setVariables({
			'timeRemainingHours': '0',
			'timeRemainingMins': '0',
			'timeRemainingSecs': '0',
			'timeRemainingMillis': '0',
			'timeRemaining': '0'
		})

		this.updateVariables()
	}

	updateVariables() {
		if (this.isReady) {
			const now = new Date()
			const diff = this.lastData.countdownGoal - now.getTime() // Get difference between now and timer goal, this can be negative
			const timeVar = this.msToTime(diff)
			if (this.lastData.timerRunState) {
				// Only update variables if timer is running, this is the same way the main app handles it
				this.setVariables({
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
		var presets = []

		// Play presets
		presets.push({
			category: 'Play Controls',
			label: '',
			bank: {
				style: 'text',
				text: 'Play',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'playCtrls',
					options: {
						id: 'play',
					},
				},
			],
			feedbacks: [
				{
					type: 'run_state',
					options: {
						booleanSelection: true,
					},
					style: {
						bgcolor: this.rgb(0, 255, 0),
						color: this.rgb(255, 255, 255),
					},
				},
			],
		})

		presets.push({
			category: 'Play Controls',
			label: '',
			bank: {
				style: 'text',
				text: 'Pause',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'playCtrls',
					options: {
						id: 'pause',
					},
				},
			],
			feedbacks: [
				{
					type: 'run_state',
					options: {
						booleanSelection: false,
					},
					style: {
						bgcolor: this.rgb(0, 255, 0),
						color: this.rgb(255, 255, 255),
					},
				},
			],
		})

		presets.push({
			category: 'Play Controls',
			label: '',
			bank: {
				style: 'text',
				text: 'Restart',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'playCtrls',
					options: {
						id: 'restart',
					},
				},
			],
		})

		// Mode presets
		presets.push({
			category: 'Mode Controls',
			label: '',
			bank: {
				style: 'text',
				text: 'Set to timer',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'setMode',
					options: {
						id: 'timer',
					},
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'timer',
					},
					style: {
						bgcolor: this.rgb(0, 255, 0),
						color: this.rgb(255, 255, 255),
					},
				},
			],
		})

		presets.push({
			category: 'Mode Controls',
			label: '',
			bank: {
				style: 'text',
				text: 'Set to clock',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'setMode',
					options: {
						modeDropdown: 'clock',
					},
					style: {
						bgcolor: this.rgb(0, 255, 0),
						color: this.rgb(255, 255, 255),
					},
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'clock',
					},
					style: {
						bgcolor: this.rgb(0, 255, 0),
						color: this.rgb(255, 255, 255),
					},
				},
			],
		})

		presets.push({
			category: 'Mode Controls',
			label: '',
			bank: {
				style: 'text',
				text: 'Set to Empty (Black)',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'setMode',
					options: {
						modeDropdown: 'black',
					},
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'black',
					},
					style: {
						bgcolor: this.rgb(0, 255, 0),
						color: this.rgb(255, 255, 255),
					},
				},
			],
		})

		presets.push({
			category: 'Mode Controls',
			label: '',
			bank: {
				style: 'text',
				text: 'Set to test image',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'setMode',
					options: {
						id: 'test',
					},
				},
			],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: 'test',
					},
					style: {
						bgcolor: this.rgb(0, 255, 0),
						color: this.rgb(255, 255, 255),
					},
				},
			],
		})

		// Add to time presets
		presets.push({
			category: 'Add to timer',
			label: 'Add 5 seconds',
			bank: {
				style: 'text',
				text: 'Add 5 sec',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'addRelativ',
					options: {
						addTime: 5000,
					},
				},
			],
		})

		presets.push({
			category: 'Add to timer',
			label: 'Add 30 seconds',
			bank: {
				style: 'text',
				text: 'Add 30 sec',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'addRelativ',
					options: {
						addTime: 30000,
					},
				},
			],
		})

		presets.push({
			category: 'Add to timer',
			label: 'Add 1 minute',
			bank: {
				style: 'text',
				text: 'Add 1 min',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'addRelativ',
					options: {
						addTime: 60 * 1000,
					},
				},
			],
		})

		presets.push({
			category: 'Add to timer',
			label: 'Add 5 minutes',
			bank: {
				style: 'text',
				text: 'Add 5 mins',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'addRelativ',
					options: {
						addTime: 5 * 60 * 1000,
					},
				},
			],
		})

		presets.push({
			category: 'Add to timer',
			label: 'Add 10 minutes',
			bank: {
				style: 'text',
				text: 'Add 10 mins',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'addRelativ',
					options: {
						addTime: 10 * 60 * 1000,
					},
				},
			],
		})

		presets.push({
			category: 'Add to timer',
			label: 'Add 30 minutes',
			bank: {
				style: 'text',
				text: 'Add 30 mins',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'addRelativ',
					options: {
						addTime: 30 * 60 * 1000,
					},
				},
			],
		})

		// Set time
		presets.push({
			category: 'Set to time',
			label: 'Set to 30 mins',
			bank: {
				style: 'text',
				text: 'Set 30 mins',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'setTime',
					options: {
						addTimeMillis: 0,
						addTimeSec: 0,
						addTimeMins: 30,
					},
				},
			],
		})

		presets.push({
			category: 'Set to time',
			label: 'Set to 15 mins',
			bank: {
				style: 'text',
				text: 'Set 15 mins',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'setTime',
					options: {
						addTimeMillis: 0,
						addTimeSec: 0,
						addTimeMins: 15,
					},
				},
			],
		})

		presets.push({
			category: 'Set to time',
			label: 'Set to 5 mins',
			bank: {
				style: 'text',
				text: 'Set 5 mins',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'setTime',
					options: {
						addTimeMillis: 0,
						addTimeSec: 0,
						addTimeMins: 5,
					},
				},
			],
		})

		// Message presets
		presets.push({
			category: 'Messaging',
			label: 'Hide the message',
			bank: {
				style: 'text',
				text: 'Hide message',
				size: '17',
				color: '16777215',
			},
			actions: [
				{
					action: 'hideMessage',
				},
			],
		})

		presets.push({
			category: 'Messaging',
			label: 'Send a message',
			bank: {
				style: 'text',
				text: 'Hey! Wait',
				size: '18',
				color: '16777215',
			},
			actions: [
				{
					action: 'sendMessage',
					options: {
						message: 'Hey! Please wait!',
					},
				},
			],
		})
		this.setPresetDefinitions(presets)
	}

	initFeedback() {
		let tThis = this
		const feedbacks = {}
		feedbacks['mode_state'] = {
			type: 'boolean', // Feedbacks can either a simple boolean, or can be an 'advanced' style change (until recently, all feedbacks were 'advanced')
			label: 'Is a certain mode active',
			description: 'Gives feedback depending on the servers mode',
			style: {
				// The default style change for a boolean feedback
				// The user will be able to customise these values as well as the fields that will be changed
				color: this.rgb(0, 0, 0),
				bgcolor: this.rgb(0, 255, 0),
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
					],
					minChoicesForSearch: 0,
				},
			],
			callback: function (feedback) {
				// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
				if (tThis.lastData.mode == feedback.options.modeDropdown) {
					return true
				} else {
					return false
				}
			},
		}

		feedbacks['run_state'] = {
			type: 'boolean', // Feedbacks can either a simple boolean, or can be an 'advanced' style change (until recently, all feedbacks were 'advanced')
			label: 'Is the countdown running',
			description: 'Gives feedback depending on wether the countdown is running or not',
			style: {
				// The default style change for a boolean feedback
				// The user will be able to customise these values as well as the fields that will be changed
				color: this.rgb(0, 0, 0),
				bgcolor: this.rgb(0, 255, 0),
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
				if (tThis.lastData.timerRunState == feedback.options.booleanSelection) {
					return true
				} else {
					return false
				}
			},
		}
		this.setFeedbackDefinitions(feedbacks)
	}

	async actions() {
		this.setActions({
			setMode: {
				label: 'Set the mode to the timer',
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
			},
			playCtrls: {
				label: 'Play controls',
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
			},
			setShowTime: {
				label: 'Style: Show time on timer',
				options: [
					{
						type: 'checkbox',
						label: 'Show current time',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the time on the timer',
					},
				],
			},
			setShowMillis: {
				label: 'Style: Show milliseconds on timer',
				options: [
					{
						type: 'checkbox',
						label: 'Show Milliseconds',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the milliseconds on the timer page',
					},
				],
			},
			setShowProgressbar: {
				label: 'Style: Show the progressbar',
				options: [
					{
						type: 'checkbox',
						label: 'Show progressbar',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the progress bar',
					},
				],
			},
			setShowTextColor: {
				label: 'Style: Show the text in color',
				options: [
					{
						type: 'checkbox',
						label: 'Show color on text',
						id: 'showTime',
						default: false,
						tooltip: 'Show the text in a fitting color to the progress bar',
					},
				],
			},
			addRelativ: {
				label: 'Timer: Add time to the timer',
				options: [
					{
						type: 'number',
						label: 'Amount of time in milliseconds to add. ',
						id: 'addTime',
						default: 5000,
						tooltip: 'The amount of milliseconds to add to the timer. 1000 ms = 1 second',
					},
				],
			},
			setTime: {
				label: 'Timer: Set the timer to a certain time',
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
			},
			sendMessage: {
				label: 'Messaging: Send a message',
				options: [
					{
						type: 'textinput',
						label: 'The message to be displayed',
						id: 'message',
						default: 'Hello World',
						tooltip: 'The message which will be displayed',
					},
				],
			},
			hideMessage: {
				label: 'Messaging: Hide the message',
			},
		})
	}

	config_fields() {
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

	updateConfig(config) {
		this.config = config
		const tThis = this
		this.isReady = false
		this.status(this.STATUS_WARNING, 'Connecting after config update')
		// console.log(this.config)
		if (this.config.host != undefined && this.config.port != undefined) {
			this.log('info', 'Connecting to http://' + this.config['host'] + ':' + this.config['port'])
			bent('GET', 200, 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1/system', 'json')().then(
				function handleList(body) {
					tThis.status(tThis.STATUS_OK, 'Connected')
					this.isReady = true
				}
			)
		} else {
			this.status(this.STATUS_ERROR, 'No host or port specified')
		}
		setTimeout(this.checkConnection, 1000)
		this.checkConnection()
	}

	action(action) {
		// Build the base api URL
		const baseUrl = 'http://' + this.config.host + ':' + this.config['port'] + '/api/v1'
		const tTemp = this

		// Only allow requests if the server is ready / available
		if (this.isReady) {
			if (action.action == 'setMode') {
				bent('GET', 200, baseUrl + '/set/mode?mode=' + action.options.modeDropdown, 'json')().then(function handleList(
					body
				) {
					tTemp.status(tTemp.STATUS_OK, 'Connected')
					tTemp.checkFeedbacks()
				})
				return
			} else if (action.action == 'setShowTime') {
				bent('GET', 200, baseUrl + '/set/layout/showTime?show=' + action.options.showTime, 'json')().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log(body)
					}
				)
				return
			} else if (action.action == 'setShowMillis') {
				bent('GET', 200, baseUrl + '/set/layout/showMillis?show=' + action.options.showTime, 'json')().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log(body)
					}
				)
				return
			} else if (action.action == 'setShowProgressbar') {
				bent('GET', 200, baseUrl + '/set/progressbar/show?show=' + action.options.showTime, 'json')().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log(body)
					}
				)
				return
			} else if (action.action == 'setShowTextColor') {
				bent('GET', 200, baseUrl + '/set/text/enableColoring?enable=' + action.options.showTime, 'json')().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log(body)
					}
				)
				return
			} else if (action.action == 'playCtrls') {
				bent('GET', 200, baseUrl + '/ctrl/timer/' + action.options.id, 'json')().then(function handleList(body) {
					tTemp.status(tTemp.STATUS_OK, 'Connected')
					tTemp.checkFeedbacks()
				})
				return
			} else if (action.action == 'addRelativ') {
				bent('GET', 200, baseUrl + '/set/relativAddMillisToTimer?time=' + action.options.addTime, 'json')().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
					}
				)
				return
			} else if (action.action == 'setTime') {
				let timeAmount =
					action.options.addTimeMillis + action.options.addTimeSec * 1000 + action.options.addTimeMins * 60 * 1000
				bent('GET', 200, baseUrl + '/set/addMillisToTimer?time=' + timeAmount, 'json')().then(function handleList(
					body
				) {
					tTemp.status(tTemp.STATUS_OK, 'Connected')
				})
				return
			} else if (action.action == 'sendMessage') {
				bent('GET', 200, baseUrl + '/ctrl/message/show?msg=' + action.options.message, 'json')().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
					}
				)
				return
			} else if (action.action == 'hideMessage') {
				bent('GET', 200, baseUrl + '/ctrl/message/hide', 'json')().then(function handleList(body) {
					tTemp.status(tTemp.STATUS_OK, 'Connected')
				})
				return
			}
		} else {
			this.checkConnection()
		}
	}

	destroy() {
		clearInterval(this.intervalId)
		clearInterval(this.interval2)
		this.debug('destroy')
	}
}
exports = module.exports = instance
