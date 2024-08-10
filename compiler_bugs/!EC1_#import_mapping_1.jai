map_basic_imports :: (names: [] string) {
  print("crashi\n"); // crash
  // BASIC.print("works!\n");
}
 
// using,map(map_basic_imports) #import "Basic"; // correctly reports dependency cycle
using,map(map_basic_imports) BASIC :: #import "Basic";
 
#run {
  print("needed to crash?!\n");
}

main :: () {}