`glitz.js` is a bare-bones, small and fast micro-framework for running 2D canvas animations.

No dependencies.
----------------

 `glitz.js` is plain `javascript`.  That said, if you are using `jQuery`
 you can still start a `glitz.Engine` like this:

     var engine = new glitz.Engine( $('canvas#myCanvas') );

Pretty Small.
----------------

 Minified, `glitz.js` weighs in at `8.1KB` and once gzipped is just `2.5KB`.  Even so, a quarter of 
 that size is the 30 built-in easing algorithms.  If compiled with 4 easings, it drops
 to `5.4KB` or `2KB` gzipped.

Well mannered.
----------------

 Unless there's an animation in progress, `glitz.Engine` is completely idle.  The main animation
 loop and subsequent render calls are event-driven, so when there's nothing to do it *does nothing*.

Real FPS.
---------

 The timing of `setInterval` and `setTimeout` is inconsistent
 at the best of times.  Animation that relies on them often feels
 chunky and worse, will crawl to a stop if performance lag drastically 
 lowers the framerate.  

 `glitz.js` animations are internally timed by millisecond durations,
 so even if redraw rates drop to 3 FPS, your animation will still 
 complete at the expected speed.

 Of course, you can always set the `FPS` yourself:

     var engine = new glitz.Engine( document.getElementById( 'myCanvas' )); 
     // 60 fps by default
     engine.fps( 24 );
 

USAGE
======================================================================================================
  --------------------------------------------------------------------------------------------------

  `glitz.js` is made up of three Classes, accessed via the global namespace `glitz`  
  ( Please note that we're still early in development so the API is definitely subject to change. )
    
glitz.Engine
---------

  `glitz.Engine` instances are initalized on the `<canvas>` tag and control the timing of an animation, store all the associated `renderables` and internally orchestrate the draw loops and framerate.  Initialize an `Engine` by passing it an `HTMLCanvasElement`.
    
      var engine = new glitz.Engine( document.getElementById( 'myCanvas' ));

  `engines` expose some configuration methods
  
      engine.fps( 24 );
      engine.setSize( 500, 500 );
      
  and include a special `Renderable` called `layout`
  
      engine.layout.backgroundColor = '#f00;'
  
glitz.Renderable
------------

  `glitz.Renderable` is a base class for any kind of drawable object.  Just give it a set of properties, and a `render` method.
  
      var square = new glitz.Renderable({
          height: 100
        , width:  100
        , color: '#0f0'
        , render: function( ctx ){
            ctx.fillStyle = this.color;
            ctx.fillRect( 0, 0, this.width, this.height );
        }
      });
    
  Then add it to the engine's layout

      engine.layout.push( square );
    
  This means that `square` is now a child of the `layout` `Renderable`. All `Renderables` can have children
  
      var triangle = new glitz.Renderable({
          height: 100
        , width:  100
        , color: '#0f0'
        , render: function( ctx ){
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.moveTo( 0, this.height );
            ctx.lineTo( this.width, this.height );
            ctx.lineTo( this.width * .5, 0 );
            ctx.lineTo( 0, this.height );
            ctx.fill();
            ctx.closePath();
        }
      });
      square.push( triangle );

  In this capacity, `Renderables` act just like `Array`. Walking the tree is easy.
  
      square.length;        // 1
      square[0];            // triangle
      engine.layout[0][0];  // triangle
      triangle.parent;      // square
      square.parent;        // layout
      square.engine;        // engine

glitz.Animation
-------------

  `glitz.Animation` instances are not usually created explicitly, but instead are handled under the hood by `renderable.animate`
  
      square.animate({ height: 50 }, 750 );

  In addition to any custom properties, `Renderables` have the built-in properties `x`, `y,` and `scale`, all of which are *automatically* applied as `transformations` to the `engine.ctx` matrix before `renerable.render`, and thusly affect all their children

      square.animate({ x: 10, y: 25, scale: 0.8 }, 500 );
      
  You can animate properties with relative transformations
  
      square.animate({ x: '+10', y: '-10' }, 500 );
      
  `Animation` has access to 30 built-in easing equations

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
      
  Finally, `glitz.Animation` can be used directly to animate the properties of any object.  The target object properties are set every time `animation.step` is called.
  
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