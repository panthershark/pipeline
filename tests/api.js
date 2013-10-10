var _ = require('lodash'),
	Pipeline = require('../index'),
	tap = require('tap'),
	test = tap.test,
	http = require('http');

var plFactory = function() {
	var pl = Pipeline.create("Api Test");

	// add logging with event emitter
	pl.on('step', function(data) {
		console.log("Executing step - " + data.pipeline.name + ":" + data.step);
	})

	// execute request
	.use(function(results, next) {
		var url = results[0].url;

		http.get(url, function(res) {
			var body = '';

		 	res.on('data', function(chunk) {
				body += chunk;
			})

			.on('end', function(err) {
				next(err, body);
			});
		});
	}, "Request api")

	// parse body
	.use(function(results, next) {
		var body = results[results.length - 1];
		next(null, JSON.parse(body));
	}, "Parse response")

	// translate result
	.use(function(results, next) {
		var tdata = results[results.length - 1],
			data = {
				query: tdata.query,
				results: _.map(tdata.results, function(r) { 
					return {
						date: r.created_at,
						user: r.from_user,
						content: r.text
					}; 
				})
			};

		next(null, data);
	}, "Translate result");

	return pl;
};


test("Test Pipeline Execution", function(t) {
	var pl = plFactory();

	pl.timeout = 10000;

	pl.on('end', function(err, results) {
		var data = results[results.length - 1];

		if (err) {
			t.notOk(err, "Pipeline should not return error");
		}
		else {
			t.equal(data.results.length, 15, "Twitter should return 15 results");

			_.each(data.results, function(r, i) {
				t.ok(r.date, "Date must exist on record #" + i);
				t.ok(r.user, "User must exist on record #" + i);
				t.ok(r.content, "Content must exist on record #" + i);
			});
		}

		t.end();
	})
	.execute({ url: "http://search.twitter.com/search.json?q=nodejs"})

});


test("Test Pipeline Timeout", function(t) {
	var pl = plFactory();

	pl.timeout = 2000;

	pl.use(function(results, next) { }, "Do nothing so it never calls next")

	.on('end', function(err, results) {
		var data = results[results.length - 1];
		t.equal(err.message, "Pipeline timeout.", "Pipeline should return timeout error");
		t.end();
	})
	.execute({ url: "http://search.twitter.com/search.json?q=nodejs"})


});
