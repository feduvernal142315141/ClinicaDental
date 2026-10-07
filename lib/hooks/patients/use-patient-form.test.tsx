import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePatientForm } from "./use-patient-form";
import { patientFormSchema } from "@/lib/entity/patients";

const mocks = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), get: vi.fn(), push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push, back: vi.fn() }) }));
vi.mock("@/lib/hooks/patients/usePatients", () => ({ usePatients: () => ({
  createPatient: mocks.create, updatePatient: mocks.update, getPatientById: mocks.get, loading: false,
}) }));
const values = { name: "Test Patient", identificationNumber: "001-TEST", phone: "+50588888888", dateOfBirth: "1990-01-01", gender: "F" as const, agreement: true, active: true };

describe("patient identification form", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.create.mockResolvedValue("new-id"); mocks.update.mockResolvedValue(true); });
  it("keeps leading zeroes and sends identification on create", async () => {
    const parsed = patientFormSchema.parse({ ...values, identificationNumber: " 001-TEST " });
    const { result } = renderHook(() => usePatientForm({}));
    await act(() => result.current.handleSubmit(parsed));
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ identificationNumber: "001-TEST" }));
  });
  it("loads identification from getById and sends its replacement", async () => {
    mocks.get.mockResolvedValue({ ...values, id: "patient-id" });
    const { result } = renderHook(() => usePatientForm({ patientId: "patient-id" }));
    await waitFor(() => expect(result.current.form.getValues("identificationNumber")).toBe("001-TEST"));
    await act(() => result.current.handleSubmit({ ...values, identificationNumber: "002-TEST" }));
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ id: "patient-id", identificationNumber: "002-TEST" }));
  });
  it("rejects omitted, blank and oversized identification", () => {
    expect(patientFormSchema.safeParse({ ...values, identificationNumber: undefined }).success).toBe(false);
    expect(patientFormSchema.safeParse({ ...values, identificationNumber: "   " }).success).toBe(false);
    expect(patientFormSchema.safeParse({ ...values, identificationNumber: "" }).success).toBe(false);
    expect(patientFormSchema.safeParse({ ...values, identificationNumber: "x".repeat(256) }).success).toBe(false);
  });
});
