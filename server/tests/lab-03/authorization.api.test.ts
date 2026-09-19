import express from "express";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { safeErrorBody } from "../../src/errors.js";
import { createAuthRouter } from "../../src/auth/auth-routes.js";
import { requireActor } from "../../src/auth/actor.js";
import { assertRequesterOwnership, requireCapability } from "../../src/authorization.js";
import {
  createAuthFixture,
  destroyAuthFixture,
  login,
  type AuthFixture,
} from "./support/auth-fixture.js";

let fixture: AuthFixture;
let app: express.Express;

beforeAll(async () => {
  fixture = await createAuthFixture();
  app = express();
  app.use(express.json());
  // The production auth router owns the session middleware. Probe routes are
  // test-local only and execute after that router has established req.session.
  app.use("/api/auth", createAuthRouter());
  app.get(
    "/api/auth/probe/staff",
    requireActor(),
    requireCapability("STAFF_TICKET_QUEUE"),
    (req, res) => res.status(200).json({ actorId: req.actor!.id }),
  );
  app.get(
    "/api/auth/probe/requester/:ownerId",
    requireActor(),
    requireCapability("REQUESTER_TICKET_READ_OWN"),
    (req, _res, next) => {
      try {
        assertRequesterOwnership(req.actor!, Number(req.params.ownerId));
        next();
      } catch (error) {
        next(error);
      }
    },
    (req, res) => res.status(200).json({ actorId: req.actor!.id }),
  );
  app.get(
    "/api/auth/probe/normal",
    requireActor(),
    (req, res) => res.status(200).json({ actorId: req.actor!.id }),
  );
  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const safe = safeErrorBody(error, "Unable to authorize request");
    res.status(safe.status).json(safe.body);
  });
});

afterAll(async () => {
  await destroyAuthFixture(fixture);
});

describe("AZ-01 direct backend authorization", () => {
  it("derives actor identity from the session and ignores a legacy requester header", async () => {
    const agent = request.agent(app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const response = await agent
      .get(`/api/auth/probe/requester/${fixture.normalRequester.id}`)
      .set("X-Development-Requester-Id", String(fixture.requester.id))
      .expect(200);
    expect(response.body.actorId).toBe(fixture.normalRequester.id);
  });

  it("denies a Requester at the capability boundary before protected resource detail", async () => {
    const agent = request.agent(app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const response = await agent.get("/api/auth/probe/staff");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("FORBIDDEN");
  });

  it("allows only roles explicitly granted the Staff capability", async () => {
    for (const user of [fixture.staff, fixture.administrator]) {
      const agent = request.agent(app);
      expect((await login(agent, fixture, user.email)).status).toBe(200);
      const response = await agent.get("/api/auth/probe/staff").expect(200);
      expect(response.body.actorId).toBe(user.id);
    }
  });

  it("returns the same non-disclosing 404 for another Requester's resource", async () => {
    const agent = request.agent(app);
    expect((await login(agent, fixture, fixture.normalRequester.email)).status).toBe(200);
    const response = await agent.get(`/api/auth/probe/requester/${fixture.requester.id}`);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      error: { code: "RESOURCE_NOT_FOUND", message: "Resource not found" },
    });
  });

  it("blocks normal capabilities while mandatory password change is pending", async () => {
    const agent = request.agent(app);
    expect((await login(agent, fixture, fixture.requester.email)).status).toBe(200);
    const blocked = await agent.get("/api/auth/probe/normal");
    expect(blocked.status).toBe(403);
    expect(blocked.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    const me = await agent.get("/api/auth/me").expect(200);
    expect(me.body.user.mustChangePassword).toBe(true);
  });

  it("requires authentication for protected middleware", async () => {
    const response = await request(app).get("/api/auth/probe/normal");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
