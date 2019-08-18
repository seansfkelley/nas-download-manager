import * as React from "react";
import { NoTasks } from "./NoTasks";

export const PrivateBrowsingUnsupported = () => (
  <div className="popup">
    <NoTasks
      icon="fa-user-secret"
      text={browser.i18n.getMessage("Private_browsing_mode_is_not_currently_supported")}
    />
  </div>
);
