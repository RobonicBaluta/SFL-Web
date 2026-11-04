/**
 * Classes for long text rendered from MDX. Tailwind's reset strips list markers,
 * heading sizes and link styling, so they are restored here.
 */
export const PROSE_CLASSES =
  "text-lg leading-relaxed [&_a]:font-semibold [&_a]:underline [&_a]:decoration-sfl-gold [&_a]:decoration-2 [&_a]:underline-offset-2 [&_li]:mb-1 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-5 [&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:uppercase [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:font-display [&_h3]:text-xl [&_h3]:font-bold";
