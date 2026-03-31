<script lang="ts">
  import Icon from "../common/components/Icon.svelte";
  import type { MessageResponse, Directory } from "../common/apis/messages";
  import DirectoryTree from "./DirectoryTree.svelte";
  import {
    type DirectoryTreeFile,
    isUnloadedChild,
    isLoadedChild,
    isErrorChild,
    recursivelyUpdateDirectoryTree,
  } from "./directoryTreeHelpers";
  import type { PopupClient } from "./popupClient";

  const ROOT_PATH = "/";

  interface Props {
    selectedPath: string | undefined;
    onSelectPath: (path: string | undefined) => void;
    client: PopupClient;
  }

  let { selectedPath, onSelectPath, client }: Props = $props();

  let directoryTree = $state<DirectoryTreeFile>({
    name: "/",
    path: ROOT_PATH,
    children: "unloaded",
  });

  const requestVersionByPath: Record<string, number> = {};

  function updateTreeWithResponse(path: string, response: MessageResponse<Directory[]>) {
    if (response.success) {
      directoryTree = recursivelyUpdateDirectoryTree(
        directoryTree,
        path,
        response.result.map((c) => ({ ...c, children: "unloaded" as const })),
      );
    } else {
      directoryTree = recursivelyUpdateDirectoryTree(directoryTree, path, {
        failureMessage: response.reason,
      });
    }
  }

  async function loadTopLevelDirectories() {
    directoryTree = recursivelyUpdateDirectoryTree(directoryTree, ROOT_PATH, "unloaded");
    const stashedRequestVersion = (requestVersionByPath[ROOT_PATH] =
      (requestVersionByPath[ROOT_PATH] || 0) + 1);
    const response = await client.listDirectories();
    if (stashedRequestVersion === requestVersionByPath[ROOT_PATH]) {
      updateTreeWithResponse(ROOT_PATH, response);
    }
  }

  async function loadNestedDirectory(path: string) {
    if (!isLoadedChild(directoryTree.children)) {
      console.error(
        `programmer error: cannot load nested directories when top-level directories are not in a valid state`,
      );
      return;
    }
    const stashedRequestVersion = (requestVersionByPath[path] =
      (requestVersionByPath[path] || 0) + 1);
    const response = await client.listDirectories(path);
    if (stashedRequestVersion === requestVersionByPath[path]) {
      updateTreeWithResponse(path, response);
    }
  }

  // Load directories on mount (component is recreated each time the form opens)
  loadTopLevelDirectories();
</script>

<div class="path-selector">
  {#if isUnloadedChild(directoryTree.children)}
    <div class="no-content">{browser.i18n.getMessage("Loading_directories")}</div>
  {:else if isErrorChild(directoryTree.children)}
    <div class="no-content intent-error">
      <Icon name="triangle-exclamation" />
      {directoryTree.children.failureMessage}
    </div>
  {:else if directoryTree.children.length === 0}
    <div class="no-content">{browser.i18n.getMessage("No_directories")}</div>
  {:else}
    <div>
      {#each directoryTree.children as directory (directory.path)}
        <DirectoryTree
          file={directory}
          requestLoad={loadNestedDirectory}
          {selectedPath}
          onSelect={onSelectPath}
        />
      {/each}
    </div>
  {/if}
</div>

<style>
  .path-selector {
    .no-content {
      padding: 5px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:not(.intent-error) {
        color: #999;
      }
    }
  }
</style>
