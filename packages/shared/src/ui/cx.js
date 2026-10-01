/** Join class names, skipping falsy ones: cx("a", cond && "b"). */
export function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}
