import * as React from 'react';
import uniqueId from 'lodash-es/uniqueId';

export interface Props {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export class SettingsListCheckbox extends React.PureComponent<Props, {}> {
  render() {
    const id = uniqueId('checkbox-id-');
    return (
      <li>
        <input
          id={id}
          type='checkbox'
          checked={this.props.checked}
          onChange={this.props.onChange}
        />
        <label htmlFor={id}>{this.props.label}</label>
      </li>
    );
  }
}
