<script lang="ts">
  import type { ConnectionSettings as ConnectionSettingsObject } from "../common/state/defaults";
  import { TestConnection } from "../common/apis/messages";
  import SettingsList from "../common/components/SettingsList.svelte";
  import LoginStatus from "../common/components/LoginStatus.svelte";
  import type { Status } from "../common/components/LoginStatus.svelte";
  import type { Overwrite } from "../common/types";
  import { assert } from "../common/lang";

  type ConnectionSettingsWithMandatoryPassword = Overwrite<
    ConnectionSettingsObject,
    { password: string }
  >;

  interface Props {
    connectionSettings: ConnectionSettingsObject;
    saveConnectionSettings: (settings: ConnectionSettingsWithMandatoryPassword) => void;
  }

  let { connectionSettings, saveConnectionSettings }: Props = $props();

  let changedSettings = $state<Partial<ConnectionSettingsWithMandatoryPassword>>({});
  let loginStatus = $state<Status>("none");

  const uid = $props.id();

  let mergedSettings = $derived({ ...connectionSettings, ...changedSettings });
  let canEditFields = $derived(loginStatus !== "in-progress");

  function setSetting<K extends keyof ConnectionSettingsWithMandatoryPassword>(
    key: K,
    value: ConnectionSettingsWithMandatoryPassword[K],
  ) {
    loginStatus = "none";
    changedSettings = { ...changedSettings, [key]: value };
  }

  async function testConnectionAndSave(settings: ConnectionSettingsWithMandatoryPassword) {
    // Firefox MV3 treats host_permissions as optional. Ensure they're granted
    // before attempting to connect to the NAS.
    const hasPermission = await browser.permissions.contains({ origins: ["<all_urls>"] });
    if (!hasPermission) {
      const granted = await browser.permissions.request({ origins: ["<all_urls>"] });
      if (!granted) {
        loginStatus = {
          type: "unknown",
          error: "Host permission is required to connect to your NAS",
        };
        return;
      }
    }
    loginStatus = "in-progress";
    const result = await TestConnection.send(
      settings.hostname,
      settings.port,
      settings.username,
      settings.password,
    );
    if (result.success) {
      loginStatus = {
        success: true,
        data: {},
        meta: { apiGroup: "Auth", method: "login", version: 6 },
      };
      saveConnectionSettings(settings);
    } else {
      loginStatus = { type: "unknown", error: result.reason };
    }
  }

  let submitDisabled = $derived(
    !canEditFields ||
      !mergedSettings.hostname ||
      !mergedSettings.port ||
      !mergedSettings.username ||
      !mergedSettings.password ||
      loginStatus === "in-progress",
  );
</script>

<form
  onsubmit={(e) => {
    e.preventDefault();
    assert(mergedSettings.password != null);
    testConnectionAndSave(mergedSettings as ConnectionSettingsWithMandatoryPassword);
  }}
  class="connection-settings"
>
  <SettingsList>
    <li class="label-and-input host-settings">
      <span class="label">{browser.i18n.getMessage("Host")}</span>
      <div class="input">
        <span>https://</span>
        <input
          type="text"
          disabled={!canEditFields}
          class="host-setting"
          placeholder={browser.i18n.getMessage("hostname_or_IP_address")}
          value={mergedSettings.hostname}
          oninput={(e) => setSetting("hostname", e.currentTarget.value.trim())}
        />
        <span>:</span>
        <input
          disabled={!canEditFields}
          class="port-setting"
          type="number"
          value={mergedSettings.port === 0 ? "" : mergedSettings.port}
          oninput={(e) => {
            const port = +(e.currentTarget.value.replace(/[^0-9]/g, "") || 0);
            setSetting("port", port);
          }}
        />
      </div>
    </li>

    <li class="label-and-input">
      <span class="label">{browser.i18n.getMessage("Username")}</span>
      <div class="input">
        <input
          type="text"
          disabled={!canEditFields}
          value={mergedSettings.username}
          oninput={(e) => setSetting("username", e.currentTarget.value)}
        />
      </div>
    </li>

    <li class="label-and-input">
      <span class="label">{browser.i18n.getMessage("Password")}</span>
      <div class="input">
        <input
          type="password"
          disabled={!canEditFields}
          value={mergedSettings.password ?? ""}
          oninput={(e) => setSetting("password", e.currentTarget.value)}
        />
      </div>
    </li>

    <li class="label-and-input remember-me">
      <input
        type="checkbox"
        disabled={!canEditFields}
        class:disabled={!canEditFields}
        id="{uid}-remember"
        checked={mergedSettings.rememberPassword}
        onchange={() => setSetting("rememberPassword", !mergedSettings.rememberPassword)}
      />
      <label for="{uid}-remember">{browser.i18n.getMessage("Remember_Password")}</label>
    </li>

    <li>
      <LoginStatus status={loginStatus} />
      <button type="submit" disabled={submitDisabled}>
        {browser.i18n.getMessage("Login")}
      </button>
    </li>
  </SettingsList>
</form>

<style>
  .connection-settings {
    .remember-me input {
      margin-left: auto;
    }
  }
</style>
