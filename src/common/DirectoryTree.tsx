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

export function isUnloadedChild(children: DirectoryTreeFileChildren): children is 'unloaded' {
  return children === 'unloaded';
}

export function isErrorChild(children: DirectoryTreeFileChildren): children is { failureMessage: string } {
  return (children as { failureMessage: string  }).failureMessage != null;
}

export function isLoadedChild(children: DirectoryTreeFileChildren): children is DirectoryTreeFile[] {
  return !isUnloadedChild(children) && !isErrorChild(children);
}

export function  recursivelyUpdateDirectoryTree(currentNode: DirectoryTreeFile, path: string, newChildren: DirectoryTreeFileChildren): DirectoryTreeFile {
  if (currentNode.path === path) {
    return {
      ...currentNode,
      children: newChildren
    };
  } else if (!isLoadedChild(currentNode.children)) {
    console.error(`programmer error: tried to update tree at ${path} but ancestor ${currentNode.path} has no valid children; ancestor:`, currentNode);
    return currentNode;
  } else {
    return {
      ...currentNode,
      children: currentNode.children.map(child => {
        if (path.startsWith(child.path)) {
          return recursivelyUpdateDirectoryTree(child, path, newChildren);
        } else {
          return child;
        }
      })
    };
  }
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
                'fa-chevron-right expand-collapse': isUnloadedChild(this.props.file.children) || (!isErrorChild(this.props.file.children) && this.props.file.children.length > 0),
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
    if (isExpanded && isUnloadedChild(this.props.file.children)) {
      this.props.requestLoad(this.props.file.path);
    }
  };

  private renderChildren(): React.ReactNode {
    if (this.state.isExpanded) {
      if (isUnloadedChild(this.props.file.children)) {
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
