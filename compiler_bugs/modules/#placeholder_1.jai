
#module_parameters()(IMPORT_BASIC := true);

using _ :: #import "Basic";
SCOPE :: #code {};
#run {
  using _ :: #import "Compiler";
  w := get_current_workspace();
  add_build_string("BASIC :: #import \"Basic\"()(MEMORY_DEBUGGER=true);", w);
  // add_build_string("BLOCKER :: true;", w, code=SCOPE);
  add_build_string("BLOCKER :: true;", w); // No scope !
}

#placeholder BLOCKER; // How does this even get filled without setting code=MY_MODULE_SCOPE? :D
#scope_file
#run print("BLOCKER = %\n", BLOCKER); // This always works
OTHER :: #run tprint("BLOCKER = %\n", BLOCKER); // This always works


// The moment i try one of these two it breaks everything though 
// Still funny.

// #insert OTHER;

// #if OTHER
// {
//   #run print("OTHER = %\n", OTHER);
// }