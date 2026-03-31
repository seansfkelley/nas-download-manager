<script lang="ts">
  import Icon from "../common/components/Icon.svelte";
  import DirectoryTree from "./DirectoryTree.svelte";
  import {
    type DirectoryTreeFile,
    isUnloadedChild,
    isErrorChild,
    isLoadedChild,
  } from "./directoryTreeHelpers";

  interface Props {
    file: DirectoryTreeFile;
    selectedPath?: string;
    requestLoad: (path: string) => void;
    onSelect: (path: string | undefined) => void;
  }

  let { file, selectedPath, requestLoad, onSelect }: Props = $props();

  let isExpanded = $state(false);

  $effect(() => {
    if (isErrorChild(file.children)) {
      isExpanded = false;
    }
  });

  function toggleExpanded() {
    const nextExpanded = !isExpanded;
    isExpanded = nextExpanded;
    if (nextExpanded && isUnloadedChild(file.children)) {
      requestLoad(file.path);
    }
    if (!nextExpanded && selectedPath && selectedPath.startsWith(file.path)) {
      onSelect(undefined);
    }
  }

  let isPlaceholder = $derived(isLoadedChild(file.children) && file.children.length === 0);
  let isError = $derived(isErrorChild(file.children));
  let isChevron = $derived(
    isUnloadedChild(file.children) ||
      (!isError && isLoadedChild(file.children) && file.children.length > 0),
  );
</script>

<div class="directory-tree">
  <div class="directory-header" class:is-selected={selectedPath === file.path}>
    <div
      class="directory-icon-wrapper"
      class:placeholder={isPlaceholder}
      class:disabled={isError}
      onclick={isError ? undefined : toggleExpanded}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === "Enter" && !isError) toggleExpanded();
      }}
      title={isErrorChild(file.children)
        ? file.children.failureMessage
        : browser.i18n.getMessage("Expandcollapse_directory")}
    >
      <span
        class:expand-collapse={isChevron}
        class:intent-warning={isError}
        class:is-expanded={isExpanded}
      >
        {#if isError}
          <Icon name="triangle-exclamation" />
        {:else if isPlaceholder}
          <Icon name="jet-fighter" />
        {:else}
          <Icon name="chevron-right" />
        {/if}
      </span>
    </div>
    <div
      class="name"
      onclick={() => onSelect(file.path)}
      role="button"
      tabindex="0"
      onkeydown={(e) => {
        if (e.key === "Enter") onSelect(file.path);
      }}
      title={file.name}
    >
      {file.name}
    </div>
  </div>
  {#if isExpanded}
    {#if isUnloadedChild(file.children)}
      <div class="children loading">{browser.i18n.getMessage("Loading")}</div>
    {:else if !isErrorChild(file.children) && file.children.length > 0}
      <ul class="children loaded">
        {#each file.children as child (child.path)}
          <DirectoryTree file={child} {requestLoad} {selectedPath} {onSelect} />
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .directory-tree {
    --icon-size: 20px;
    --icon-text-margin: 3px;

    &:not(:last-child) {
      margin-top: 1px;
    }

    .directory-header {
      display: flex;
      align-items: center;
      justify-content: center;
      height: var(--icon-size);

      .name {
        flex: 1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        border-radius: 2px;
        padding: 2px var(--icon-text-margin);

        &:hover {
          color: white;
          background-color: var(--color-selected);
          cursor: pointer;
        }
      }

      .directory-icon-wrapper {
        width: var(--icon-size);
        height: var(--icon-size);
        transition: background-color 100ms;
        border-radius: 2px;
        line-height: var(--icon-size);
        text-align: center;

        &.placeholder :global(.icon) {
          visibility: hidden;
        }

        :global(.icon) {
          font-size: 0.8em;
        }

        .expand-collapse {
          display: inline-block;
          transition: transform 100ms;

          &.is-expanded {
            transform: rotate(90deg);
          }
        }

        &:not(.placeholder):not(.disabled):hover {
          cursor: pointer;
          background-color: rgba(0, 0, 0, 0.1);
        }

        &.disabled {
          color: var(--color-text-faded);
        }
      }

      &.is-selected .name {
        color: white;
        background-color: var(--color-selected);
      }
    }

    > .children {
      padding: 2px 0 2px calc(var(--icon-size) + var(--icon-text-margin));

      &.loaded {
        margin: 0;
        list-style: none;
      }

      &.loading {
        font-style: italic;
        color: #999;
      }
    }
  }
</style>
