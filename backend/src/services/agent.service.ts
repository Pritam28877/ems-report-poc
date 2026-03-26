import https from 'https';
import OpenAI from 'openai';
import type { Response } from 'express';
import { config } from '../config/env';
import { getDb } from '../db/client';
import { createReport, addTimelineEvent, getTemplateByIncidentType } from './report.service';
import type {
  AiField,
  DetectIncidentTypeResult,
  ExtractPatientInfoResult,
  ExtractVitalsResult,
  ExtractIncidentDetailsResult,
  ExtractInterventionsResult,
  ExtractMedicationsResult,
  ExtractNarrativeResult,
  DetectClinicalAlertResult,
  AgentToolName,
} from '../types/agent.types';

const agent = new https.Agent({ keepAlive: false });
const openai = new OpenAI({ apiKey: config.openaiApiKey, httpAgent: agent, maxRetries: 2 });

// ─── Tool Definitions ──────────────────────────────────────────────────────────

const TOOL_DEFINITIONS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'detect_incident_type',
      description:
        'Classify the emergency incident type from the paramedic transcript. Determines which form template to use.',
      parameters: {
        type: 'object',
        properties: {
          incident_type: {
            type: 'string',
            enum: ['trauma', 'cardiac', 'respiratory', 'unknown'],
            description:
              'The primary incident classification. Trauma for MVA/falls/injuries, cardiac for chest pain/arrest/ECG issues, respiratory for breathing difficulties/asthma/COPD.',
          },
          confidence: {
            type: 'number',
            minimum: 0,
            maximum: 1,
            description: 'Confidence score 0-1 for the classification.',
          },
          reasoning: {
            type: 'string',
            description: 'Brief explanation of why this incident type was chosen.',
          },
        },
        required: ['incident_type', 'confidence', 'reasoning'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_patient_info',
      description:
        'Extract patient demographic information from the transcript including name, age, gender, and date of birth.',
      parameters: {
        type: 'object',
        properties: {
          patient_name: {
            type: 'string',
            description: 'Full name of the patient as mentioned in the transcript.',
          },
          patient_age: {
            type: 'number',
            description: 'Age of the patient in years.',
          },
          patient_gender: {
            type: 'string',
            enum: ['Male', 'Female', 'Other'],
            description: 'Patient gender.',
          },
          date_of_birth: {
            type: 'string',
            description: 'Date of birth in ISO 8601 format if mentioned (YYYY-MM-DD).',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_vitals',
      description:
        'Extract all vital signs from the transcript including blood pressure, heart rate, SpO2, respiratory rate, GCS, temperature, and blood glucose.',
      parameters: {
        type: 'object',
        properties: {
          bp_systolic: {
            type: 'number',
            description: 'Systolic blood pressure in mmHg.',
          },
          bp_diastolic: {
            type: 'number',
            description: 'Diastolic blood pressure in mmHg.',
          },
          heart_rate: {
            type: 'number',
            description: 'Heart rate in beats per minute.',
          },
          spo2: {
            type: 'number',
            minimum: 0,
            maximum: 100,
            description: 'Oxygen saturation percentage (SpO2).',
          },
          respiratory_rate: {
            type: 'number',
            description: 'Respiratory rate in breaths per minute.',
          },
          gcs_score: {
            type: 'number',
            minimum: 3,
            maximum: 15,
            description: 'Glasgow Coma Scale total score.',
          },
          temperature: {
            type: 'number',
            description: 'Body temperature in Celsius.',
          },
          blood_glucose: {
            type: 'number',
            description: 'Blood glucose level in mg/dL.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_incident_details',
      description:
        'Extract incident-specific details including time, location, mechanism of injury or chief complaint, and symptom onset time.',
      parameters: {
        type: 'object',
        properties: {
          incident_time: {
            type: 'string',
            description: 'Time of the incident or dispatch time in ISO 8601 format if determinable.',
          },
          location: {
            type: 'string',
            description: 'Location of the incident as described (address, landmark, area).',
          },
          mechanism_of_injury: {
            type: 'string',
            enum: ['MVA', 'Fall', 'Penetrating Trauma', 'Blunt Force', 'Burns', 'Other'],
            description: 'For trauma: mechanism of injury.',
          },
          chief_complaint: {
            type: 'string',
            description: 'Primary complaint or reason for call.',
          },
          onset_time: {
            type: 'string',
            description: 'When symptoms started.',
          },
        },
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_interventions',
      description:
        'Extract all medical interventions performed on the patient including oxygen therapy, IV access, CPR, defibrillation, and airway management.',
      parameters: {
        type: 'object',
        properties: {
          interventions: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of interventions performed.',
          },
          oxygen_delivered: {
            type: 'string',
            enum: [
              'Room Air',
              'Nasal Cannula',
              'Non-Rebreather Mask',
              'BVM',
              'CPAP',
              'BiPAP',
              'Intubated',
            ],
            description: 'Oxygen delivery method used.',
          },
          lpm: {
            type: 'number',
            description: 'Oxygen flow rate in liters per minute.',
          },
          cpr_performed: {
            type: 'boolean',
            description: 'Whether CPR was performed.',
          },
          defib_used: {
            type: 'boolean',
            description: 'Whether defibrillation was used.',
          },
          nebulizer_used: {
            type: 'boolean',
            description: 'Whether nebulizer treatment was administered.',
          },
          intubated: {
            type: 'boolean',
            description: 'Whether the patient was intubated.',
          },
        },
        required: ['interventions', 'cpr_performed', 'defib_used', 'nebulizer_used', 'intubated'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_medications',
      description:
        'Extract all medications administered to the patient with doses, routes, and times.',
      parameters: {
        type: 'object',
        properties: {
          medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Medication name.' },
                dose: { type: 'string', description: 'Dose with units (e.g., "0.4mg", "325mg").' },
                route: {
                  type: 'string',
                  description: 'Route of administration (IV, SL, PO, IM, IN, etc.).',
                },
                time: { type: 'string', description: 'Time administered if mentioned.' },
              },
              required: ['name'],
            },
            description: 'Array of medications given.',
          },
          medications_summary: {
            type: 'string',
            description: 'Free-text summary of all medications given.',
          },
        },
        required: ['medications', 'medications_summary'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_narrative',
      description:
        'Generate a structured clinical narrative from the transcript suitable for an official EMS report.',
      parameters: {
        type: 'object',
        properties: {
          narrative: {
            type: 'string',
            description:
              'Complete clinical narrative in SOAP or chronological format suitable for official EMS documentation.',
          },
          dispatch_info: {
            type: 'string',
            description: 'Dispatch information and initial call details.',
          },
          scene_findings: {
            type: 'string',
            description: 'Findings upon arrival at scene.',
          },
          treatment_provided: {
            type: 'string',
            description: 'Summary of treatment provided on scene and during transport.',
          },
          patient_response: {
            type: 'string',
            description: "Patient's response to treatment.",
          },
          transport_info: {
            type: 'string',
            description: 'Transport information including destination and condition during transport.',
          },
        },
        required: ['narrative'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'detect_clinical_alert',
      description:
        'Detect critical clinical patterns that require immediate alerts such as STEMI, stroke, sepsis, anaphylaxis, respiratory failure, or other life-threatening conditions.',
      parameters: {
        type: 'object',
        properties: {
          alert_detected: {
            type: 'boolean',
            description: 'Whether a clinical alert condition was detected.',
          },
          alert_type: {
            type: 'string',
            description:
              'Type of alert (e.g., STEMI_SUSPECTED, STROKE_SUSPECTED, SEPSIS_SUSPECTED, ANAPHYLAXIS, RESPIRATORY_FAILURE, TRAUMATIC_ARREST, PEDIATRIC_CRITICAL).',
          },
          severity: {
            type: 'string',
            enum: ['critical', 'warning', 'info'],
            description: 'Severity level of the alert.',
          },
          message: {
            type: 'string',
            description: 'Human-readable alert message for the paramedic and receiving hospital.',
          },
          indicators: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of clinical indicators that triggered this alert.',
          },
        },
        required: ['alert_detected', 'indicators'],
      },
    },
  },
];

// ─── SSE Helpers ───────────────────────────────────────────────────────────────

function sseWrite(res: Response, eventType: string, data: unknown): void {
  const payload = JSON.stringify(data);
  res.write(`event: ${eventType}\ndata: ${payload}\n\n`);
}

// ─── Field Mapping ─────────────────────────────────────────────────────────────

function buildFieldsFromResults(
  incidentType: string,
  patientInfo: ExtractPatientInfoResult | null,
  vitals: ExtractVitalsResult | null,
  incidentDetails: ExtractIncidentDetailsResult | null,
  interventions: ExtractInterventionsResult | null,
  medications: ExtractMedicationsResult | null,
  narrative: ExtractNarrativeResult | null
): AiField[] {
  const fields: AiField[] = [];

  const addField = (
    key: string,
    value: AiField['value'],
    confidence: number
  ) => {
    if (value !== null && value !== undefined) {
      fields.push({ key, value, ai_filled: true, ai_confidence: confidence });
    }
  };

  // Patient info
  if (patientInfo) {
    addField('patient_name', patientInfo.patient_name, 0.95);
    addField('patient_age', patientInfo.patient_age, 0.93);
    addField('patient_gender', patientInfo.patient_gender, 0.92);
  }

  // Vitals
  if (vitals) {
    addField('bp_systolic', vitals.bp_systolic, 0.97);
    addField('bp_diastolic', vitals.bp_diastolic, 0.97);
    addField('heart_rate', vitals.heart_rate, 0.97);
    addField('spo2', vitals.spo2, 0.96);
    addField('respiratory_rate', vitals.respiratory_rate, 0.94);
    addField('gcs_score', vitals.gcs_score, 0.93);
  }

  // Incident details
  if (incidentDetails) {
    addField('incident_time', incidentDetails.incident_time, 0.88);
    addField('location', incidentDetails.location, 0.9);
    addField('chief_complaint', incidentDetails.chief_complaint, 0.9);
    addField('onset_time', incidentDetails.onset_time, 0.85);
    if (incidentType === 'trauma') {
      addField('mechanism_of_injury', incidentDetails.mechanism_of_injury, 0.89);
    }
  }

  // Interventions
  if (interventions) {
    if (interventions.interventions.length > 0) {
      addField('interventions', interventions.interventions, 0.91);
    }
    addField('oxygen_delivered', interventions.oxygen_delivered, 0.9);
    if (interventions.lpm !== null) {
      addField('lpm', interventions.lpm, 0.88);
    }
    if (interventions.cpr_performed) {
      addField('cpr_performed', true, 0.98);
    }
    if (interventions.defib_used) {
      addField('defib_used', true, 0.98);
    }
    if (interventions.nebulizer_used) {
      addField('nebulizer_used', true, 0.97);
    }
  }

  // Medications
  if (medications) {
    if (medications.medications_summary) {
      addField('medications_given', medications.medications_summary, 0.9);
    }
    if (medications.medications.length > 0) {
      const firstMed = medications.medications[0];
      if (firstMed?.name && incidentType === 'respiratory') {
        addField('medication_used', firstMed.name, 0.88);
      }
    }
  }

  // Narrative
  if (narrative) {
    addField('narrative', narrative.narrative, 0.85);
  }

  return fields;
}

// ─── Main Agent ────────────────────────────────────────────────────────────────

export async function runAgentAnalysis(
  transcript: string,
  transcriptionId: number | undefined,
  res: Response
): Promise<void> {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    sseWrite(res, 'thinking', { message: 'Analyzing transcript with GPT-4o...' });

    const systemPrompt = `You are a medical AI assistant specialized in pre-hospital emergency care documentation.
Extract structured data from paramedic speech transcripts with high accuracy.
Medical terminology awareness is critical.

Guidelines:
- Extract ONLY information explicitly stated or clearly implied in the transcript
- For vitals, look for blood pressure (e.g., "BP 120 over 80"), heart rate (e.g., "HR 90", "pulse 90"), SpO2 (e.g., "sats 98", "SpO2 96%")
- For medications, include drug name, dose, route, and time if available
- Incident time should be in ISO 8601 format when determinable
- Clinical alerts should only be triggered when there are clear clinical indicators
- Always call ALL provided tools - do not skip any
- Call tools in this order: detect_incident_type, extract_patient_info, extract_vitals, extract_incident_details, extract_interventions, extract_medications, extract_narrative, detect_clinical_alert`;

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: `Please analyze this paramedic incident transcript and call all the provided tools to extract structured data:\n\n---\n${transcript}\n---`,
      },
    ];

    // Results storage
    let incidentTypeResult: DetectIncidentTypeResult | null = null;
    let patientInfoResult: ExtractPatientInfoResult | null = null;
    let vitalsResult: ExtractVitalsResult | null = null;
    let incidentDetailsResult: ExtractIncidentDetailsResult | null = null;
    let interventionsResult: ExtractInterventionsResult | null = null;
    let medicationsResult: ExtractMedicationsResult | null = null;
    let narrativeResult: ExtractNarrativeResult | null = null;
    let alertResult: DetectClinicalAlertResult | null = null;

    // Agentic loop with tool calling
    let continueLoop = true;
    let iteration = 0;
    const maxIterations = 10;

    while (continueLoop && iteration < maxIterations) {
      iteration++;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        temperature: 0.1, // Low temperature for medical accuracy
        max_tokens: 4096,
      });

      const choice = response.choices[0];
      if (!choice) break;

      const assistantMessage = choice.message;
      messages.push(assistantMessage);

      // No more tool calls — agent is done
      if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
        continueLoop = false;
        break;
      }

      // Process each tool call
      const toolResults: OpenAI.Chat.ChatCompletionToolMessageParam[] = [];

      for (const toolCall of assistantMessage.tool_calls) {
        const toolName = toolCall.function.name as AgentToolName;

        sseWrite(res, 'tool_call', { tool: toolName, status: 'running' });

        let parsedArgs: Record<string, unknown>;
        try {
          parsedArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
        } catch {
          parsedArgs = {};
        }

        // "Execute" the tool by storing the result (the model provides the values)
        let toolResult: unknown;

        switch (toolName) {
          case 'detect_incident_type': {
            incidentTypeResult = parsedArgs as unknown as DetectIncidentTypeResult;
            toolResult = { success: true, recorded: incidentTypeResult };
            sseWrite(res, 'tool_result', {
              tool: toolName,
              result: { type: incidentTypeResult.incident_type },
            });
            sseWrite(res, 'field_filled', {
              field: 'incident_type',
              value: incidentTypeResult.incident_type,
              confidence: incidentTypeResult.confidence,
            });
            break;
          }

          case 'extract_patient_info': {
            patientInfoResult = parsedArgs as unknown as ExtractPatientInfoResult;
            toolResult = { success: true, recorded: patientInfoResult };
            sseWrite(res, 'tool_result', { tool: toolName, result: patientInfoResult });

            if (patientInfoResult.patient_name) {
              sseWrite(res, 'field_filled', {
                field: 'patient_name',
                value: patientInfoResult.patient_name,
                confidence: 0.95,
              });
            }
            if (patientInfoResult.patient_age !== null) {
              sseWrite(res, 'field_filled', {
                field: 'patient_age',
                value: patientInfoResult.patient_age,
                confidence: 0.93,
              });
            }
            if (patientInfoResult.patient_gender) {
              sseWrite(res, 'field_filled', {
                field: 'patient_gender',
                value: patientInfoResult.patient_gender,
                confidence: 0.92,
              });
            }
            break;
          }

          case 'extract_vitals': {
            vitalsResult = parsedArgs as unknown as ExtractVitalsResult;
            toolResult = { success: true, recorded: vitalsResult };
            sseWrite(res, 'tool_result', { tool: toolName, result: vitalsResult });

            const vitalEmissions: Array<[string, number | null, number]> = [
              ['bp_systolic', vitalsResult.bp_systolic, 0.97],
              ['bp_diastolic', vitalsResult.bp_diastolic, 0.97],
              ['heart_rate', vitalsResult.heart_rate, 0.97],
              ['spo2', vitalsResult.spo2, 0.96],
              ['respiratory_rate', vitalsResult.respiratory_rate, 0.94],
              ['gcs_score', vitalsResult.gcs_score, 0.93],
            ];

            for (const [field, value, conf] of vitalEmissions) {
              if (value !== null && value !== undefined) {
                sseWrite(res, 'field_filled', { field, value, confidence: conf });
              }
            }
            break;
          }

          case 'extract_incident_details': {
            incidentDetailsResult = parsedArgs as unknown as ExtractIncidentDetailsResult;
            toolResult = { success: true, recorded: incidentDetailsResult };
            sseWrite(res, 'tool_result', { tool: toolName, result: incidentDetailsResult });

            if (incidentDetailsResult.location) {
              sseWrite(res, 'field_filled', {
                field: 'location',
                value: incidentDetailsResult.location,
                confidence: 0.9,
              });
            }
            if (incidentDetailsResult.incident_time) {
              sseWrite(res, 'field_filled', {
                field: 'incident_time',
                value: incidentDetailsResult.incident_time,
                confidence: 0.88,
              });
            }
            if (incidentDetailsResult.mechanism_of_injury) {
              sseWrite(res, 'field_filled', {
                field: 'mechanism_of_injury',
                value: incidentDetailsResult.mechanism_of_injury,
                confidence: 0.89,
              });
            }
            if (incidentDetailsResult.chief_complaint) {
              sseWrite(res, 'field_filled', {
                field: 'chief_complaint',
                value: incidentDetailsResult.chief_complaint,
                confidence: 0.9,
              });
            }
            break;
          }

          case 'extract_interventions': {
            interventionsResult = parsedArgs as unknown as ExtractInterventionsResult;
            toolResult = { success: true, recorded: interventionsResult };
            sseWrite(res, 'tool_result', { tool: toolName, result: interventionsResult });

            if (interventionsResult.interventions?.length > 0) {
              sseWrite(res, 'field_filled', {
                field: 'interventions',
                value: interventionsResult.interventions,
                confidence: 0.91,
              });
            }
            if (interventionsResult.oxygen_delivered) {
              sseWrite(res, 'field_filled', {
                field: 'oxygen_delivered',
                value: interventionsResult.oxygen_delivered,
                confidence: 0.9,
              });
            }
            break;
          }

          case 'extract_medications': {
            medicationsResult = parsedArgs as unknown as ExtractMedicationsResult;
            toolResult = { success: true, recorded: medicationsResult };
            sseWrite(res, 'tool_result', { tool: toolName, result: medicationsResult });

            if (medicationsResult.medications_summary) {
              sseWrite(res, 'field_filled', {
                field: 'medications_given',
                value: medicationsResult.medications_summary,
                confidence: 0.9,
              });
            }
            break;
          }

          case 'extract_narrative': {
            narrativeResult = parsedArgs as unknown as ExtractNarrativeResult;
            toolResult = { success: true, recorded: narrativeResult };
            sseWrite(res, 'tool_result', { tool: toolName, result: narrativeResult });

            if (narrativeResult.narrative) {
              sseWrite(res, 'field_filled', {
                field: 'narrative',
                value: narrativeResult.narrative,
                confidence: 0.85,
              });
            }
            break;
          }

          case 'detect_clinical_alert': {
            alertResult = parsedArgs as unknown as DetectClinicalAlertResult;
            toolResult = { success: true, recorded: alertResult };
            sseWrite(res, 'tool_result', { tool: toolName, result: alertResult });

            if (alertResult.alert_detected && alertResult.alert_type) {
              sseWrite(res, 'alert', {
                type: alertResult.alert_type,
                severity: alertResult.severity ?? 'warning',
                message: alertResult.message ?? `Clinical alert: ${alertResult.alert_type}`,
              });
            }
            break;
          }

          default: {
            toolResult = { success: false, error: 'Unknown tool' };
          }
        }

        toolResults.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }

      // Add all tool results back to the conversation
      messages.push(...toolResults);

      // If stop_reason is end_turn or no more tools needed, break
      if (choice.finish_reason === 'stop') {
        continueLoop = false;
      }
    }

    // ─── Build final form fields ─────────────────────────────────────────────

    const resolvedIncidentType = incidentTypeResult?.incident_type ?? 'unknown';

    const allFields = buildFieldsFromResults(
      resolvedIncidentType,
      patientInfoResult,
      vitalsResult,
      incidentDetailsResult,
      interventionsResult,
      medicationsResult,
      narrativeResult
    );

    // Look up template_id
    let templateId: number | null = null;
    if (resolvedIncidentType !== 'unknown') {
      const tpl = getTemplateByIncidentType(resolvedIncidentType) as
        | { id: number }
        | undefined
        | null;
      if (tpl) templateId = tpl.id;
    }

    // ─── Save draft report to DB ──────────────────────────────────────────────

    const patientName =
      (patientInfoResult?.patient_name) ?? null;
    const patientAge =
      (patientInfoResult?.patient_age) ?? null;
    const patientGender =
      (patientInfoResult?.patient_gender) ?? null;
    const incidentTime =
      (incidentDetailsResult?.incident_time) ?? null;
    const location =
      (incidentDetailsResult?.location) ?? null;

    const formData: Record<string, unknown> = {};
    for (const f of allFields) {
      formData[f.key] = f.value;
    }

    const reportId = createReport({
      transcription_id: transcriptionId,
      template_id: templateId ?? undefined,
      incident_type: resolvedIncidentType !== 'unknown' ? resolvedIncidentType : undefined,
      patient_name: patientName ?? undefined,
      patient_age: patientAge ?? undefined,
      patient_gender: patientGender ?? undefined,
      incident_time: incidentTime ?? undefined,
      location: location ?? undefined,
      ai_alert: alertResult?.alert_detected ? (alertResult.alert_type ?? undefined) : undefined,
      ai_alert_severity: alertResult?.alert_detected ? (alertResult.severity ?? undefined) : undefined,
      form_data: formData,
      fields: allFields.map((f) => ({
        field_key: f.key,
        field_value: Array.isArray(f.value) ? JSON.stringify(f.value) : String(f.value ?? ''),
        ai_filled: true,
        ai_confidence: f.ai_confidence,
      })),
    });

    addTimelineEvent(reportId, 'ai_analysis_complete', `GPT-4o extracted ${allFields.length} fields`);

    if (alertResult?.alert_detected && alertResult.alert_type) {
      addTimelineEvent(
        reportId,
        'clinical_alert',
        `${alertResult.alert_type}: ${alertResult.message ?? ''}`
      );
    }

    // ─── Send final events ────────────────────────────────────────────────────

    sseWrite(res, 'form_ready', {
      incident_type: resolvedIncidentType,
      template_id: templateId,
      fields: allFields,
      transcription_id: transcriptionId ?? null,
    });

    sseWrite(res, 'done', { report_id: reportId });

    res.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown agent error';
    sseWrite(res, 'error', { message });
    res.end();
  }
}

// ─── DB helper for persisting agent state ─────────────────────────────────────

export function getAgentRunsByTranscriptionId(transcriptionId: number) {
  const db = getDb();
  return db
    .prepare('SELECT * FROM reports WHERE transcription_id = ? ORDER BY created_at DESC')
    .all(transcriptionId);
}
