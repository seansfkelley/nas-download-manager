import classNames from "classnames";

export function disabledPropAndClassName(disabled: boolean, className?: string) {
  return {
    disabled,
    className: classNames({ disabled: disabled }, className),
  };
}
