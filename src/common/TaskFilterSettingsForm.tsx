import * as React from 'react';

import {
  VisibleTaskSettings,
  TaskSortType,
  ORDERED_TASK_SORT_TYPE_NAMES,
  ORDERED_VISIBLE_TASK_TYPE_NAMES
} from '../state';

export interface Props {
  visibleTasks: VisibleTaskSettings;
  taskSortType: TaskSortType;
  updateVisibleTasks: (visibleTasks: VisibleTaskSettings) => void;
  updateTaskSortType: (taskSortType: TaskSortType) => void;
}

export class TaskFilterSettingsForm extends React.PureComponent<Props, void> {
  render() {
    return (
      <div className='task-filter-settings-form'>
        <ul className='settings-list'>
          {Object.keys(ORDERED_VISIBLE_TASK_TYPE_NAMES).map((type: keyof VisibleTaskSettings) => (
            <li key={type}>
              <input
                id={`${type}-input`}
                type='checkbox'
                checked={this.props.visibleTasks[type]}
                onChange={() => {
                  this.props.updateVisibleTasks({
                    ...this.props.visibleTasks,
                    [type]: !this.props.visibleTasks[type]
                  });
                }}
              />
              <label htmlFor={`${type}-input`}>
                {ORDERED_VISIBLE_TASK_TYPE_NAMES[type]}
              </label>
            </li>
          ))}
        </ul>
        <div className='task-sort-type'>
          <span className='label'>
            {browser.i18n.getMessage('Order_tasks_by')}
          </span>
          <select
            value={this.props.taskSortType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              this.props.updateTaskSortType(e.currentTarget.value as TaskSortType);
            }}
          >
            {Object.keys(ORDERED_TASK_SORT_TYPE_NAMES).map((type: TaskSortType) => (
              <option key={type} value={type}>
                {ORDERED_TASK_SORT_TYPE_NAMES[type]}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
}
