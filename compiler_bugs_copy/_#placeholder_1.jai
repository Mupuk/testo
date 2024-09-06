// #import "#placeholder_1"()();

// #run BASIC.print("%\n", BASIC.MEMORY_DEBUGGER);









#import,string #string DONE
  #module_parameters()(S: Code){
  };
  #scope_file
  // using _ :: #import "Basic";
  using _ :: #import "Compiler";
  // #run add_build_string("using MYBASIC :: #import \"Basic\"()(MEMORY_DEBUGGER=true);", get_current_workspace(), code=S);
  // #insert,scope(S) "using MYBASIC :: #import \"Basic\"()(MEMORY_DEBUGGER=true);";
  #insert,scope(S) -> string {return join("using MYBASIC :: #import \"Basic\"()(MEMORY_DEBUGGER=", "true", ");", "X::5;");};



#import,string #string XXX
join :: (inputs: .. string, separator := "", before_first := false, after_last := false) -> string {
    if !inputs return "";

    bytes := separator.count * (inputs.count-1);
    for inputs bytes += it.count;

    if before_first  bytes += separator.count;
    if after_last    bytes += separator.count;

    if !bytes return "";

    result: string;
    result.count = bytes;

    a := context.allocator;
    result.data  = a.proc(.ALLOCATE, bytes, 0, null, a.data); // @leak

    if !result.data  return "";  // Allocation failed. Maybe we should log an error.

    cursor := result.data;
    if before_first && inputs.count {
        memcpy(cursor, separator.data, separator.count);
        cursor += separator.count;
    }

    for input: inputs {
        memcpy(cursor, input.data, input.count);
        cursor += input.count;

        if separator {
            if (it_index == inputs.count-1) && !after_last {
                continue;
            }

            memcpy(cursor, separator.data, separator.count);
            cursor += separator.count;
        }
    }

    return result;
}
XXX;
DONE()(S);

S :: #code {};

#placeholder X;
#if X
{

// #insert,scope(S) -> string {return join("using MYBASIC :: #import \"Basic\"()(MEMORY_DEBUGGER=", "true", ");");};
// #insert -> string {return join("using MYBASIC :: #import \"Basic\"()(MEMORY_DEBUGGER=true);");};

#run {
  using _ :: #import "Compiler";
  w := get_current_workspace();
  // add_build_string("using MYBASIC :: #import \"Basic\"()(MEMORY_DEBUGGER=true);", w);
}



#run print("DBG = %\n", MYBASIC.MEMORY_DEBUGGER);

main :: () 
{
}

}



