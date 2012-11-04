simplerXDM - simpler Cross-Domain Messaging
===========================================

Inspired by easyXDM <http://easyxdm.net/>

How simplerXDM works 
---------------
simplerXDM uses browser PostMessage and JSON APIs which are supported by:
* IE8+
* Opera 9+ (support for both Operas old standard and the HTML5 standard)
* Firefox 3+
* Safari 4+
* Chrome 2+

How to use simplerXDM
------------------

When using simplerXDM you first load the *consumer* document and then **let simplerXDM load** the *provider*. This is by default done in a hidden iframe, but you can also configure easyXDM to display the iframe in a specific container, and with a specific style attached. 

To set up a simple XDM this is what you will need to add to the *consumer*

```javascript
    var rpc = new finamtrade.simplerXDM({
        url: "http://path.to/provider.html", // the path to the provider
        local: {
            helloWorld: function(successFn, errorFn) {
                // here we expose a simple method with no arguments
                // if we want to return a response, we can use `return ....`,
                // or we can use the provided callbacks if the operation is async
                // or an error occurred
            }
        },
        remote: {
            helloWorld:{
                // here we tell the XDM object to stub a method helloWorld for us
            }
        }
    });
```
These properties can be set only on the consumer:
* `parameters` {Object} - set additional parameters to provider url like 'parameters: {myQuery: "value"}'
* `container` {String || DOMElement} - Set this to an id or element if you want the iframe to be visible for interaction.
* `props` {Object} - The key/value pairs of this object will be deep-copied onto the iframe. As an example, use `props: {style: {border: "1px solid red"} }` to set the border of the iframe to 1px solid red.
* `onReady` - If you set this to a function, then this will be called once the communication has been established.

Call the methods like this 

```javascript
    rpc.helloWorld(1,2,3, function(response){
        // here we can do something with the return value from `helloWorld`
    }, function(errorObj){
        // here we can react to a possible error
    };
```

And this is what's needed for the *provider*

```javascript
    var rpc = new finamtrade.simplerXDM({
        local: {
            helloWorld: function(one, two, three, successFn, errorFn){
                // here we expose a simple method with three arguments
                // that returns an object
                return {
                    this_is: "an object"
                };
            }
        },
        remote: {
            helloWorld:{
                // here we tell the XDM object to stub a method helloWorld for us
            }
        }
    });
```

Call the methods like this 

```javascript
    rpc.helloWorld();
```
When calling the stubs you can provide up to two callback functions after the expected arguments, the first one being the method that will receive the callback in case of a success, and the next the method that will receive the callback in case of an error.

If an error occurs in the execution of the stubbed method then this will be caught and passed back to the error handler. This means that you in the body of the exposed method can use ` throw "custom error";` to return a message, or you can pass a message, and an optional object containing error data to the error callback.
If the error handler is present, then this will be passed an object containing the properties

* `message` {String} - The message returned from the invoked method
* `data` {Object} - The optional error data passed back.

Provider can be teared down (iframe removed etc) using 

```javascript
    rpc.destroy();
```

License
=======
simplerXDM is distributed under the MIT license. Please keep the exisisting headers.

Attribution
======
Main developer:
 - <nordlig.ulv@gmail.com>, Andrey Korzhevskiy

Thanks to [Øyvind Sean Kinsey](http://easyxdm.net/) - creator of easyXDM
