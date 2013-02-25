`glitz.js` is a bare-bones, small and fast micro-framework for running 2D canvas animations.  It is designed for cases where a simple animation or special effect is called for, but where a more complete ( and heavier ) animation solution is overkill.

* **No dependencies.**

 `glitz.js` is vanilla `javascript`.  That said, if you are using `jQuery`
 you can start a `glitz.Engine` like this:

            var engine = new glitz.Engine( $('canvas#myCanvas') );

* **Pretty Small.**

 Minified, `glitz.js` weighs in at `10.4KB ( 3.3KB gzip )`.  A quarter of 
 that size is the 30 built-in easing algorithms, so when maximum thinness is required remove any unused easing equasions.

* **Well mannered.**

 Unless there's an animation in progress, `glitz.Engine` is 100% idle.  The main animation
 loop and subsequent render calls are event-driven, so when there's nothing to do it *does nothing*.

* **Control your FPS.**

 Glitz uses a render loop that allows for a configurable `FPS`, crucial for achieving subtle film & traditional animation effects:

     var engine = new glitz.Engine( document.getElementById( 'myCanvas' )); 
     engine.fps( 24 );
 

USAGE
----------------------------------------------------------------------------------------------------

  `glitz.js` is made up of three Classes, accessed via the global namespace `glitz`  
  ( note: glitz is still < 1.0, the API may be subject to rapid change )
    
glitz.Engine
=========

  `glitz.Engine` instances are initalized on the `<canvas>` tag and control the timing of an animation, store all the associated `renderables` and internally orchestrate the draw loops and framerate.  Initialize an `Engine` by passing it an `HTMLCanvasElement`.
    
      var engine = new glitz.Engine( document.getElementById( 'myCanvas' ));

  `engines` expose some configuration methods
  
      engine.fps( 24 );
      engine.setSize( 500, 500 );
      
  and include a special `Renderable` called `layout`
  
      engine.layout.backgroundColor = '#f00;'
  
glitz.Renderable
=========

  `glitz.Renderable` is a factory that builds your drawable objects.  Just give it a set of class properties that includes a `render` method.
  
      var Square = new glitz.Renderable({
        render: function( ctx ){
            ctx.fillStyle = this.color;
            ctx.fillRect( 0, 0, this.width, this.height );
        }
      });
    
  Then create an instance and add it to the engine's layout

      var square = new Square({          
          height: 100
        , width:  100
        , color: '#0f0'
      });

      engine.layout.push( square );
    
  This means that `square` is now a child of the `layout` `Renderable`. All `Renderables` can have children
  
      var childSquare = new Square({
          height: 100
        , width:  100
        , color: '#0f0'
      });
      square.push( childSquare );

  `Renderables` subclass `Array` internally. Walking the tree is easy.
  
      square.length;        // 1
      square[0];            // child square
      engine.layout[0][0];  // child square
      triangle.parent;      // square
      square.parent;        // layout
      square.engine;        // engine

  Each `Renderable` class includes it's own private `Array` which can be extended dynamically.

      Square.Array.prototype.foo = function(){ return 'bar' }
      square.foo()          // bar
      square[0].foo()       // bar

glitz.Animation
=========

  `glitz.Animation` instances are not usually created explicitly, but instead are handled under the hood by `renderable.animate.`  

  In addition to any custom properties, `Renderables` expose the spacial components `x`, `y,` and `scale`, all of which are applied as `transformations` to the `engine.ctx` matrix before `renerable.render`, affecting all descendent renderables.

  If you've used `jQuery.animate` then the basic animate calls should be familiar, all of the following are equivalent:

  ``` javascript
    // transform ( duration defaults to 250ms )
    box.animate({ x: 100 });
    // transform, duration
    box.animate({ x: 100 }, 5000 );
    // transform, callback
    box.animate({ x: 100 }, function(){ ... });
    // transform, duration, callback
    box.animate({ x: 100 }, 5000, function(){ ... });
    // transform, options
    box.animate({ x: 100 }, { duration: 5000, done: function(){ ... }});
    // single config object
    box.animate({ to: { x: 100 }, duration: 5000, done: function(){ ... }});
  ```
      
  You can also animate properties with relative transformations
  
      square.animate({ to: { x: '+10', y: '-10' }, duration: 500 });
      
  `Animation` has access to 30 built-in easing equations ported from Robert Penner's [`Easing Equations Library for ActionScript`](http://www.robertpenner.com/easing/)

      square.animate({ to: { width: '+50' }, easing: 'easeInOutBounce', duration: 750 });
  
  and can tween colors
  
      square.animate({ to: { color: '#00f' }, duration: 1500 });
      triangle.animate({ to: { color: 'rgba(150,200,100,0.8)' }, duration: 750 });
  
  Each call to `renderable.animate` will cancel any running `Animation` and start the new one immediately.
  If you pass `renderable.animate` an Array of animation config objects it will run them in series:

      square.animate([ { to: { x: '+100' } }, { to: { y: '+100' } } ]);

  If that array contains an array, those animations will be run in parallel:

      square.animate([[ { to: { x: '+100' } }, { to: { y: '+100' } } ]]);

  If parallel animations contain an array, they will be run a series, and so on to any depth

      square.animate([[ { to: { x: '+100' } }, { to: { y: '+100' } }, [ { to: { height: 100 }, duration: 100 }, { to: { width: 100 }, duration: 100 }]]]);

  Finally, the `glitz.Animation` class can be used independantly to animate the properties of any object.  The target object properties are set every time `animation.step` is called.
  
      var foo = { bar: 0 };
      var anim = new glitz.Animation( foo, { to: { bar: '+50' }, duration: 1500 });
      
      setTimeout(function(){
        anim.step(); // true
        console.log(foo.bar); // 27.8222
      }, 500 );
      
      setTimeout(function(){
        anim.step(); // true
        console.log(foo.bar); // 44.46664444444445
      }, 1000 );
      
      setTimeout(function(){
        anim.step(); // false, animation is done.
        console.log(foo.bar); // 50
      }, 1600 );