pipeline
========

Node.js module for simplifying and sequencing a number of dependent functions and callbacks.

Simple module to performing asynchronous inter-dependent series operations in node.  Unlike other more complicated approaches, this is pure javascript and very small (~100 lines of code with comments).

# Install
```
npm install node-pipeline
```

# Simple example for calculating gratuity
This example is in the tests folder.  It is basic and does not fully test all error conditions, but it is a good way to get the hang of the module.

``` javascript
var pipeline = require('../index.js'),
	pl = pipeline.create("Tax and Gratuity Calculator");

pl.on('end', function(err, results) {
	if (err) {
		console.log('Error in pipeline: ' + err);
	}

	console.log("Raw results" + JSON.stringify(results, 2) );
	process.exit();
});


pl.use(function(results, next) {
	var price = Number(results[0].price),
		taxrate = Number(results[0].taxrate);

	next(null, { tax : price * taxrate });
});


pl.use(function(results, next) {
	var price = Number(results[0].price),
		tax = Number(results[1].tax),
		gratuityrate = Number(results[0].gratuityrate);

	next(null, { gratuity : (price + tax) * gratuityrate }) 
});


pl.execute({
	currency: "USD",
	symbol: "$",
	price: argv.price || 0,
	taxrate: argv.tax || 0.0825,
	gratuityrate: argv.gratuity || "0.25"
});
```