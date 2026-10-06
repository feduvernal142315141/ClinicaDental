"use client";

import { Form, Progress, Card } from "antd";
import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { PASSWORD_RULES, getPasswordStrength } from "@/lib/validation/password-policy";

// Las reglas vienen de la política central (la misma que valida el backend).
const requirements = PASSWORD_RULES;

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

        // "Excelente" solo cuando cumple las cinco reglas (ver password-policy).
        const info = getPasswordStrength(password);
        const strength = info.percent;
        const progressColor =
          info.level === "excellent" ? "#52c41a" : info.level === "weak" ? "#ff4d4f" : "#faad14";

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
                  <span className="text-xs text-subtle">
                    Fortaleza de contraseña
                  </span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: progressColor }}
                  >
                    {info.label}
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
