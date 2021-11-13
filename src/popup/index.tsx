import "./index.scss";
import "../common/init/nonContentContext";
import * as React from "react";
import * as ReactDOM from "react-dom";

import { FatalErrorWrapper } from "./FatalErrorWrapper";
import { PopupWrapper } from "./PopupWrapper";

const ELEMENT = document.getElementById("body")!;

ReactDOM.render(
  <FatalErrorWrapper>
    <PopupWrapper />
  </FatalErrorWrapper>,
  ELEMENT,
);
