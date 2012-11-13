(function(window, undefined) {

    var document = window.document,
        location = window.location,
        ft = window.finamtrade;

    if (!ft) {
        window.finamtrade = ft = {};
    }
    if (!!ft.XDM) {
        return;
    }

    function isFunction(f) {
        return typeof f == "function";
    }

    function isString(s) {
        return typeof s == "string";
    }

    function isObject(obj) {
        return obj != null && typeof obj == "object";
    }

    function noop() {
    }

    //https://developer.mozilla.org/ru/docs/JavaScript/Reference/Global_Objects/Array/isArray
    if (!Array.isArray) {
        var ObjectToString = Object.prototype.toString;
        Array.isArray = function (o) {
            return ObjectToString.call(o) == "[object Array]";
        };
    }

    function postMessage(target, data, origin) {
        if (window.addEventListener) {
            target.postMessage(data, origin);
        } else {
            //postMessage is synchronous in IE 8, so we wrap it in setTimeout
            setTimeout(function () {
                target.postMessage(data, origin);
            }, 0);
        }
    }

    function addEventListener(target, event, handler) {
        if (target.addEventListener) {
            target.addEventListener(event, handler, false);
        } else {
            target.attachEvent("on" + event, handler);
        }
    }

    function removeEventListener(target, event, handler) {
        if (target.removeEventListener) {
            target.removeEventListener(event, handler, false);
        } else {
            target.detachEvent("on" + event, handler);
        }
    }

    function getLocation(url) {
        if (/^file:/.test(url)) {
            throw "The file:// protocol is not supported";
        }
        var reURI = /^((http.?:)\/\/([^:\/\s]+)(:\d+)*)/, // returns groups for protocol (2), domain (3) and port (4)
            m = url.toLowerCase().match(reURI),
            proto = m[2], domain = m[3], port = m[4] || "";
        if ((proto == "http:" && port == ":80") || (proto == "https:" && port == ":443")) {
            port = "";
        }
        return proto + "//" + domain + port;
    }

    function getOrigin(event) {
        if (event.origin) {
            // This is the HTML5 property
            return getLocation(event.origin);
        }
        if (event.uri) {
            // From earlier implementations
            return getLocation(event.uri);
        }
        if (event.domain) {
            // This is the last option and will fail if the
            // origin is not using the same schema as we are
            return location.protocol + "//" + event.domain;
        }
        throw "Unable to retrieve the origin of the event";
    }

    function getQuery() {
        var data = {},
            pair,
            input = location.search.substring(1).split("&"),
            i = input.length;
        while (i--) {
            pair = input[i].split("=");
            data[pair[0]] = decodeURIComponent(pair[1]);
        }
        return data;
    }

    function appendQueryParameters(url, parameters) {
        var hash = "",
            hashIndex = url.indexOf("#");
        if (hashIndex != -1) {
            hash = url.substring(hashIndex);
            url = url.substring(0, hashIndex);
        }
        var q = [];
        for (var key in parameters) {
            if (parameters.hasOwnProperty(key)) {
                q.push(key + "=" + encodeURIComponent(parameters[key]));
            }
        }
        return url + (url.indexOf("?") == -1 ? "?" : "&") + q.join("&") + hash;
    }

    function attr(elem, attrs) {
        for (var prop in attrs) {
            if (attrs.hasOwnProperty(prop)) {
                elem.setAttribute(prop, attrs[prop]);
            }
        }
    }

    function apply(destination, source) {
//        var prop, member;
        for (var prop in source) {
            if (source.hasOwnProperty(prop)) {
                destination[prop] = source[prop];
//                if (prop in destination) {
//                    member = source[prop];
//                    if (isObject(member)) {
//                        apply(destination[prop], member);
//                    } else {
//                        destination[prop] = source[prop];
//                    }
//                } else {
//                    destination[prop] = source[prop];
//                }
            }
        }
        return destination;
    }

    function createFrame(container, props) {
        var frame = document.createElement("IFRAME");

        if (!container) {
            // This needs to be hidden like this, simply setting display:none and the like will cause failures in some browsers.
            apply(frame.style, {
                position: "absolute",
                top: "-9999px",
                // Avoid potential horizontal scrollbar
                left: "0"
            });
            container = document.body;
        } else if (isString(container)) {
            container = document.getElementById(container);
        }

        // HACK: IE cannot have the src attribute set when the frame is appended
        //       into the container, so we set it to "javascript:false" as a
        //       placeholder for now.  If we left the src undefined, it would
        //       instead default to "about:blank", which causes SSL mixed-content
        //       warnings in IE6 when on an SSL parent page.
        var src = props.src,
            style = props.style;

        props.src = "javascript:false";

        if (style) {
            delete props.style;
            apply(frame.style, style);
        }

        frame.frameBorder = 0;  //HTML4 only. https://developer.mozilla.org/en-US/docs/HTML/Element/iframe
//        frame.border = 0;
        attr(frame, props);

        container.appendChild(frame);
        frame.src = src;

        return frame;
    }

    function resolveUrl(url) {
        var reParent = /[\-\w]+\/\.\.\//, // matches a foo/../ expression
            reDoubleSlash = /([^:])\/\//g; // matches // anywhere but in the protocol

        // replace all // except the one in proto with /
        url = url.replace(reDoubleSlash, "$1/");

        // If the url is a valid url we do nothing
        if (!url.match(/^(http||https):\/\//)) {
            // If this is a relative path
            var path = (url.substring(0, 1) === "/") ? "" : location.pathname;
            if (path.substring(path.length - 1) !== "/") {
                path = path.substring(0, path.lastIndexOf("/") + 1);
            }

            url = location.protocol + "//" + location.host + path + url;
        }

        // reduce all 'xyz/../' to just ''
        while (reParent.test(url)) {
            url = url.replace(reParent, "");
        }

        return url;
    }

    ft.XDM = function (config) {
        function onMessage(event) {
            var origin = getOrigin(event);
            if (origin == targetOrigin && event.data.substring(0, channel.length + 1) == channel + " ") {
                incoming(event.data.substring(channel.length + 1));
            }
        }

        function waitForReady(event) {
            if (event.data == channel + "-ready") {
                // replace the eventlistener
                callerWindow = ("postMessage" in frame.contentWindow) ? frame.contentWindow : frame.contentWindow.document;
                removeEventListener(window, "message", waitForReady);
                addEventListener(window, "message", onMessage);
                if (isFunction(config.onReady)) {
                    config.onReady();
                }
            }
        }

        function incoming(message) {
            var data = JSON.parse(message);
            if (data.method) {
                // A method call from the remote end
                executeLocalMethod(data.id, localMethods[data.method], data.params);
            } else {
                // A method response from the other end
                var callback = callbacks[data.id];
                if (data.error) {
                    callback.error && callback.error(data.error);
                } else if (callback.success) {
                    callback.success(data.result);
                }
                delete callbacks[data.id];
            }
        }

        function outgoing(data) {
            postMessage(callerWindow, channel + " " + JSON.stringify(data), targetOrigin);
        }

        function createRemoteMethod(method) {
            var slice = Array.prototype.slice;
            return function () {
                var args = arguments,
                    length = args.length,
                    callback,
                    message = {
                        method:method
                    };

                if (length > 0 && isFunction(args[length - 1])) {
                    //with callback, procedure
                    if (length > 1 && isFunction(args[length - 2])) {
                        // two callbacks, success and error
                        callback = {
                            success:args[length - 2],
                            error:args[length - 1]
                        };
                        message.params = slice.call(args, 0, length - 2);
                    } else {
                        // single callback, success
                        callback = {
                            success:args[length - 1]
                        };
                        message.params = slice.call(args, 0, length - 1);
                    }
                    callbacks['' + (++callbackCounter)] = callback;
                    message.id = callbackCounter;
                } else {
                    // no callbacks, a notification
                    message.params = slice.call(args, 0);
                }
                // Send the method request
                outgoing(message);
            };
        }

        function executeLocalMethod(id, fn, params) {
            if (!fn) {
                if (id) {
                    outgoing({
                        id:id,
                        error:{
                            code:-32601,
                            message:"Procedure not found."
                        }
                    });
                }
                return;
            }

            var success,
                error;
            if (id) {
                success = function (result) {
                    success = noop;
                    outgoing({
                        id:id,
                        result:result
                    });
                };
                error = function (message, data) {
                    error = noop;
                    var msg = {
                        id:id,
                        error:{
                            code:-32099,
                            message:message
                        }
                    };
                    if (data) {
                        msg.error.data = data;
                    }
                    outgoing(msg);
                };
            } else {
                success = error = noop;
            }
            // Call local method
            if (!Array.isArray(params)) {
                params = [params];
            }
            try {
                var result = fn.apply(self, params.concat([success, error]));
                if (result !== undefined) {
                    success(result);
                }
            } catch (e) {
                error(e.message);
            }
        }

        function extendRpcMethods(remote, local) {
            apply(localMethods, local);
            apply(remoteMethods, remote);
            for (var name in remote) {
                if (remote.hasOwnProperty(name)) {
                    self[name] = createRemoteMethod(name);
                }
            }
        }

        function destroy() {
            for (var i = 0; i < remoteMethods.length; i++) {
                var method = remoteMethods[i];
                delete self[method];
            }
            removeEventListener(window, "message", waitForReady);
            removeEventListener(window, "message", onMessage);
            if (frame) {
                frame.parentNode.removeChild(frame);
                self.frame = frame = null;
            }
        }

        var self = this,
            callbackCounter = 0,
            callbacks = {},
            callerWindow,
            channel,
            targetOrigin,   // the domain to communicate with
            localMethods = {},
            remoteMethods = {};

        extendRpcMethods(config.remote, config.local);
        if (config.url) {
            var url = config.url,
                frame;
            channel = config.channel || ("default_" + Math.floor(Math.random() * 10000)); // randomize the initial id in case of multiple closures loaded
            targetOrigin = getLocation(url);

            // add the event handler for listening
            addEventListener(window, "message", waitForReady);

            // set up the iframe
            url = resolveUrl(url);

            var parameters = apply({
                    xdm_e:getLocation(location.href),
                    xdm_c:channel
                }, config.params || {}),

                props = apply({
                    src:appendQueryParameters(url, parameters),
                    id:"ft_xdm_provider_" + channel
                }, config.props || {});

            self.frame = frame = createFrame(config.container, props);
            self.extendRpcMethods = extendRpcMethods;
            self.destroy = destroy;
        } else {
            var parent = window.parent,
                query = getQuery(),
                remoteUrl = query.xdm_e.replace(/["'<>\\]/g, "");
            channel = query.xdm_c.replace(/["'<>\\]/g, ""); // anti-XSS protection
            targetOrigin = getLocation(remoteUrl);
            callerWindow = ("postMessage" in parent) ? parent : parent.document; // the window that we will call with, parent.document used in opera

            addEventListener(window, "message", onMessage);
            postMessage(callerWindow, channel + "-ready", targetOrigin);
        }

        return self;
    };

})(window);
