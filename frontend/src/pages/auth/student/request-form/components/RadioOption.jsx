import OptionLabel from "./OptionLabel";

// Radio na pwedeng i-unselect kapag na-click ulit (same behavior as before).
export default function RadioOption({
  name,
  value,
  label,
  checked,
  onToggle,
  onChange,
}) {
  return (
    <OptionLabel>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onClick={(event) => onToggle(name, value, event)}
        onChange={(event) => onChange(name, event.target.value)}
        className="accent-[#101C4A]"
      />
      {label ?? value}
    </OptionLabel>
  );
}
