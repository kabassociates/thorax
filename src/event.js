var _destroy = Thorax.View.prototype.destroy,
  _on = Thorax.View.prototype.on,
  _delegateEvents = Thorax.View.prototype.delegateEvents;

_.extend(Thorax.View, {
  _events: [],
  on: function(eventName, callback) {
{{{override.on}}}
    if (typeof eventName === 'object') {
      _.each(eventName, function(value, key) {
        this.on(key, value);
      }, this);
    } else {
      if (_.isArray(callback)) {
        callback.forEach(function(cb) {
          this._events.push([eventName, cb]);
        }, this);
      } else {
        this._events.push([eventName, callback]);
      }
    }
    return this;
  }
});

_.extend(Thorax.View.prototype, {
  freeze: function(options) {
    options = _.defaults(options || {}, {
      dom: true,
      children: true
    });
    this._eventArgumentsToUnbind && this._eventArgumentsToUnbind.forEach(function(args) {
      args[0].off(args[1], args[2], args[3]);
    });
    this._eventArgumentsToUnbind = [];
    this.off();
    if (options.dom) {
      this.undelegateEvents();
    }
    this.trigger('freeze');
    if (options.children) {
      _.each(this.children, function(child, id) {
        child.freeze(options);
      }, this);
    }
  },
  destroy: function() {
    var response = _destroy.apply(this, arguments);
    this.freeze();
    return response;
  },
  on: function(eventName, handler, context) {
{{{override.on}}}
    if (typeof eventName === 'object') {
      //events in {name:handler} format
      if (arguments.length === 1) {
        _.each(eventName, function(value, key) {
          this.on(key, value, this);
        }, this);
      //events on other objects to auto dispose of when view frozen
      } else if (arguments.length > 1) {
        if (!this._eventArgumentsToUnbind) {
          this._eventArgumentsToUnbind = [];
        }
        var args = Array.prototype.slice.call(arguments);
        this._eventArgumentsToUnbind.push(args);
        args[0].on.apply(args[0], args.slice(1));
      }
    } else {
      (_.isArray(handler) ? handler : [handler]).forEach(function(handler) {
        var params = eventParamsFromEventItem(eventName, handler, context || this);
        if (params.type === 'DOM') {
          //will call _addEvent during delegateEvents()
          if (!this._eventsToDelegate) {
            this._eventsToDelegate = [];
          }
          this._eventsToDelegate.push(params);
        } else {
          this._addEvent(params);
        }
      }, this);
    }
    return this;
  },
  delegateEvents: function(events) {
    this.undelegateEvents();
    if (events) {
      if (_.isFunction(events)) {
        events = events.call(this);
      }
      this._eventsToDelegate = [];
      this.on(events);
    }
    this._eventsToDelegate && this._eventsToDelegate.forEach(this._addEvent, this);
{{{override.constructor-after}}}
  },
  //params may contain:
  //- name
  //- originalName
  //- selector
  //- type "view" || "DOM"
  //- handler
  _addEvent: function(params) {
    if (params.type === 'view') {
      params.name.split(/\s+/).forEach(function(name) {
        _on.call(this, name, params.handler, params.context || this);
      }, this);
    } else {
      var boundHandler = containHandlerToCurentView(bindEventHandler.call(this, params.handler), this.cid);
      if (params.selector) {
        //TODO: determine why collection views and some nested views
        //need defered event delegation
        var name = params.name + '.delegateEvents' + this.cid;
        if (typeof jQuery !== 'undefined' && $ === jQuery) {
          _.defer(_.bind(function() {
            this.$el.on(name, params.selector, boundHandler);
          }, this));
        } else {
          this.$el.on(name, params.selector, boundHandler);
        }
      } else {
        this.$el.on(name, boundHandler);
      }
    }
  }
});

var eventSplitter = /^(\S+)(?:\s+(.+))?/;

var domEvents = [
  'mousedown', 'mouseup', 'mousemove', 'mouseover', 'mouseout',
  'touchstart', 'touchend', 'touchmove',
  'click', 'dblclick',
  'keyup', 'keydown', 'keypress',
  'submit', 'change',
  'focus', 'blur'
];
var domEventRegexp = new RegExp('^(' + domEvents.join('|') + ')');

function containHandlerToCurentView(handler, cid) {
  return function(event) {
    var view = $(event.target).view({helper: false});
    if (view && view.cid == cid) {
      handler(event);
    }
  }
}

function bindEventHandler(callback) {
  var method = typeof callback === 'function' ? callback : this[callback];
  if (!method) {
    throw new Error('Event "' + callback + '" does not exist');
  }
  return _.bind(method, this);
}

function eventParamsFromEventItem(name, handler, context) {
  var params = {
    originalName: name,
    handler: typeof handler === 'string' ? this[handler] : handler
  };
  if (name.match(domEventRegexp)) {
    var match = eventSplitter.exec(name);
    params.name = match[1];
    params.type = 'DOM';
    params.selector = match[2];
  } else {
    params.name = name;
    params.type = 'view';
  }
  params.context = context;
  return params;
}
