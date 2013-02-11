`glitz.js` is a bare-bones, small and fast micro-framework for running 2D canvas animations.  It is designed for cases where a simple animation or special effect is called for, but where a more complete ( and heavier ) animation solution is overkill.

* **No dependencies.**

 `glitz.js` is vanilla `javascript`.  That said, if you are using `jQuery`
 you can start a `glitz.Engine` like this:

            var engine = new glitz.Engine( $('canvas#myCanvas') );

* **Pretty Small.**

 Minified, `glitz.js` weighs in at `9.5KB ( 3.1KB gzip )`.  A quarter of 
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

  `glitz.Animation` instances are not usually created explicitly, but instead are handled under the hood by `renderable.animate`
  
      square.animate({ height: 50 }, 750 );

  In addition to any custom properties, `Renderables` expose the spacial components `x`, `y,` and `scale`, all of which are applied as `transformations` to the `engine.ctx` matrix before `renerable.render`, affecting all descendent renderables.

      square.animate({ x: 10, y: 25, scale: 0.8 }, 500 );
      
  You can also animate properties with relative transformations
  
      square.animate({ x: '+10', y: '-10' }, 500 );
      
  `Animation` has access to 30 built-in easing equations ported from Robert Penner's [`Easing Equations Library for ActionScript`](http://www.robertpenner.com/easing/)

      square.animate({ width: '+50' }, { easing: 'easeInOutBounce', duration: 750 });
  
  and can tween colors
  
      square.animate({ color: '#00f' }, 1500 );
      triangle.animate({ color: 'rgba(150,200,100,0.8)' }, 750 );

  Right now, animations are not automatically queued and cannot be run in parallel on a single `renderable` --
  each call to `renderable.animate` will cancel any running `Animation` and start the new one immediately.
  Instead, pass a callback as the third parameter or as an option:
  
      square.animate({ width: '-25' }, 500, function(){
        // or as an option
        triangle.animate({ height: '+25' }, { duration: 500, done: function(){ 
          // done!
        }});
      });
      
  Finally, `glitz.Animation` can be used independantly to animate the properties of any object.  The target object properties are set every time `animation.step` is called.
  
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