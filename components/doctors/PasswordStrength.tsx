"use client";

import { Form } from "antd";

/**
 * PasswordStrength Component
 * Visual indicator for password strength
 */
export function PasswordStrength() {
  return (
    <Form.Item noStyle shouldUpdate>
      {({ getFieldValue }) => {
        const password = getFieldValue("password") || "";
        
        if (!password) return null;

        let strength = 0;
        let strengthText = "";
        let strengthColor = "";

        // Calculate strength
        if (password.length >= 8) strength++;
        if (password.length >= 12) strength++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
        if (/\d/.test(password)) strength++;
        if (/[^a-zA-Z0-9]/.test(password)) strength++;

        // Determine text and color
        if (strength <= 2) {
          strengthText = "Débil";
          strengthColor = "#ff4d4f";
        } else if (strength === 3) {
          strengthText = "Media";
          strengthColor = "#faad14";
        } else if (strength === 4) {
          strengthText = "Buena";
          strengthColor = "#52c41a";
        } else {
          strengthText = "Excelente";
          strengthColor = "#52c41a";
        }

        return (
          <span style={{ color: strengthColor, fontSize: "12px" }}>
            Fortaleza: {strengthText}
          </span>
        );
      }}
    </Form.Item>
  );
}
