<script module lang="ts">
  import { ClientRequestResult } from "../apis/synology/client";

  export type Status = "none" | "in-progress" | ClientRequestResult<unknown>;
</script>

<script lang="ts">
  import Icon from "./Icon.svelte";
  import { getErrorForConnectionFailure, getErrorForFailedResponse } from "../apis/errors";

  interface Props {
    status: Status;
  }

  let { status }: Props = $props();

  let isSlow = $state(false);

  $effect(() => {
    if (status === "in-progress") {
      const timeout = setTimeout(() => {
        isSlow = true;
      }, 5000);
      return () => {
        clearTimeout(timeout);
      };
    } else {
      isSlow = false;
      return;
    }
  });
</script>

{#if status === "none"}
  <span class="login-status-display"></span>
{:else if status === "in-progress"}
  <span class="login-status-display">
    <Icon name="arrows-rotate" spin />
    {isSlow
      ? browser.i18n.getMessage("Logging_in_this_is_unusually_slow_is_your_NAS_asleep")
      : browser.i18n.getMessage("Logging_in")}
  </span>
{:else if ClientRequestResult.isConnectionFailure(status)}
  <span class="login-status-display intent-error">
    <Icon name="xmark" />
    {getErrorForConnectionFailure(status)}
  </span>
{:else if status.success}
  <span class="login-status-display intent-success">
    <Icon name="check" />
    {browser.i18n.getMessage("Login_successful")}
  </span>
{:else if !status.success}
  <span class="login-status-display intent-error">
    <Icon name="xmark" />
    {getErrorForFailedResponse(status)}
  </span>
{/if}

<style>
  .login-status-display {
    display: flex;
    flex: 1;
    margin-right: 10px;
    align-items: center;
  }
</style>
