"use server"

import crypto from "node:crypto"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false, autoRefreshToken: false } }
)

const leadSchema = z.object({
  full_name: z.string().optional().default(""),
  email: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  company: z.string().optional().default(""),
  city: z.string().optional().default(""),
  stage: z.string().optional().default(""),
  owner_name: z.string().optional().default(""),
  campaign: z.string().optional().default(""),
  raw_data: z.record(z.any()).default({}),
  mapped_fields: z.record(z.any()).default({}),
})

const importBatchSchema = z.object({
  sourceSystem: z.string().min(1),
  sourceLabel: z.string().optional(),
  leads: z.array(leadSchema).min(1),
})

const exportLeadsFilterSchema = z.object({
  query: z.string().optional(),
  city: z.string().optional(),
  ownerName: z.string().optional(),
  stage: z.string().optional(),
  pipeline: z.string().optional(),
  leadStatus: z.string().optional(),
  opportunitySource: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z.number().int().min(1).max(10000).optional(),
})

type RdFilterOptions = {
  cityOptions: string[]
  ownerOptions: string[]
  stageOptions: string[]
  pipelineOptions: string[]
  leadStatusOptions: string[]
  opportunitySourceOptions: string[]
}

const EMPTY_RD_FILTER_OPTIONS: RdFilterOptions = {
  cityOptions: [],
  ownerOptions: [],
  stageOptions: [],
  pipelineOptions: [],
  leadStatusOptions: [],
  opportunitySourceOptions: [],
}

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function normalizeForHash(value: unknown) {
  return String(value ?? "").trim().toLowerCase()
}

function parseInteger(value: string) {
  const normalized = String(value ?? "").trim()
  if (!normalized) return null
  const parsed = Number.parseInt(normalized.replace(/[^\d-]/g, ""), 10)
  return Number.isNaN(parsed) ? null : parsed
}

function parseBoolean(value: string) {
  const normalized = normalizeText(String(value ?? ""))
  if (!normalized) return null
  if (["sim", "s", "yes", "true", "1", "aceito", "aceitou"].includes(normalized)) return true
  if (["nao", "não", "n", "no", "false", "0", "nao aceito"].includes(normalized)) return false
  return null
}

function lookupRawValue(rawData: Record<string, any>, aliases: string[], fallback = "") {
  const entries = Object.entries(rawData || {})
  const normalizedMap = new Map<string, string>()

  entries.forEach(([key, value]) => {
    normalizedMap.set(normalizeText(key), String(value ?? "").trim())
  })

  for (const alias of aliases) {
    const direct = rawData?.[alias]
    if (direct !== undefined && direct !== null && String(direct).trim() !== "") {
      return String(direct).trim()
    }

    const normalized = normalizedMap.get(normalizeText(alias))
    if (normalized) {
      return normalized
    }
  }

  return fallback
}

function buildRdStationRow(rawData: Record<string, any>, normalizedLead: Record<string, string>, rowHash: string) {
  const row = {
    "row_hash": rowHash,
    raw_data: rawData || {},
    "Email": lookupRawValue(rawData, ["Email", "email"], normalizedLead.email),
    "Nome": lookupRawValue(rawData, ["Nome", "nome", "name"], normalizedLead.full_name),
    "Telefone": lookupRawValue(rawData, ["Telefone", "telefone"]),
    "Celular": lookupRawValue(rawData, ["Celular", "celular", "mobile"]),
    "Facebook": lookupRawValue(rawData, ["Facebook"]),
    "Twitter": lookupRawValue(rawData, ["Twitter"]),
    "Linkedin": lookupRawValue(rawData, ["Linkedin", "LinkedIn"]),
    "Website": lookupRawValue(rawData, ["Website", "site"]),
    "Cargo": lookupRawValue(rawData, ["Cargo"]),
    "Empresa": lookupRawValue(rawData, ["Empresa", "company"], normalizedLead.company),
    "País": lookupRawValue(rawData, ["País", "Pais", "país", "pais"]),
    "Estado": lookupRawValue(rawData, ["Estado", "state"]),
    "Cidade": lookupRawValue(rawData, ["Cidade", "city"], normalizedLead.city),
    "Biografia": lookupRawValue(rawData, ["Biografia", "bio"]),
    "Estágio no funil": lookupRawValue(rawData, ["Estágio no funil", "Estagio no funil", "status"], normalizedLead.stage),
    "Dono do Lead": lookupRawValue(rawData, ["Dono do Lead", "owner", "corretor"], normalizedLead.owner_name),
    "Data da última oportunidade": lookupRawValue(rawData, ["Data da última oportunidade", "Data da ultima oportunidade"]),
    "Data da última venda": lookupRawValue(rawData, ["Data da última venda", "Data da ultima venda"]),
    "Valor da última venda": lookupRawValue(rawData, ["Valor da última venda", "Valor da ultima venda"]),
    "Lead Scoring - Perfil": lookupRawValue(rawData, ["Lead Scoring - Perfil"]),
    "Lead Scoring - Interesse": parseInteger(lookupRawValue(rawData, ["Lead Scoring - Interesse"])),
    "Status para comunicação por email": parseBoolean(lookupRawValue(rawData, ["Status para comunicação por email", "Status para comunicacao por email"])),
    "Tags": lookupRawValue(rawData, ["Tags"]),
    "URL pública": lookupRawValue(rawData, ["URL pública", "URL publica"]),
    "Data de aniversário": lookupRawValue(rawData, ["Data de aniversário", "Data de aniversario"]),
    "Base legal para comunicação": lookupRawValue(rawData, ["Base legal para comunicação", "Base legal para comunicacao"]),
    "Total de conversões": parseInteger(lookupRawValue(rawData, ["Total de conversões", "Total de conversoes"])),
    "Data da primeira conversão": lookupRawValue(rawData, ["Data da primeira conversão", "Data da primeira conversao"]),
    "Origem da primeira conversão": lookupRawValue(rawData, ["Origem da primeira conversão", "Origem da primeira conversao"]),
    "Data da última conversão": lookupRawValue(rawData, ["Data da última conversão", "Data da ultima conversao"]),
    "Origem da última conversão": lookupRawValue(rawData, ["Origem da última conversão", "Origem da ultima conversao"]),
    "Eventos (Últimos 100)": lookupRawValue(rawData, ["Eventos (Últimos 100)", "Eventos (Ultimos 100)"]),
    "Aceitou a condição de entrada?": lookupRawValue(rawData, ["Aceitou a condição de entrada?", "Aceitou a condicao de entrada?"]),
    "Aceitou o valor do imóvel?": lookupRawValue(rawData, ["Aceitou o valor do imóvel?", "Aceitou o valor do imovel?"]),
    "Celular.1": lookupRawValue(rawData, ["Celular.1"]),
    "Concordou com a renda familiar?": lookupRawValue(rawData, ["Concordou com a renda familiar?"]),
    "CÓDIGO": lookupRawValue(rawData, ["CÓDIGO", "CODIGO", "codigo"]),
    "Entrada de 310.000?": lookupRawValue(rawData, ["Entrada de 310.000?"]),
    "Entrada de R$ 50 mil?": lookupRawValue(rawData, ["Entrada de R$ 50 mil?"]),
    "Etapa do funil de vendas no CRM (última atualização)": lookupRawValue(rawData, ["Etapa do funil de vendas no CRM (última atualização)", "Etapa do funil de vendas no CRM (ultima atualizacao)"]),
    "FeedBack Lead:": lookupRawValue(rawData, ["FeedBack Lead:", "Feedback Lead:"]),
    "Funil de vendas no CRM (última atualização)": lookupRawValue(rawData, ["Funil de vendas no CRM (última atualização)", "Funil de vendas no CRM (ultima atualizacao)"]),
    "Mot. de Descarte:": lookupRawValue(rawData, ["Mot. de Descarte:"]),
    "Motivo de Perda no RD Station CRM": lookupRawValue(rawData, ["Motivo de Perda no RD Station CRM"]),
    "Nome do responsável pela Oportunidade no CRM (última atualização)": lookupRawValue(rawData, ["Nome do responsável pela Oportunidade no CRM (última atualização)", "Nome do responsavel pela Oportunidade no CRM (ultima atualizacao)"]),
    "O valor de R$ 2.950.000 está de acordo?": lookupRawValue(rawData, ["O valor de R$ 2.950.000 está de acordo?"]),
    "O valor de R$ 4.800.000 está de acordo?": lookupRawValue(rawData, ["O valor de R$ 4.800.000 está de acordo?"]),
    "O valor de R$ 850.000 está de acordo com que deseja investir?": lookupRawValue(rawData, ["O valor de R$ 850.000 está de acordo com que deseja investir?"]),
    "O valor de R$ 950.000 está de acordo?": lookupRawValue(rawData, ["O valor de R$ 950.000 está de acordo?"]),
    "Origem da Oportunidade no CRM (última atualização)": lookupRawValue(rawData, ["Origem da Oportunidade no CRM (última atualização)", "Origem da Oportunidade no CRM (ultima atualizacao)"]),
    "Qual o valor você pretende investir?": lookupRawValue(rawData, ["Qual o valor você pretende investir?", "Qual o valor voce pretende investir?"]),
    "Qualificação da Oportunidade no CRM (última atualização)": lookupRawValue(rawData, ["Qualificação da Oportunidade no CRM (última atualização)", "Qualificacao da Oportunidade no CRM (ultima atualizacao)"]),
    "Quando pretende adquirir um imóvel?": lookupRawValue(rawData, ["Quando pretende adquirir um imóvel?", "Quando pretende adquirir um imovel?"]),
    "Referência": lookupRawValue(rawData, ["Referência", "Referencia"]),
    "Referência do Imóvel": lookupRawValue(rawData, ["Referência do Imóvel", "Referencia do Imovel"]),
    "Selecione uma das opções": lookupRawValue(rawData, ["Selecione uma das opções", "Selecione uma das opcoes"]),
    "Selecione uma das opções.1": lookupRawValue(rawData, ["Selecione uma das opções.1", "Selecione uma das opcoes.1"]),
    "Status do Lead:": lookupRawValue(rawData, ["Status do Lead:"]),
    "Tem restrição?": lookupRawValue(rawData, ["Tem restrição?", "Tem restricao?"]),
    "Valor total da Oportunidade no CRM (última atualização)": lookupRawValue(rawData, ["Valor total da Oportunidade no CRM (última atualização)", "Valor total da Oportunidade no CRM (ultima atualizacao)"]),
    "Você deseja um imóvel para:": lookupRawValue(rawData, ["Você deseja um imóvel para:", "Voce deseja um imovel para:"]),
  }

  return row
}

function resolveMappedValue(mappedFields: Record<string, any>, rawData: Record<string, any>, key: string, aliases: string[], fallback = "") {
  const mappedValue = mappedFields?.[key]
  if (mappedValue !== undefined && mappedValue !== null && String(mappedValue).trim() !== "") {
    return String(mappedValue).trim()
  }

  return lookupRawValue(rawData, aliases, fallback)
}

export async function listLeadsForExportAction(input: unknown) {
  const parsed = exportLeadsFilterSchema.safeParse(input || {})

  if (!parsed.success) {
    return {
      success: false,
      error: "Filtros inválidos para exportação.",
      leads: [] as Record<string, any>[],
    }
  }

  const {
    query,
    city,
    ownerName,
    stage,
    pipeline,
    leadStatus,
    opportunitySource,
    startDate,
    endDate,
    limit,
  } = parsed.data

  let request = supabaseAdmin
    .from("rd_station_leads")
    .select("*")
    .limit(limit || 2000)

  const { data, error } = await request

  if (error) {
    return {
      success: false,
      error: error.message,
      leads: [] as Record<string, any>[],
    }
  }

  let filteredRows = (data || []) as Record<string, any>[]

  if (query?.trim()) {
    const normalizedQuery = normalizeText(query)
    filteredRows = filteredRows.filter((row) => {
      const textPool = [
        row["Nome"],
        row["Email"],
        row["Telefone"],
        row["Celular"],
        row["Empresa"],
        row["Cidade"],
        row["Dono do Lead"],
        row["Tags"],
        row["Referência"],
      ]
        .map((value) => normalizeText(String(value ?? "")))
        .join(" ")

      return textPool.includes(normalizedQuery)
    })
  }

  if (city?.trim()) {
    const normalizedCity = normalizeText(city)
    filteredRows = filteredRows.filter((row) => normalizeText(String(row["Cidade"] ?? "")) === normalizedCity)
  }

  if (ownerName?.trim()) {
    const normalizedOwner = normalizeText(ownerName)
    filteredRows = filteredRows.filter((row) => normalizeText(String(row["Dono do Lead"] ?? "")).includes(normalizedOwner))
  }

  if (stage?.trim()) {
    const normalizedStage = normalizeText(stage)
    filteredRows = filteredRows.filter((row) => {
      const stageA = normalizeText(String(row["Estágio no funil"] ?? ""))
      const stageB = normalizeText(String(row["Etapa do funil de vendas no CRM (última atualização)"] ?? ""))
      return stageA.includes(normalizedStage) || stageB.includes(normalizedStage)
    })
  }

  if (pipeline?.trim()) {
    const normalizedPipeline = normalizeText(pipeline)
    filteredRows = filteredRows.filter((row) => normalizeText(String(row["Funil de vendas no CRM (última atualização)"] ?? "")) === normalizedPipeline)
  }

  if (leadStatus?.trim()) {
    const normalizedLeadStatus = normalizeText(leadStatus)
    filteredRows = filteredRows.filter((row) => normalizeText(String(row["Status do Lead:"] ?? "")) === normalizedLeadStatus)
  }

  if (opportunitySource?.trim()) {
    const normalizedOpportunitySource = normalizeText(opportunitySource)
    filteredRows = filteredRows.filter((row) => normalizeText(String(row["Origem da Oportunidade no CRM (última atualização)"] ?? "")) === normalizedOpportunitySource)
  }

  if (startDate?.trim()) {
    const start = new Date(`${startDate.trim()}T00:00:00.000Z`).getTime()
    filteredRows = filteredRows.filter((row) => {
      const value = row["imported_at"]
      if (!value) return false
      const parsed = new Date(String(value)).getTime()
      return !Number.isNaN(parsed) && parsed >= start
    })
  }

  if (endDate?.trim()) {
    const end = new Date(`${endDate.trim()}T23:59:59.999Z`).getTime()
    filteredRows = filteredRows.filter((row) => {
      const value = row["imported_at"]
      if (!value) return false
      const parsed = new Date(String(value)).getTime()
      return !Number.isNaN(parsed) && parsed <= end
    })
  }

  filteredRows.sort((left, right) => {
    const leftTime = new Date(String(left["imported_at"] ?? "")).getTime()
    const rightTime = new Date(String(right["imported_at"] ?? "")).getTime()

    if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) {
      return rightTime - leftTime
    }

    if (!Number.isNaN(leftTime)) return -1
    if (!Number.isNaN(rightTime)) return 1

    return String(right["id"] ?? "").localeCompare(String(left["id"] ?? ""))
  })

  return {
    success: true,
    leads: filteredRows,
    totalCount: filteredRows.length,
  }
}

export async function listExportFilterOptionsAction() {
  const { data, error } = await supabaseAdmin
    .from("rd_station_leads")
    .select([
      '"Cidade"',
      '"Dono do Lead"',
      '"Estágio no funil"',
      '"Etapa do funil de vendas no CRM (última atualização)"',
      '"Funil de vendas no CRM (última atualização)"',
      '"Status do Lead:"',
      '"Origem da Oportunidade no CRM (última atualização)"',
    ].join(","))
    .limit(5000)

  if (error) {
    return {
      success: false,
      error: error.message,
      options: EMPTY_RD_FILTER_OPTIONS,
    }
  }

  const city = new Set<string>()
  const owners = new Set<string>()
  const stages = new Set<string>()
  const pipelines = new Set<string>()
  const leadStatuses = new Set<string>()
  const opportunitySources = new Set<string>()

  ;(data || []).forEach((row) => {
    const cityValue = String(row["Cidade"] ?? "").trim()
    const ownerValue = String(row["Dono do Lead"] ?? "").trim()
    const stageValueA = String(row["Estágio no funil"] ?? "").trim()
    const stageValueB = String(row["Etapa do funil de vendas no CRM (última atualização)"] ?? "").trim()
    const pipelineValue = String(row["Funil de vendas no CRM (última atualização)"] ?? "").trim()
    const leadStatusValue = String(row["Status do Lead:"] ?? "").trim()
    const opportunitySourceValue = String(row["Origem da Oportunidade no CRM (última atualização)"] ?? "").trim()

    if (cityValue) city.add(cityValue)
    if (ownerValue) owners.add(ownerValue)
    if (stageValueA) stages.add(stageValueA)
    if (stageValueB) stages.add(stageValueB)
    if (pipelineValue) pipelines.add(pipelineValue)
    if (leadStatusValue) leadStatuses.add(leadStatusValue)
    if (opportunitySourceValue) opportunitySources.add(opportunitySourceValue)
  })

  const sortText = (values: Set<string>) => Array.from(values).sort((a, b) => a.localeCompare(b, "pt-BR"))

  return {
    success: true,
    options: {
      cityOptions: sortText(city),
      ownerOptions: sortText(owners),
      stageOptions: sortText(stages),
      pipelineOptions: sortText(pipelines),
      leadStatusOptions: sortText(leadStatuses),
      opportunitySourceOptions: sortText(opportunitySources),
    },
  }
}

async function upsertRdRowsWithMissingColumnFallback(rows: Record<string, any>[]) {
  if (!rows.length) {
    return { success: true as const }
  }

  let currentRows = rows
  const removedColumns = new Set<string>()

  for (let attempt = 0; attempt < 40; attempt += 1) {
    const { error } = await supabaseAdmin
      .from("rd_station_leads")
      .upsert(currentRows, { onConflict: "row_hash", ignoreDuplicates: true })

    if (!error) {
      return {
        success: true as const,
        removedColumns: Array.from(removedColumns),
      }
    }

    const message = String(error.message || "")
    const missingColumnMatch = message.match(/Could not find the '([^']+)' column of 'rd_station_leads'/i)

    if (!missingColumnMatch) {
      return {
        success: false as const,
        error,
      }
    }

    const missingColumn = missingColumnMatch[1]
    removedColumns.add(missingColumn)
    currentRows = currentRows.map((row) => {
      const next = { ...row }
      delete next[missingColumn]
      return next
    })
  }

  return {
    success: false as const,
    error: {
      message: "Falha ao gravar em rd_station_leads: excedido o limite de tentativas para ajustar colunas ausentes.",
    },
  }
}

export async function importLeadsAction(input: unknown) {
  const parsed = importBatchSchema.safeParse(input)

  if (!parsed.success) {
    return {
      success: false,
      error: "A estrutura da importação está inválida.",
    }
  }

  const isRdStation = normalizeText(parsed.data.sourceSystem).includes("rd station")

  const sourceLabel = parsed.data.sourceLabel?.trim() || null
  const rows = parsed.data.leads
    .map((lead) => {
      const normalizedLead = {
        full_name: lead.full_name.trim(),
        email: lead.email.trim(),
        phone: lead.phone.trim(),
        company: lead.company.trim(),
        city: lead.city.trim(),
        stage: lead.stage.trim(),
        owner_name: lead.owner_name.trim(),
        campaign: lead.campaign.trim(),
      }

      const rowHash = crypto
        .createHash("sha256")
        .update(
          [
            parsed.data.sourceSystem,
            normalizedLead.email,
            normalizedLead.full_name,
            normalizedLead.phone,
            normalizedLead.company,
            normalizedLead.campaign,
            JSON.stringify(lead.raw_data || {}),
          ]
            .map(normalizeForHash)
            .join("|")
        )
        .digest("hex")

      return {
        source_system: parsed.data.sourceSystem,
        source_label: sourceLabel,
        ...normalizedLead,
        row_hash: rowHash,
        raw_data: lead.raw_data,
        imported_at: new Date().toISOString(),
      }
    })
    .filter((lead) => {
      if (isRdStation) {
        return Object.values(lead.raw_data || {}).some((value) => String(value ?? "").trim() !== "")
      }
      return lead.full_name || lead.email
    })

  if (isRdStation) {
    const rdRows = parsed.data.leads
      .map((lead) => {
        const normalizedLead = {
          full_name: lead.full_name.trim(),
          email: lead.email.trim(),
          phone: lead.phone.trim(),
          company: lead.company.trim(),
          city: lead.city.trim(),
          stage: lead.stage.trim(),
          owner_name: lead.owner_name.trim(),
          campaign: lead.campaign.trim(),
        }
        const mappedFields = lead.mapped_fields || {}

        const rdHash = crypto
          .createHash("sha256")
          .update(
            [
              parsed.data.sourceSystem,
              normalizedLead.email,
              normalizedLead.full_name,
              normalizedLead.phone,
              normalizedLead.company,
              normalizedLead.city,
              normalizedLead.stage,
              normalizedLead.owner_name,
              normalizedLead.campaign,
              JSON.stringify(lead.raw_data || {}),
            ]
              .map(normalizeForHash)
              .join("|")
          )
          .digest("hex")

        const rawData = {
          ...(lead.raw_data || {}),
          ...mappedFields,
        }

        return buildRdStationRow(rawData, normalizedLead, rdHash)
      })
      .filter((row) => Object.values(row).some((value) => value !== null && String(value).trim() !== ""))

    if (rdRows.length) {
      const rdUpsertResult = await upsertRdRowsWithMissingColumnFallback(rdRows)

      if (!rdUpsertResult.success) {
        return {
          success: false,
          error: `Falha ao gravar em rd_station_leads: ${rdUpsertResult.error.message}. Execute o arquivo setup_lead_imports.sql no Supabase.`,
        }
      }

      if (rdUpsertResult.removedColumns?.length) {
        console.warn("[lead-imports] Colunas ignoradas em rd_station_leads por ausencia no schema:", rdUpsertResult.removedColumns)
      }
    }
  }


  if (rows.length === 0) {
    return {
      success: false,
      error: "Nenhum lead válido foi encontrado no arquivo.",
    }
  }

  const { data, error } = await supabaseAdmin
    .from("lead_imports")
    .upsert(rows, { onConflict: "row_hash", ignoreDuplicates: true })
    .select("id")

  if (error) {
    return {
      success: false,
      error: error.message,
    }
  }

  return {
    success: true,
    importedCount: data?.length || rows.length,
    totalCount: rows.length,
  }
}