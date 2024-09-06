#module_parameters()(
  OPTION: $I/interface _DefaultSettings = _DefaultSettings
) {};
#scope_file
  _DefaultSettings :: struct {
    settings: [] Setting = .[
      .{flags = .MEMORY_DEBUGGER | .NO_ASSERTS, mode = .[.DEBUG, .DEVELOPER, .RELEASE] },
    ];
  }
  Setting :: struct {
    flags: _Flag;
    mode: [] Modee;
  }
  #run print("params\n");
_Flag :: enum_flags 
  {
    // NOTE: Commands have to be implemented by the build system. This is just a
    //    list of recommended commands. Commands overwrites the default settings.
                    // enabled as default when ; forced for mode
    MEMORY_DEBUGGER; // <= RELEASE              ; never  >= SHIPPING    | Command '-memdbg' | '-no_memdbg'         
    NO_ASSERTS;      // >= SHIPPING             ; always >= SHIPPING    | Command '-no_asserts'
    PROFILE;         // never                   ; never  >= SHIPPING    | Command '-profile'   
  }

#scope_export
// Modee :: _Mode;
Modee :: enum #specified 
  {
    DEBUG       :: 0; // all debug info, no optimizations                                         | Command '-debug'
    DEVELOPER   :: 1; // *default* all debug info, some optimizations
    // Rename this to optimized, test, fast? And make shipping be release?
    RELEASE     :: 2; // debug info, many optimizations,                                          | Command '-release' 
    // From here onwards it should always be thought of builds that a user can
    // safely use. All above should not get shipped to the user.
    SHIPPING    :: 3; // no debug info, all optimizations,  no sensitive information, no asserts  | Command '-shipping'
  };

#if OPTION == _DefaultSettings
{
Flag :: _DefaultSettings.{};
#run print("Flag\n");
}
else
{
#run print("Flag\n");
Flag :: OPTION.{};
}

#run {
  #import "Basic";
  print("Option is a %\n", OPTION);
  print("Flag is a %\n%\n", type_of(Flag), Flag);
}