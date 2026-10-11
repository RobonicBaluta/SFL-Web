// Event bodies are compiled as MDX, where "{", "}", "<" and a line starting with
// import/export are syntax, and backslash escapes do not help. Character
// references render as the literal character, so the admin form stores those
// and shows the owner plain text. No Node imports: the client uses this too.

const ENCODE: [RegExp, string][] = [
  [/\r\n?/g, "\n"],
  [/\{/g, "&#123;"],
  [/\}/g, "&#125;"],
  [/</g, "&lt;"],
  [/^([ \t]*)import/gm, "$1&#105;mport"],
  [/^([ \t]*)export/gm, "$1&#101;xport"]
];

const DECODE: [RegExp, string][] = [
  [/&#123;/g, "{"],
  [/&#125;/g, "}"],
  [/&lt;/g, "<"],
  [/&#105;mport/g, "import"],
  [/&#101;xport/g, "export"]
];

const apply = (text: string, rules: [RegExp, string][]) =>
  rules.reduce((s, [re, to]) => s.replace(re, to), text);

/** Plain text typed in the admin form → MDX-safe body. */
export function encodeBody(text: string): string {
  return apply(text, ENCODE);
}

/** MDX body from a file → the plain text shown in the admin form. */
export function decodeBody(mdx: string): string {
  return apply(mdx, DECODE);
}
