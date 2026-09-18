import { describe, expect, it } from "vitest";
import { ApiError } from "../../src/errors.js";
import {
  parseAdminUserQuery,
  parseCreateAdminUserBody,
  parseResetInitialPasswordBody,
  parseUpdateAdminUserBody,
} from "../../src/admin/user-contract.js";

function expectValidation(action: () => unknown, field: string): void {
  try {
    action();
    throw new Error("Expected validation error");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    const apiError = error as ApiError;
    expect(apiError.status).toBe(400);
    expect(apiError.code).toBe("VALIDATION_ERROR");
    expect(apiError.fieldErrors).toHaveProperty(field);
  }
}

describe("USER-02 Administrator User validation", () => {
  it("canonicalizes create identity fields and accepts exactly one documented role", () => {
    expect(parseCreateAdminUserBody({
      name: "  Fictional Staff  ",
      email: "  Staff.User@Example.Test  ",
      role: "IT_STAFF",
      active: true,
      initialPassword: "Local Initial Password!",
      confirmPassword: "Local Initial Password!",
    })).toEqual({
      name: "Fictional Staff",
      email: "staff.user@example.test",
      role: "IT_STAFF",
      active: true,
      initialPassword: "Local Initial Password!",
    });
  });

  it("rejects invalid/multiple roles, password mismatch, and unsupported create fields", () => {
    const valid = {
      name: "Fictional Staff",
      email: "staff@example.test",
      role: "IT_STAFF",
      active: true,
      initialPassword: "Local Initial Password!",
      confirmPassword: "Local Initial Password!",
    };
    expectValidation(() => parseCreateAdminUserBody({ ...valid, role: ["IT_STAFF", "ADMINISTRATOR"] }), "role");
    expectValidation(() => parseCreateAdminUserBody({ ...valid, confirmPassword: "Different Password!" }), "confirmPassword");
    expectValidation(() => parseCreateAdminUserBody({ ...valid, department: "Help Desk" }), "department");
  });

  it("rejects edit/reset overposting and requires optimistic version/confirmation", () => {
    const edit = { name: "User", email: "user@example.test", role: "REQUESTER", active: true, expectedVersion: 2 };
    expectValidation(() => parseUpdateAdminUserBody({ ...edit, passwordHash: "forbidden" }), "passwordHash");
    expectValidation(() => parseUpdateAdminUserBody({ ...edit, expectedVersion: 0 }), "expectedVersion");

    const reset = { initialPassword: "Replacement Password!", confirmPassword: "Replacement Password!", expectedVersion: 2, confirmed: true };
    expectValidation(() => parseResetInitialPasswordBody({ ...reset, confirmed: false }), "confirmed");
    expectValidation(() => parseResetInitialPasswordBody({ ...reset, authVersion: 99 }), "authVersion");
  });

  it("rejects unknown/repeated query parameters and overlong search text", () => {
    expect(parseAdminUserQuery({ search: "  Ada  ", role: "ADMINISTRATOR" })).toEqual({ search: "Ada", role: "ADMINISTRATOR" });
    expectValidation(() => parseAdminUserQuery({ role: ["REQUESTER", "IT_STAFF"] }), "role");
    expectValidation(() => parseAdminUserQuery({ page: "1" }), "page");
    expectValidation(() => parseAdminUserQuery({ search: "x".repeat(121) }), "search");
  });
});
