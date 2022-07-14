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
		const tThis = this

		this.actions() // export actions
		this.status(this.STATUS_WARNING, 'Connecting')
		this.isReady = false
		if (this.config.host != undefined) {
			// this.log("info", 'Connecting to ' + this.config["host"] + ':' + this.config["port"])
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/api/v1/system", "json")().then(function handleList(body) {
				tThis.status(tThis.STATUS_OK, 'Connected')
				tThis.log('Connected to ' + tThis.config.host)
				tThis.isReady = true
			})
		}
		// this.variables()
		/*this.intervalId = setInterval(function handleInterval() {
			tThis.log("info", "Updating variables")
			tThis.updateVariables()
		}, this.config.refreshTime)*/

	}


	checkConnection() {
		if (this.isReady) {
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/api/v1/system", "json")().then(function handleList(body) {
				tThis.status(tThis.STATUS_OK, 'Connected')
			}).catch(function handleError(err) {
				tThis.status(tThis.STATUS_ERROR, 'Not connected')
				tThis.log('Not connected')
			})
		}
	}

	updateVariables() {
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
			/*{
				type: 'number',
				id: 'refreshTime',
				label: 'Update interval',
				width: 4,
				default: 1000,
			},*/
		]
	}

	updateConfig(config) {
		this.config = config
		const tThis = this
		this.isReady = false
		this.status(this.STATUS_WARNING, 'Connecting')
		if(this.config.host != undefined && this.config.port != undefined){
			this.log("info", 'Connecting to http://' + this.config["host"] + ':' + this.config["port"])
			bent('GET', 200, "http://" + this.config.host + ':' + this.config["port"] + "/api/v1/system", "json")().then(function handleList(body) {
				tThis.status(this.STATUS_OK, 'Connected')
				tThis.log('Connected to ' + this.config.host)
				tThis.log(body)
				this.isReady = true
			})
		}

	}

	action(action) {
		const baseUrl = "http://" + this.config.host + ':' + this.config["port"] + "/api/v1"
		const tTemp = this
		if (this.isReady) {
			if (action.action == 'setMode') {
				bent('GET', 200, baseUrl + "/set/mode?mode=" + action.options.modeDropdown, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'setShowTime') {
				console.log(baseUrl + "/set/layout/showTime?show=" + action.options.showTime)
				bent('GET', 200,  baseUrl + "/set/layout/showTime?show=" + action.options.showTime, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'setShowMillis') {
				console.log(baseUrl + "/set/layout/showMillis?show=" + action.options.showTime)
				bent('GET', 200,  baseUrl + "/set/layout/showMillis?show=" + action.options.showTime, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'setShowProgressbar') {
				console.log(baseUrl + "/set/progressbar/show?show=" + action.options.showTime)
				bent('GET', 200,  baseUrl + "/set/progressbar/show?show=" + action.options.showTime, "json")().then(
					function handleList(body) {
						tTemp.status(tTemp.STATUS_OK, 'Connected')
						tTemp.log('Connected to ' + tTemp.config.host)
						tTemp.log(body)
					})
				return
			} else if (action.action == 'setShowTextColor') {
				console.log(baseUrl + "/set/text/enableColoring?enable=" + action.options.showTime)
				bent('GET', 200,  baseUrl + "/set/text/enableColoring?enable=" + action.options.showTime, "json")().then(
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