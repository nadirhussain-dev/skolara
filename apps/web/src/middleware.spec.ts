import { subdomainFromHost } from "./middleware";

describe("subdomainFromHost", () => {
  it.each([
    ["acme.skolara.app", "acme"],
    ["beaconhouse.skolara.app", "beaconhouse"],
    ["acme.staging.skolara.app", "acme"],
    // Local development can exercise tenant routing without DNS.
    ["acme.localhost:3000", "acme"],
  ])("resolves %s to %s", (host, expected) => {
    expect(subdomainFromHost(host)).toBe(expected);
  });

  it.each<[string | null, string]>([
    // The apex is the platform, not a school.
    ["skolara.app", "apex domain"],
    ["www.skolara.app", "reserved www"],
    ["app.skolara.app", "reserved app"],
    ["api.skolara.app", "reserved api"],
    ["localhost:3000", "local platform host"],
    ["127.0.0.1:3000", "raw IPv4"],
    [null, "missing host header"],
  ])("treats %s as the platform (%s)", (host) => {
    expect(subdomainFromHost(host)).toBeNull();
  });

  it("ignores the port and casing", () => {
    expect(subdomainFromHost("ACME.Skolara.App:443")).toBe("acme");
  });
});
