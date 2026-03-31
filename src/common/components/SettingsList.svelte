<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    children?: Snippet;
  }

  let { children }: Props = $props();
</script>

<ul class="settings-list">
  {#if children}
    {@render children()}
  {/if}
</ul>

<style>
  ul.settings-list {
    list-style: none;
    padding-left: 15px;

    :global(li) {
      margin: 5px auto;
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }
  }
</style>
