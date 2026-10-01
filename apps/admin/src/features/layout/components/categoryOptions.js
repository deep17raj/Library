import { formatRupees } from "@app/shared/money";

/**
 * <select> options for a seat category: "none", the active categories, and the
 * currently assigned one even if it has since been archived (so the form shows it).
 * @param {{ id: string, name: string, monthlySurchargePaise: number, status: string }[]} categories
 * @param {string | null | undefined} currentId
 */
export function categoryOptions(categories, currentId) {
  const usable = categories.filter((c) => c.status === "active" || c.id === currentId);
  return [
    { value: "", label: "No extra charge" },
    ...usable.map((c) => ({
      value: c.id,
      label: `${c.name} (+${formatRupees(c.monthlySurchargePaise)}/month)${c.status === "archived" ? " — archived" : ""}`,
    })),
  ];
}
