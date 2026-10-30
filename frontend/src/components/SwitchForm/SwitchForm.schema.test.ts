import { describe, expect, it } from "vitest";

import { fieldErrors, switchFormSchema } from "./SwitchForm.schema";

const fields = [
  { name: "name", label: "Name", inputType: "text" as const },
  { name: "email", label: "Email", inputType: "email" as const },
  { name: "password", label: "Password", inputType: "password" as const },
];

const prompt = {
  title: "Welcome Back !",
  description: "To keep connected",
  switchLabel: "SIGN IN",
};

const panel = {
  title: "Create Account",
  tabLabel: "Sign up",
  fields,
  submitLabel: "SIGN UP",
  prompt,
};

describe("fieldErrors", () => {
  it("returns no errors when every field is filled and the email is valid", () => {
    expect(
      fieldErrors(fields, {
        name: "Asha",
        email: "asha@example.com",
        password: "correct-horse",
      }),
    ).toEqual({});
  });

  it("asks for each blank field, including one that is missing from the values", () => {
    expect(fieldErrors(fields, { name: "   ", email: "" })).toEqual({
      name: "Name is required",
      email: "Email is required",
      password: "Password is required",
    });
  });

  it("rejects an email that is not an address", () => {
    expect(
      fieldErrors(fields, {
        name: "Asha",
        email: "not-an-email",
        password: "correct-horse",
      }),
    ).toEqual({
      email: "Enter an email address, like name@example.com.",
    });
  });

  it("does not check the format of a text or password field", () => {
    expect(
      fieldErrors(fields, {
        name: "not an email",
        email: "asha@example.com",
        password: "plain words",
      }),
    ).toEqual({});
  });
});

describe("switchFormSchema", () => {
  const valid = {
    "aria-label": "Account",
    signUp: panel,
    signIn: { ...panel, title: "Sign in to Website", tabLabel: "Sign in" },
  };

  it("defaults to the sign-up form when no starting mode is given", () => {
    expect(switchFormSchema.parse(valid).initialMode).toBe("signUp");
  });

  it("accepts sign-in as the starting mode", () => {
    expect(
      switchFormSchema.parse({ ...valid, initialMode: "signIn" }).initialMode,
    ).toBe("signIn");
  });

  it("rejects a panel with no fields, since a form must ask for something", () => {
    const result = switchFormSchema.safeParse({
      ...valid,
      signUp: { ...panel, fields: [] },
    });

    expect(result.success).toBe(false);
  });

  it("rejects a starting mode that is neither sign-up nor sign-in", () => {
    const result = switchFormSchema.safeParse({
      ...valid,
      initialMode: "reset",
    });

    expect(result.success).toBe(false);
  });
});
