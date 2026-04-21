"use client";

import { Form, Input, Row, Col, Select, DatePicker, Switch } from "antd";
import { genderOptions } from "@/lib/entity/patients";
import dayjs from "dayjs";

interface PatientFormFieldsProps {
  /** Column gutter spacing — allows the parent to control layout density */
  gutter?: [number, number];
  /**
   * Container for Select/DatePicker popups.
   * Useful inside modals to prevent click-through issues.
   * Defaults to the parent node of the trigger element.
   */
  popupContainer?: "parent" | "body";
}

/**
 * PatientFormFields — Reusable field set for patient data.
 *
 * Renders only the form items (name, email, phone, dateOfBirth, gender,
 * address, agreement). It must be placed inside an Ant Design `<Form>`.
 *
 * This component owns **no** form instance, submit logic, or layout chrome
 * (Card, actions, etc.), following the Single Responsibility Principle.
 *
 * @example
 * // Inside a standalone page form
 * <Form form={form} layout="vertical" onFinish={handleSubmit}>
 *   <PatientFormFields />
 * </Form>
 *
 * @example
 * // Inside a modal for quick creation
 * <Modal open={open}>
 *   <Form form={modalForm} layout="vertical">
 *     <PatientFormFields gutter={[16, 12]} />
 *   </Form>
 * </Modal>
 */
export function PatientFormFields({
  gutter = [24, 16],
  popupContainer = "parent",
}: PatientFormFieldsProps) {
  const getPopupContainer =
    popupContainer === "parent"
      ? (trigger: HTMLElement) => trigger.parentElement ?? document.body
      : undefined;
  return (
    <Row gutter={gutter}>
      <Col xs={24} md={12} lg={8}>
        <Form.Item
          name="name"
          label="Nombre Completo"
          rules={[
            { required: true, message: "El nombre es obligatorio" },
            {
              min: 2,
              message: "El nombre debe tener al menos 2 caracteres",
            },
          ]}
        >
          <Input placeholder="Ej: María González López" size="large" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12} lg={8}>
        <Form.Item
          name="email"
          label="Correo Electrónico"
          rules={[
            { required: true, message: "El correo es obligatorio" },
            { type: "email", message: "Ingrese un correo válido" },
          ]}
        >
          <Input placeholder="Ej: maria@email.com" size="large" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12} lg={8}>
        <Form.Item
          name="phone"
          label="Teléfono"
          rules={[{ required: true, message: "El teléfono es obligatorio" }]}
        >
          <Input placeholder="Ej: +505 8275-8275" size="large" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12} lg={8}>
        <Form.Item
          name="dateOfBirth"
          label="Fecha de Nacimiento"
          rules={[
            {
              required: true,
              message: "La fecha de nacimiento es obligatoria",
            },
          ]}
          getValueProps={(value) => ({
            value: value ? dayjs(value) : undefined,
          })}
          getValueFromEvent={(date) => date?.format("YYYY-MM-DD")}
        >
          <DatePicker
            placeholder="Seleccione fecha"
            size="large"
            style={{ width: "100%" }}
            format="DD/MM/YYYY"
            getPopupContainer={getPopupContainer}
          />
        </Form.Item>
      </Col>

      <Col xs={24} md={12} lg={8}>
        <Form.Item
          name="gender"
          label="Género"
          rules={[{ required: true, message: "El género es obligatorio" }]}
        >
          <Select
            placeholder="Seleccione género"
            size="large"
            getPopupContainer={getPopupContainer}
            options={genderOptions.map((opt) => ({
              value: opt.value,
              label: opt.label,
            }))}
          />
        </Form.Item>
      </Col>

      <Col xs={24} md={12} lg={8}>
        <Form.Item name="address" label="Dirección">
          <Input placeholder="Ej: Calle Mayor 123, Madrid" size="large" />
        </Form.Item>
      </Col>

      <Col xs={24} md={12} lg={8}>
        <Form.Item name="agreement" label="Convenio" valuePropName="checked">
          <Switch checkedChildren="Sí" unCheckedChildren="No" />
        </Form.Item>
      </Col>
    </Row>
  );
}
