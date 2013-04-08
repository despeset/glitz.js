/*****************************************************************************************

     glitz.js 0.3 - Javascript canvas animation micro-framework  
     http://github.com/danielmendel/glitz.js

     Copyright (c) 2012 Daniel Mendel Espeset (http://danielmendel.com)         
     MIT Licence ( http://github.com/danielmendel/glitz.js/license.txt )        

     Includes a port of Robert Penner's Easing Equations Library for ActionScript:

       Easing Equations v1.5
       May 1, 2003
       (c) 2003 Robert Penner, all rights reserved. 
       Easing Equations are subject to the terms in http://www.robertpenner.com/easing_terms_of_use.html.  

     CSS sring to color conversion based on  http://www.bitstorm.org/jquery/color-animation/jquery.animate-colors.js

     requestAnimationFrame polyfill by Erik MË†ller + fixes from Paul Irish and Tino Zijdel. ( trimmed down for glitz by Daniel Mendel Espeset )

******************************************************************************************/

// http://paulirish.com/2011/requestanimationframe-for-smart-animating/
// http://my.opera.com/emoller/blog/2011/12/20/requestanimationframe-for-smart-er-animating
// requestAnimationFrame polyfill by Erik MË†ller
// fixes from Paul Irish and Tino Zijdel
// unused behaviors removed by Daniel Mendel Espeset

// ! lets us both execute our function expression & serves to close any previous context: https://gist.github.com/533f4d52e58e59ca9ecd
!function() {
    var vendors = ['ms', 'moz', 'webkit', 'o']
    for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
        window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame']
        // window.cancelAnimationFrame  = window[vendors[x]+'CancelAnimationFrame'] 
        //                             || window[vendors[x]+'CancelRequestAnimationFrame']
    }
    
    // NOOP instead of setTimeout fallback -- we're already running our anim loop that way
    window.requestAnimationFrame = window.requestAnimationFrame || function(){}

    /**
     *  This isn't being used, let's keep it out of the build.

        if (!window.cancelAnimationFrame)
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id)
            }

     **/

}()

!function(scope){ 
  
    /**
     * Private Utility Functions
     * ================================================================================= */

    // config vars, grafted onto the glitz namespace later
    var config = { defaultEasing: 'easeOutQuad' }

    /**
    *  alias hasOwnProperty
    *  @type {function}
    *  @private
    */

      , hasOwn = Object.prototype.hasOwnProperty

    /**
     *  makeClass - By John Resig (MIT Licensed) 
     *  return a base function for constructors which
     *  makes the `new` operator optional when instantiating
     *  works via <class>.prototype.init
     *  
     *  @return {function(*): Object}
     *  @private
     *
     */
     
    function makeClass(){
      return function(args){
        if ( this instanceof arguments.callee )
          return typeof this.init == "function" ? this.init.apply( this, args && args.callee ? args : arguments ) : false
        else
          return new arguments.callee( arguments )
      }
    }
    
    /**
     *  Fast and simple each implimentation (faster than native forEach)
     *  Return false in `fn` to break the loop
     *
     *  @param {(Array | Object.<number> | number)} arr Collection to enumerate OR number of iterations to perform
     *  @param {Function} fn Function to run, passed current iteration object
     *  @private
     *
     **/
     
    function each( arr, fn ){
        var i = 0, u = arr && arr.length ? arr.length : arr, r, num = typeof arr === 'number'
        for( i=0 ; i<u ; i++ ){
          r = fn( num ? i : arr[i], i )
          if( !( typeof r === 'undefined' ? true : r) ) break
        }
    }
    
    /**
     *  Fast each implimentation for iterating over object keys
     *
     *  @param {Object}
     *  @param {Function} 
     *  @private
     *
     **/
    
    function eachProp( obj, fn ){
      for( var attr in obj ){
        if( hasOwn.call( obj, attr ) )
          fn.call( obj, attr)
      }
    }

    /**
     *  Recursively copy arrays of objects & arrays, for animation series & parallel sets
     *
     *  @param {Object|Array}
     *  @private
     *
     **/

    function copyDeep( a ){
      if( a instanceof Array ){
        var b = []
        each( a, function(o){
          b.push( copyDeep(o) )
        })
      } else {
        var b = {}
        eachProp( a, function(k){ b[k] = typeof a[k] !== 'object' ? a[k] : copyDeep( a[k] ) })
      }
      return b
    }

    /**
     *  convert CSS color string to Array: [R,G,B,A]
     *  based on http://www.bitstorm.org/jquery/color-animation/jquery.animate-colors.js
     *
     *  @param {string} color Valid CSS color, hex or rgb #FF0000 | rgba(255,0,0,1)
     *  @returns {Array.<number>}
     *  @private
     *
     **/ 
     
    function parseColor( color ) {
      var match, triplet
      
      // catch malformed color -- shouldn't be necessary, why is this deformation happening?
      if( match = /^\s?[0-9]*,[0-9]*,[0-9]*/.exec( color ) ){
        color = 'rgba('+color+')'
      }
      
      // Match #aabbcc
      if (match = /#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})/.exec(color)) {
        triplet = [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16), 1]

        // Match #abc
      } else if (match = /#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])/.exec(color)) {
        triplet = [parseInt(match[1], 16) * 17, parseInt(match[2], 16) * 17, parseInt(match[3], 16) * 17, 1]

        // Match rgb(n, n, n)
      } else if (match = /rgb\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*\)/.exec(color)) {
        triplet = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), 1]

      } else if (match = /rgba\(\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9]{1,3})\s*,\s*([0-9\.]*)\s*\)/.exec(color)) {
        triplet = [parseInt(match[1], 10), parseInt(match[2], 10), parseInt(match[3], 10),parseFloat(match[4])]

        // No browser returns rgb(n%, n%, n%), so little reason to support this format.
      }
      return triplet
    }
    
    /**
     *  Recursively set `t`, to have all the same keys as `k`, but with the value copied from `v`.
     *  All keys in `k` *must* exist in `v`, but not vice-versa.
     *  
     *  Used to initialize the `animation.from` object.
     *
     *  @param {object} t Target
     *  @param {object} k Keys to set
     *  @param {object} v Values
     *  @private
     *
     **/
    
    function tkvDeepCopy(t, k, v){ 
      eachProp(k, function( a ) { 
        return typeof k[ a ] === 'object' ? tkvDeepCopy( t[ a ], k[ a ], v[ a ] ) : t[ a ] = v[ a ]
      })
    }
    
    /**
     *  Recursively convert the non-number values in `animation.to` and `animation.from` prior to animating.
     *  Adds support for:
     *
     *    - Relative value strings, such as `'+20'` or `'-500'`.
     *    - CSS Color Strings ( using `parseColor` )
     *
     *  @param {object} t `animation.to`
     *  @param {object} f `animation.from`
     *  @private
     **/
        
    function parseAnimationDSL( t, f ) {
      eachProp( t, function( a ){
        switch( typeof t[ a ] ){
          case 'string': 
            if( t[ a ].match( /^\+/ ) ) // positive relative
              return t[ a ] = f[ a ] + parseFloat( t[ a ].replace( /^\+/, '' ) )
            if( t[ a ].match( /^-/ ) ) // negative relative
              return t[ a ] = f[ a ] - parseFloat( t[ a ].replace( /^\-/,'' ) )
            if( t[ a ].match( /^(#|rgb)/ ) ){ // color val
              t[ a ] = parseColor( t[ a ] )
              return f[ a ] = parseColor( f[ a ] )
            }
            break
          case 'object': // recurse!
            parseAnimationDSL( t[ a ], f[ a ] )
            break
          default:
            break
        }
      })
    }

    /** Core Classes: Animation, Renderable, Engine
     * ================================================================================= */
     
    /**
     *  `animations` orchestrate the transformation of `renderable` properties over time.
     *  @class 
     *  @name Animation
     *  @constructor
     **/

    var Animation = makeClass()
    Animation.prototype = {

      /**
       *  Destination snapshot of target `renderable` properties
       *  @type {object}
       **/

      to: {},

      /**
       *  Starting snapshot of target `renderable` properties
       *  @type {object}
       **/

      from: {},
      
      /**
       *  The target `renderable`
       *  @type {Renderable}
       **/

      renderable: null,
      
      /**
       *  The easing to use
       *  @type {string}
       **/

      easing: config.defaultEasing,

      /**
       *  The total duration in milliseconds
       *  @type {string}
       **/

      duration: 0,
      
      /**
       *  millisecond to start on or after
       *  @type {?number}
       **/

      startAt: null,

      /**
       *  millisecond to end on or after
       *  @type {?number}
       **/

      endAt: null,
      
      /**
       *  @type {boolean}
       **/

      finished: false,

      /**
       *  fires before each frame renders.
       *  @type {?function}
       **/

      eachFrame: null,
      
      /**
       *  fires after animation completes.
       *  @type {?function}
       **/

      done: null,
      
      /**
       *  Setup the animation
       *
       *  @param {Renderable}
       *  @param {object} opts Options
       *  @returns {Animation}
       *
       **/
      
      init: function( renderable, opts ){
      
        var animation = this
        
        animation.duration   = opts.duration || 0
        animation.startAt    = new Date().getTime()
        animation.endAt      = animation.startAt + animation.duration
        animation.done       = opts.done || null
        animation.to         = opts.to || {}
        animation.easing     = opts.easing || animation.easing
        animation.renderable = renderable

        // let the engine know we're starting an animation
        animation.renderable.engine ? animation.renderable.engine.registerAnimation() : 0

        animation.from = {}
        tkvDeepCopy( animation.from, animation.to, renderable )
        parseAnimationDSL( animation.to, animation.from )
                
        return this

      },
      
      /**
       *  Prepare `renderable` for the current frame
       *
       *  @returns {boolean} false if animation is determined to be over
       *
       **/
      
      step: function(){
        
          var animation     = this
            , now           = new Date().getTime()
            , frameInterval = animation.endAt - now
            , changeRatio   = 1 / ( animation.duration / frameInterval )
            , target        = animation.renderable
            , to            = animation.to
            , from          = animation.from
            , duration      = animation.duration
            , easing        = animation.easing
          
          
          if( frameInterval <= 1 ){
            animation.stop()
            return false
          }
          
          /**
           *  Recursively update properties on `renderable`
           *
           *  @param {object}
           *  @param {object}
           *  @param {Renderable}
           *  @private
           *
           **/
           
          !function updateAttr( to, from, target ){ 
            eachProp( to, function( attr ){
              return typeof to[ attr ] === 'object' ?
                to[ attr ] instanceof Array && to[ attr ].length === 4 ? // is a color, render to rgba string
                  target[ attr ] = 'rgba('
                                    + parseInt(easingLib[ easing ]( duration - frameInterval, from[ attr ][0], to[ attr ][0] - from[ attr ][0], duration ))
                                    + ','
                                    + parseInt(easingLib[ easing ]( duration - frameInterval, from[ attr ][1], to[ attr ][1] - from[ attr ][1], duration ))
                                    + ','
                                    + parseInt(easingLib[ easing ]( duration - frameInterval, from[ attr ][2], to[ attr ][2] - from[ attr ][2], duration ))
                                    + ','
                                    + easingLib[ easing ]( duration - frameInterval, from[ attr ][3], to[ attr ][3] - from[ attr ][3], duration )
                                    + ')'
                 : updateAttr( to[ attr ], from[ attr ], target[ attr ] ) // recurse
               : target[ attr ] = easingLib[ easing ]( duration - frameInterval, from[ attr ], to[ attr ] - from[ attr ], duration )
            })
          }(to, from, target)

          return true
      },
      
      /**
       *  Stops and finalizes the animation
       *  Fired when the step function determines that the animation is over
       *
       *  @returns {boolean}
       *
       **/
       
      stop: function(){
        
        var animation = this
          , to = animation.to
          , ren = animation.renderable
        
        
        /**
         *  Recursively set `animation.renderable` properties to match `animation.to`
         *
         *  @param {Renderable}
         *  @param {object}
         *  @private
         **/
         
        !function copyProps( ren, to ){
          eachProp( to, function( attr ){ 
            return typeof to[ attr ] === 'object' ? 
              to[ attr ] instanceof Array && to[ attr ].length === 4 ? // color
                ren[ attr ] = 'rgba('
                                 + parseInt(to[ attr ][0])
                                 + ','
                                 + parseInt(to[ attr ][1])
                                 + ','
                                 + parseInt(to[ attr ][2])
                                 + ','
                                 + parseFloat(to[ attr ][3])
                                 + ')'
              : copyProps( ren[ attr ], to[ attr ] ) // recurse!
            : ren[ attr ] = to[ attr ]
          })
        }( ren, to )
        
        // trigger callback
        if( typeof animation.done === 'function' ) animation.done.call( ren, animation )

        // let the engine know we're done
        hasOwn.call(ren, 'engine') ? ren.engine.unregisterAnimation() : 0 
        
        return animation.finished = true
      
      }
    }
    /**
     *  `renderables` are the objects that get drawn *and* an array-like collection of child `renderables`
     *  @class 
     *  @name Renderable
     *  @constructor
     **/

    var renderableCore = {

      /**
       *  x position in pixels
       *  @type {number}
       **/

      x: 0,

      /**
       *  y position in pixels
       *  @type {number}
       **/

      y: 0,

      /**
       *  @type {number}
       **/

      scale: 1,

      /**
       *  `Engine` this renderable is a part of
       *  @type {?Engine}
       **/

      engine: null,

      /**
       *  Index of this renderable in parent
       *  @type {number}
       **/
      
      _id: -1,
      
      /**
       *  Current animation (if any)
       *  @type {?Animation}
       **/
      
      animations: [],
      
      /**
       *  Construct the `renderable`, shallow merge extension and `renderable`
       *
       *  @param {object} extension
       *
       **/
      
      init: function( extension ){
        var renderable = this
          , extension = extension || {}
        

        eachProp( extension, function( attr ){ 
          renderable[ attr ] = extension[ attr ]
        })
      },
      
      /**
       *  Run right before render, sets up `ctx` transformations.
       *  Expect to be overwritten by custom method.
       *  By default set `ctx 0,0` to `renderable.x, renderable.y` and scale
       *
       *  @param {CanvasRenderingContext2D}
       *
       **/

      setup: function( ctx ){
        ctx.translate( this.x, this.y )
        ctx.scale( this.scale, this.scale )
      },

      /**
       *  Where the magic happens.
       *
       *  @param {CanvasRenderingContext2D}
       *
       **/

      render: function( ctx ){
        // ...
      },
      
      /**
       *  Just like `Array.push`
       *  Add a child Renderable to this Renderable.
       *
       *  @param {Renderable}
       *
       **/

      push: function( child ){ 
        child.parent = this
        child.registerEngine( this.engine )
        Array.prototype.push.call( this, child )
        child._id = this.length-1
      },
      
      /**
       *  Set `renderable.engine`
       *  Recursively applied to all children.
       *
       *  @param {Engine}
       *
       **/

      registerEngine: function( engine ){
        this.engine = engine
        each( this, function(child){
          child.registerEngine( engine )
        })
      },

      /**
       *  Remove a child from this Renderable & sync former siblings
       *
       *  @param {Renderable}
       *
       **/
      
      removeChild: function( removingChild ){
        Array.prototype.splice.call( this, removingChild._id, 1)
        each(this,function( child ){ 
          if(child._id > removingChild._id) child._id--
        })
      },
      
      /**
       *  Remove this Renderable from it's parent
       *
       *  @returns {Renderable}
       *
       **/

      remove: function(){
        this.parent.removeChild( this )
        return this
      },
      
      /**
       *  Execute an animation series.  Arrays found in `series` will be run in parallel.
       *  Deligated to by `animate` and `animateParallel`
       *
       *  @param {array} animation config objects
       *
       **/

      animateSeries: function( series ){
        if( !series.length ) return false

        var that = this
          , anim = series.shift()
          , _done = anim.done

        if( anim instanceof Array )
          return that.animateParallel( anim, function(){
            that.animateSeries( series )
          })

        anim.done = function() {
          that.animateSeries( series )
          if( _done ) _done.call( this )
        }

        return that.animations.push( new Animation( that, anim ) )
      }

      /**
       *  Execute parallel animations.  Arrays found in `parallel` will be run in series.
       *  Deligated to by `animate` and `animateSeries`
       *
       *  @param {array} animation config objects
       *
       **/

      , animateParallel: function( parallel, done ){ 
        var that = this

        parallel.sort(function(a,b){ return a.duration < b.duration })

        // deep search longest
        var longest = { duration: 0 }
        !function getLongest( set ){
          each( set, function( anim ){
            if( anim instanceof Array ) return getLongest( anim )
            longest = anim.duration > longest.duration ? anim : longest
          })
        }( parallel )

        var _done = longest.done
        longest.done = function(){
          done.call( this )
          if( _done ) _done.call( this )
        }

        each( parallel, function( anim, i ){
          if( anim instanceof Array )
            return that.animateSeries( anim, done )
          that.animations.push( new Animation( that, anim ) )
        })

        return true
      }
      
      /**
       *  Create a new Animation for this Renderable:
       *
       *    `renderable.animate({ x: '+100' });`
       *    `renderable.animate({ x: 50 }, 500);`
       *    `renderable.animate({ x: '-100', y: 50 }, function(){ alert( 'done!' ); });`
       *    `renderable.animate({ background: 'rgba(255,0,0,1)' }, 1500, function(){ alert( 'done!' ); });`
       *    `renderable.animate({ scale: 2.5, color: '#f00' }, { duration: 1500, easing: 'easeInOutBack', done: function(){ alert( 'done!' ) } });`
       *
       *  Create animation series:
       *    `renderable.animate([{ x: 100 }, { y: 100 }]);`
       *
       *  Create parallel animations:
       *    `renderable.animate([[{ to: { x: 100 }}, { to: { y: 100 }}]]);`
       *  
       *  Combine the two:
       *    `renderable.animate([{ to: { x: 100 }}, [ { to: { x: 0 }}, { to: { y: 100 }}]]);`
       *
       *  The first array level is a series.
       *  Arrays found in a series are run in parallel. 
       *  Arrays found in parallel animations are run as series.
       *
       *  @param {object|array}
       *  @param {?(object|number|function)}
       *  @param {?function}
       *
       **/

      , animate: function( to, opts, done ){
        var conf = {}
        
        this.animations.length = 0

        if( to instanceof Array )
          return this.animateSeries( copyDeep( to ) )
        
        if( typeof opts === 'number' ){ // opts is duration
          conf.duration = opts
          conf.done = arguments[2] || function(){ }
        }  else {
          conf = {
              duration: opts.duration || 250
            , done: opts.done || function(){ }
            , easing: opts.easing || glitz.config.defaultEasing
          }
        }              
        
        if( typeof opts === 'function' ){
          conf.done = opts
        }
        
        if( typeof done === 'function' ){
          conf.done = done
        }
                
        conf.to = to

        this.animations.push( new Animation( this, conf ) )
      
      },
      
      /**
       *  Handles setup and rendering, bookended by `ctx.save` and `restore`.
       *  Recursively applied to all children.
       *
       *  @param {CanvasRenderingContext2D}
       *
       **/

      draw: function( ctx ){

        var renderable = this
          , ctx = ctx || renderable.engine.ctx
          , animations = renderable.animations
        
        
        ctx.save()

        var clean = []

        if( animations.length ){
            each( animations, function( animation, i ){ 
              if( !animation.finished ) animation.step()
              else clean.push(i)
            })
        }

        each( clean.reverse(), function(i){
          animations.splice(i,1)
        })

        renderable.setup( ctx )
        renderable.render( ctx )
        
        each( renderable, function(child){
          child.draw( ctx )
        })

        ctx.restore()

      }
    }

    function Renderable( classProps ){
        // generate our temporary global transport key ( with collision protection )
        do { var key = '___glitzBorrowedArray'+(+ new Date()) } while( window.hasOwnProperty(key) )
        // inject iframe & assign Array to our transport key in this window.
        var iframe = document.createElement("iframe")
        iframe.style.display = "none"
        document.body.appendChild(iframe)
        frames[frames.length - 1].document.write(
            "<script>parent."+key+" = Array;<\/script>"
        )
        // store the new Array prototype
        var privateArray = window[key]
        // clean the global namespace
        delete window[key]
        // extend the imported `Array` prototype with the core `Renderable` mixin
        for( k in renderableCore ){
            if( renderableCore.hasOwnProperty(k) )
                privateArray.prototype[k] = renderableCore[k]
        }
        // extend the imported `Array` prototype with the classProps passed to `Renderable`
        for( k in classProps ){
            if( classProps.hasOwnProperty(k) )
                privateArray.prototype[k] = classProps[k]
        }
        // build a `Factory` for instantiating instances of our new `Renderable` Class.
        function Factory( instanceProps ){
            var children = []
            var arr = new privateArray()
            var i = 1
            while(i++<arguments.length){
                arr.push(arguments[i])
            }
            // instantiate the animations array.
            arr.animations = []
            arr.init && arr.init()
            if( !arguments.length )
              return arr
            // `direct extension` for all properties passed to the factory when instantiating.
            for( k in instanceProps ){
                if( instanceProps.hasOwnProperty(k) )
                    arr[k] = instanceProps[k]
            }
            // return our Renderable instance! Super fast & fully inherits the behavior of Array!
            return arr
        }
        // make the internal array available for prorotype extension later
        Factory.Array = privateArray
        return Factory
    }
    
    /**
     *  `engines` interface with individual `<canvas>` elements, run the animation loop and trigger `renderable.draw`
     *  @class 
     *  @name Engine
     *  @constructor
     **/

    var Engine = makeClass()
    Engine.prototype = {
      
      /**
       *  `true` when there's a pending `draw`.
       *  @type {boolean}
       **/ 
         
      _dirty: true,

      /**
       *  Frames Per Second as milliseconds for `setInterval`.  Defaults to `60 fps`, to change use setter `Engine#fps`.
       *  @type {number}
       **/

      FPS: 1000 / 60,

      /**
       *  Total animations active on this Engine.
       *  @type {number}
       **/

      runningAnimations: 0,

      /**
       *  `<canvas>` Engine writes to.
       *  @type {?HTMLCanvasElement}
       **/

      canvas: null,

      /**
       *  `CanvasRenderingContext2D` for active `<canvas>`
       *  @type {?CanvasRenderingContext2D}
       **/
      
      ctx: null,
      
      /**
       *  Special root Renderable
       *  @type {?Renderable}
       **/
       
      layout: null,

      /**
       *  `false` when engine is idle, interval id when running animation loop.
       *  @type {(boolean|number)}
       **/

      running: false,

      /**
       *  Initialize, setup the `layout` Renderable and begin running.
       *
       *  @param {HTMLCanvasElement}
       *
       **/

      init: function( canvasElement ){
        var engine = this

        engine.canvas = typeof window.jQuery !== 'undefined' ? jQuery(canvasElement)[0] : canvasElement
        engine.ctx = engine.canvas.getContext('2d')
        
        engine.layout = new ( Renderable({
          engine: engine,
          width: engine.canvas.width,
          height: engine.canvas.height,
          backgroundColor: '#fff',
          clearFrames: true,
          onLoop: function(){
            // ...
          },
          background: function( ctx ){
            // ...
          },
          setup: function( ctx ){
            this.onLoop()
            ctx.fillStyle = this.backgroundColor
            if(this.clearFrames)
              ctx.fillRect( -1, -1, this.width + 1, this.height + 1 ) // setup
            this.background( ctx )
            ctx.translate( this.x, this.y )
            ctx.scale( this.scale, this.scale )
          }
        }) )

        /**
         *  requestAnimationFrame play & pause control
         * 
         *  requestAnimationFrame is only fired by the browser when
         *  the page is visible.  setTimeout & setInterval both run 
         *  regardless of page visibility.
         *
         *  We're still using an interval for our draw loop ( for now )
         *  But this is a simple methodology for adding that functionality
         *  so that the engine stops running automatically 
         *  when the browser pane is hidden.
         *
         **/

        var reqAnimFrameTimer = -1
        requestAnimationFrame(function playOnFrame(){
          if( reqAnimFrameTimer < 0 ){
              engine.start()
          }
          clearTimeout(reqAnimFrameTimer)
          reqAnimFrameTimer = setTimeout(function(){
            reqAnimFrameTimer = -1
            engine.stop()
          }, 100)
          requestAnimationFrame(playOnFrame)
        })
        
      },
      
      /**
       *  If not running, start.
       **/
      
      dirty: function(){
        if(!this._dirty){
          this._dirty = true
          this.start()
        }
      },

      clean: function(){
        if(this._dirty){
          this._dirty = false
          this.stop()
        }
      },

      /**
       *  Start animation interval: call `layout.draw` every `FPS`
       *  Stop automatically if no more `runningAnimations`
       **/
       
      start: function(){
        var engine = this
        if(!engine.running)
          engine.running = setInterval(function(){
            if(engine._dirty){ 
              engine.layout.draw()
              return engine.runningAnimations < 1 ? engine.clean() : null
            }
            return engine.clean()
          }, engine.FPS)
      },

      /**
       *  Clear animation interval, set running to false. Engine is now idle.
       **/

      stop: function(){
        clearInterval( this.running )
        this.running = false
      },

      loop: function( onframe ){
        this.layout.onLoop = onframe
        this.registerAnimation()
      },
      
      /**
       *  new Animations report their existence to Engine.  Start engine if idle.
       *  @returns {boolean}
       *
       **/
      
      registerAnimation: function(){ 
        this.runningAnimations++
        this.dirty()
        return true 
      },

      /**
       *  Animations report their demise to Engine.
       *  @returns {boolean}
       *
       **/

      unregisterAnimation: function(){ 
        this.runningAnimations--; return true 
      },
      
      /**
       *  Add a new renderable to the layout.  Start engine if idle.
       *  @param {Renderable}
       *
       **/ 
       
      push: function( renderable ){ 
        this.layout.push( renderable )
        this.dirty()
      },
      
      /**
       *  Set the size in pixels of the canvas & layout.
       *  @param {number} Width
       *  @param {number} Height
       **/
       
      setSize: function( w, h ){
        var layout = this.layout
          , canvas = this.canvas
        
        layout.width = canvas.width = w
        layout.height = canvas.height = h
      },

      /**
       *  Set the animation framerate.  Restart if running.
       *  @param {number} fps, frames per second
       **/
      
      fps: function( fps ){ 
        this.FPS = 1000 / fps
        if( this.running ){ 
          this.stop()
          this.start()
        } 
      },

      /**
       *  Get all the renderables of a given type from the layout.
       *
       *  Pass the Factory returned by glitz.Renderable to `filter` to
       *  retrieve a set of all instances of that factory regardless of heirarchy.
       *
       *      var Box = glitz.Renderable({ ... });
       *      engine.push( new Box({ ... }) );
       *      engine.filter( Box ); // => [ box, box, box, ... ]
       *
       *  Optionally pass a specific renderable to filter only from it's children.
       *
       *      engine.filter( Box, engine.layout ); // default behavior
       *
       *  Called recursively, the third argument should probably only be used internally.
       *
       *  @param {Factory}    The type to filter for
       *  @param {Renderable} Specific renderable to check inside of ( optional )
       *  @param {Array}      The Array to push matched elements into ( optional )
       **/

      filter: function filter( RenderableFactory, renderable, setArr ){
        var set = setArr || []
          , ren = renderable || this.layout
        
        if( ren.constructor === RenderableFactory.Array )
          set.push(ren)
        
        for( var i=0, u=ren.length; i<u; i++ ){
          filter( RenderableFactory, ren[i], set )
        }

        return set
      }
    }

    /**
     *  Easing Equations Library
     *  ============================================================================================
     *
     *  TERMS OF USE - EASING EQUATIONS
     * 
     *  Open source under the BSD License. 
     * 
     *  Copyright © 2001 Robert Penner
     *  All rights reserved.
     * 
     *  Redistribution and use in source and binary forms, with or without modification, 
     *  are permitted provided that the following conditions are met:
     * 
     *  Redistributions of source code must retain the above copyright notice, this list of 
     *  conditions and the following disclaimer.
     *  Redistributions in binary form must reproduce the above copyright notice, this list 
     *  of conditions and the following disclaimer in the documentation and/or other materials 
     *  provided with the distribution.
     * 
     *  Neither the name of the author nor the names of contributors may be used to endorse 
     *  or promote products derived from this software without specific prior written permission.
     * 
     *  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY 
     *  EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF
     *  MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE
     *  COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
     *  EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE
     *  GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED 
     *  AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
     *  NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED 
     *  OF THE POSSIBILITY OF SUCH DAMAGE. 
     *
     **/

    var easingLib = Animation.easingLib = {
      
      easeInQuad: function (t, b, c, d) {
        return c*(t/=d)*t + b
      },
      easeOutQuad: function (t, b, c, d) {
        return -c *(t/=d)*(t-2) + b
      },
      easeInOutQuad: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t + b
        return -c/2 * ((--t)*(t-2) - 1) + b
      },
      easeInCubic: function (t, b, c, d) {
        return c*(t/=d)*t*t + b
      },
      easeOutCubic: function (t, b, c, d) {
        return c*((t=t/d-1)*t*t + 1) + b
      },
      easeInOutCubic: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t + b
        return c/2*((t-=2)*t*t + 2) + b
      },
      easeInQuart: function (t, b, c, d) {
        return c*(t/=d)*t*t*t + b
      },
      easeOutQuart: function (t, b, c, d) {
        return -c * ((t=t/d-1)*t*t*t - 1) + b
      },
      easeInOutQuart: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t + b
        return -c/2 * ((t-=2)*t*t*t - 2) + b
      },
      easeInQuint: function (t, b, c, d) {
        return c*(t/=d)*t*t*t*t + b
      },
      easeOutQuint: function (t, b, c, d) {
        return c*((t=t/d-1)*t*t*t*t + 1) + b
      },
      easeInOutQuint: function (t, b, c, d) {
        if ((t/=d/2) < 1) return c/2*t*t*t*t*t + b
        return c/2*((t-=2)*t*t*t*t + 2) + b
      },
      easeInSine: function (t, b, c, d) {
        return -c * Math.cos(t/d * (Math.PI/2)) + c + b
      },
      easeOutSine: function (t, b, c, d) {
        return c * Math.sin(t/d * (Math.PI/2)) + b
      },
      easeInOutSine: function (t, b, c, d) {
        return -c/2 * (Math.cos(Math.PI*t/d) - 1) + b
      },
      easeInExpo: function (t, b, c, d) {
        return (t==0) ? b : c * Math.pow(2, 10 * (t/d - 1)) + b
      },
      easeOutExpo: function (t, b, c, d) {
        return (t==d) ? b+c : c * (-Math.pow(2, -10 * t/d) + 1) + b
      },
      easeInOutExpo: function (t, b, c, d) {
        if (t==0) return b
        if (t==d) return b+c
        if ((t/=d/2) < 1) return c/2 * Math.pow(2, 10 * (t - 1)) + b
        return c/2 * (-Math.pow(2, -10 * --t) + 2) + b
      },
      easeInCirc: function (t, b, c, d) {
        return -c * (Math.sqrt(1 - (t/=d)*t) - 1) + b
      },
      easeOutCirc: function (t, b, c, d) {
        return c * Math.sqrt(1 - (t=t/d-1)*t) + b
      },
      easeInOutCirc: function (t, b, c, d) {
        if ((t/=d/2) < 1) return -c/2 * (Math.sqrt(1 - t*t) - 1) + b
        return c/2 * (Math.sqrt(1 - (t-=2)*t) + 1) + b
      },
      easeInElastic: function (t, b, c, d) {
        var s=1.70158;var p=0;var a=c
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a)
        return -(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b
      },
      easeOutElastic: function (t, b, c, d) {
        var s=1.70158;var p=0;var a=c
        if (t==0) return b;  if ((t/=d)==1) return b+c;  if (!p) p=d*.3
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a)
        return a*Math.pow(2,-10*t) * Math.sin( (t*d-s)*(2*Math.PI)/p ) + c + b
      },
      easeInOutElastic: function (t, b, c, d) {
        var s=1.70158;var p=0;var a=c
        if (t==0) return b;  if ((t/=d/2)==2) return b+c;  if (!p) p=d*(.3*1.5)
        if (a < Math.abs(c)) { a=c; var s=p/4; }
        else var s = p/(2*Math.PI) * Math.asin (c/a)
        if (t < 1) return -.5*(a*Math.pow(2,10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )) + b
        return a*Math.pow(2,-10*(t-=1)) * Math.sin( (t*d-s)*(2*Math.PI)/p )*.5 + c + b
      },
      easeInBack: function (t, b, c, d, s) {
        if (s == undefined) s = 1.70158
        return c*(t/=d)*t*((s+1)*t - s) + b
      },
      easeOutBack: function (t, b, c, d, s) {
        if (s == undefined) s = 1.70158
        return c*((t=t/d-1)*t*((s+1)*t + s) + 1) + b
      },
      easeInOutBack: function (t, b, c, d, s) {
        if (s == undefined) s = 1.70158
        if ((t/=d/2) < 1) return c/2*(t*t*(((s*=(1.525))+1)*t - s)) + b
        return c/2*((t-=2)*t*(((s*=(1.525))+1)*t + s) + 2) + b
      },
      easeInBounce: function (t, b, c, d) {
        return c - easingLib.easeOutBounce (d-t, 0, c, d) + b
      },
      easeOutBounce: function (t, b, c, d) {
        if ((t/=d) < (1/2.75)) {
          return c*(7.5625*t*t) + b
        } else if (t < (2/2.75)) {
          return c*(7.5625*(t-=(1.5/2.75))*t + .75) + b
        } else if (t < (2.5/2.75)) {
          return c*(7.5625*(t-=(2.25/2.75))*t + .9375) + b
        } else {
          return c*(7.5625*(t-=(2.625/2.75))*t + .984375) + b
        }
      },
      easeInOutBounce: function (t, b, c, d) {
        if (t < d/2) return easingLib.easeInBounce (t*2, 0, c, d) * .5 + b
        return easingLib.easeOutBounce (t*2-d, 0, c, d) * .5 + c*.5 + b
      }
    }

    // Write to the namespace

    scope.glitz = { Animation: Animation, Renderable: Renderable, Engine: Engine, version: '0.1.2', config: config }
    
}(window);
