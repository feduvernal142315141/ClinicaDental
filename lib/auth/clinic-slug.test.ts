import { describe, expect, it } from "vitest";
import { clinicSlugFromHost } from "./clinic-slug";

const APP_DOMAIN = "clinic.dev.kodewave-solutions.com";

describe("clinicSlugFromHost", () => {
  it("saca el slug de la primera parte del subdominio", () => {
    expect(clinicSlugFromHost("diente-sable-360.clinic.dev.kodewave-solutions.com", APP_DOMAIN)).toBe(
      "diente-sable-360",
    );
    expect(clinicSlugFromHost("prueba.clinic.dev.kodewave-solutions.com:443", APP_DOMAIN)).toBe("prueba");
  });

  it("lo devuelve en minúscula", () => {
    expect(clinicSlugFromHost("Diente-Sable-360.clinic.dev.kodewave-solutions.com", APP_DOMAIN)).toBe(
      "diente-sable-360",
    );
  });

  it("el dominio base a secas, localhost y las IP no identifican una clínica", () => {
    expect(clinicSlugFromHost(APP_DOMAIN, APP_DOMAIN)).toBeNull();
    expect(clinicSlugFromHost("localhost:3000", APP_DOMAIN)).toBeNull();
    expect(clinicSlugFromHost("192.168.1.10", APP_DOMAIN)).toBeNull();
    expect(clinicSlugFromHost("", APP_DOMAIN)).toBeNull();
  });

  it("los subdominios de infraestructura no son clínicas", () => {
    expect(clinicSlugFromHost("www.clinic.dev.kodewave-solutions.com", APP_DOMAIN)).toBeNull();
    expect(clinicSlugFromHost("api.clinic.dev.kodewave-solutions.com", APP_DOMAIN)).toBeNull();
  });

  it("*.localhost sirve para probar subdominios en local", () => {
    expect(clinicSlugFromHost("diente-sable-360.localhost:3000", APP_DOMAIN)).toBe("diente-sable-360");
  });

  it("sin dominio base configurado usa la primera etiqueta", () => {
    expect(clinicSlugFromHost("diente-sable-360.front-office.dev.clinic-flow-360.com")).toBe("diente-sable-360");
  });

  it("un host de OTRO dominio base no se adivina: devuelve null", () => {
    // Con NEXT_PUBLIC_APP_DOMAIN apuntando a kodewave, un despliegue servido desde otro
    // dominio necesita su propio NEXT_PUBLIC_APP_DOMAIN (o NEXT_PUBLIC_CLINIC_SLUG).
    expect(clinicSlugFromHost("diente-sable-360.front-office.dev.clinic-flow-360.com", APP_DOMAIN)).toBeNull();
  });
});
