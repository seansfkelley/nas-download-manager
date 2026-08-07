import { useId } from "react";

export interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
  subtitle?: string;
  title?: string;
}

export function SettingsListCheckbox(props: Props) {
  const id = useId();
  return (
    <li title={props.title}>
      <input id={id} type="checkbox" checked={props.checked} onChange={props.onChange} />
      <label htmlFor={id}>
        {props.label}
        {props.subtitle == null ? undefined : <span className="subtitle">{props.subtitle}</span>}
      </label>
    </li>
  );
}
