/**********************************************************************
 * jquery.qimhelpers.js
 * version 2.0.0
 *
 * This connects to QiMessaging, and adds a few useful functions to the
 * JQuery namespace.
 *
 * It's convenient for making lightweight web pages.
 *********************************************************************/

(function ($) {
    // When this library is used, a session is immediatly created.
    //$.qim = new QiSession();

    // $.qim.socket().on('connect', function() {
    //     console.log('Qimessaging: connected!');
    // });

    // $.qim.socket().on('disconnect', function() {
    //     console.log('Qimessaging: disconnected!');
    // });

    $.qim = new QiSession(function(session) {
        console.log("connected");
    }, disconnected);

    function disconnected() {
        console.log("disconnected");
    }

    $.onQimError = function (data) {
        console.log("Service error: " + data);
    };

    var servicePromises = {};

    /* Helper function for getting services
     *   - Lighter syntax: $.getService('ALServiceName', function(ALServiceName) {ALServiceName.doThings()});
     *   - Caches services, increasing efficiency
     *   - Warns you for missing services (no need to add fail() callbacks on all your functions)
     */
    $.getService = function(serviceName, doneCallback) {
        if (true && !(serviceName in servicePromises)) {
          servicePromises[serviceName] = $.qim.service(serviceName);
        }
        return servicePromises[serviceName].then(doneCallback, function (error) {
              console.log("Failed getting " + serviceName + ": " + error);
          });
    };


    // Helper function for directly raising an ALMemory event.
    $.raiseALMemoryEvent = function(event, value) {
        return $.getService("ALMemory", function(ALMemory) {
            ALMemory.raiseEvent(event, value);
        });
    };

    function MemoryEventSubscription(event) {
        this._event = event;
        this._internalId = null;
        this._sub = null;
        this._unsubscribe = false;
    }

    MemoryEventSubscription.prototype.setId = function(id) {
        this._internalId = id;
        // as id can be receveid after unsubscribe call, defere
        if (this._unsubscribe) this.unsubscribe(this._unsubscribeCallback);
    };

    MemoryEventSubscription.prototype.setSubscriber = function(sub) {
        this._sub = sub;
        // as sub can be receveid after unsubscribe call, defere
        if (this._unsubscribe) this.unsubscribe(this._unsubscribeCallback);
    };

    MemoryEventSubscription.prototype.unsubscribe = function(unsubscribeDoneCallback)
    {
        if (this._internalId !== null && this._sub !== null) {
            evtSubscription = this;
            evtSubscription._sub.signal.disconnect(evtSubscription._internalId).then(function() {
                if (unsubscribeDoneCallback) unsubscribeDoneCallback();
            }, $.onQimError);
        }
        else
        {
            this._unsubscribe = true;
            this._unsubscribeCallback = unsubscribeDoneCallback;
        }
    };

    // Helper function for subscribing to ALMemory events.
    // Usage:
    //  $.subscribeToALMemoryEvent('myEvent', function(eventValue) {
    //      console.log("Got myEvent: " + value);
    //  });
    //  As an optional third parameter, you can pass a function to be called once
    //  the subscription is successful.
    $.subscribeToALMemoryEvent = function(event, eventCallback, subscribeDoneCallback) {
        var evt = new MemoryEventSubscription(event);
        $.getService("ALMemory", function(ALMemory) {
            ALMemory.subscriber(event).then(function (sub) {
                evt.setSubscriber(sub);
                sub.signal.connect(eventCallback).then(function(id) {
                    evt.setId(id);
                    if (subscribeDoneCallback) subscribeDoneCallback(id);
                }, $.onQimError);
            }, $.onQimError);
        });
        return evt;
    };
})(jQuery);
