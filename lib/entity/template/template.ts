export interface RequestCreateTemplate {
    clinicId: string;
    name: string;
    variables: TemplateVariableRequest[];
    body: string;
    type: string;
}

export interface TemplateVariableRequest {
    id: string;
    placeholder: string;
    sampleContent: string;
    type: string;
}


