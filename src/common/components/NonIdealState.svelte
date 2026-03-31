<script lang="ts">
  import type { Snippet } from "svelte";

  interface Props {
    icon?: Snippet;
    text?: string;
    className?: string;
    children?: Snippet;
  }

  let { icon, text, className, children }: Props = $props();
</script>

<div class="non-ideal-state {className ?? ''}">
  {#if icon}
    <span class="main-icon">{@render icon()}</span>
  {/if}
  {#if text}
    <span class="explanation">{text}</span>
  {/if}
  {#if children}
    {@render children()}
  {/if}
</div>

<style>
  .non-ideal-state {
    margin: 20px 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    color: var(--color-text-faded);
    padding: 10px;

    .main-icon {
      margin-bottom: 8px;
    }

    .explanation {
      font-weight: 500;
      font-size: 14px;
      max-width: 60%;
      text-align: center;
    }
  }
</style>
