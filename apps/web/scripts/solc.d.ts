/**
 * The `solc` package ships no types. The compile script only needs the
 * standard JSON entry point, so describe exactly that and nothing more.
 */
declare module 'solc' {
  const solc: {
    compile(input: string): string;
    version(): string;
  };
  export default solc;
}
