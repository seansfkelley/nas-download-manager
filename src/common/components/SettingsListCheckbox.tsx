import { useId } from "react";

export interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
  title?: string;
  subtitle?: string;
}

export function SettingsListCheckbox(props: Props) {
  const id = useId();
  return (
    <li title={props.title} className={props.subtitle ? "has-subtitle" : undefined}>
      <div className="control">
        <input id={id} type="checkbox" checked={props.checked} onChange={props.onChange} />
        <label htmlFor={id}>{props.label}</label>
      </div>
      {props.subtitle && <span className="subtitle">{props.subtitle}</span>}
    </li>
  );
}
