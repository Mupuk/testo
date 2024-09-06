#module_parameters()(
  // It seems the interface gets ignored! The compiler should error here
  TEST : $I/interface Testo = Testo
) {
  Testo :: struct {x: int;};
}

#run {
  crash: TEST;
  // crash.x = 5;
}