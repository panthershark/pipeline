var util = require("util"),
    events = require('events');

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

exports.create = function(name) {
	return new Pipeline(name);
};

var Pipeline = function(name) {
	var that = this;

	this.name = name || '';
	this.steps = [];
	this.timeout = 0;
	this.timeoutId = null; // used to clear timeouts.
	this.reset();  // sets some defaults.

	this.on('step', function(name, action) {
		if (typeof(setImmediate) === 'function') {
			setImmediate(action);
		}
		else {
			setTimeout(action, 0);
		}
	});

	this.on('next', function(err, params) {
		that.execute(err, params);
	});
};

util.inherits(Pipeline, events.EventEmitter);


// Adds a  function to the chain.
// @fn (function): The function to execute in form of fn(err, data) for that step.
// @name (string): Optional friendly string for the step.  Names are here to support a future feature where an event can be emitted when a step starts and completes.
Pipeline.prototype.use = function(fn, name) {
	this.steps.push({ name: name, run: fn });
	return this;
};

// Start the execution of the pipeline.  Initial execution can be called like this:  pl.execute({ foo: "moo", poo: "doo" })
// @err (Object): An standard convention callback param for reporting errors.
// @params (Object): The initial object state for the pipeline or the callback for a given step.  The initial params are available at index zero of the results array that carries state thorugh the call cycle.
Pipeline.prototype.execute =function(err, params) {
	var p = Array.prototype.slice.call(arguments, arguments.length - 1),
		that = this,
		step = this.steps[this.currentStep],
		action = null,
		dtNow = new Date();

	this.results.push( p.length > 0 ? p[0] : null );

	// first run, start the timer
	if (this.timeout > 0 && this.timing.length == 0) {
		if (this.timeoutId) {
			clearTimeout(this.timeoutId);
		}
		this.timeoutId = setTimeout(this.timeoutElapsed.bind(this), this.timeout);
	}

	// start tracking the timer
	this.timing.push({ 
		step: step ? step.name : 'END',
		timestamp: dtNow
	});

	// if the err was thrown on a step, then abort the pipeline
	// alternately if there are no more steps, then end.
	if ( (this.currentStep > 0 && err) || this.currentStep >= this.steps.length) {
		this.end(err);
		return this;
	}

	action = (function(r, n) {

			// catch an error instantiating step.  Callback also has err field to report errors on callbacks.
			try {
				var err = step.run(r, n);
				if (err) {
					throw err;
				}
			} catch (e) {
				this.end(e);
			}

		}).bind(this, this.results, this.next.bind(this));

	// execute the step.
	this.currentStep++;
	this.emit('step', { pipeline: this, step: step.name }, action);

	return this;
	
};

// Start the execution of the pipeline.  Initial execution can be called like this:  pl.execute({ foo: "moo", poo: "doo" })
// @err (Object): An standard convention callback param for reporting errors.
// @params (Object): The initial object state for the pipeline or the callback for a given step.  The initial params are available at index zero of the results array that carries state thorugh the call cycle.
Pipeline.prototype.next =function(err, params) {
	this.emit('next', err, params);
};

Pipeline.prototype.reset = function() {
	this.currentStep = 0;
	this.results = [];
	this.timing = []; 
	this.finished = false;
	return this;
};

Pipeline.prototype.end = function(err) {
	var endListeners = this.listeners('end'),
		that = this,
		cleanup = function() { 
			that.finished = true;

			// remove all end listeners since this pipeline is complete.
			that.removeAllListeners('end');
		};
	
	this.stop();

	if (!this.finished) {

		this.on('end', cleanup);
		this.emit('end', err, this.results)
	}
};

Pipeline.prototype.stop =  function() {
	// by setting the currentStep, this will allow any pending async ops to finish before actually stopping.
	this.currentStep = this.steps.length;
	if (this.timeoutId) {
		clearTimeout(this.timeoutId);
	}
	return this;
};

Pipeline.prototype.timeoutElapsed = function() {
	if (this.timeout > 0 && this.timing.length > 0) {

		// if timeout has expired, then abort pipeline and emit timeout error
		this.end(new Error("Pipeline timeout."));
	}
	return this;
};
