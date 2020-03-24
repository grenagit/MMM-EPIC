/* Magic Mirror
 * Module: MMM-EPIC
 *
 * Magic Mirror By Michael Teeuw https://magicmirror.builders
 * MIT Licensed.
 *
 * Module MMM-EPIC By Grena https://github.com/grenagit
 * MIT Licensed.
 */

Module.register("MMM-EPIC",{

	// Default module config
	defaults: {
		appid: "",
		updateInterval: 1 * 60 * 60 * 1000, // every 1 hour
		animationSpeed: 1000, // 1 second
		maxMediaWidth: 0,
		maxMediaHeight: 0,
		showDescription: false,

		initialLoadDelay: 0, // 0 seconds delay
		retryDelay: 2500, // 2,5 seconds

		apiBase: "https://api.nasa.gov/",
		epicDataEndpoint: "EPIC/api/natural/images",
		epicImageEndpoint: "EPIC/archive/natural",
	},

	// Define start sequence
	start: function() {
		Log.info("Starting module: " + this.name);

		this.title = null;
		this.description = null;
		this.copyright = null;
		this.type = null;
		this.url = null;
		this.loaded = false;
		this.scheduleUpdate(this.config.initialLoadDelay);
	},

	// Override dom generator
	getDom: function() {
		var wrapper = document.createElement("div");

		if (this.config.appid === "") {
			wrapper.innerHTML = "Please set the correct NASA <i>appid</i> in the config for module: " + this.name + ".";
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		if (!this.loaded) {
			wrapper.innerHTML = this.translate("LOADING");
			wrapper.className = "dimmed light small";
			return wrapper;
		}

		var epicImage = document.createElement('img');

		var styleString = '';
		if (this.config.maxMediaWidth != 0) {
			styleString += 'max-width: ' + this.config.maxMediaWidth + 'px;';
		}
		if (this.config.maxMediaHeight != 0) {
			styleString += 'max-height: ' + this.config.maxMediaHeight + 'px;';
		}
		if (styleString != '') {
			epicImage.style = styleString;
		}

		var year = this.date.getFullYear();
		var month = ('0' + (this.date.getMonth() + 1)).slice(-2);
		var day = ('0' + this.date.getDate()).slice(-2);
		var hour = ('0' + this.date.getHours()).slice(-2);
		var minute = ('0' + this.date.getMinutes()).slice(-2);

		var date = year + "-" + month + "-" + day;
		var time = hour + ":" + minute;

		epicImage.src = this.config.apiBase + this.config.epicImageEndpoint + "/" + year + "/" + month + "/" + day + "/jpg/" + this.image + ".jpg?api_key=" + this.config.appid;
		epicImage.alt = "Picture of Earth on " + date + " at " + time;

		wrapper.appendChild(epicImage);

		var epicCopyright = document.createElement('div');

		epicCopyright.className = "dimmed thin xsmall";
		epicCopyright.innerHTML = "&copy; NASA NOAA";

		wrapper.appendChild(epicCopyright);

		if(this.config.showDescription) {
			var epicDescription = document.createElement('div');

			epicDescription.className = "dimmed light xsmall";

			if (this.config.maxMediaWidth != 0) {
				epicDescription.style = 'max-width: ' + this.config.maxMediaWidth + 'px;';
			} else {
				epicDescription.style = 'max-width: 960px;';
			}

			epicDescription.innerHTML = this.description + " on " + date + " at " + time + ".";

			wrapper.appendChild(epicDescription);
		}

		return wrapper;
	},

	// Request new data from api.nasa.gov
	updateEPIC: function() {
		if (this.config.appid === "") {
			Log.error(this.name + ": APPID not set.");
			return;
		}

		var url = this.config.apiBase + this.config.epicDataEndpoint + "?api_key=" + this.config.appid;
		var self = this;
		var retry = true;

		var epicRequest = new XMLHttpRequest();
		epicRequest.open("GET", url, true);
		epicRequest.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					self.processEPIC(JSON.parse(this.response));
				} else if (this.status === 403) {
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Incorrect APPID.");
					retry = false;
				} else if (this.status === 429) {
					self.updateDom(self.config.animationSpeed);

					Log.error(self.name + ": Rate limit exceeded.");
					retry = false;
				} else {
					Log.error(self.name + ": Could not load EPIC.");
				}

				if (retry) {
					self.scheduleUpdate((self.loaded) ? -1 : self.config.retryDelay);
				}
			}
		};
		epicRequest.send();
	},

	// Use the received data to set the various values before update DOM
	processEPIC: function(data) {
		if(data.length > 0) { data = data[data.length-1]; }
		if (!data || typeof data.image === "undefined") {
			Log.error(this.name + ": Do not receive usable data.");
			return;
		}

		this.date = new Date(data.date);
		this.description = data.caption;
		this.image = data.image;

		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},

	// Schedule next update
	scheduleUpdate: function(delay) {
		var nextLoad = this.config.updateInterval;
		if (typeof delay !== "undefined" && delay >= 0) {
			nextLoad = delay;
		}

		var self = this;
		setTimeout(function() {
			self.updateEPIC();
		}, nextLoad);
	}

});
