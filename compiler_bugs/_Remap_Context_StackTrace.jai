// just to not forget it

// modules\Remap_Context.jai:27
remap_context :: () -> Context {
    // If we dont fix this after copying, the stack trace will point to
    // remap_context, since that's where it gets copied from.
    // Usually you will want to push the generated context right after
    // calling this function, therefore it makes sense to have it
    // point the the caller.
    caller_stack_trace := context.stack_trace.next; // Should always exist since we got called at some point.
    if context.context_info == type_info(Context) return context;  // @Speed: This does a copy.
 
    result := remap_context(*context, context.context_info);
    result.stack_trace = caller_stack_trace;
    return result;
}