pipeline
========

Node.js module for simplifying and sequencing a number of dependent functions and callbacks.

Simple module to performing asynchronous inter-dependent series operations in node.  Unlike other more complicated approaches, this is pure javascript and very small (~100 lines of code with comments).

# Simple example for calculating gratuity
This example is in the tests folder.  It is basic and does not fully test all error conditions, but it is a good way to get the hang of the module.

``` javascript
var pipeline = require('../index.js'),
	pl = pipeline.create("Tax and Gratuity Calculator");


pl.on('end', function(err, results) {
	if (err) {
		console.log(err);
		return;
	}

	console.log("Raw results" + JSON.stringify(results, 2) );
	var currency = ' ' + results[0].currency,
		symbol = results[0].symbol,
		price = Number(results[0].price),
		tax = Number(results[1].tax),
		gratuity = Number(results[2].gratuity);

	console.log("Price: " + symbol + price.toFixed(2) + currency);
	console.log("Tax: " + symbol + tax.toFixed(2) + currency);
	console.log("Total: " + symbol + (price + tax).toFixed(2) + currency);
	console.log("Gratuity: " + symbol + gratuity.toFixed(2) + currency);
	console.log("Total with Gratuity: " + symbol + (price + tax + gratuity).toFixed(2) + currency);

	process.exit();
});


pl.use(function(results, next) {
	var init = results[0],
		price = Number(init.price),
		taxrate = Number(init.taxrate);

	// async callback error style
	if (isNaN(price)) {
		next('Price is not a number: ' + price);
	}

	// Before async style quick error condition.
	if (isNaN(taxrate)) {
		return 'Tax rate is not a number: ' + taxrate;
	}

	// there is no blocking here so this will actually turn out to be synchronous.
	next(null, { tax : price * taxrate });

}, "Calculate Tax");


pl.use(function(results, next) {
	var init = results[0],
		price = Number(init.price),
		tax = results.length > 1 ? Number(results[1].tax) : NaN,
		gratuityrate = Number(init.gratuityrate),
		taxprice = price + tax;
		
	// Before async style quick error condition.
	if (isNaN(price)) {
		return 'Price is not a number: ' + price;
	}

	// async callback error style
	if (isNaN(gratuityrate)) {
		next('Gratuity rate is not a number: ' + gratuityrate);
		return;
	}

	// push to next tick just to test async callbacks.
	process.nextTick( function() {
		next(null, { gratuity : taxprice * gratuityrate }) 
	});

}, "Calculate Gratuity");


pl.execute({
	currency: "USD",
	symbol: "$",
	price: argv.price || 0,
	taxrate: argv.tax || 0.0825,
	gratuityrate: argv.gratuity || "0.25"
});
```