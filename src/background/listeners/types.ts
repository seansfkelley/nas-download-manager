import type { SynologyClient } from "../../common/apis/synology";
import type { Settings } from "../../common/state";
import type { Downloads, MutableContextContainer } from "../backgroundState";

export type SettingsChangeListener = (
  settings: Readonly<Settings>,
  api: SynologyClient,
  updateDownloads: (downloads: Partial<Downloads>) => void,
  context: MutableContextContainer,
) => void;

export type ReadonlyListener = (
  settings: Readonly<Settings>,
  downloads: Readonly<Downloads>,
  context: MutableContextContainer,
) => void;
