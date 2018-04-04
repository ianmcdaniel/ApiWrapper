var ApiWrapper = function(schema, options) {

  var config = {};

  // promises
  var P = function() {
    var callbacks = [];
    var execute = function(type, args) {
      while (callbacks.length) {
        callbacks[0][type].apply(this, args);
        callbacks.shift();
      }
    };
    return {
      resolve: function() {
        execute('fulfilled', arguments);
      },
      reject: function() {
        execute('rejected', arguments);
      },
      then: function(onFulfilled, onRejected) {
        callbacks.push({ 'fulfilled': onFulfilled, 'rejected': onRejected });
        return this;
      }
    };
  };

  // object extend
  function extend(m){
    var i, a = function(d, s, m) {  
      for (var k in s) if (hasOwnProperty.call(s, k)) 
        (m && k in d && typeof(d[k]) == 'object' && typeof(s[k]) == 'object') ? a(d[k], s[k], m) : d[k] = s[k];
      return d;
    }
    var d = arguments[m===true?1:0]
    for(i=1;i<arguments.length; i++) d = a(d, arguments[i], m===true);
    return d;
  }

  function serialize(obj, prefix) {
    var str = [];
    for(var p in obj) {
      if (obj.hasOwnProperty(p)) {
        var k = prefix ? prefix + "[" + p + "]" : p, v = obj[p];
        str.push(typeof v == "object" ?
          serialize(v, k) :
          encodeURIComponent(k) + "=" + encodeURIComponent(v));
      }
    }
    return str.join("&");
  }

  // ajax requests
  function request(opts) {
    var 
      resp,
      url = opts.url,
      p   = new P(),
      xhr = new XMLHttpRequest();

    if(opts.type.match(/^get$/i) && opts.data) {
      url += (url.indexOf("?") !== -1 ? "&" : "?") + encodeURIComponent(serialize(opts.data));
    }

    xhr.dataType = opts.dataType || "json";
    xhr.open(opts.type, url, !opts.sync);
    if (!opts.sync) {
      xhr.onreadystatechange = function () {
        if (this.readyState == 4) {
          if (this.status >= 200 && this.status < 300 || this.status === 304) {
            resp = xhr.dataType != "json" ? this.responseText : JSON.parse(this.responseText || null);
            p.resolve(resp, this);
          } else {
            p.reject({request: this, error: this.status});
          }
        }
      };
    }
    for(header in opts.headers) {
      xhr.setRequestHeader(header,opts.headers[header]);  
    }
    if (opts.data) {
      xhr.send(JSON.stringify(opts.data))
    } else {
      xhr.send();
    }
    if (opts.sync) return xhr.response;
    return p;
  }




  // This is just for nice console objects
  var namedFunction = function (name, fn) {
    var fstring;
    var fname = (name) ? name.replace(/\s/g,'') : "Object";
    var fstring = [
      "return function(call){return function ",
      "(){return call(this,arguments)}}"
    ].join(fname);
    return (new Function(fstring)())(Function.apply.bind(fn));
  }



  function applyConfig(obj){
    var json = JSON.stringify(obj).replace(/\{config:([^}]+)\}/g, function(match, key){
      if(config[key] === undefined) {
        throw("'" + key + "' must be set in config.");
      }
      return config[key];
    })
    return JSON.parse(json);
  }


 function buildRequest(attrs, resource) {
    return function(){
      var args = arguments;
      var used = [];
      var ajaxOpts = extend(true, {}, schema.ajaxOptions, resource.ajaxOptions);
      var opts = extend({
        url       : "",
        data      : {},
        defaults  : {},
        require   : []
      }, attrs);
      
      // check required
      opts.require.forEach(function(key, index){
        opts.data[key] = args[index] || opts.defaults[key];
        if(opts.data[key] === undefined) {
          throw("'" + key + "' is required.");
        }
      });
      
      // get query data from last argument
      extend(opts.data, args[opts.require.length] || {});
      
      // use data to build url
      var path = [];
      if(schema.apiPath)    path.push(schema.apiPath);
      if(resource.basePath) path.push(resource.basePath);
      if(opts.url)          path.push(opts.url);
      
      var url = path.join('/').replace(/\{:(\w+)\}/g, function(match, key) {
        var str = (
          (opts.require.indexOf(key) >- 1) ? args[opts.require.indexOf(key)] :
          (opts.data[key] !== undefined)   ? opts.data[key] : undefined
        );
        if(str !== undefined) {
          usedKeys.push(key);
        }
        return str || (resource.data && resource.data[key]) || match;
      });

      // remove used keys
      used.forEach(function(key){
        delete opts.data[key];
      })

      // build the request object
      var requestObj = extend(true, ajaxOpts, {
        url     : url,
        data    : opts.data,
        type    : opts.type || "get",
        headers : opts.headers
      })

      return request(applyConfig(requestObj));
    }
  }



  var namespace = {};

  // Resource Classes
  if(schema.resources) {
    for(var resource in schema.resources) {
      namespace[resource] = (function (props){

        var 
          rfn,
          require  = props.require  || [],
          defaults = props.defaults || [],
          methods  = props.methods  || {},

        rfn =  namedFunction(resource, function(){
          var args    = arguments;
          var rsrc    = extend({data: {}}, props);
          var fn      = namedFunction(resource, function(){});

          // check resource requires
          require.forEach(function(key, index){
            rsrc.data[key] = args[index] || defaults[key];
            if(rsrc.data[key] === undefined) {
              throw("'" + key + "' is required.");
            }
          });

          for(var method in methods) {
            fn.prototype[method] = buildRequest(methods[method], rsrc);
          }
          return new fn();
        });

        // static methods
        for(var method in props.static) {
          rfn[method] = buildRequest(props.static[method], this);
        }

        return rfn;
      })(schema.resources[resource]);
    }
  }


  // Top Level Methods
  if(schema.methods) {
    for(var method in schema.methods) {
      namespace[method] = buildRequest(schema.methods[method], this);
    }
  }

  namespace.config = function(key, val) {
    if(val) config[key] = val;
    return config[key];
  }
  
  var F = namedFunction(schema.name, function(){})
  F.prototype = namespace;
  return new F();
}