import "./task-filter-settings-form.scss";
import * as React from "react";
import {
  VisibleTaskSettings,
  TaskSortType,
  ORDERED_TASK_SORT_TYPE_NAMES,
  ORDERED_VISIBLE_TASK_TYPE_NAMES,
  BadgeDisplayType,
  ORDERED_BADGE_DISPLAY_TYPE_NAMES,
} from "../state";
import { recordKeys } from "../lang";
import { SettingsList } from "./SettingsList";
import { SettingsListCheckbox } from "./SettingsListCheckbox";

export interface Props {
  visibleTasks: VisibleTaskSettings;
  taskSortType: TaskSortType;
  badgeDisplayType: BadgeDisplayType;
  updateTaskTypeVisibility: (taskType: keyof VisibleTaskSettings, visibility: boolean) => void;
  updateTaskSortType: (taskSortType: TaskSortType) => void;
  updateBadgeDisplayType: (badgeDisplayType: BadgeDisplayType) => void;
}

export class TaskFilterSettingsForm extends React.PureComponent<Props> {
  render() {
    return (
      <div className="task-filter-settings-form">
        <SettingsList>
          {recordKeys(ORDERED_VISIBLE_TASK_TYPE_NAMES).map((type) => (
            <SettingsListCheckbox
              key={type}
              checked={this.props.visibleTasks[type]}
              onChange={() => {
                this.props.updateTaskTypeVisibility(type, !this.props.visibleTasks[type]);
              }}
              label={ORDERED_VISIBLE_TASK_TYPE_NAMES[type]}
            />
          ))}
        </SettingsList>
        <div className="task-sort-type">
          <span className="label">{browser.i18n.getMessage("Order_tasks_by")}</span>
          <select
            value={this.props.taskSortType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              this.props.updateTaskSortType(e.currentTarget.value as TaskSortType);
            }}
          >
            {recordKeys(ORDERED_TASK_SORT_TYPE_NAMES).map((type) => (
              <option key={type} value={type}>
                {ORDERED_TASK_SORT_TYPE_NAMES[type]}
              </option>
            ))}
          </select>
        </div>
        <div className="badge-display-type">
          <span className="label">{browser.i18n.getMessage("Badge_shows")}</span>
          <select
            value={this.props.badgeDisplayType}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              this.props.updateBadgeDisplayType(e.currentTarget.value as BadgeDisplayType);
            }}
          >
            {recordKeys(ORDERED_BADGE_DISPLAY_TYPE_NAMES).map((type) => (
              <option key={type} value={type}>
                {ORDERED_BADGE_DISPLAY_TYPE_NAMES[type]}
              </option>
            ))}
          </select>
        </div>
      </div>
    );
  }
}
