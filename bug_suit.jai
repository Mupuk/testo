
//
// Comiles all files in the compiler_bugs directory and runs them if they compile
// If its a folder it does the same with the first.jai file inside the folder
//
// Files that start with "EC" are expected to fail with the error code specified after "EC"


#run 
{
  #assert OS == .WINDOWS; // @todo platform specific

  // Don't output anything
  set_build_options_dc(.{do_output=false, write_added_strings=false});

  visitor :: (info: *File_Visit_Info, test_list: *[..] string) {
    // Ignore directories starting with "_" or "."
    if (info.short_name[0] == #char "_" 
        || info.short_name[0] == #char "." 
        || info.short_name == "modules"
    )
    { 
      if info.is_directory 
        info.descend_into_directory = false;

      return;
    }

    extension, found := path_extension(info.short_name);
    if !found && !info.is_directory return; // Skip files without extensions
    if found && extension != "jai" return; // Skip files that are not .jai

    if info.is_directory
      array_add(test_list, tprint("%/first.jai", info.full_name));
    else
      array_add(test_list, copy_string(info.full_name,, temp));

    // p(info.full_name);
  }

  // Stats
  succeeded := 0;
  failed := 0;

  // Get all the test file list
  test_list: [..] string;
  test_list.allocator = temp;
  visit_files("compiler_bugs", false, *test_list, visitor, visit_directories=true);
  print("%\n", test_list);

  log("\n\n");

  // Run the tests
  for test_list
  {
    expected_error_code := 0;
    name := path_filename(it);

    // Program to run if it exists after compilation
    program := tprint("%.exe", path_strip_extension(it)); // @todo platform specific

    // If its a folder we need to check the folder name instead of file name
    if starts_with(name, "first.jai") {
      copy := path_strip_filename(it);
      copy.count -= 1; // remove /
      name = path_filename(copy);
    }
    
    // We ignore the '!' so we can mark files that passed the test
    if starts_with(name, "EC") || starts_with(name, "!EC")
    {
      skip_count := ifx starts_with(name, "EC") then 2 else 3;
      code, success := string_to_int(advance(name, skip_count));
      if success  expected_error_code = code;
    }
    // Compile Program
    compile_process_result: Process_Result;  
    {
      command := tprint("jai %", it);
      command_split := split(command, " ",, temp);
      // command := split(tprint("echo %", test_list[0]), " ",, temp);
      print("Compiling: '%' ... ", command);

      compile_process_result=, 
      output_string, 
      error_string, 
      timeout_reached := run_command(..command_split, 
                                    working_directory="", 
                                    capture_and_return_output=true, 
                                    print_captured_output=false,
                                    timeout_ms = 5000 // avoid infinite loops
                                    ,, temp);

      if compile_process_result.type == .FAILED_TO_LAUNCH {
          log_error("Could not run command: \"%\"", command);
          return;
      }

      // log("Exit code: % (timeout reached: %)", process_result.exit_code, timeout_reached);

      


      exit_code_text := "";
      // if compile_process_result.exit_code == {
      //   case 0; exit_code_text = "0";
      //   case 1; exit_code_text = "1 - (USER)";
      //   case 3; exit_code_text = "3 (COMPILER)";
      //   case; exit_code_text = tprint("(UNHANDLED %)", compile_process_result.exit_code);
      // }

      status_text := ifx compile_process_result.exit_code == expected_error_code 
                    then "SUCCESS" 
                    else tprint("FAILURE - Got Exit Code % (timeout reached: %), Expected %", 
                                compile_process_result.exit_code, 
                                timeout_reached,
                                expected_error_code);
      color := ifx compile_process_result.exit_code == expected_error_code then Console_Color.GREEN else .RED;
      if !(expected_error_code == 0 && file_exists(program)) 
        print_color(status_text, color=color);
      print("\n");

    }

    // make sure this runs only when file exists and is expected to compile
    if expected_error_code == 0 && file_exists(program) 
    {
      if compile_process_result.exit_code == 0
      {
        print("   Runing:     '%' ... ", program);
        process_result, 
        output_string, 
        error_string, 
        timeout_reached := run_command(program,
                                      working_directory="", 
                                      capture_and_return_output=true, 
                                      print_captured_output=false,
                                      timeout_ms = 5000 // avoid infinite loops
                                      ,, temp);

        if process_result.type == .FAILED_TO_LAUNCH {
            log_error("Could not run command: \"%\"", program);
            return;
        }

        // log("Exit code: % (timeout reached: %)", process_result.exit_code, timeout_reached);

        status_text := ifx process_result.exit_code == 0
                      then "SUCCESS" 
                      else tprint("FAILURE - Exit Code % (timeout reached: %)", process_result.exit_code, timeout_reached);
        color := ifx process_result.exit_code == 0 then Console_Color.GREEN else .RED;
        print_color(status_text, color=color);
        print("\n");

        // if there is a executable we just look at its result
        if process_result.exit_code == 0 
          succeeded += 1;
        else
          failed += 1;
      }
    }
    else
    {
      // if there is no executable we just look at compile result
      if compile_process_result.exit_code == expected_error_code 
        succeeded += 1;
      else
        failed += 1;
    }
  }

  // Cleanup
  {
    DIRS_TO_DELETE_RECURSIVELY :: string.[".bin", ".build"];
    EXTENSIONS_TO_DELETE_RECURSIVELY :: string.["exe", "obj", "pdb", "lib", "dll"]; // @todo platform specific

    cleanup_visitor :: (info: *File_Visit_Info, data: *void) {
      // Ignore directories starting with "_" or ".", delete .bin and .build directories
      if info.is_directory && (
          info.short_name[0] == #char "_" 
          || info.short_name[0] == #char "." 
          || array_find(DIRS_TO_DELETE_RECURSIVELY, info.short_name)
      )
      {
        info.descend_into_directory = false;
        if array_find(DIRS_TO_DELETE_RECURSIVELY, info.short_name)
        {
          delete_directory(info.full_name);
        }
        return;
      }

      if info.is_directory {
        return;
      }

      // Ignore files that are not .jai
      extension, found := path_extension(info.short_name);
      if !found return;

      if !array_find(EXTENSIONS_TO_DELETE_RECURSIVELY, extension) return;

      // p(info.full_name);
      file_delete(info.full_name);
    }
    visit_files("compiler_bugs", true, null, cleanup_visitor, visit_directories=true);
  }

  // Stats
  print_color("\n\nSUCCEEDED: %\n", succeeded, color=.GREEN);
  print_color("FAILED:    %\n", failed, color=.RED);
  print_color("TOTAL:     ", color=.MAGENTA);
  print_color("%", succeeded, color=.GREEN);
  print_color("/%\n", test_list.count, color=.MAGENTA);
}


#import "Compiler";
#import "File"; // :ReplaceOwn
#import "File_Utilities"; // :ReplaceOwn
#import "Process";
#import "String";
#import "Print_Color";
#import "Basic";
// }
