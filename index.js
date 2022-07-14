const instance_skel = require('../../instance_skel')
const bent = require("bent")


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
		let tThis = this
		this.lastData = {};


		this.actions() // export actions
		this.initPresets() // export presets
		this.initFeedback() // export feedback
		this.status(this.STATUS_WARNING, 'Connecting')
		this.isReady = false
		if (this.config.host != undefined) {
			// this.log("info", 'Connecting to ' + this.config["host"] + ':' + this.config["port"])
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/api/v1/data", "json")().then(function handleList(body) {
				tThis.status(tThis.STATUS_OK, 'Connected')
				tThis.log('Connected to ' + tThis.config.host)
				tThis.isReady = true
				tThis.lastData = body
			})
		}

			this.intervalId = setInterval(function handleInterval() {
				tThis.updateDataFrame()
			}, this.config.refreshTime | 1000)
		


	}

	feedback(){
		
	}

	updateDataFrame() {
		let tThis = this
		if (this.isReady) {
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/api/v1/data", "json")().then(function handleList(body) {
				tThis.status(tThis.STATUS_OK, 'Connected')
				tThis.lastData = body
				tThis.checkFeedbacks()
			}).catch(function handleError(err) {
				tThis.status(tThis.STATUS_ERROR, 'Not connected')
				tThis.log('Not connected')
			})
		}
	}

	checkConnection() {
		if (this.isReady) {
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/api/v1/data", "json")().then(function handleList(body) {
				tThis.status(tThis.STATUS_OK, 'Connected')
				tThis.lastData = body
			}).catch(function handleError(err) {
				tThis.status(tThis.STATUS_ERROR, 'Not connected')
				tThis.log('Not connected')
			})
		}
	}

	updateVariables() { // Outdated
		const tThis = this
		if (this.isReady) {
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/v1/current", "json")().then(
				function handleList(body) {
					tThis.status(tThis.STATUS_OK, 'Connected')
					tThis.setVariable('amount_sounds_currently_playing', String(Object.keys(body).length))
					// console.log(Object.keys(body).length)
				})
		}
	}

	initPresets() {
		var presets = [];

		presets.push({
			category: 'Play Controls',
			label: "",
			bank: {
				style: 'text',
				text: 'Play',
				size: '18',
				color: '16777215'
			},
			actions: [{
				action: 'playCtrls',
				options: {
					id: 'play'
				}
			}],
			feedbacks: [
				{
					type: 'run_state',
					options: {
						booleanSelection: true
					},
					style: {
						bgcolor: this.rgb(0,255,0),
						color: this.rgb(255,255,255),
					}
				},
			],
		})
		presets.push({
			category: 'Play Controls',
			label: "",
			bank: {
				style: 'text',
				text: 'Pause',
				size: '18',
				color: '16777215'
			},
			actions: [{
				action: 'playCtrls',
				options: {
					id: 'pause'
				}
			}],
			feedbacks: [
				{
					type: 'run_state',
					options: {
						booleanSelection: false
					},
					style: {
						bgcolor: this.rgb(0,255,0),
						color: this.rgb(255,255,255),
					}
				},
			],
		})

		presets.push({
			category: 'Play Controls',
			label: "",
			bank: {
				style: 'text',
				text: 'Restart',
				size: '18',
				color: '16777215'
			},
			actions: [{
				action: 'playCtrls',
				options: {
					id: 'restart'
				}
			}]
		})

		presets.push({
			category: 'Mode Controls',
			label: "",
			bank: {
				style: 'text',
				text: 'Set to timer',
				size: '18',
				color: '16777215'
			},
			actions: [{
				action: 'setMode',
				options: {
					id: 'timer'
				}
			}],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: "timer"
					},
					style: {
						bgcolor: this.rgb(0,255,0),
						color: this.rgb(255,255,255),
					}
				},
			],
		})

		presets.push({
			category: 'Mode Controls',
			label: "",
			bank: {
				style: 'text',
				text: 'Set to clock',
				size: '18',
				color: '16777215'
			},
			actions: [{
				action: 'setMode',
				options: {
					modeDropdown: 'clock'
				},
				style: {
					bgcolor: this.rgb(0,255,0),
					color: this.rgb(255,255,255),
				}
			}],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: "clock",
					},
					style: {
						bgcolor: this.rgb(0,255,0),
						color: this.rgb(255,255,255),
					}
				},
			],
		})

		presets.push({
			category: 'Mode Controls',
			label: "",
			bank: {
				style: 'text',
				text: 'Set to Empty (Black)',
				size: '18',
				color: '16777215'
			},
			actions: [{
				action: 'setMode',
				options: {
					modeDropdown: 'black'
				}
			}],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: "black"
					},
					style: {
						bgcolor: this.rgb(0,255,0),
						color: this.rgb(255,255,255),
					}
				},
			],
		})

		presets.push({
			category: 'Mode Controls',
			label: "",
			bank: {
				style: 'text',
				text: 'Set to test image',
				size: '18',
				color: '16777215'
			},
			actions: [{
				action: 'setMode',
				options: {
					id: 'test'
				}
			}],
			feedbacks: [
				{
					type: 'mode_state',
					options: {
						modeDropdown: "test"
					},
					style: {
						bgcolor: this.rgb(0,255,0),
						color: this.rgb(255,255,255),
					}
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
				bgcolor: this.rgb(0, 255, 0)
			},
			// options is how the user can choose the condition the feedback activates for
			options: [{
				type: 'dropdown',
				label: 'Control the countdown',
				id: 'modeDropdown',
				default: "timer",
				tooltip: '',
				choices: [{ id: "timer", label: "Timer" }, { id: "clock", label: "Clock" }, { id: "black", label: "Black" }, { id: "test", label: "Testimage" }],
				minChoicesForSearch: 0
			}],
			callback: function (feedback) {
				// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
				if (tThis.lastData.mode == feedback.options.modeDropdown) {
					return true
				} else {
					return false
				}
			}
		}

		feedbacks['run_state'] = {
			type: 'boolean', // Feedbacks can either a simple boolean, or can be an 'advanced' style change (until recently, all feedbacks were 'advanced')
			label: 'Is the countdown running',
			description: 'Gives feedback depending on wether the countdown is running or not',
			style: {
				// The default style change for a boolean feedback
				// The user will be able to customise these values as well as the fields that will be changed
				color: this.rgb(0, 0, 0),
				bgcolor: this.rgb(0, 255, 0)
			},
			// options is how the user can choose the condition the feedback activates for
			options: [{
				type: 'checkbox',
				label: 'Trigger when active',
				id: 'booleanSelection',
				default: "timer",
				tooltip: '',
			}],
			callback: function (feedback) {
				// This callback will be called whenever companion wants to check if this feedback is 'active' and should affect the button style
				if (tThis.lastData.timerRunState == feedback.options.booleanSelection) {
					return true
				} else {
					return false
				}
			}
		}
		this.setFeedbackDefinitions(feedbacks);
	}

	variables() {
		/*this.setVariableDefinitions([
			{
				name: "amount_sounds_currently_playing",
				label: "Songs currently playing"
			}
		])
		this.setVariable('amount_sounds_currently_playing', "0");*/
	}

	async actions() {
		this.setActions({
			"setMode": {
				label: 'Set the mode to the timer',
				options: [{
					type: 'dropdown',
					label: 'Select a mode',
					id: 'modeDropdown',
					default: "timer",
					tooltip: 'Please select a mode',
					choices: [{ id: "timer", label: "Timer" }, { id: "clock", label: "Clock" }, { id: "black", label: "Black" }, { id: "test", label: "Testimage" }],
					minChoicesForSearch: 0
				}]
			},
			"playCtrls": {
				label: 'Play controls',
				options: [{
					type: 'dropdown',
					label: 'Control the countdown',
					id: 'modeDropdown',
					default: "play",
					tooltip: '',
					choices: [{ id: "pause", label: "Pause" }, { id: "play", label: "Play" }, { id: "restart", label: "Restart" }],
					minChoicesForSearch: 0
				}]
			},
			"setShowTime": {
				label: 'Style: Show time on timer',
				options: [
					{
						type: 'checkbox',
						label: 'Show current time',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the time on the timer',
					}]
			},
			"setShowMillis": {
				label: 'Style: Show milliseconds on timer',
				options: [
					{
						type: 'checkbox',
						label: 'Show Milliseconds',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the milliseconds on the timer page'
					}]
			},
			"setShowProgressbar": {
				label: 'Style: Show the progressbar',
				options: [
					{
						type: 'checkbox',
						label: 'Show progressbar',
						id: 'showTime',
						default: false,
						tooltip: 'Show or hide the progress bar'
					}]
			},
			"setShowTextColor": {
				label: 'Style: Show the text in color',
				options: [
					{
						type: 'checkbox',
						label: 'Show color on text',
						id: 'showTime',
						default: false,
						tooltip: 'Show the text in a fitting color to the progress bar'
					}]
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
				label: 'Update interval',
				width: 4,
				default: 1000,
			}
		]
	}

	updateConfig(config) {
		this.config = config
		const tThis = this
		this.isReady = false
		this.status(this.STATUS_WARNING, 'Connecting')
		if (this.config.host != undefined && this.config.port != undefined) {
			this.log("info", 'Connecting to http://' + this.config["host"] + ':' + this.config["port"])
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/api/v1/system", "json")().then(function handleList(body) {
				tThis.status(this.STATUS_OK, 'Connected')
				// tThis.log('Connected to ' + this.config.host)
				// tThis.log(body)
				this.isReady = true
			})
		}

	}

	action(action) {
		// Build the base api URL
		const baseUrl = "http://" + this.config.host + ':' + this.config["port"] + "/api/v1"
		const tTemp = this

		// Only allow requests if the server is ready / available
		if (this.isReady) {
			if (action.action == 'setMode') {
				bent('GET', 200, baseUrl + "/set/mode?mode=" + action.options.modeDropdown, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tThis.checkFeedbacks()
					})
				return
			} else if (action.action == 'setShowTime') {
				bent('GET', 200, baseUrl + "/set/layout/showTime?show=" + action.options.showTime, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'setShowMillis') {
				bent('GET', 200, baseUrl + "/set/layout/showMillis?show=" + action.options.showTime, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'setShowProgressbar') {
				bent('GET', 200, baseUrl + "/set/progressbar/show?show=" + action.options.showTime, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'setShowTextColor') {
				bent('GET', 200, baseUrl + "/set/text/enableColoring?enable=" + action.options.showTime, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'playCtrls') {
				bent('GET', 200, baseUrl + "/ctrl/timer/" + action.options.modeDropdown, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			}
		} else {
			this.checkConnection();
		}
	}

	destroy() {
		clearInterval(this.intervalId)
		this.debug('destroy')
	}

}
exports = module.exports = instance