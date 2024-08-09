#import "Basic";
#import "Compiler";
#import "String";

#run {
  set_build_options_dc(.{do_output=false, write_added_strings=false});
  version := compiler_get_version_info(null);
  version = replace(version, " ", "-",, temp);
  found:, version = split_from_left(version, ",",, temp);
  print("%\n", version);
}