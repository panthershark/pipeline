// This test will calculate tax and gratuity on a price.
var opt = require('optimist'),
	packageJSON = require('package.json'),
	argv = opt
		.alias('h', 'help')
		.alias('?', 'help')
		.describe('help', 'Display help')
		.usage('Test for ' + packageJSON.name + '.\n\nVersion: ' + packageJSON.version + '\nAuthor: ' + packageJSON.author.name + 
				'\nExample: node tests/gratuity -p 118.93 -g 0.18 -t 0.0525'
		)
		.alias('p', 'price')
		.describe('price', 'Price of the bill.  (float)')
		.alias('t', 'tax')
		.describe('tax', 'Tax rate in decimal.  Default: 0.0825 (8.25%)')
		.alias('g', 'gratuity')
		.describe('gratuity', 'Gratuity to calculate. Default: 0.20 (20%)')
		.argv;

if(argv.help) {
	opt.showHelp();
	return;
}



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
	






