var _ = require("lodash");
/*  Example:

var Pipeline = require("pipeline/Pipeline"),
	job = Pipeline.create(),
	h = require("tests/pipeline/Hello"),
	w = require("tests/pipeline/World");

job.use(new h());
job.use(new w());
job.on("end", function(dictionary) {
	console.log(dictionary.hello + ' ' + dictionary.world);
	process.exit();
});

job.execute();

*/

module.exports.create = function(name) {
	return new Pipeline(name);
};

var Pipeline = function(name) {
	this.name = name || '';
	this.currentStep = 0;
	this.results = [];
	this.events = { 
		step: [],
		end: []
	};
};


var _endExecution = function(err, results) {
	_.each(this.events.end, function(cb) {
		cb(err, results);
	});
};


Pipeline.prototype = {

	// Adds a  function to the chain.
	// @fn (function): The function to execute in form of fn(err, data) for that step.
	// @name (string): Optional friendly string for the step.  Names are here to support a future feature where an event can be emitted when a step starts and completes.
	use: function(fn, name) {
		this.events.step.push({ name: name, run: fn });
	},

	// Start the execution of the pipeline.  Initial execution can be called like this:  pl.execute({ foo: "moo", poo: "doo" })
	// @err (Object): An standard convention callback param for reporting errors.
	// @params (Object): The initial object state for the pipeline or the callback for a given step.  The initial params are available at index zero of the results array that carries state thorugh the call cycle.
	execute: function(err, params) {
		var p = Array.prototype.slice.call(arguments, arguments.length - 1);
		this.results.push( p.length > 0 ? p[0] : null );

		// if the err was thrown on a step, then abort the pipeline
		// alternately if there are no more steps, then end.
		if ( (this.currentStep > 0 && err) || this.currentStep >= this.events.step.length) {
			this.stop();
			_endExecution.call(this, err, this.results);
			return;
		}

		var that = this,
			step = this.events.step[this.currentStep],
			action = _.bind(function(r, n) {

				// catch an error instantiating step.  Callback also has err field to report errors on callbacks.
				try {
					var err = step.run(r, n);
					if (err) {
						throw err;
					}
				} catch (e) {
					// TODO: add stack trace
					that.stop();
					_.bind(_endExecution, that, e, that.results)();
				}

			}, this, this.results, _.bind(this.execute, this) );

		// execute the step.
		this.currentStep++;
		action();
		
	},
	on: function(ev, callback) {
		var found = _.find(["end"], function(key) { return key == ev; });  // currently only support end, but added hook for more.
		if (found && callback) {
			this.events[ev].push(callback);
		}
	},
	reset: function() {
		this.currentStep = 0;
		this.results = [];
	},
	stop: function() {
		// by setting the currentStep, this will allow any pending async ops to finish before actually stopping.
		this.currentStep = this.events.step.length;
	}
};

