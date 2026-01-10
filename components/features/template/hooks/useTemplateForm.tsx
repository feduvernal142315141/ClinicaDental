import {
  RequestCreateTemplate,
  TemplateVariableRequest,
} from "@/lib/entity/template/template";
import * as z from "zod";
import { useAuth } from "@/lib/contexts/auth-context";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { serviceCreateTemplate } from "@/lib/services/template/template";

interface TemplateVariable {
  id: string;
  placeholder: string;
  sampleContent: string;
}

type TemplateFormData = Omit<RequestCreateTemplate, "clinicId">;

const variablesSchema = z.object({
  id: z.string(),
  placeholder: z.string(),
  sampleContent: z.string().min(1, "debe agregar un ejemplo de la variable"),
  type: z.string(),
}) satisfies z.ZodType<TemplateVariableRequest>;

const schema = z.object({
  variables: z.array(variablesSchema),
  body: z.string().min(25, "El mensaje debe tener minimo 25 caracteres"),
  type: z.string(),
  name: z.string().min(5, "El nombre debe tener minimo 5 caracteres"),
}) satisfies z.ZodType<TemplateFormData>;

const replaceVariablesWithSamples = (
  text: string,
  variables: TemplateVariable[]
) => {
  let result = text;
  variables.forEach((v) => {
    if (v.sampleContent) {
      result = result.replace(
        new RegExp(`\\{\\{${v.id}\\}\\}`, "g"),
        v.sampleContent
      );
    }
  });
  return result;
};

// Validar y extraer placeholders del texto
const validateAndExtractPlaceholders = (
  text: string
): {
  valid: boolean;
  error: string;
  placeholders: string[];
} => {
  // Primero, encontrar todos los placeholders válidos y marcar sus posiciones
  const validPlaceholderRegex = /\{\{\d+}}/g;
  const validMatches: string[] = [];
  const validPositions: Array<{ start: number; end: number }> = [];

  let match;
  while ((match = validPlaceholderRegex.exec(text)) !== null) {
    validMatches.push(match[0]);
    validPositions.push({
      start: match.index,
      end: match.index + match[0].length,
    });
  }

  // Verificar si hay placeholders duplicados
  const placeholderCounts = new Map<string, number>();
  validMatches.forEach((placeholder) => {
    const count = placeholderCounts.get(placeholder) || 0;
    placeholderCounts.set(placeholder, count + 1);
  });

  // Encontrar el primer placeholder duplicado
  for (const [placeholder, count] of placeholderCounts.entries()) {
    if (count > 1) {
      return {
        valid: false,
        error: `El placeholder ${placeholder} está repetido ${count} veces. Cada placeholder debe aparecer solo una vez.`,
        placeholders: [],
      };
    }
  }

  // Verificar que los placeholders estén en orden ascendente y consecutivo
  if (validMatches.length > 0) {
    // Extraer los números de los placeholders en el orden que aparecen
    const placeholderNumbers = validMatches.map((p) => {
      const match = p.match(/\{\{(\d+)}}/);
      return match ? parseInt(match[1], 10) : 0;
    });

    // Verificar que comiencen en 1
    if (placeholderNumbers[0] !== 1) {
      return {
        valid: false,
        error: `Los placeholders deben comenzar con {{1}}. Encontrado: {{${placeholderNumbers[0]}}}`,
        placeholders: [],
      };
    }

    // Verificar que sean consecutivos y ascendentes
    for (let i = 0; i < placeholderNumbers.length; i++) {
      const expected = i + 1;
      const actual = placeholderNumbers[i];

      if (actual !== expected) {
        return {
          valid: false,
          error: `Los placeholders deben ser consecutivos. Se esperaba {{${expected}}} pero se encontró {{${actual}}}`,
          placeholders: [],
        };
      }
    }
  }

  // Ahora verificar si hay llaves { o } fuera de los placeholders válidos
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === "{" || char === "}") {
      // Verificar si esta posición está dentro de un placeholder válido
      const isInValidPlaceholder = validPositions.some(
        (pos) => i >= pos.start && i < pos.end
      );

      if (!isInValidPlaceholder) {
        // Encontrar el contexto alrededor de la llave malformada
        const start = Math.max(0, i - 10);
        const end = Math.min(text.length, i + 10);
        const context = text.substring(start, end);

        return {
          valid: false,
          error: `Llaves malformadas cerca de: "...${context}...". Use el formato {{número}}`,
          placeholders: [],
        };
      }
    }
  }

  // Si llegamos aquí, todos los placeholders son válidos y únicos
  return {
    valid: true,
    error: "",
    placeholders: validMatches,
  };
};

const useTemplateForm = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [bodyText, setBodyText] = React.useState(
    "Hola {{1}}, tu cita está programada para el {{2}} a las {{3}}.\nPor favor confirma si podrás asistir."
  );

  const [variablesText, setVariablesText] = React.useState<TemplateVariable[]>([
    { id: "1", placeholder: "{{1}}", sampleContent: "" },
    { id: "2", placeholder: "{{2}}", sampleContent: "" },
    { id: "3", placeholder: "{{3}}", sampleContent: "" },
  ]);

  // Variables específicas para el tipo Media
  const [mediaBodyText, setMediaBodyText] = React.useState("Hola, {{1}}");

  const [variablesMedia, setVariablesMedia] = React.useState<
    TemplateVariable[]
  >([{ id: "1", placeholder: "{{1}}", sampleContent: "" }]);

  const [mediaVariable2, setMediaVariable2] = React.useState("");
  const [placeholderError, setPlaceholderError] = React.useState<string>("");

  const typeOptions = useMemo(
    () => [
      {
        id: "media",
        label: "Imagen/Video",
      },
      {
        id: "text",
        label: "Texto",
      },
    ],
    []
  );

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      variables: [],
      body: "",
      type: "text",
      name: "",
    },
  });

  const addVariable = useCallback(() => {
    let newId: string;
    setVariablesText((prev) => {
      newId = (prev.length + 1).toString();

      return [
        ...prev,
        {
          id: newId,
          placeholder: `{{${newId}}}`,
          sampleContent: "",
        },
      ];
    });

    queueMicrotask(() => {
      setBodyText((prevBody) => `${prevBody}{{${newId}}}`);
    });
  }, []);

  const addVariableMedia = useCallback(() => {
    let nextId: string;
    setVariablesMedia((prev) => {
      nextId = (prev.length + 1).toString();

      return [
        ...prev,
        {
          id: nextId,
          placeholder: `{{${nextId}}}`,
          sampleContent: "",
        },
      ];
    });

    queueMicrotask(() => {
      setMediaBodyText((bodyPrev) => `${bodyPrev}{{${nextId}}}`);
    });
  }, []);

  const updateVariableSample = useCallback((id: string, value: string) => {
    setVariablesText((prev) => {
      return prev.map((v) =>
        v.id === id ? { ...v, sampleContent: value } : v
      );
    });
  }, []);

  const updateVariableMediaSample = useCallback((id: string, value: string) => {
    setVariablesMedia((prev) => {
      return prev.map((v) =>
        v.id === id ? { ...v, sampleContent: value } : v
      );
    });
    setMediaVariable2(value);
  }, []);

  const handleUpdateBodyText = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const newText = e.target.value;
      setBodyText(newText);

      // Validar placeholders
      const validation = validateAndExtractPlaceholders(newText);

      if (!validation.valid) {
        setPlaceholderError(validation.error);
        return;
      }

      setPlaceholderError("");

      // Extraer los IDs únicos de los placeholders válidos (eliminar duplicados)
      const placeholderIdsSet = new Set<string>();
      validation.placeholders.forEach((p) => {
        const match = p.match(/\{\{(\d+)}}/);
        if (match) {
          placeholderIdsSet.add(match[1]);
        }
      });

      const uniquePlaceholderIds = Array.from(placeholderIdsSet);

      // Actualizar variables manteniendo el contenido previo si existe

      setVariablesText((prev) => {
        const newVariables: TemplateVariable[] = uniquePlaceholderIds.map(
          (id) => {
            const existingVar = prev.find((v) => v.id === id);
            return {
              id,
              placeholder: `{{${id}}}`,
              sampleContent: existingVar?.sampleContent || "",
            };
          }
        );
        return newVariables;
      });
    },
    []
  );

  const onSubmit = useCallback(
    async (values: TemplateFormData) => {
      try {
        let response;

        const variables: TemplateVariableRequest[] = variablesText.map((v) => {
          return {
            ...v,
            type: "text",
          };
        });

        response = await serviceCreateTemplate({
          name: values.name,
          body: values.body,
          type: values.type,
          variables: variables,
          clinicId: user?.clinicId ?? "",
        });

        if (response?.status === 201) {
          router.push("/campaigns");
        }
      } catch (error) {
        console.error("Error saving campaign:", error);
      }
    },
    [user?.clinicId, router]
  );

  // Watch del tipo para reactividad
  const selectedType = watch("type");

  return {
    bodyText,
    variablesText,
    variablesMedia,
    mediaVariable2,
    placeholderError,
    typeOptions,
    selectedType,
    control,
    errors,
    handleSubmit,
    addVariable,
    updateVariableSample,
    updateVariableMediaSample,
    handleUpdateBodyText,
    replaceVariablesWithSamples,
  };
};

export default useTemplateForm;
