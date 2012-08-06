var _ = require("lodash"),
	util = require("util"),
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
	this.currentStep = 0;
	this.results = [];
	this.steps = [];

	this.on('step', function(name, action) {
		process.nextTick(action);
	});

	this.on('next', function(err, params) {
		process.nextTick( _.bind(that.execute, that, err, params) );
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
	var p = Array.prototype.slice.call(arguments, arguments.length - 1);
	this.results.push( p.length > 0 ? p[0] : null );

	// if the err was thrown on a step, then abort the pipeline
	// alternately if there are no more steps, then end.
	if ( (this.currentStep > 0 && err) || this.currentStep >= this.steps.length) {
		this.stop();
		this.emit('end', err, this.results);
		return this;
	}

	var that = this,
		step = this.steps[this.currentStep],
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
				that.emit('error', e, that.results);
				that.emit('end', e, that.results);
			}

		}, this, this.results, _.bind(this.next, this) );

	// execute the step.
	this.currentStep++;
	this.emit('step', step.name, action);

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
	return this;
};

Pipeline.prototype.stop =  function() {
	// by setting the currentStep, this will allow any pending async ops to finish before actually stopping.
	this.currentStep = this.steps.length;
	return this;
};

