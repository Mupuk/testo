// #import "Simp"(render_api = Render_API.OPENGL); // shouldnt this compile?
#import "Simp"(render_api = .OPENGL); // this works
#import "Simp"(render_api = .OPENGL); // shouldnt this compile since the arguments are the same? as described in 380

main :: () {}