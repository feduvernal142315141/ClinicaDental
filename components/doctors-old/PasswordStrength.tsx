"use client";

import { Card, Progress } from "antd";

interface PasswordStrengthProps {
  password: string;
}

/**
 * Password strength indicator component
 * Shows visual feedback on password requirements
 */
export function PasswordStrength({ password }: PasswordStrengthProps) {
  if (!password) return null;

  const checks = [
    {
      label: "8-20 caracteres",
      passed: password.length >= 8 && password.length <= 20,
    },
    { label: "Una mayúscula", passed: /[A-Z]/.test(password) },
    { label: "Una minúscula", passed: /[a-z]/.test(password) },
    { label: "Un número", passed: /[0-9]/.test(password) },
    {
      label: "Un carácter especial",
      passed: /[!@#&()\–{}\:;',\?\/\*~\$\^\+=<>]/.test(password),
    },
  ];

  const passedCount = checks.filter((c) => c.passed).length;
  const percent = (passedCount / checks.length) * 100;

  const getColor = () => {
    if (percent <= 40) return "#ff4d4f";
    if (percent <= 80) return "#faad14";
    return "#52c41a";
  };

  return (
    <Card size="small" className="mt-2 mb-4">
      <div className="text-sm font-medium mb-2">Fortaleza de contraseña</div>
      <Progress
        percent={percent}
        showInfo={false}
        strokeColor={getColor()}
        size="small"
      />
      <div className="grid grid-cols-2 gap-1 mt-2 text-xs">
        {checks.map((check, index) => (
          <div
            key={index}
            className={check.passed ? "text-green-600" : "text-gray-400"}
          >
            {check.passed ? "✓" : "○"} {check.label}
          </div>
        ))}
      </div>
    </Card>
  );
}
