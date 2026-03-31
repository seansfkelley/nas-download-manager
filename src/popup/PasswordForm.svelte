<script lang="ts">
  import type { PopupClient } from "./popupClient";
  import LoginStatus from "../common/components/LoginStatus.svelte";
  import type { Status } from "../common/components/LoginStatus.svelte";

  interface Props {
    client: PopupClient;
  }

  let { client }: Props = $props();

  let status = $state<Status>("none");
  let password = $state("");
</script>

<form
  class="password-form"
  onsubmit={async (e) => {
    e.preventDefault();
    status = "in-progress";
    status = await client.testConnectionAndLogin(password);
  }}
>
  <div class="centering-wrapper">
    <input
      type="password"
      value={password}
      disabled={status === "in-progress"}
      oninput={(e) => {
        status = "none";
        password = e.currentTarget.value;
      }}
    />
    <button type="submit" disabled={password.length === 0 || status === "in-progress"}>
      {browser.i18n.getMessage("Login")}
    </button>
  </div>
  <LoginStatus {status} />
</form>

<style>
  .password-form {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 10px;

    input {
      margin-right: 5px;
    }

    :global(.login-status-display) {
      margin-top: 10px;
    }
  }
</style>
