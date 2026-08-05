// Style sheets are imported for their side effects and resolved by the bundler, not TypeScript.
// "bundler" module resolution reports unresolvable side-effect imports, so declare them here.
declare module "*.css";
