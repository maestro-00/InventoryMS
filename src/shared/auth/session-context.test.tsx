import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { authSessionFixture } from "../../../tests/fixtures/domain";
import { SessionManager } from "./session-manager";
import { SessionProvider, useSession } from "./session-context";

function SessionLabel() {
  const { session, accessToken } = useSession();
  return (
    <p>
      {session?.userId ?? "anonymous"} {accessToken ?? "none"}
    </p>
  );
}

function SessionGuard() {
  let message = "inside";
  try {
    useSession();
  } catch (error) {
    message = error instanceof Error ? error.message : "failed";
  }
  return <p>{message}</p>;
}

describe("session context", () => {
  it("exposes the memory session to descendants", () => {
    const manager = new SessionManager({ origin: "http://localhost:5088" });
    manager.setSession({
      ...authSessionFixture,
      permissions: [...authSessionFixture.permissions],
      locationScope: [...authSessionFixture.locationScope],
      accessToken: "access-token",
      refreshToken: "refresh-token",
    });
    render(
      <SessionProvider manager={manager}>
        <SessionLabel />
      </SessionProvider>,
    );
    expect(
      screen.getByText(`${authSessionFixture.userId} access-token`),
    ).toBeInTheDocument();
  });

  it("throws when useSession is used outside the provider", () => {
    render(<SessionGuard />);
    expect(screen.getByText(/SessionProvider/)).toBeInTheDocument();
  });
});
