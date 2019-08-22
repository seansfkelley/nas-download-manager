import classNames from "classnames";

// For some reason, (p)react in the Firefox settings page is incapable of setting the classname on <input>
// elements. So hax with this ref callback that does it by touching the DOM directly. I don't know who
// is at fault or why, but this workaround works.
export function kludgeRefSetClassname(className: string) {
  return (e: HTMLElement | null) => {
    if (e != null) {
      e.className = className;
    }
  };
}

export function disabledPropAndClassName(disabled: boolean, otherClassNames?: string) {
  return {
    disabled,
    className: classNames({ disabled: disabled }, otherClassNames),
  };
}
