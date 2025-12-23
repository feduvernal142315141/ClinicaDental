"use client";

import { Form, Progress, Card } from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: "Al menos 8 caracteres",
    test: (pwd) => pwd.length >= 8,
  },
  {
    label: "Una letra mayúscula",
    test: (pwd) => /[A-Z]/.test(pwd),
  },
  {
    label: "Una letra minúscula",
    test: (pwd) => /[a-z]/.test(pwd),
  },
  {
    label: "Un número",
    test: (pwd) => /\d/.test(pwd),
  },
  {
    label: "Un carácter especial",
    test: (pwd) => /[^a-zA-Z0-9]/.test(pwd),
  },
];

/**
 * PasswordStrength Component
 *
 * Visual indicator for password strength with progress bar and animated checkpoints
 */
export function PasswordStrength() {
  return (
    <Form.Item noStyle shouldUpdate>
      {({ getFieldValue }) => {
        const password = getFieldValue("password") || "";

        if (!password) return null;

        // Calculate how many requirements are met
        const metRequirements = requirements.filter((req) =>
          req.test(password)
        );
        const strength = (metRequirements.length / requirements.length) * 100;

        // Determine progress bar color
        let progressColor = "#ff4d4f"; // Red (weak)
        if (strength >= 40 && strength < 60) {
          progressColor = "#faad14"; // Orange (medium)
        } else if (strength >= 60 && strength < 80) {
          progressColor = "#52c41a"; // Green (good)
        } else if (strength >= 80) {
          progressColor = "#52c41a"; // Green (excellent)
        }

        return (
          <Card
            size="small"
            className="mt-2"
            styles={{
              body: { padding: "12px 16px" },
            }}
          >
            <div className="space-y-3">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between items-center mb-1 flex-wrap gap-2">
                  <span className="text-xs text-gray-500">
                    Fortaleza de contraseña
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: progressColor }}
                  >
                    {strength < 40 && "Débil"}
                    {strength >= 40 && strength < 60 && "Media"}
                    {strength >= 60 && strength < 80 && "Buena"}
                    {strength >= 80 && "Excelente"}
                  </span>
                </div>
                <Progress
                  percent={strength}
                  strokeColor={progressColor}
                  showInfo={false}
                  size="small"
                />
              </div>

              {/* Requirements Checklist - Responsive Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {requirements.map((req, index) => {
                  const isMet = req.test(password);
                  return (
                    <div
                      key={index}
                      className="flex items-start gap-2 text-xs transition-all duration-300 ease-in-out min-w-0"
                      style={{
                        color: isMet ? "#52c41a" : "#8c8c8c",
                        opacity: isMet ? 1 : 0.6,
                      }}
                    >
                      {isMet ? (
                        <CheckCircleFilled
                          className="transition-all duration-300 shrink-0"
                          style={{ fontSize: "14px", color: "#52c41a" }}
                        />
                      ) : (
                        <CloseCircleFilled
                          className="transition-all duration-300 shrink-0"
                          style={{ fontSize: "14px", color: "#d9d9d9" }}
                        />
                      )}
                      <span className="wrap-break-word leading-tight min-w-0">
                        {req.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>
        );
      }}
    </Form.Item>
  );
}
