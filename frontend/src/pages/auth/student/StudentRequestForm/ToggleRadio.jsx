import { OptionLabel } from "./RequestPrimitives";

function ToggleRadio({ name, value, checked, onChange, onClick, children }) {
  return <OptionLabel>
    <input type="radio" name={name} value={value} checked={checked}
      onClick={(event) => onClick(name, value, event)}
      onChange={(event) => onChange(name, event.target.value)}
      className="accent-[#101C4A]" />
    {children}
  </OptionLabel>;
}

export default ToggleRadio;
