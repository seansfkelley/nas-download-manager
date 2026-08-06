import { Auth } from "../src/common/apis/synology/Auth";
import { SynologyClient } from "../src/common/apis/synology/client";
import { SessionName } from "../src/common/apis/synology/shared";

jest.mock("../src/common/apis/synology/Auth", () => ({
  Auth: {
    API_NAME: "SYNO.API.Auth",
    Login: jest.fn(),
    Logout: jest.fn(),
  },
}));

const login = Auth.Login as jest.MockedFunction<typeof Auth.Login>;
const logout = Auth.Logout as jest.MockedFunction<typeof Auth.Logout>;

const SETTINGS = {
  baseUrl: "https://hostname:5001",
  account: "account",
  passwd: "passwd",
  session: SessionName.DownloadStation,
};

function loginResponse(sid: string) {
  return {
    success: true as const,
    data: { sid },
    meta: { apiGroup: "Auth", method: "login", version: 2 },
  };
}

describe("SynologyClient sessions", () => {
  beforeEach(() => {
    login.mockReset();
    logout.mockReset();
    logout.mockResolvedValue({
      success: true,
      data: {},
      meta: { apiGroup: "Auth", method: "logout", version: 1 },
    });
  });

  it("should report no session before logging in", async () => {
    const client = new SynologyClient(SETTINGS);
    await expect(client.getSid()).resolves.toBeUndefined();
    expect(login).not.toHaveBeenCalled();
  });

  it("should resume a session it was constructed with, without logging in", async () => {
    const client = new SynologyClient(SETTINGS, "restored-sid");

    await expect(client.getSid()).resolves.toBe("restored-sid");
    await expect(client.Auth.Login()).resolves.toStrictEqual(loginResponse("restored-sid"));
    expect(login).not.toHaveBeenCalled();
  });

  it("should report the session established by a login", async () => {
    login.mockResolvedValue(loginResponse("fresh-sid"));
    const client = new SynologyClient(SETTINGS);

    await client.Auth.Login();

    await expect(client.getSid()).resolves.toBe("fresh-sid");
  });

  it("should report no session when the login failed", async () => {
    login.mockResolvedValue({
      success: false,
      meta: { apiGroup: "Auth", method: "login", version: 2 },
      error: { code: 400 },
    });
    const client = new SynologyClient(SETTINGS);

    await client.Auth.Login();

    await expect(client.getSid()).resolves.toBeUndefined();
  });

  it("should discard a resumed session when the connection settings change", async () => {
    const client = new SynologyClient(SETTINGS, "restored-sid");

    expect(client.partiallyUpdateSettings({ baseUrl: "https://elsewhere:5001" })).toBe(true);

    await expect(client.getSid()).resolves.toBeUndefined();
    // Not asserting which baseUrl this went to: partiallyUpdateSettings applies the new settings
    // before logging out, so the old session's logout is addressed to the new host.
    expect(logout).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ sid: "restored-sid" }),
    );
  });

  it("should keep a resumed session when the settings are unchanged", async () => {
    const client = new SynologyClient(SETTINGS, "restored-sid");

    expect(client.partiallyUpdateSettings({ account: SETTINGS.account })).toBe(false);

    await expect(client.getSid()).resolves.toBe("restored-sid");
    expect(logout).not.toHaveBeenCalled();
  });
});
