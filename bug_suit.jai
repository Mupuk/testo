
//
// Comiles all files in the 'compiler_bugs' directory and runs them if they compile
// and produce a binary. If its a folder it has to contain a 'first.jai' file.
//
// Files must have a prefix of the form [C|R]EC<exit_code>_<issue_number>.jai
// Files that start with "CEC" are expected to compile with the exit code that follows
// Files that start with "REC" are expected to run with the exit code that follows

Test_Result :: struct 
{
  passed_test: bool = false; // ifx tried_to_run then run_exit_code == expected_run_exist_code else compilation_exit_code == expected_compilation_exist_code
  file_path: string; @JsonIgnore
  issue_number: int; @JsonIgnore

  is_runtime_test: bool = false; // if not we ignore runtime

  // compilation results
  expected_compilation_exit_code: int = 0;
  compilation_exit_code: int = -1;

  // run results
  expected_run_exit_code: int = 0;
  run_exit_code: int = -1;
};



#run {

  // Don't output anything when triggered by lsp
  #if #exists(JAILS_DIAGNOSTICS_BUILD) then return; 

  // Don't output anything
  set_build_options_dc(.{do_output=false, write_added_strings=false});

  // Only those platforms are supported
  #assert OS == .WINDOWS || OS == .LINUX;
  
  
  // need to do it like this, so other deferes can be tracked
  defer report_memory_leaks();


  print("\n\n");


  jai_path := get_path_of_running_executable();



  // Stats
  succeeded := 0;
  failed := 0;
  broken_tests: [..] string;
  broken_tests.allocator = temp;
  test_results: [..] Test_Result;
  test_results.allocator = temp;


  // Get all the test file list
  test_file_list: [..] string;
  defer {
    for test_file_list     free(it);
    array_free(test_file_list);
  }

  visit_files("compiler_bugs", false, *test_file_list, find_all_tests_visitor, visit_directories=true);

  // Used for checking if issue numbers are unique
  unique_issue_numbers: [..] int;
  defer { array_free(unique_issue_numbers); }

  // Compile and run all the test files
  for file_path_to_compile: test_file_list
  {
    test_result: Test_Result;
    test_result.file_path = file_path_to_compile;
    // Extract expected exit code from file name
    {
      filename := path_filename(file_path_to_compile);
      // If its a folder we need to use the folder name instead of file name
      if starts_with(filename, "first.jai")
      {
        file_path := path_strip_filename(file_path_to_compile);
        file_path.count -= 1; // remove '/'
        filename = path_filename(file_path);
      }

      if starts_with(filename, "CEC") // expected compilation exit code
      {
        expected_exit_code, success, remainder := string_to_int(advance(filename, 3));
        if success then   test_result.expected_compilation_exit_code = expected_exit_code;
        test_result.issue_number = string_to_int(advance(remainder, 1)); // skip '_'

        newly_added := array_add_if_unique(*unique_issue_numbers, test_result.issue_number);
        assert(newly_added, "Issue number % is not unique", test_result.issue_number);
      }
      else if starts_with(filename, "REC") // expected run exit code
      {
        test_result.is_runtime_test = true;
        expected_exit_code, success, remainder := string_to_int(advance(filename, 3));
        if success then   test_result.expected_run_exit_code = expected_exit_code;
        test_result.issue_number = string_to_int(advance(remainder, 1)); // skip '_'

        newly_added := array_add_if_unique(*unique_issue_numbers, test_result.issue_number);
        assert(newly_added, "Issue number % is not unique", test_result.issue_number);
      }
      else
      {
        //@todo think about this
        assert(false, "File name does not start with 'CEC' or 'REC'. File: '%'", filename);
      }
    }



    //
    // compile and run the program
    //

    compile_process_result, outputed_binary_path := compile_program(*test_result, jai_path);
    if compile_process_result.type == .FAILED_TO_LAUNCH
    {
      array_add(*broken_tests, file_path_to_compile);
      continue;
    }

    // make sure this runs only when file exists and is expected to compile
    if test_result.is_runtime_test 
    {
      run_process_result := run_program(*test_result, outputed_binary_path);
      if run_process_result.type == .FAILED_TO_LAUNCH
      {
        array_add(*broken_tests, file_path_to_compile);
        continue;
      }
    }
      

    if test_result.passed_test
      succeeded += 1;
    else
      failed += 1;

    array_add(*test_results, test_result);
  }

  

  //
  // output test result json
  //

  write_test_results(test_results, "last_test_results.json");



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
  print_color("BROKEN:    %\n", broken_tests.count, color=.YELLOW);
  print_color("TOTAL:     ", color=.MAGENTA);
  print_color("%", succeeded, color=.GREEN);
  print_color("/%\n", test_file_list.count - broken_tests.count, color=.MAGENTA);

  if (broken_tests.count > 0)
  {
    print("\n\n BROKEN TESTS: \n");
    for broken_tests    print("    %\n", it);
  }


}

// Visitor to find all test files to run
find_all_tests_visitor :: (info: *File_Visit_Info, test_list: *[..] string) 
{
  // Ignore directories starting with "_" or "." or "modules" folder
  if (info.short_name[0] == #char "_" 
      || info.short_name[0] == #char "." 
      || info.short_name == "modules"
  )
  { 
    if info.is_directory then info.descend_into_directory = false;
    return;
  }

  extension, found := path_extension(info.short_name);
  if !found && !info.is_directory return; // Skip files without extensions
  if found && extension != "jai" return; // Skip files that are not .jai

  if info.is_directory
  {
    entry_file := tprint("%/first.jai", info.full_name);
    if (file_exists(entry_file))
      array_add(test_list, entry_file);
    else
      print("No 'first.jai' file found in directory '%'. Skipping ...", info.full_name);
  }
  else
    array_add(test_list, copy_string(info.full_name));
}


// Compiles the program.
//
// The exit_code will always be 0, when 'outputed_binary_path' is non empty. 
compile_program :: (test_result: *Test_Result, jai_path: string) -> (compile_process_result: Process_Result, outputed_binary_path: string)
{
  command := tprint("% %", jai_path, test_result.file_path);
  command_split := split(command, " ",, temp);
  // command := split(tprint("echo %", test_list[0]), " ",, temp);
  print("Compiling: 'jai %' ... ", test_result.file_path);

  // exit_code 
  //    0 = success
  //    1 = user error in source code
  //    3 = internal compiler error
  compile_process_result, 
  output_string, 
  error_string, 
  timeout_reached := run_command(..command_split, 
                                working_directory="", 
                                capture_and_return_output=true, 
                                print_captured_output=false,
                                timeout_ms = 5000 // avoid infinite loops
                                ,, temp);


  if compile_process_result.type == .FAILED_TO_LAUNCH {
      print_color("Could not run command: '%'\n", command, color=.RED);
      return compile_process_result, "";
  }

  // Update test_result
  test_result.compilation_exit_code = compile_process_result.exit_code;
  passed_compilation_as_expected := compile_process_result.exit_code == test_result.expected_compilation_exit_code;
  test_result.passed_test = passed_compilation_as_expected;
  

  // Only print if its a compiletime test
  if !test_result.is_runtime_test
  {
    status_text := ifx passed_compilation_as_expected
                  then "SUCCESS" 
                  else tprint("FAILURE - Got Exit Code % (timeout reached: %), Expected %", 
                              compile_process_result.exit_code, 
                              timeout_reached,
                              test_result.expected_compilation_exit_code);
    color := ifx passed_compilation_as_expected then Console_Color.GREEN else .RED;
    print_color(status_text, color=color);
  }

  print("\n"); // newline after status text or for runtime tests


  // @todo remove this and move it to run_program, also remove its argumetn 
  // Program to run if it exists after compilation
#if OS == .WINDOWS {
    program_path_to_run := tprint("%.exe", path_strip_extension(test_result.file_path));
} else #if OS == .LINUX {
    program_path_to_run := tprint("%", path_strip_extension(test_result.file_path));
}

  program_does_exist := file_exists(program_path_to_run);
  // ignore outputed binary if its a compilation test
  outputed_binary_path := ifx test_result.is_runtime_test && program_does_exist then program_path_to_run else "";
  return compile_process_result, outputed_binary_path;
}


// runs the outputed binary and returns the results
run_program :: (test_result: *Test_Result, program_path_to_run: string) -> (process_result: Process_Result)
{
  print("   Running:     '%' ... ", program_path_to_run);
  if program_path_to_run == ""
  {
    print_color("ERROR: No executable found to run. Check that your test is corect.\n", color=.RED);
    return .{};
  }

  process_result, 
  output_string, 
  error_string, 
  timeout_reached := run_command(program_path_to_run,
                                working_directory="", 
                                capture_and_return_output=true, 
                                print_captured_output=false,
                                timeout_ms = 5000 // avoid infinite loops
                                ,, temp);

  if process_result.type == .FAILED_TO_LAUNCH {
      print_color("Could not run command: \"%\"", program_path_to_run, color=.RED);
      return process_result;
  }


  // print("Exit code: % (timeout reached: %)", process_result.exit_code, timeout_reached);

  // Update test_result
  test_result.run_exit_code = process_result.exit_code;
  passed_run_as_expected := process_result.exit_code == test_result.expected_run_exit_code;
  passed_compilation_as_expected := test_result.compilation_exit_code == test_result.expected_compilation_exit_code;
  test_result.passed_test = passed_compilation_as_expected && passed_run_as_expected;


  status_text := ifx passed_run_as_expected
                then "SUCCESS" 
                else tprint("FAILURE - Exit Code % (timeout reached: %)", process_result.exit_code, timeout_reached);
  color := ifx passed_run_as_expected then Console_Color.GREEN else .RED;
  print_color(status_text, color=color);
  print("\n");

  return process_result;
}



// Create the json file and write the results to it
write_test_results :: (test_results: [..] Test_Result, filename: string)
{
  current_compiler_version := compiler_get_version_info(null);
  found:, current_compiler_version = split_from_left(current_compiler_version, ",",, temp);
  current_compiler_version = replace(current_compiler_version, " ", "-",, temp);


  root_obj := New(JSON_Object);
  root_value := json_value(root_obj);
  defer { json_free(root_value); }

  for test_results
  {
    // Create the issue object
    issue_obj := New(JSON_Object);
    issue_value := json_value(issue_obj);
    json_set(root_obj, sprint("%", it.issue_number), issue_value);
    // Add the issue number
    json_set(issue_obj, copy_string("issue_number"), .{type=.NUMBER, number=xx it.issue_number});
    // Add the file path
    json_set(issue_obj, copy_string("file_path"), json_value(copy_string(it.file_path)));


    // Create the version object
    version_obj := New(JSON_Object);
    version_value := json_value(version_obj);
    json_set(issue_obj, copy_string(current_compiler_version), version_value, true);

    // Create the test result object under the current platform
#if OS == .WINDOWS {
      current_platform := copy_string("windows");
} else #if OS == .LINUX {
      current_platform := copy_string("linux");
}
    test_result_string := json_write_string(it,, temp);
    success, test_result_value := json_parse_string(test_result_string);
    assert(success, "Could not parse json string. Should never happen.");
    json_set(version_value.object, current_platform, test_result_value);
  }

  // traverse_node(root_value, 0);

  success := json_write_file(filename, root_value, indent_char = "  ");
  assert(success, "Could not write to file: '%'", filename);
}


traverse_node :: (node: JSON_Value, depth: int) 
{
  INDENTATION :: 4;
  print("% ", node.type);

  if node.type == 
  {
    case .NULL;
      print("\n");
    case .BOOLEAN;
      print("%\n", node.boolean);
    case .NUMBER;
      print("%\n", node.number);
    case .STRING;
      print("%\n", node.str);

    case .OBJECT;
      print("{\n");
      for node.object
      {
        for 1..(depth+1)*INDENTATION		print(" ");
        print("%: ", it_index);
        traverse_node(it, depth+1);
      }
      for 1..depth*INDENTATION		print(" ");
      print("}\n");

    case .ARRAY;
      print("[\n");
      for node.array {
        for 1..(depth+1)*INDENTATION		print(" ");
          traverse_node(it, depth + 1);
      }
      for 1..depth*INDENTATION		print(" ");
      print("]\n");
  }
}

#import "Jaison";
#import "Compiler";
#import "File";
#import "File_Utilities";
#import "Process";
#import "String";
#import "Print_Color";
#import "Basic"()(MEMORY_DEBUGGER=true);
#import "System";
#import "Hash_Table";
