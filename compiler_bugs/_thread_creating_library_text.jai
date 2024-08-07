// im not exactly sure why this works porperly when calling this
// via a process by doing 'jai thread_creating_library_text.jai'

// calling the second part manually shows the actual bug:
// 'jai .\compiler_bugs\thread_creating_library_text.jai -quiet -add "COMPILE :: false;"'
//
// Scrambled output:
// Creat i n gC rleiabtrianrgy  lCi:b/rUasreyr
// sC/:M/uUpsue/rDse/sMkutpoup//Dmeuspkut-oepn/gmiunpeu/-ceonmgpiinlee/rc_obmupgisl/e.rb_ubiulgds//t.hbrueialdd_/ctrheraetaidn_gc_rleiabtrianrgy__ltiebxrta2r.yl_itbe
// xatn.dl iobb jaencdt  oCb:j/eUcste
// rCs://MUuspeur/sD/eMsukptuo/pD/emsukptuo-pe/nmguipnue-/ecnogmipniel/ecro_mbpuiglse/r._bbuuiglsd//.tbhurieladd/_tchrreeaatdi_ncgr_elaitbirnagr_yl_itberxatr2y._etxepx


#if !#exists(COMPILE)
{
  #run {
    #import "Basic";
    #import "Compiler";
    #import "Check";
    #import "Metaprogram_Plugins";
    #import "String";
    #import "Process";

    // Don't output anything
    set_build_options_dc(.{do_output=false, write_added_strings=false});

    command := string.["jai", #file, "-quiet", "-add", "COMPILE :: true;"];
    process_result, 
    output_string, 
    error_string, 
    timeout_reached := run_command(..command, capture_and_return_output=true, print_captured_output=true); 

    index := find_index_from_left(output_string, "Creating library ");
    assert(index != -1);
  }
}
else
{

  #run {
    #import "Basic"()(MEMORY_DEBUGGER=true);
    #import "Compiler";
    #import "Check";
    #import "Metaprogram_Plugins";
    #import "String";

    // Don't output anything
    set_build_options_dc(.{do_output=false, write_added_strings=false});

    w := compiler_create_workspace("1");
    w2 := compiler_create_workspace("2");
    if !w || !w2
    {
      log("Workspace creation failed.\n", flags=.ERROR);
      return;
    }

    // Set build options
    {
      options := get_build_options(w);
      // options.output_type = .NO_OUTPUT;
      options.output_executable_name = path_basename(#file);
      options.output_path = ".build/";
      options.text_output_flags = 0;
      set_build_options(options, w);
    }

    // Set build options
    {
      options := get_build_options(w2);
      // options.output_type = .NO_OUTPUT;
      options.output_executable_name = tprint("%02", path_basename(#file));
      options.output_path = ".build/";
      options.text_output_flags = 0;
      set_build_options(options, w2);
    }


    // Message Loop
    {
      compiler_begin_intercept(w);
      compiler_begin_intercept(w2);

      add_build_string("main :: () {}", w);
      add_build_string("main :: () {}", w2);

      while true 
      {
        message := compiler_wait_for_message();
        if message.kind == .COMPLETE break;
      }

      compiler_end_intercept(w);
      compiler_end_intercept(w2);
    }


    reset_temporary_storage();
    report := make_leak_report();
    defer deinit(*report);

    if (report.sorted_summaries.count > 0) 
    {
      log_leak_report(report);
      // assert(false);
    }
  }


}