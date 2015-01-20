var ApiWrapper = function(schema) {

  // promises
  var P = function(context) {
    var callbacks = [];
    var execute = function(type, context, args) {
      while (callbacks.length) {
        callbacks[0][type].apply(context, args);
        callbacks.shift();
      }
    };
    return {
      context: context || this,
      resolve: function() {
        execute('fulfilled', this.context, arguments);
      },
      reject: function() {
        execute('rejected', this.context, arguments);
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


  // ajax requests
  function request(opts, context) {
    var 
      resp,
      p   = new P(context),
      xhr = new XMLHttpRequest();

    opts = extend(true,schema.ajaxOptions||{}, opts);
    var url = [schema.apiPath,opts.url].join("/")

    xhr.dataType = opts.dataType || "json";
    xhr.open(opts.type, opts.url, !opts.sync);
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
    (opts.data) ? xhr.send(JSON.stringify(opts.data)) : xhr.send();
    if (opts.sync) return xhr.response;
    return p;
  }


  function parseMethodString(string) {
    var 
      data    = {}, 
      require = [],
      parts   = string.replace(/[ ]{2,}/g," ").split(" "), 
      type    = parts[0], 
      url     = parts[1];
    
    if(parts[2]) {
      parts[2].split(',').forEach(function(p){
        var kv = p.split('='),
        k = kv[0].replace(/^\*(.+)/, function(a,b){require.push(b); return b}),
        v = kv[1] || null;
        data[k] = v;
      })
    }
    return {type:type, url:url, require:require, data:data}
  }  

  function buildRequestMethod(attrs, context, opts) {
    return function(){
      var args = arguments;
      if(typeof attrs === "string") {
        opts = parseMethodString(attrs);
      } else {
        opts = extend({type:"GET",url:"",data:{},require:[]}, attrs);
        if(typeof opts.require === "string") opts.require = opts.require.split(',');
      }

      opts.require.forEach(function(k,i){
        if(args[i] !== undefined) opts.data[k] = args[i]
      });

      opts.url = opts.url.replace(/(\(\?)?:(\w+)/g, function(a,b,c){
        return (opts.require.indexOf(c)>-1) ? delete opts.data[c] && args[opts.require.indexOf(c)] : context[c];
      })

      extend(opts.data, args[opts.require.length] || {});
      delete opts.require
      return request(opts, context);
    }
  }

  // This is just for nice console objects
  var namedFunction = function (name, fn) {
    name = name && name.replace(/\s/g,'') || "Object";
    return (new Function("return function(call){return function "+name+"(){return call(this,arguments)}}")())(Function.apply.bind(fn));
  }

  var namespace = {};

  // Resource Classes
  if(schema.resources) {
    for(var resource in schema.resources) {
      namespace[resource] = (function (props){
        var 
          require  = props.require  || [],
          defaults = props.defaults || [],
          methods  = props.methods  || {};

        return namedFunction(resource, function(){
          var i, args = arguments;
          require.forEach(function(r,i){
            this[r] = args[i] || defaults[r] || undefined;
            if(this[r] === undefined) throw("'" + r + "' is required.")
          }.bind(this))

          // class methods
          for(var method in methods) {
            this[method] = buildRequestMethod(methods[method], this);
          }
        })
      })(schema.resources[resource]);
    }
  }

  // Top Level Resource Methods
  if(schema.resourceMethods) {
    for(var method in schema.resourceMethods) {
      namespace[method] = (function(m){
        var F = namedFunction(m, function(args){return namespace[m].apply(this, args)})
        F.prototype = namespace[m].prototype;
        return function() {return new F(arguments);}
      })(schema.resourceMethods[method])
    }
  }

  // Top Level Methods
  if(schema.methods) {
    for(var method in schema.methods) {
      namespace[method] = buildRequestMethod(schema.methods[method], this);
    }
  }
  
  var F = namedFunction(schema.name, function(){})
  F.prototype = namespace;
  return new F();
}