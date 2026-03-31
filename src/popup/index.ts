import "../popup/index.css";
import { setupGlobalErrorHandler } from "../common/errorHandlers";

setupGlobalErrorHandler();

import { mount } from "svelte";
import { PollTasks } from "../common/apis/messages";
import PopupWrapper from "./PopupWrapper.svelte";

PollTasks.send();
setInterval(() => {
  PollTasks.send();
}, 10000);

mount(PopupWrapper, { target: document.getElementById("body")! });
