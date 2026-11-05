import { programShortName } from "../../../../lib/programs.js";

export function chartProgramTick(name) {
  const label = programShortName(name);
  return label.length > 10 ? `${label.slice(0, 10)}…` : label;
}
