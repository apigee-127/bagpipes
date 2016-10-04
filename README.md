# Bagpipes

[![Build Status](https://travis-ci.org/apigee-127/bagpipes.svg?branch=travis-ci)](https://travis-ci.org/apigee-127/bagpipes)

[![Coverage Status](https://coveralls.io/repos/github/apigee-127/bagpipes/badge.svg?branch=master)](https://coveralls.io/github/apigee-127/bagpipes?branch=master)


### NOTE: THIS IS PRE-RELEASE SOFTWARE - SUBJECT TO CHANGE ###

** Quick Reference links: **

* [Installation](#installation)
* [Pipes](#pipes)
	* [Parallel Execution](#parallel-execution)
	* [Context](#context)
	* [Error Handling](#error-handling)
* [Fittings](#fittings)
	* [System Fittings](#system-fittings)
	* [User Defined Fittings](#user-defined-fittings)
* [Debugging](#debugging)
* [Change Log](#change-log)

## What is Bagpipes?

Bagpipes was developed as a way to enable API flows and mashups to be created declaratively in YAML (or JSON)
without writing code. It works a lot like functional programming... there's no global state, data is just
passed from one function to the next down the line until we're done. (Similar to connect middleware.)

For example, to expose an API to get the latitude and longitude of an address using Google's Geocode API, one
could simply define a flow that looks like this:

```yaml
 # 1. Define a http callout we'll use in our pipe
 google_geocode:
   name: http
   input:
     url: http://maps.googleapis.com/maps/api/geocode/json?sensor=true  
     params:
       address: .request.parameters.address.value[0]

 # 2. Defined the pipe flow we'll play
 getAddressLocation:
   - google_geocode            # call the fitting defined in this swagger
   - path: body                # system fitting: get body from output
   - parse: json               # body is a json string, parse to object
   - path: results             # get results from body
   - first                     # get first result
   - path: geometry.location   # output = { lat: n, lng: n }
```

But that's just a quick example, you can do much, much more... including filtering, error handling, and even
parallel handling like mashup HTTP requests to multiple services.

## Getting started

Here's a simple, self-contained "Hello, World" example you can run:

```js
var bagpipes = require('bagpipes');

var pipesDefs =  {
  HelloWorld: [
    { emit: 'Hello, World!' }
  ]
};

var pipesConfig = {};
var pipes = bagpipes.create(pipesDefs, pipesConfig);
var pipe = pipes.getPipe('HelloWorld');

// log the output to standard out
pipe.fit(function(context, cb) {
  console.log(context.output);
  cb(null, context);
});

var context = {};
pipes.play(pipe, context);
```

As you can see, the pipe in the hello world above is defined programmatically. This is perfectly ok, but 
in general, you'll probably want load your pipe definitions from a YAML file something like this:

```yaml
HelloWorld:
  - emit: 'Hello, World!'
```

```js
var bagpipes = require('bagpipes');
var yaml = require('js-yaml');

var pipesDefs = yaml.safeLoad(fs.readFileSync('HelloWorld.yaml'));
var pipes = bagpipes.create(pipesDefs, pipesConfig);
var pipe = pipes.getPipe('HelloWorld');

// log the output to standard out
pipe.fit(function(context, cb) {
  console.log(context.output);
  cb(null, context);
});

var context = {};
pipes.play(pipe, context);
```

Either way, have fun!

## Fittings

So what are these things called "fittings"? Well, simply, if a pipe is a list of steps, a fitting describes
what a single step actually accomplishes.

Let's take a very simple example: Say we have some data that looks like this:

```js
[ { "name": "Scott", "city": "Los Angeles" }
  { "name": "Jeff", "city": "San Francisco" } ]
```

Now, we'll create a pipe that just retrieves the first name. In the definition below, we've defined a pipe called
"getFirstUserName" that consists of a couple of system-provided fittings:

```yaml
 getFirstUserName:
   - first
   - path: name
```

The "first" fitting selects the first element of an array passed in. The "path" fitting selects the "user" attribute
 from the object passed on by the first fitting. Thus, the result from our example is "Scott".

Or, say we want to get all the names from our data as an array. We could simply do it like this:

```yaml
 getUserNames:
   - pick: name
```

Obviously, these are trivial examples, but you can create pipes as long and as complex as you wish. In fact, you can
even write your own special-purpose fittings. We'll get to that [later](#user-defined-fittings).

### Fitting Definition

When you want to use a fitting in your pipe, you have 2 options:

1. A system or user fitting with zero or one input can be defined in-line, as we have shown above.
2. A fitting with configuration or more complex inputs may need to be defined before use.

Let's look at the 2nd type. Here's an example of a fitting that calls out to an API with a  URL that looks like
something like this: http://maps.googleapis.com/maps/api/geocode/json?sensor=true?address=Los%20Angeles. And, of
course, we'll want to make the address dynamic. This requires a a little bit of configuration: We need to tell the
"http" fitting the URL, the operation, and what parameters to use (and how to get them):

```yaml
 geocode:
   name: http
   input:
     operation: get
     url: http://maps.googleapis.com/maps/api/geocode/json
     params:
       sensor: true
       address: .output.address[0]
```

As you can see above, we've give our fitting a name ("geocode") and specified which type of fitting we're creating
(a "system" fitting called "http"). This fitting requires several inputs including the HTTP operation, the URL, and
parameters to pass. Each of these is just a static string in this case except for the "address" parameter. The
address is merely retrieved by picking the "address" property from the "output" object of whatever fitting came
before it in the pipe. (Note: There are several options for input sources that will be defined later.)

By default, the output of this operation will be placed on the pipe in the "output" variable for the next fitting
to use - or to be returned to the client if it's the last fitting to execute.

-----

# Reference

## Pipe

A Pipe is just defined in YAML as an Array. It can be reference by its key and can reference other pipes and fittings by
their keys. Each step in a pipe may be one of the following:

1. A pipe name
2. A fitting name (with an optional value)
3. An set of key/value pairs defining pipes to be performed in parallel

If a fitting reference includes a value, that value will be emitted onto the output for the fitting to consume. Most
of the system fittings are able to operate solely on the output without any additional configuration - similar to a
Unix pipe.

### Parallel Execution

Generally, a pipe flows from top to bottom in serial manner. However, in some cases it is desirable to execute two
pipes in parallel (for example, a mashup of two external APIs).

Parallel execution of pipes can be done by using key/value pairs on the pipe in place of a single step. The output
from each pipe will be assigned to the key associated with it. It's probably easiest to explain by example:

```yaml
getRestaurantsAndWeather:
  - getAddressLocation
  - restaurants: getRestaurants
    weather: getWeather
```

This pipe will first flow through getAddressLocation step. Then, because the restaurants and weather keys are both on
the same step, it will execute the getRestaurants and getWeather pipes concurrently. The final output of this pipe
will be an object that looks like this: { restaurants: {...}, weather: {...} } where the values will be the output
from the respective pipes.

### Context

The context object that is passed through the pipe has the following properties that should be generally used by the
fittings to accept input and deliver output via the pipe to other fittings or to the client:

* **input**: the input defined in the fitting definition (string, number, object, array)
* **output**: output to be delivered to the next fitting or client

In addition, the context has the following properties that should not be modified - and, in general, you shouldn't
need to access them at all:

* **_errorHandler**: the pipe played if an error occurs in the pipe 
* **_finish**: a final fitting or pipe run once the pipe has finished (error or not) 

Finally, the context object itself will contain any properties that you've assigned to it via the 'output' option on 
your fitting definition.

Notes:

The context object is extensible as well. The names listed above as well as any name starting with '_' should be
considered reserved, but you may assign other additional properties to the context should you need it for communication
between fittings (see also the [memo](#memo) fitting).

### Error Handling

You may install a custom error handler pipe by specifying them using the system [onError](#onError) fitting. (As
you might guess, this actually sets the _errorHandler property on context.)

## Fittings

All fittings may have the following values (all of which are optional):

* **type**: one of: system, user, swagger, node-machine
* **name**: the name of the fitting of the type specified
* **config**: static values passed to the fitting during construction
* **input**: dynamic values passed to the fitting during execution
* **output**: The name of the context key to which the output value is assigned

#### Type

If type is omitted (as it must be for in-line usage), Bagpipes will first check the user fittings then the
system fittings for the name and use the first fitting found. Thus be aware that if you define a fitting with the
same name as a system one, your fitting will override it.

#### Input

The **input** may be a hash, array, or constant. The value or sub-values of the input is defined as either:

* a constant string or number value
* a **reference** to a value

A **reference** is a value populated either from data on the request or from the output of previous fittings on the
pipe. It is defined like so:

```yaml
 key:            # the variable name (key) on context.input to which the value is assigned
   path: ''      # the variable to pick from context using [json path syntax](https://www.npmjs.com/package/jspath)
   default: ''   # (optional) value to assign if the referenced value is undefined
```

Note: If there is no input definition, input will be assigned to the prior fitting's output. 

See also [Context](#context) for more information.


#### System Fittings

There are 2 basic types of system fittings: Internal fittings that just modify output in a flow and those that are
callouts to other systems. These are listed below by category:

##### Internal Fittings

###### amend: input

Amend the pipe output by copying the fields from input. Overrides output. Input and output must be objects.

###### emit: input

Emit the fitting's input onto onto the pipe output.

###### eval: 'script'

Used for testing and will likely be removed, but evaluates provided javascript directly.

###### first

Select the first element from an array.

###### jspath: jspath

Selects output using [json path](https://www.npmjs.com/package/jspath) syntax.

###### memo: key

Saves the current context.output value to context[key]. Can be later retrieved via:

```yaml
emit:
  name: key
  in: context
```

###### omit: key | [ keys ]

Omit the specified key or keys from an object.

###### onError: pipename

In case of error, redirect the flow to the specified pipe.

###### parallel: [ pipenames ]

Run multiple pipe flows concurrently. Generally not used directly (use shorthand syntax on pipe).

###### parse: json

Parses a String. Currently input must be 'json'.

###### path: path

Selects an element from an object by dot-delimited keys.

###### pick: key | [ keys ]

Selects only the specified key or keys from an object.

###### render: string | @filename

Render the object using a mustache template specified as the string or loaded from the filename in the user view
directory.

###### values

Select the values of an object as an array.

##### Callout Fittings

###### http

Make a call to a URL.

config keys:

* baseUrl (optional)

input keys:

* url    (optional: default = context.output)
* method (optional: default = get) (get, post, put, delete, patch, etc.)
* params (optional) key/value pairs
* headers (optional) key/value pairs

output:

{
  status: statusCode
  headers: JSON string
  body: JSON string
}


#### User Defined Fittings

The user fitting is a custom function you can write and place in the fittings directory. It requires the following
values:

* **name**: the javascript module name in the 'fittings' folder

```
 exampleUserFitting:
   name: customizeResponse
```

Javascript implementation:

A user fitting is a fitting defined in the user's fittings directory. It exposes a creation function that accepts a
fittingDefinition and the swagger-pipes configuration. This function is executed during parsing. Thus, it should access 
the fittingDef.config (if any) and create any static resources at this time.

The creation function returns an execution function that will called during pipe flows. This function accepts a
context object and a standard javascript asynchronous callback. When executed, this function should perform its
intended function and then call the callback function with (error, response) when complete. 

Here's an example fitting that will query Yelp for businesses near a location with an input of 
{ latitude: n, longitude: n }:

```js
var Yelp = require('yelp');
var util = require('util');

module.exports = function create(fittingDef, bagpipes) {

  var yelp = Yelp.createClient(fittingDef.config);

  return function yelp_search(context, cb) {

    var input = context.input;

    var options = {
      term: input.term,
      ll: util.format('%s,%s', input.latitude, input.longitude)
    };

    yelp.search(options, function(error, data) {

      if (error) { return cb(error); }
      if (data.error) { return cb(data.error); }

      cb(null, data.businesses);
    });
  }
};
```

#### Swagger fittings

** Experimental **

You can access Swagger APIs by simply loading that Swagger. A Swagger fitting expects this:

* **type**: 'swagger'
* **url**: url to the swagger definition

```yaml
 exampleSwaggerFitting:
   type: swagger
   url: http://petstore.swagger.io/v2/swagger.json
```

#### Node-machine fittings

** Experimental **

A node-machine is a self-documenting component format that we've adapted to the a127 (see [http://node-machine.org]()).
You can use a node-machine just by using 'npm install' and declaring the fitting. The fitting definition expects a
minimum of:

* **type**: 'node-machine'
* **machinepack**: the name of the machinepack
* **machine**: the function name (or id) of the machine

```yaml
 exampleNodeMachineFitting:
   type: node-machine
   machinepack: machinepack-github
   machine: list-repos
```

#### Connect-middleware fittings

** Experimental **

Connect-middleware fittings are special-purpose fittings provided as a convenience if you want to call out to any
connect middleware that you have. Before calling a connect-middleware fitting, you must set a `request` and `response` 
property on context with appropriate values from your request chain. These will be passed to the associated connect 
middleware. Also, you must have passed in to the bagpipes configuration a value for connectMiddlewareDirs. 
Be aware, however, as these controllers almost certainly interact directly with the response and aren't designed for 
use within the Bagpipes system, either appropriately wrap the response object or use this option with caution.

* **type**: 'connect-middleware'
* **module**: the name of the file or module to load from your middleware directory
* **function**: the exported function to call on the middleware

```yaml
 exampleMiddlewareFitting:
   type: connect-middleware
   module: my_module
   function: someFunction
```

## Debugging

Currently, debugging is limited to reading log entries and the debugger. However, there is a lot of information
available to you by enabling the DEBUG log. By enabling the DEBUG=pipes log, you will be able to see the entire
flow of the swagger-pipes system sent to the console:

    DEBUG=pipes

You can get more debug information from the fittings with:

    DEBUG=pipes:fittings

You can also emit the actual output from each step by enabling pipes:content:

    DEBUG=pipes:content

Finally, you can enable all the pipes debugging by using a wildcard:

    DEBUG=pipes*

## Change Log



Enjoy!
