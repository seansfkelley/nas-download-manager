import * as React from 'react';
import * as classNamesProxy from 'classnames';

// https://github.com/rollup/rollup/issues/1267
const classNames: typeof classNamesProxy = (classNamesProxy as any).default || classNamesProxy;

export type DirectoryTreeFileChildren = 'unloaded' | { failureMessage: string } | DirectoryTreeFile[];

export interface DirectoryTreeFile {
  name: string;
  path: string;
  children: DirectoryTreeFileChildren;
}

export function isErrorChild(children: DirectoryTreeFileChildren): children is { failureMessage: string } {
  return (children as { failureMessage: string  }).failureMessage != null;
}

export function isLoadedChild(children: DirectoryTreeFileChildren): children is DirectoryTreeFile[] {
  return children !== 'unloaded' && !isErrorChild(children);
}

export interface Props {
  file: DirectoryTreeFile;
  selectedPath?: string;
  requestLoad: (path: string) => void;
  onSelect: (path: string) => void;
}

export interface State {
  isExpanded: boolean;
}

export class DirectoryTree extends React.PureComponent<Props, State> {
  state: State = {
    isExpanded: false
  };

  render() {
    return (
      <div className='directory-tree'>
        <div className={classNames('directory-header', { 'is-selected': this.props.selectedPath === this.props.file.path })}>
          <div
            className='directory-icon-wrapper'
            onClick={this.toggleExpanded}
            title='Expand/collapse directory'
          >
            <span
              className={classNames('fa', {
                'fa-chevron-right expand-collapse': this.props.file.children === 'unknown' || (!isErrorChild(this.props.file.children) && this.props.file.children.length > 0),
                'fa-exclamation-triangle intent-warning': isErrorChild(this.props.file.children),
                'fa-fighter-jet placeholder': isLoadedChild(this.props.file.children) && this.props.file.children.length === 0,
                'is-expanded': this.state.isExpanded
              })}
            />
          </div>
          <div
            className='name'
            onClick={this.onSelect}
            title={this.props.file.name}
          >
            {this.props.file.name}
          </div>
        </div>
        {this.renderChildren()}
      </div>
    );
  }

  private onSelect = () => {
    this.props.onSelect(this.props.file.path);
  };

  private toggleExpanded = () => {
    const isExpanded = !this.state.isExpanded;
    this.setState({ isExpanded });
    if (isExpanded && this.props.file.children === 'unknown') {
      this.props.requestLoad(this.props.file.path);
    }
  };

  private renderChildren(): React.ReactNode {
    if (this.state.isExpanded) {
      if (this.props.file.children === 'unloaded') {
        return 'loading...';
      } else if (isErrorChild(this.props.file.children)) {
        return null;
      } else {
        return (
          <ul className='children'>
            {this.props.file.children.map(child => (
              <DirectoryTree
                key={child.path}
                file={child}
                requestLoad={this.props.requestLoad}
                selectedPath={this.props.selectedPath}
                onSelect={this.props.onSelect}
              />
            ))}
          </ul>
        );
      }
    } else {
      return null;
    }
  }
}
