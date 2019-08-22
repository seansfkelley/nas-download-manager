import * as React from "react";
import { NonIdealState } from "../common/components/NonIdealState";

export const PrivateBrowsingUnsupported = () => (
  <div className="popup">
    <NonIdealState
      icon="fa-user-secret"
      text={browser.i18n.getMessage("Private_browsing_mode_is_not_currently_supported")}
    />
  </div>
);
