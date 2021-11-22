import "mocha";
import { expect } from "chai";

import type { DownloadStationTask } from "../src/common/apis/synology/DownloadStation/Task";
import { sortTasks } from "../src/common/filtering";

describe("sortTasks", () => {
  interface MockTaskInput {
    id: string;
    title: string;
    status: DownloadStationTask["status"];
    downloadedBytes?: number;
    totalBytes?: number;
    createdTime?: number;
    completedTime?: number;
  }

  function mockTask({
    id,
    title,
    status,
    downloadedBytes,
    totalBytes,
    createdTime,
    completedTime,
  }: MockTaskInput): DownloadStationTask {
    return {
      id,
      title,
      status,
      size: totalBytes ?? 0,
      additional: {
        detail: {
          completed_time: completedTime ?? 0,
          create_time: createdTime ?? 0,
        },
        transfer: {
          size_downloaded: downloadedBytes ?? 0,
        },
      },
    } as DownloadStationTask;
  }

  it("should sort by name, A-Z", () => {
    expect(
      sortTasks(
        [
          mockTask({ id: "2", status: "downloading", title: "b" }),
          mockTask({ id: "1", status: "downloading", title: "a" }),
          mockTask({ id: "3", status: "downloading", title: "c" }),
        ],
        "name-asc",
      ).map(({ id }) => id),
    ).to.deep.equal(["1", "2", "3"]);
  });

  it("should sort by name, Z-A", () => {
    expect(
      sortTasks(
        [
          mockTask({ id: "2", status: "downloading", title: "b" }),
          mockTask({ id: "1", status: "downloading", title: "a" }),
          mockTask({ id: "3", status: "downloading", title: "c" }),
        ],
        "name-desc",
      ).map(({ id }) => id),
    ).to.deep.equal(["3", "2", "1"]);
  });

  it("should sort completed tasks, oldest first, and in-progress tasks before in %-complete order", () => {
    expect(
      sortTasks(
        [
          mockTask({
            id: "5",
            status: "seeding",
            title: "e",
            downloadedBytes: 100,
            totalBytes: 100,
            completedTime: 0, // There is a bug in DSM that reports a 0 completion time sometimes.
          }),
          mockTask({
            id: "4",
            status: "downloading",
            title: "d",
            downloadedBytes: 2,
            totalBytes: 100,
          }),
          mockTask({
            id: "2",
            status: "finished",
            title: "b",
            downloadedBytes: 100,
            totalBytes: 100,
            completedTime: 1,
          }),
          mockTask({
            id: "1",
            status: "seeding",
            title: "a",
            downloadedBytes: 100,
            totalBytes: 100,
            completedTime: 2,
          }),
          mockTask({
            id: "3",
            status: "downloading",
            title: "c",
            downloadedBytes: 1,
            totalBytes: 100,
          }),
        ],
        "timestamp-completed-asc",
      ).map(({ id }) => id),
    ).to.deep.equal(["4", "3", "5", "2", "1"]);
  });

  it("should sort completed tasks, newest first, and in-progress tasks before in %-complete order", () => {
    expect(
      sortTasks(
        [
          mockTask({
            id: "5",
            status: "seeding",
            title: "e",
            downloadedBytes: 100,
            totalBytes: 100,
            completedTime: 0, // There is a bug in DSM that reports a 0 completion time sometimes.
          }),
          mockTask({
            id: "4",
            status: "downloading",
            title: "d",
            downloadedBytes: 2,
            totalBytes: 100,
          }),
          mockTask({
            id: "2",
            status: "finished",
            title: "b",
            downloadedBytes: 100,
            totalBytes: 100,
            completedTime: 1,
          }),
          mockTask({
            id: "1",
            status: "seeding",
            title: "a",
            downloadedBytes: 100,
            totalBytes: 100,
            completedTime: 2,
          }),
          mockTask({
            id: "3",
            status: "downloading",
            title: "c",
            downloadedBytes: 1,
            totalBytes: 100,
          }),
        ],
        "timestamp-completed-desc",
      ).map(({ id }) => id),
    ).to.deep.equal(["4", "3", "1", "2", "5"]);
  });
});
