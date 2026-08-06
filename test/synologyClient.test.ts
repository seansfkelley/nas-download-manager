import { Auth } from "../src/common/apis/synology/Auth";
import { type AuthResult, SynologyClient } from "../src/common/apis/synology/client";
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

const SESSION: AuthResult = {
  success: true,
  data: { sid: "sid" },
  meta: { apiGroup: "Auth", method: "login", version: 2 },
};

const REFUSED: AuthResult = {
  success: false,
  meta: { apiGroup: "Auth", method: "login", version: 2 },
  // "No such username or incorrect password".
  error: { code: 400 },
};

function makeClient(auth?: AuthResult, settings = SETTINGS) {
  const changes: (AuthResult | undefined)[] = [];
  const client = new SynologyClient(settings, auth, (a) => changes.push(a));
  return { client, changes };
}

describe("SynologyClient auth", () => {
  beforeEach(() => {
    login.mockReset();
    logout.mockReset();
    logout.mockResolvedValue({
      success: true,
      data: {},
      meta: { apiGroup: "Auth", method: "logout", version: 1 },
    });
  });

  it("should log in when it has no auth result", async () => {
    login.mockResolvedValue(SESSION);
    const { client, changes } = makeClient();

    await expect(client.Auth.Login()).resolves.toStrictEqual(SESSION);

    expect(login).toHaveBeenCalledTimes(1);
    expect(changes).toStrictEqual([SESSION]);
  });

  it("should resume a session it was given without logging in", async () => {
    const { client, changes } = makeClient(SESSION);

    await expect(client.Auth.Login()).resolves.toStrictEqual(SESSION);

    expect(login).not.toHaveBeenCalled();
    expect(changes).toStrictEqual([]);
  });

  it("should not retry a login the NAS already refused", async () => {
    const { client, changes } = makeClient(REFUSED);

    await expect(client.Auth.Login()).resolves.toStrictEqual(REFUSED);

    expect(login).not.toHaveBeenCalled();
    expect(changes).toStrictEqual([]);
  });

  it("should report a refusal as the auth result rather than throwing it away", async () => {
    login.mockResolvedValue(REFUSED);
    const { client, changes } = makeClient();

    await client.Auth.Login();

    expect(changes).toStrictEqual([REFUSED]);
  });

  it("should share one login between concurrent callers", async () => {
    login.mockResolvedValue(SESSION);
    const { client, changes } = makeClient();

    await Promise.all([client.Auth.Login(), client.Auth.Login(), client.Auth.Login()]);

    expect(login).toHaveBeenCalledTimes(1);
    expect(changes).toStrictEqual([SESSION]);
  });

  it("should not report an unconfigured client as an auth result", async () => {
    const { client, changes } = makeClient(undefined, { ...SETTINGS, passwd: "" });

    const result = await client.Auth.Login();

    expect(result).toStrictEqual({ type: "missing-config", which: "password" });
    expect(login).not.toHaveBeenCalled();
    // A missing-config is not an auth result: it stops being true as soon as the settings do, and
    // settings only change by building a different client.
    expect(changes).toStrictEqual([]);
  });

  it("should discard the auth result on logout", async () => {
    const { client, changes } = makeClient(SESSION);

    await client.Auth.Logout();

    expect(changes).toStrictEqual([undefined]);
    expect(logout).toHaveBeenCalledWith(SETTINGS.baseUrl, expect.objectContaining({ sid: "sid" }));
  });

  it("should say so rather than logging out when there is nothing to log out of", async () => {
    const { client, changes } = makeClient();

    await expect(client.Auth.Logout()).resolves.toBe("not-logged-in");

    expect(logout).not.toHaveBeenCalled();
    expect(changes).toStrictEqual([]);
  });
});
