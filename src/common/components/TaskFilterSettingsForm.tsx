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
  showInactiveTasks: boolean;
  updateTaskTypeVisibility: (taskType: keyof VisibleTaskSettings, visibility: boolean) => void;
  updateTaskSortType: (taskSortType: TaskSortType) => void;
  updateBadgeDisplayType: (badgeDisplayType: BadgeDisplayType) => void;
  updateShowInactiveTasks: (showInactiveTasks: boolean) => void;
}

export function TaskFilterSettingsForm(props: Props) {
  return (
    <div className="task-filter-settings-form">
      <SettingsList>
        {recordKeys(ORDERED_VISIBLE_TASK_TYPE_NAMES).map((type) => (
          <SettingsListCheckbox
            key={type}
            checked={props.visibleTasks[type]}
            onChange={() => {
              props.updateTaskTypeVisibility(type, !props.visibleTasks[type]);
            }}
            label={ORDERED_VISIBLE_TASK_TYPE_NAMES[type]}
          />
        ))}
      </SettingsList>
      <div className="task-sort-type">
        <span className="label">{browser.i18n.getMessage("Order_tasks_by")}</span>
        <select
          value={props.taskSortType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            props.updateTaskSortType(e.currentTarget.value as TaskSortType);
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
          value={props.badgeDisplayType}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            props.updateBadgeDisplayType(e.currentTarget.value as BadgeDisplayType);
          }}
        >
          {recordKeys(ORDERED_BADGE_DISPLAY_TYPE_NAMES).map((type) => (
            <option key={type} value={type}>
              {ORDERED_BADGE_DISPLAY_TYPE_NAMES[type]}
            </option>
          ))}
        </select>
      </div>
      <SettingsList>
        <SettingsListCheckbox
          checked={props.showInactiveTasks}
          onChange={() => {
            props.updateShowInactiveTasks(!props.showInactiveTasks);
          }}
          label={browser.i18n.getMessage("Show_inactive_tasks")}
          title={browser.i18n.getMessage("Tasks_with_nonzero_uploaddownload_speeds_are_active")}
        />
      </SettingsList>
    </div>
  );
}
