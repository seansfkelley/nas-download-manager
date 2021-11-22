import * as React from "react";
import { default as uniqueId } from "lodash/uniqueId";

export interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
  title?: string;
}

export function SettingsListCheckbox(props: Props) {
  const id = uniqueId("checkbox-id-");
  return (
    <li title={props.title}>
      <input id={id} type="checkbox" checked={props.checked} onChange={props.onChange} />
      <label htmlFor={id}>{props.label}</label>
    </li>
  );
}
