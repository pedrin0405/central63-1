"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  FileSpreadsheet,
  FileUp,
  Loader2,
  Menu,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react"
import { toast } from "sonner"
import { Sidebar } from "@/components/central63/sidebar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { importLeadsAction, listExportFilterOptionsAction, listLeadsForExportAction } from "@/app/actions/lead-imports"

type ParsedRow = Record<string, string>

type LeadRow = {
  full_name: string
  email: string
  phone: string
  company: string
  city: string
  stage: string
  owner_name: string
  campaign: string
  raw_data: ParsedRow
  mapped_fields: Record<string, string>
}

type MappingRow = {
  id: string
  sourceHeader: string
  targetField: string
}

type ImportResult = {
  success: boolean
  importedCount?: number
  totalCount?: number
  error?: string
}

type ExportLeadRow = {
  id?: string
  row_hash?: string
  imported_at?: string | null
  raw_data?: Record<string, string>
  [key: string]: unknown
}

type ExportFilterOptions = {
  cityOptions: string[]
  ownerOptions: string[]
  stageOptions: string[]
  pipelineOptions: string[]
  leadStatusOptions: string[]
  opportunitySourceOptions: string[]
}

const MAX_IMPORT_BATCH_BYTES = 4 * 1024 * 1024
const EXPORT_BASE_HEADERS = [
  "Nome",
  "Email",
  "Telefone",
  "Celular",
  "Empresa",
  "Cidade",
  "Estágio no funil",
  "Dono do Lead",
  "Tags",
  "Referência",
  "imported_at",
]

const SOURCE_OPTIONS = [
  "RD Station",
  "Meta Ads",
  "Google Ads",
  "WhatsApp",
  "Landing Page",
  "Manual CSV",
  "Outro",
]

const FIELD_DEFINITIONS = [
  { key: "full_name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
  { key: "city", label: "Cidade" },
  { key: "stage", label: "Etapa" },
  { key: "owner_name", label: "Responsável" },
  { key: "campaign", label: "Campanha" },
] as const

const RD_FIELDS = [
  { key: "Email", label: "Email" },
  { key: "Nome", label: "Nome" },
  { key: "Telefone", label: "Telefone" },
  { key: "Celular", label: "Celular" },
  { key: "Facebook", label: "Facebook" },
  { key: "Twitter", label: "Twitter" },
  { key: "Linkedin", label: "Linkedin" },
  { key: "Website", label: "Website" },
  { key: "Cargo", label: "Cargo" },
  { key: "Empresa", label: "Empresa" },
  { key: "País", label: "País" },
  { key: "Estado", label: "Estado" },
  { key: "Cidade", label: "Cidade" },
  { key: "Biografia", label: "Biografia" },
  { key: "Estágio no funil", label: "Estágio no funil" },
  { key: "Dono do Lead", label: "Dono do Lead" },
  { key: "Data da última oportunidade", label: "Data da última oportunidade" },
  { key: "Data da última venda", label: "Data da última venda" },
  { key: "Valor da última venda", label: "Valor da última venda" },
  { key: "Lead Scoring - Perfil", label: "Lead Scoring - Perfil" },
  { key: "Lead Scoring - Interesse", label: "Lead Scoring - Interesse" },
  { key: "Status para comunicação por email", label: "Status para comunicação por email" },
  { key: "Tags", label: "Tags" },
  { key: "URL pública", label: "URL pública" },
  { key: "Data de aniversário", label: "Data de aniversário" },
  { key: "Base legal para comunicação", label: "Base legal para comunicação" },
  { key: "Total de conversões", label: "Total de conversões" },
  { key: "Data da primeira conversão", label: "Data da primeira conversão" },
  { key: "Origem da primeira conversão", label: "Origem da primeira conversão" },
  { key: "Data da última conversão", label: "Data da última conversão" },
  { key: "Origem da última conversão", label: "Origem da última conversão" },
  { key: "Eventos (Últimos 100)", label: "Eventos (Últimos 100)" },
  { key: "Aceitou a condição de entrada?", label: "Aceitou a condição de entrada?" },
  { key: "Aceitou o valor do imóvel?", label: "Aceitou o valor do imóvel?" },
  { key: "Celular.1", label: "Celular.1" },
  { key: "Concordou com a renda familiar?", label: "Concordou com a renda familiar?" },
  { key: "CÓDIGO", label: "CÓDIGO" },
  { key: "Entrada de 310.000?", label: "Entrada de 310.000?" },
  { key: "Entrada de R$ 50 mil?", label: "Entrada de R$ 50 mil?" },
  { key: "Etapa do funil de vendas no CRM (última atualização)", label: "Etapa do funil de vendas no CRM (última atualização)" },
  { key: "FeedBack Lead:", label: "FeedBack Lead:" },
  { key: "Funil de vendas no CRM (última atualização)", label: "Funil de vendas no CRM (última atualização)" },
  { key: "Mot. de Descarte:", label: "Mot. de Descarte:" },
  { key: "Motivo de Perda no RD Station CRM", label: "Motivo de Perda no RD Station CRM" },
  { key: "Nome do responsável pela Oportunidade no CRM (última atualização)", label: "Nome do responsável pela Oportunidade no CRM (última atualização)" },
  { key: "O valor de R$ 2.950.000 está de acordo?", label: "O valor de R$ 2.950.000 está de acordo?" },
  { key: "O valor de R$ 4.800.000 está de acordo?", label: "O valor de R$ 4.800.000 está de acordo?" },
  { key: "O valor de R$ 850.000 está de acordo com que deseja investir?", label: "O valor de R$ 850.000 está de acordo com que deseja investir?" },
  { key: "O valor de R$ 950.000 está de acordo?", label: "O valor de R$ 950.000 está de acordo?" },
  { key: "Origem da Oportunidade no CRM (última atualização)", label: "Origem da Oportunidade no CRM (última atualização)" },
  { key: "Qual o valor você pretende investir?", label: "Qual o valor você pretende investir?" },
  { key: "Qualificação da Oportunidade no CRM (última atualização)", label: "Qualificação da Oportunidade no CRM (última atualização)" },
  { key: "Quando pretende adquirir um imóvel?", label: "Quando pretende adquirir um imóvel?" },
  { key: "Referência", label: "Referência" },
  { key: "Referência do Imóvel", label: "Referência do Imóvel" },
  { key: "Selecione uma das opções", label: "Selecione uma das opções" },
  { key: "Selecione uma das opções.1", label: "Selecione uma das opções.1" },
  { key: "Status do Lead:", label: "Status do Lead:" },
  { key: "Tem restrição?", label: "Tem restrição?" },
  { key: "Valor total da Oportunidade no CRM (última atualização)", label: "Valor total da Oportunidade no CRM (última atualização)" },
  { key: "Você deseja um imóvel para:", label: "Você deseja um imóvel para:" },
] as const

const FIELD_OPTIONS = [
  ...RD_FIELDS,
  { key: "__ignore__", label: "Ignorar campo" },
] as const

const FIELD_ALIASES: Record<(typeof FIELD_DEFINITIONS)[number]["key"], string[]> = {
  full_name: ["nome", "name", "full_name", "cliente", "lead", "contato"],
  email: ["email", "e-mail", "mail"],
  phone: ["telefone", "celular", "fone", "phone", "mobile", "whatsapp"],
  company: ["empresa", "company", "imobiliaria", "organização", "organizacao"],
  city: ["cidade", "city", "localidade"],
  stage: ["status", "etapa", "stage", "funil", "pipeline"],
  owner_name: ["responsavel", "responsável", "corretor", "owner", "vendedor"],
  campaign: ["campanha", "campaign", "origem", "source", "utm_campaign"],
}

const RD_FIELD_ALIASES: Record<string, string[]> = {
  ...FIELD_ALIASES,
  Email: ["Email", "email", "e-mail"],
  Nome: ["Nome", "nome", "name"],
  Telefone: ["Telefone", "telefone"],
  Celular: ["Celular", "celular", "mobile", "whatsapp"],
  Facebook: ["Facebook"],
  Twitter: ["Twitter"],
  Linkedin: ["Linkedin", "LinkedIn"],
  Website: ["Website", "site"],
  Cargo: ["Cargo", "função", "funcao"],
  Empresa: ["Empresa", "company"],
  País: ["País", "Pais", "pais"],
  Estado: ["Estado", "state"],
  Cidade: ["Cidade", "city"],
  Biografia: ["Biografia", "bio"],
  "Estágio no funil": ["Estágio no funil", "Estagio no funil", "stage", "status"],
  "Dono do Lead": ["Dono do Lead", "owner", "responsável", "responsavel"],
  "Data da última oportunidade": ["Data da última oportunidade", "Data da ultima oportunidade"],
  "Data da última venda": ["Data da última venda", "Data da ultima venda"],
  "Valor da última venda": ["Valor da última venda", "Valor da ultima venda"],
  "Lead Scoring - Perfil": ["Lead Scoring - Perfil"],
  "Lead Scoring - Interesse": ["Lead Scoring - Interesse"],
  "Status para comunicação por email": ["Status para comunicação por email", "Status para comunicacao por email"],
  Tags: ["Tags"],
  "URL pública": ["URL pública", "URL publica"],
  "Data de aniversário": ["Data de aniversário", "Data de aniversario"],
  "Base legal para comunicação": ["Base legal para comunicação", "Base legal para comunicacao"],
  "Total de conversões": ["Total de conversões", "Total de conversoes"],
  "Data da primeira conversão": ["Data da primeira conversão", "Data da primeira conversao"],
  "Origem da primeira conversão": ["Origem da primeira conversão", "Origem da primeira conversao"],
  "Data da última conversão": ["Data da última conversão", "Data da ultima conversao"],
  "Origem da última conversão": ["Origem da última conversão", "Origem da ultima conversao"],
  "Eventos (Últimos 100)": ["Eventos (Últimos 100)", "Eventos (Ultimos 100)"],
  "Aceitou a condição de entrada?": ["Aceitou a condição de entrada?", "Aceitou a condicao de entrada?"],
  "Aceitou o valor do imóvel?": ["Aceitou o valor do imóvel?", "Aceitou o valor do imovel?"],
  "Celular.1": ["Celular.1"],
  "Concordou com a renda familiar?": ["Concordou com a renda familiar?"],
  "CÓDIGO": ["CÓDIGO", "CODIGO", "codigo"],
  "Entrada de 310.000?": ["Entrada de 310.000?"],
  "Entrada de R$ 50 mil?": ["Entrada de R$ 50 mil?"],
  "Etapa do funil de vendas no CRM (última atualização)": ["Etapa do funil de vendas no CRM (última atualização)", "Etapa do funil de vendas no CRM (ultima atualizacao)"],
  "FeedBack Lead:": ["FeedBack Lead:", "Feedback Lead:"],
  "Funil de vendas no CRM (última atualização)": ["Funil de vendas no CRM (última atualização)", "Funil de vendas no CRM (ultima atualizacao)"],
  "Mot. de Descarte:": ["Mot. de Descarte:"],
  "Motivo de Perda no RD Station CRM": ["Motivo de Perda no RD Station CRM"],
  "Nome do responsável pela Oportunidade no CRM (última atualização)": ["Nome do responsável pela Oportunidade no CRM (última atualização)", "Nome do responsavel pela Oportunidade no CRM (ultima atualizacao)"],
  "O valor de R$ 2.950.000 está de acordo?": ["O valor de R$ 2.950.000 está de acordo?"],
  "O valor de R$ 4.800.000 está de acordo?": ["O valor de R$ 4.800.000 está de acordo?"],
  "O valor de R$ 850.000 está de acordo com que deseja investir?": ["O valor de R$ 850.000 está de acordo com que deseja investir?"],
  "O valor de R$ 950.000 está de acordo?": ["O valor de R$ 950.000 está de acordo?"],
  "Origem da Oportunidade no CRM (última atualização)": ["Origem da Oportunidade no CRM (última atualização)", "Origem da Oportunidade no CRM (ultima atualizacao)"],
  "Qual o valor você pretende investir?": ["Qual o valor você pretende investir?", "Qual o valor voce pretende investir?"],
  "Qualificação da Oportunidade no CRM (última atualização)": ["Qualificação da Oportunidade no CRM (última atualização)", "Qualificacao da Oportunidade no CRM (ultima atualizacao)"],
  "Quando pretende adquirir um imóvel?": ["Quando pretende adquirir um imóvel?", "Quando pretende adquirir um imovel?"],
  "Referência": ["Referência", "Referencia"],
  "Referência do Imóvel": ["Referência do Imóvel", "Referencia do Imovel"],
  "Selecione uma das opções": ["Selecione uma das opções", "Selecione uma das opcoes"],
  "Selecione uma das opções.1": ["Selecione uma das opções.1", "Selecione uma das opcoes.1"],
  "Status do Lead:": ["Status do Lead:"],
  "Tem restrição?": ["Tem restrição?", "Tem restricao?"],
  "Valor total da Oportunidade no CRM (última atualização)": ["Valor total da Oportunidade no CRM (última atualização)", "Valor total da Oportunidade no CRM (ultima atualizacao)"],
  "Você deseja um imóvel para:": ["Você deseja um imóvel para:", "Voce deseja um imovel para:"],
}

const SAMPLE_CSV = `nome,email,telefone,empresa,cidade,status,corretor,campanha
Ana Silva,ana@exemplo.com,(63) 99999-1111,Casa63,Palmas,Qualificado,Marcos,Meta Ads
Bruno Lima,bruno@exemplo.com,(63) 98888-2222,Central63,Araguaína,Contato inicial,Juliana,RD Station`

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
}

function tokenize(value: string) {
  return normalizeText(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
}

function stripTrailingDigitsFromTokens(value: string) {
  return normalizeText(value).replace(/\b([a-z]+[a-z0-9]*)\d+\b/g, "$1")
}

function extractNumericSignature(value: string) {
  const matches = normalizeText(value).match(/\d+/g) || []
  return matches.join("-")
}

function hasMoneyOrNumericContext(value: string) {
  const normalized = normalizeText(value)
  return /\d/.test(normalized) || normalized.includes("r$") || normalized.includes("valor") || normalized.includes("investir")
}

function inferFieldGroup(value: string) {
  const normalized = normalizeText(value)

  if (/nome|responsavel|responsável|dono|corretor|owner|vendedor/.test(normalized)) return "person"
  if (/email|e-mail|telefone|celular|fone|whatsapp|website|facebook|twitter|linkedin/.test(normalized)) return "contact"
  if (/cidade|estado|pais|país|localidade/.test(normalized)) return "location"
  if (/valor|preco|preço|investir|r\$|entrada/.test(normalized)) return "money"
  if (/data|aniversario|aniversário/.test(normalized)) return "date"
  if (/status|etapa|stage|funil|qualificacao|qualificação|descarte|perda/.test(normalized)) return "pipeline"
  if (/origem|fonte|campaign|campanha/.test(normalized)) return "source"
  if (/aceitou|concordou|restricao|restrição|deseja|pretende/.test(normalized)) return "decision"
  if (/referencia|referência|codigo|código/.test(normalized)) return "reference"

  return "generic"
}

function scoreMatch(sourceHeader: string, candidateKey: string, candidateLabel: string, aliases: string[]) {
  const source = normalizeText(sourceHeader)
  const sourceBase = stripTrailingDigitsFromTokens(sourceHeader)
  const sourceTokens = new Set(tokenize(sourceHeader))
  const sourceNumericSignature = extractNumericSignature(sourceHeader)
  const sourceHasNumericContext = hasMoneyOrNumericContext(sourceHeader)
  const sourceGroup = inferFieldGroup(sourceHeader)

  const candidates = [candidateKey, candidateLabel, ...aliases]
    .map((value) => normalizeText(value))
    .filter(Boolean)

  let bestScore = 0

  for (const candidate of candidates) {
    if (source === candidate) {
      bestScore = Math.max(bestScore, 100)
      continue
    }

    const candidateBase = stripTrailingDigitsFromTokens(candidate)

    if (sourceBase === candidateBase && sourceBase !== source) {
      bestScore = Math.max(bestScore, 98)
      continue
    }

    const candidateTokens = tokenize(candidate)
    const sharedTokens = candidateTokens.filter((token) => sourceTokens.has(token)).length
    const candidateNumericSignature = extractNumericSignature(candidate)
    const candidateHasNumericContext = hasMoneyOrNumericContext(candidate)
    const candidateGroup = inferFieldGroup(candidate)

    if (sourceGroup !== "generic" && candidateGroup !== "generic" && sourceGroup !== candidateGroup) {
      const strongSource = sourceGroup !== "decision" || sourceHasNumericContext || source.includes("?")
      const strongCandidate = candidateGroup !== "decision" || candidateHasNumericContext || candidate.includes("?")

      if (strongSource && strongCandidate) {
        bestScore = Math.max(bestScore, 0)
        continue
      }
    }

    if (sourceGroup === candidateGroup && sourceGroup !== "generic") {
      bestScore = Math.max(bestScore, 18)
    }

    if (sourceGroup === "money" && candidateGroup !== "money") {
      bestScore = Math.max(bestScore, 0)
      continue
    }

    if (sourceGroup === "person" && candidateGroup !== "person" && (source.includes("nome") || source.includes("respons"))) {
      bestScore = Math.max(bestScore, 0)
      continue
    }

    if (sourceHasNumericContext || candidateHasNumericContext) {
      if (sourceBase === candidateBase && sourceBase !== source) {
        bestScore = Math.max(bestScore, 98)
        continue
      }

      if (sourceNumericSignature !== candidateNumericSignature) {
        bestScore = Math.max(bestScore, 0)
        continue
      }
    }

    if (sourceNumericSignature || candidateNumericSignature) {
      if (sourceNumericSignature && candidateNumericSignature) {
        if (sourceNumericSignature === candidateNumericSignature) {
          bestScore = Math.max(bestScore, 96)
        } else {
          bestScore = Math.max(bestScore, 0)
          continue
        }
      } else if (sourceNumericSignature || candidateNumericSignature) {
        // When only one side carries numbers, avoid matching on generic numeric language.
        bestScore = Math.max(bestScore, 0)
      }
    }

    if (sourceNumericSignature && !candidateNumericSignature && !candidateBase.includes(sourceBase)) {
      bestScore = Math.min(bestScore, 18)
    }

    if (!sourceNumericSignature && candidateNumericSignature && !sourceBase.includes(candidateBase)) {
      bestScore = Math.min(bestScore, 18)
    }

    if (candidate && source.includes(candidate)) {
      bestScore = Math.max(bestScore, 80 + candidate.length / 100)
    }

    if (candidate && candidate.includes(source)) {
      bestScore = Math.max(bestScore, 78 + source.length / 100)
    }

    if (sharedTokens > 0) {
      const tokenScore = 40 + sharedTokens * 12 + candidateTokens.length * 0.5
      bestScore = Math.max(bestScore, tokenScore)
    }

    if (sourceHasNumericContext && candidateHasNumericContext && !sourceNumericSignature && !candidateNumericSignature) {
      bestScore = Math.max(bestScore, 60)
    }

    if (candidateTokens.some((token) => source.startsWith(token) || source.endsWith(token))) {
      bestScore = Math.max(bestScore, 55)
    }
  }

  return bestScore
}

function detectDelimiter(sampleLine: string) {
  const delimiters = [",", ";", "\t", "|"]
  return delimiters
    .map((delimiter) => ({ delimiter, score: sampleLine.split(delimiter).length }))
    .sort((left, right) => right.score - left.score)[0]?.delimiter || ","
}

function parseCsv(text: string) {
  const sanitizedText = text.replace(/^\uFEFF/, "").trim()
  if (!sanitizedText) {
    return { headers: [] as string[], rows: [] as ParsedRow[] }
  }

  const firstLine = sanitizedText.split(/\r?\n/)[0] || ""
  const delimiter = detectDelimiter(firstLine)

  const lines: string[][] = []
  let currentCell = ""
  let currentRow: string[] = []
  let insideQuotes = false

  for (let index = 0; index < sanitizedText.length; index += 1) {
    const char = sanitizedText[index]
    const nextChar = sanitizedText[index + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentCell += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
      continue
    }

    if (!insideQuotes && char === delimiter) {
      currentRow.push(currentCell.trim())
      currentCell = ""
      continue
    }

    if (!insideQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && nextChar === "\n") {
        index += 1
      }

      currentRow.push(currentCell.trim())
      if (currentRow.some((value) => value !== "")) {
        lines.push(currentRow)
      }
      currentRow = []
      currentCell = ""
      continue
    }

    currentCell += char
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((value) => value !== "")) {
      lines.push(currentRow)
    }
  }

  const rawHeaders = (lines.shift() || []).map((header) => header.replace(/^\uFEFF/, "").trim())
  const headerCounter = new Map<string, number>()
  const headers = rawHeaders.map((header, index) => {
    const base = header || `coluna_${index + 1}`
    const current = headerCounter.get(base) || 0
    headerCounter.set(base, current + 1)
    if (current === 0) return base
    return `${base}.${current}`
  })

  const rows = lines.map((row) => {
    const mappedRow: ParsedRow = {}
    headers.forEach((header, index) => {
      mappedRow[header] = row[index]?.trim() || ""
    })
    return mappedRow
  })

  return { headers, rows }
}

function getAutoMappingRows(headers: string[]) {
  const usedTargets = new Set<string>()

  return headers.map((header) => {
    const rankedFields = RD_FIELDS
      .map((field) => ({
        key: field.key,
        score: scoreMatch(header, field.key, field.label, RD_FIELD_ALIASES[field.key] || []),
      }))
      .filter((field) => !usedTargets.has(field.key))
      .sort((left, right) => right.score - left.score)

    const bestMatch = rankedFields[0]
    const targetField = bestMatch && bestMatch.score >= 55 ? bestMatch.key : "__ignore__"

    if (targetField !== "__ignore__") {
      usedTargets.add(targetField)
    }

    return {
      id: header,
      sourceHeader: header,
      targetField,
    } satisfies MappingRow
  })
}

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = "modelo-importacao-leads.csv"
  anchor.click()
  URL.revokeObjectURL(url)
}

function toCsvValue(value: unknown) {
  const text = String(value ?? "")
  const escaped = text.replace(/"/g, '""')
  return `"${escaped}"`
}

function downloadLeadsCsv(leads: ExportLeadRow[]) {
  if (!leads.length) return

  const dynamicHeaders = new Set<string>()
  leads.forEach((lead) => {
    Object.keys(lead || {}).forEach((key) => {
      if (key === "raw_data") return
      if (EXPORT_BASE_HEADERS.includes(key)) return
      dynamicHeaders.add(key)
    })

    Object.keys(lead.raw_data || {}).forEach((key) => {
      if (EXPORT_BASE_HEADERS.includes(key)) return
      dynamicHeaders.add(key)
    })
  })

  const orderedDynamicHeaders = Array.from(dynamicHeaders).sort((a, b) => a.localeCompare(b, "pt-BR"))
  const headers = [...EXPORT_BASE_HEADERS, ...orderedDynamicHeaders]

  const lines = [headers.map(toCsvValue).join(",")]

  leads.forEach((lead) => {
    const row = headers.map((key) => {
      if (key in lead) return lead[key]
      return lead.raw_data?.[key] ?? ""
    })

    lines.push(row.map(toCsvValue).join(","))
  })

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `leads-export-${new Date().toISOString().slice(0, 10)}.csv`
  anchor.click()
  URL.revokeObjectURL(url)
}

function downloadLeadsJson(leads: ExportLeadRow[]) {
  if (!leads.length) return

  const blob = new Blob([JSON.stringify(leads, null, 2)], { type: "application/json;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = `leads-export-${new Date().toISOString().slice(0, 10)}.json`
  anchor.click()
  URL.revokeObjectURL(url)
}

export default function ImportLeadsPage() {
  const router = useRouter()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"import" | "export">("import")
  const [sourceSystem, setSourceSystem] = useState("RD Station")
  const [sourceLabel, setSourceLabel] = useState("")
  const [csvFileName, setCsvFileName] = useState("")
  const [headers, setHeaders] = useState<string[]>([])
  const [rows, setRows] = useState<ParsedRow[]>([])
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([])
  const [isParsing, setIsParsing] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [exportQuery, setExportQuery] = useState("")
  const [exportCity, setExportCity] = useState("all")
  const [exportOwnerName, setExportOwnerName] = useState("all")
  const [exportStage, setExportStage] = useState("all")
  const [exportPipeline, setExportPipeline] = useState("all")
  const [exportLeadStatus, setExportLeadStatus] = useState("all")
  const [exportOpportunitySource, setExportOpportunitySource] = useState("all")
  const [exportStartDate, setExportStartDate] = useState("")
  const [exportEndDate, setExportEndDate] = useState("")
  const [exportLimit, setExportLimit] = useState("2000")
  const [exportFormat, setExportFormat] = useState<"csv" | "json">("csv")
  const [isLoadingExport, setIsLoadingExport] = useState(false)
  const [isLoadingFilterOptions, setIsLoadingFilterOptions] = useState(false)
  const [exportRows, setExportRows] = useState<ExportLeadRow[]>([])
  const [exportError, setExportError] = useState<string | null>(null)
  const [exportFilterOptions, setExportFilterOptions] = useState<ExportFilterOptions>({
    cityOptions: [],
    ownerOptions: [],
    stageOptions: [],
    pipelineOptions: [],
    leadStatusOptions: [],
    opportunitySourceOptions: [],
  })

  const previewExportRows = useMemo(() => exportRows.slice(0, 20), [exportRows])
  const activeExportFilterCount = useMemo(() => {
    const values = [
      exportQuery.trim(),
      exportCity !== "all" ? exportCity : "",
      exportOwnerName !== "all" ? exportOwnerName : "",
      exportStage !== "all" ? exportStage : "",
      exportPipeline !== "all" ? exportPipeline : "",
      exportLeadStatus !== "all" ? exportLeadStatus : "",
      exportOpportunitySource !== "all" ? exportOpportunitySource : "",
      exportStartDate,
      exportEndDate,
    ]

    return values.filter(Boolean).length
  }, [
    exportQuery,
    exportCity,
    exportOwnerName,
    exportStage,
    exportPipeline,
    exportLeadStatus,
    exportOpportunitySource,
    exportStartDate,
    exportEndDate,
  ])

  const mappedLeads = useMemo<LeadRow[]>(() => {
    const sourceToTarget = new Map(mappingRows.map((row) => [row.sourceHeader, row.targetField]))

    return rows
      .map((row) => {
        const lead: LeadRow = {
          full_name: "",
          email: "",
          phone: "",
          company: "",
          city: "",
          stage: "",
          owner_name: "",
          campaign: "",
          raw_data: row,
          mapped_fields: {},
        }

        const mappedFields: Record<string, string> = {}

        Object.entries(row).forEach(([sourceHeader, value]) => {
          const targetField = sourceToTarget.get(sourceHeader)
          const normalizedValue = value?.trim() || ""
          if (!targetField || targetField === "__ignore__" || !normalizedValue) return

          mappedFields[targetField] = mappedFields[targetField] || normalizedValue
          if (targetField in lead && !lead[targetField as keyof LeadRow]) {
            lead[targetField as keyof LeadRow] = normalizedValue as never
          }
        })

        lead.mapped_fields = mappedFields

        return lead
      })
      .filter((lead) => {
        if (lead.full_name || lead.email) return true
        return Object.values(lead.raw_data).some((value) => String(value ?? "").trim() !== "")
      })
  }, [mappingRows, rows])

  const validLeadCount = mappedLeads.length
  const invalidLeadCount = Math.max(rows.length - validLeadCount, 0)
  const previewRows = mappedLeads.slice(0, 6)
  const previewHeaders = headers
  const mappedCount = mappingRows.filter((row) => row.targetField !== "__ignore__").length
  const coverage = headers.length
    ? Math.round((mappedCount / headers.length) * 100)
    : 0
  const selectedTargets = new Map(
    mappingRows
      .filter((row) => row.targetField !== "__ignore__")
      .map((row) => [row.id, row.targetField])
  )

  useEffect(() => {
    if (activeTab !== "export") return
    if (exportFilterOptions.cityOptions.length > 0) return

    const loadFilterOptions = async () => {
      setIsLoadingFilterOptions(true)
      try {
        const response = await listExportFilterOptionsAction()
        if (!response.success) {
          throw new Error(response.error || "Não foi possível carregar os filtros.")
        }
        setExportFilterOptions(response.options)
      } catch (error: any) {
        toast.error(error.message || "Falha ao carregar opções de filtro.")
      } finally {
        setIsLoadingFilterOptions(false)
      }
    }

    void loadFilterOptions()
  }, [activeTab, exportFilterOptions.cityOptions.length])

  const resetFile = () => {
    setCsvFileName("")
    setHeaders([])
    setRows([])
    setMappingRows([])
    setResult(null)
    setErrorMessage(null)
  }

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsParsing(true)
    setErrorMessage(null)
    setResult(null)
    setCsvFileName(file.name)

    try {
      const text = await file.text()
      const parsed = parseCsv(text)

      if (!parsed.headers.length) {
        throw new Error("O CSV não contém cabeçalhos válidos.")
      }

      setHeaders(parsed.headers)
      setRows(parsed.rows)
      setMappingRows(getAutoMappingRows(parsed.headers))

      if (!parsed.rows.length) {
        throw new Error("Nenhuma linha de lead foi encontrada no arquivo.")
      }

      toast.success(`${parsed.rows.length} linhas carregadas para revisão.`)
    } catch (error: any) {
      resetFile()
      setErrorMessage(error.message || "Falha ao ler o CSV.")
    } finally {
      setIsParsing(false)
    }
  }

  const handleImport = async () => {
    if (!mappedLeads.length) {
      toast.error("Carregue e mapeie um arquivo CSV antes de importar.")
      return
    }

    setIsImporting(true)
    setErrorMessage(null)
    setResult(null)

    try {
      const leadsPayload = mappedLeads.map((lead) => ({
        full_name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        city: lead.city,
        stage: lead.stage,
        owner_name: lead.owner_name,
        campaign: lead.campaign,
        raw_data: lead.raw_data,
        mapped_fields: lead.mapped_fields,
      }))

      const encoder = new TextEncoder()
      const batches: typeof leadsPayload[] = []
      let currentBatch: typeof leadsPayload = []
      let currentBatchBytes = 0

      for (const lead of leadsPayload) {
        const leadBytes = encoder.encode(JSON.stringify(lead)).length

        if (leadBytes > MAX_IMPORT_BATCH_BYTES) {
          throw new Error("Existe uma linha do CSV grande demais para processar. Tente remover colunas muito extensas nessa linha.")
        }

        if (currentBatch.length > 0 && currentBatchBytes + leadBytes > MAX_IMPORT_BATCH_BYTES) {
          batches.push(currentBatch)
          currentBatch = [lead]
          currentBatchBytes = leadBytes
          continue
        }

        currentBatch.push(lead)
        currentBatchBytes += leadBytes
      }

      if (currentBatch.length > 0) {
        batches.push(currentBatch)
      }

      let totalImported = 0
      let totalProcessed = 0

      for (const batch of batches) {
        const response = await importLeadsAction({
          sourceSystem,
          sourceLabel: sourceLabel.trim() || undefined,
          leads: batch,
        })

        if (!response.success) {
          throw new Error(response.error || "Falha na importação.")
        }

        totalImported += response.importedCount || 0
        totalProcessed += response.totalCount || batch.length
      }

      const finalResult: ImportResult = {
        success: true,
        importedCount: totalImported,
        totalCount: totalProcessed,
      }

      setResult(finalResult)
      toast.success(`Importação concluída com ${totalImported} leads.`)
    } catch (error: any) {
      const message = error.message || "Não foi possível enviar os dados para o Supabase."
      setErrorMessage(message)
      toast.error(message)
    } finally {
      setIsImporting(false)
    }
  }

  const handleSearchForExport = async () => {
    setIsLoadingExport(true)
    setExportError(null)

    try {
      const parsedLimit = Number.parseInt(exportLimit, 10)
      const response = await listLeadsForExportAction({
        query: exportQuery.trim() || undefined,
        city: exportCity === "all" ? undefined : exportCity,
        ownerName: exportOwnerName === "all" ? undefined : exportOwnerName,
        stage: exportStage === "all" ? undefined : exportStage,
        pipeline: exportPipeline === "all" ? undefined : exportPipeline,
        leadStatus: exportLeadStatus === "all" ? undefined : exportLeadStatus,
        opportunitySource: exportOpportunitySource === "all" ? undefined : exportOpportunitySource,
        startDate: exportStartDate || undefined,
        endDate: exportEndDate || undefined,
        limit: Number.isNaN(parsedLimit) ? 2000 : parsedLimit,
      })

      if (!response.success) {
        throw new Error(response.error || "Não foi possível carregar os leads.")
      }

      setExportRows((response.leads || []) as ExportLeadRow[])
      toast.success(`${response.totalCount || 0} leads prontos para exportação.`)
    } catch (error: any) {
      const message = error.message || "Falha ao consultar leads para exportação."
      setExportError(message)
      toast.error(message)
    } finally {
      setIsLoadingExport(false)
    }
  }

  const handleResetExportFilters = () => {
    setExportQuery("")
    setExportCity("all")
    setExportOwnerName("all")
    setExportStage("all")
    setExportPipeline("all")
    setExportLeadStatus("all")
    setExportOpportunitySource("all")
    setExportStartDate("")
    setExportEndDate("")
  }

  const handleExportRows = (rowsToExport: ExportLeadRow[]) => {
    if (!rowsToExport.length) {
      toast.error("Nenhum lead disponível para exportação.")
      return
    }

    if (exportFormat === "json") {
      downloadLeadsJson(rowsToExport)
      return
    }

    downloadLeadsCsv(rowsToExport)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.10),_transparent_22%),linear-gradient(to_bottom,_rgba(248,250,252,0.98),_rgba(241,245,249,0.94))] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.14),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(16,185,129,0.10),_transparent_22%),linear-gradient(to_bottom,_rgba(9,12,20,0.96),_rgba(15,23,42,0.92))]">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        activeTab="import-leads"
        onTabChange={() => {}}
      />

      <main className="relative flex-1 flex flex-col h-full overflow-y-auto">
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -top-24 right-20 h-72 w-72 rounded-full bg-sky-400/20 blur-3xl" />
          <div className="absolute top-48 -left-16 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        </div>

        <header className="relative z-10 flex items-center justify-between border-b border-white/40 bg-white/55 px-6 py-4 shadow-[0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/40 dark:shadow-none">
          <div className="flex items-center gap-4 text-foreground">
            <button className="rounded-xl p-2 text-muted-foreground hover:bg-black/5 lg:hidden dark:hover:bg-white/5" onClick={() => setSidebarOpen(true)}>
              <Menu />
            </button>
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-500 text-white shadow-lg shadow-sky-500/20">
              <FileSpreadsheet size={18} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Importação de Leads</p>
              <h1 className="text-2xl font-black tracking-tight">CSV para Supabase</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={downloadSampleCsv}
              className="rounded-full border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
            >
              <FileUp className="mr-2 h-4 w-4" /> Modelo CSV
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.refresh()}
              title="Atualizar"
              className="rounded-full border-white/60 bg-white/70 backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
            >
              <RefreshCw size={16} />
            </Button>
          </div>
        </header>

        <div className="relative z-10 mx-auto w-full max-w-7xl space-y-6 p-4 pb-10 lg:p-8">
          <div className="rounded-[1.4rem] border border-white/50 bg-white/65 p-2 shadow-[0_12px_35px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => setActiveTab("import")}
                className={cn(
                  "h-11 rounded-xl border font-bold",
                  activeTab === "import"
                    ? "border-sky-500/25 bg-sky-600 text-white hover:bg-sky-700"
                    : "border-white/60 bg-white/70 text-foreground hover:bg-white dark:border-white/10 dark:bg-white/5"
                )}
              >
                Importar Leads
              </Button>
              <Button
                type="button"
                onClick={() => setActiveTab("export")}
                className={cn(
                  "h-11 rounded-xl border font-bold",
                  activeTab === "export"
                    ? "border-emerald-500/25 bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border-white/60 bg-white/70 text-foreground hover:bg-white dark:border-white/10 dark:bg-white/5"
                )}
              >
                Filtrar e Exportar
              </Button>
            </div>
          </div>

          {activeTab === "import" && (
            <>
              <section className="relative overflow-hidden rounded-[2rem] border border-white/50 bg-white/60 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
            <div className="pointer-events-none absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)", backgroundSize: "18px 18px" }} />
            <div className="relative grid gap-6 p-6 lg:grid-cols-[1.3fr_0.9fr] lg:p-8">
              <div className="space-y-5">
                <Badge className="w-fit rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-sky-700 dark:text-sky-300">
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Fluxo compatível com RD Station e outros canais
                </Badge>
                <div className="max-w-3xl space-y-3">
                  <h2 className="text-3xl font-black tracking-tight text-foreground lg:text-5xl">
                    Importe seus leads por CSV e grave direto no Supabase.
                  </h2>
                  <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground lg:text-base">
                    O arquivo é validado no navegador, mapeado campo a campo e enviado para uma tabela própria no banco.
                    Isso permite receber bases exportadas do RD Station, Meta Ads, Google Ads ou qualquer outro canal que entregue CSV.
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs font-semibold text-foreground/70">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> Controle via RLS e action do servidor
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                    <Database className="h-3.5 w-3.5 text-sky-500" /> Guarda o CSV bruto para auditoria
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/50 px-4 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                    <ArrowRight className="h-3.5 w-3.5 text-violet-500" /> Prévia antes de gravar
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1.75rem] border border-white/50 bg-white/55 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Arquivo</p>
                  <p className="mt-2 truncate text-2xl font-black tracking-tight">{csvFileName || "Nenhum CSV"}</p>
                </div>
                <div className="rounded-[1.75rem] border border-white/50 bg-white/55 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Cobertura</p>
                  <p className="mt-2 text-2xl font-black tracking-tight">{coverage}%</p>
                </div>
                <div className="rounded-[1.75rem] border border-white/50 bg-white/55 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Linhas válidas</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">{validLeadCount}</p>
                </div>
                <div className="rounded-[1.75rem] border border-white/50 bg-white/55 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground">Ignoradas</p>
                  <p className="mt-2 text-2xl font-black tracking-tight text-amber-600 dark:text-amber-400">{invalidLeadCount}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/50 bg-white/65 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Entrada</p>
                    <h3 className="mt-1 text-xl font-black tracking-tight">Carregar arquivo CSV</h3>
                  </div>
                  <Button variant="outline" size="sm" onClick={resetFile} className="rounded-full border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                    Limpar
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Canal de origem</Label>
                    <Select value={sourceSystem} onValueChange={setSourceSystem}>
                      <SelectTrigger className="h-12 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                        <SelectValue placeholder="Selecione a origem" />
                      </SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Etiqueta da importação</Label>
                    <Input
                      value={sourceLabel}
                      onChange={(event) => setSourceLabel(event.target.value)}
                      placeholder="Ex: Base RD Mês 04"
                      className="h-12 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    />
                  </div>

                  <label className={cn(
                    "group flex cursor-pointer items-center justify-between gap-4 rounded-[1.75rem] border border-dashed border-sky-400/40 bg-gradient-to-br from-sky-500/8 to-emerald-500/8 p-5 transition-all",
                    "hover:border-sky-400/70 hover:from-sky-500/12 hover:to-emerald-500/12"
                  )}>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-sm dark:border-white/10 dark:bg-white/5">
                        {isParsing ? <Loader2 className="h-5 w-5 animate-spin text-sky-500" /> : <UploadCloud className="h-5 w-5 text-sky-500" />}
                      </div>
                      <div>
                        <p className="font-black tracking-tight text-foreground">Selecione ou arraste o CSV</p>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Aceita exportações de RD Station e planilhas com cabeçalho na primeira linha.</p>
                      </div>
                    </div>
                    <div className="rounded-full border border-white/60 bg-white/70 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-foreground/70 dark:border-white/10 dark:bg-white/5">
                      CSV
                    </div>
                    <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
                  </label>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Button
                      className="h-12 rounded-2xl bg-sky-600 font-bold text-white shadow-lg shadow-sky-600/25 hover:bg-sky-700"
                      onClick={handleImport}
                      disabled={isImporting || isParsing || !mappedLeads.length}
                    >
                      {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      Importar para o Supabase
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 rounded-2xl border-white/60 bg-white/70 font-bold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                      onClick={downloadSampleCsv}
                    >
                      <FileUp className="mr-2 h-4 w-4" /> Baixar modelo
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/50 bg-white/65 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Mapeamento</p>
                    <h3 className="mt-1 text-xl font-black tracking-tight">Mapeie cada coluna do CSV</h3>
                  </div>
                  <Badge className="rounded-full border border-white/50 bg-black/[0.04] px-3 py-1.5 text-foreground dark:border-white/10 dark:bg-white/5">
                    {coverage}% pronto
                  </Badge>
                </div>

                {headers.length > 0 ? (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                      <span className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                        {mappingRows.length} colunas detectadas
                      </span>
                      <span className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                        Mapeamento ilimitado por arquivo
                      </span>
                    </div>

                    <div className="rounded-[1.5rem] border border-white/60 bg-white/55 dark:border-white/10 dark:bg-white/5">
                      <div className="max-h-[28rem] overflow-auto">
                        <table className="min-w-full border-separate border-spacing-0 text-sm">
                          <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-slate-950/90">
                            <tr>
                              <th className="border-b border-white/60 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground dark:border-white/10">Coluna do CSV</th>
                              <th className="border-b border-white/60 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground dark:border-white/10">Destino</th>
                              <th className="border-b border-white/60 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground dark:border-white/10">Exemplo</th>
                            </tr>
                          </thead>
                          <tbody>
                            {mappingRows.map((row, index) => (
                              <tr key={row.id} className={cn(index % 2 === 0 ? "bg-black/[0.015] dark:bg-white/[0.02]" : "bg-transparent")}>
                                <td className="border-b border-white/50 px-4 py-3 align-top font-semibold text-foreground dark:border-white/10">
                                  <div className="max-w-[22rem] truncate">{row.sourceHeader}</div>
                                </td>
                                <td className="border-b border-white/50 px-4 py-3 align-top dark:border-white/10">
                                  <Select
                                    value={row.targetField}
                                    onValueChange={(value) => {
                                      if (value !== "__ignore__") {
                                        const duplicateRow = mappingRows.find((item) => item.id !== row.id && item.targetField === value)
                                        if (duplicateRow) {
                                          toast.error(`O destino ${value} já está sendo usado por outra coluna.`)
                                          return
                                        }
                                      }

                                      setMappingRows((current) => current.map((item) => item.id === row.id ? { ...item, targetField: value } : item))
                                    }}
                                  >
                                    <SelectTrigger className="h-11 w-full rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                                      <SelectValue placeholder="Selecionar destino" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {FIELD_OPTIONS.map((option) => (
                                        <SelectItem
                                          key={option.key}
                                          value={option.key}
                                          disabled={option.key !== "__ignore__" && selectedTargets.get(row.id) !== option.key && mappingRows.some((item) => item.id !== row.id && item.targetField === option.key)}
                                        >
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </td>
                                <td className="border-b border-white/50 px-4 py-3 align-top text-muted-foreground dark:border-white/10">
                                  <div className="max-w-[22rem] truncate">{rows[0]?.[row.sourceHeader] || "-"}</div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs leading-relaxed text-muted-foreground">
                        Cada linha corresponde a uma coluna real do CSV. Você pode mapear quantas colunas quiser, sem limite fixo.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                        onClick={() => setMappingRows(getAutoMappingRows(headers))}
                      >
                        Auto mapear
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.5rem] border border-dashed border-white/60 bg-white/50 p-6 text-sm leading-relaxed text-muted-foreground dark:border-white/10 dark:bg-white/5">
                    Faça upload do CSV para liberar o mapeamento automático.
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className="rounded-[2rem] border border-white/50 bg-white/65 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-5 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Prévia</p>
                    <h3 className="mt-1 text-xl font-black tracking-tight">Leads prontos para importação</h3>
                  </div>
                  <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">
                    {validLeadCount} registros
                  </Badge>
                </div>

                <div className="mb-4 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-muted-foreground">
                  <span className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                    {previewHeaders.length} colunas no CSV
                  </span>
                  <span className="rounded-full border border-white/60 bg-white/50 px-3 py-1.5 dark:border-white/10 dark:bg-white/5">
                    Visualização horizontal liberada
                  </span>
                </div>

                {errorMessage && (
                  <div className="mb-5 flex items-start gap-3 rounded-[1.5rem] border border-amber-400/30 bg-amber-50/80 p-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                {result?.success && (
                  <div className="mb-5 flex items-start gap-3 rounded-[1.5rem] border border-emerald-400/30 bg-emerald-50/80 p-4 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">
                      Importação concluída. {result.importedCount || 0} leads foram enviados para a tabela <span className="font-black">lead_imports</span>.
                    </p>
                  </div>
                )}

                <div className="overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/55 dark:border-white/10 dark:bg-white/5">
                  <div className="max-h-[32rem] overflow-auto">
                    <table className="min-w-max w-full border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-slate-950/90">
                        <tr>
                          {previewHeaders.map((header) => (
                            <th key={header} className="border-b border-white/60 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap dark:border-white/10">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.length > 0 ? (
                          previewRows.map((lead, index) => (
                            <tr key={`${lead.full_name || lead.email || index}`} className={cn(index % 2 === 0 ? "bg-black/[0.015] dark:bg-white/[0.02]" : "bg-transparent")}>
                              {previewHeaders.map((header) => (
                                <td key={`${index}-${header}`} className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">
                                  {lead.raw_data[header] || "-"}
                                </td>
                              ))}
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={Math.max(previewHeaders.length, 1)} className="px-4 py-12 text-center text-muted-foreground">
                              Envie o CSV para ver a prévia dos leads.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/50 bg-white/65 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10 text-violet-600 dark:text-violet-300">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Persistência</p>
                    <h3 className="text-lg font-black tracking-tight">Como os dados entram no banco</h3>
                  </div>
                </div>

                <ul className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                  <li className="rounded-[1.25rem] border border-white/60 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    O CSV é lido no navegador, com detecção de delimitador e mapeamento automático dos cabeçalhos.
                  </li>
                  <li className="rounded-[1.25rem] border border-white/60 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    A gravação acontece via server action, usando a service role do Supabase para não expor credenciais no client.
                  </li>
                  <li className="rounded-[1.25rem] border border-white/60 bg-white/50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                    O dado bruto do CSV fica salvo em JSON para futuras reimportações, auditoria e ajustes de mapeamento.
                  </li>
                </ul>
              </div>
            </div>
          </section>
            </>
          )}

          {activeTab === "export" && (
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-white/50 bg-white/65 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Exportação</p>
                    <h3 className="mt-1 text-xl font-black tracking-tight">Filtre os leads da tabela rd_station_leads</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-700 dark:text-emerald-300">
                      {exportRows.length} resultados
                    </Badge>
                    <Badge className="rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1.5 text-sky-700 dark:text-sky-300">
                      {activeExportFilterCount} filtros ativos
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Busca</Label>
                    <Input
                      value={exportQuery}
                      onChange={(event) => setExportQuery(event.target.value)}
                      placeholder="Nome, email, telefone, cidade, referência..."
                      className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Cidade</Label>
                    <Select value={exportCity} onValueChange={setExportCity}>
                      <SelectTrigger className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {exportFilterOptions.cityOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Responsável</Label>
                    <Select value={exportOwnerName} onValueChange={setExportOwnerName}>
                      <SelectTrigger className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {exportFilterOptions.ownerOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Etapa/Funil</Label>
                    <Select value={exportStage} onValueChange={setExportStage}>
                      <SelectTrigger className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {exportFilterOptions.stageOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Funil CRM</Label>
                    <Select value={exportPipeline} onValueChange={setExportPipeline}>
                      <SelectTrigger className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {exportFilterOptions.pipelineOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Status do Lead</Label>
                    <Select value={exportLeadStatus} onValueChange={setExportLeadStatus}>
                      <SelectTrigger className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                        <SelectValue placeholder="Todos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {exportFilterOptions.leadStatusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Origem da Oportunidade</Label>
                    <Select value={exportOpportunitySource} onValueChange={setExportOpportunitySource}>
                      <SelectTrigger className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                        <SelectValue placeholder="Todas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        {exportFilterOptions.opportunitySourceOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Data inicial</Label>
                    <Input
                      type="date"
                      value={exportStartDate}
                      onChange={(event) => setExportStartDate(event.target.value)}
                      className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Data final</Label>
                    <Input
                      type="date"
                      value={exportEndDate}
                      onChange={(event) => setExportEndDate(event.target.value)}
                      className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Limite de linhas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10000}
                      value={exportLimit}
                      onChange={(event) => setExportLimit(event.target.value)}
                      className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    />
                  </div>
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <Button
                    className="h-11 rounded-2xl bg-emerald-600 font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700"
                    onClick={handleSearchForExport}
                    disabled={isLoadingExport || isLoadingFilterOptions}
                  >
                    {isLoadingExport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Buscar no Supabase
                  </Button>

                  <Select value={exportFormat} onValueChange={(value) => setExportFormat(value as "csv" | "json")}>
                    <SelectTrigger className="h-11 w-[180px] rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                      <SelectValue placeholder="Formato" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                      <SelectItem value="json">JSON (.json)</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl border-white/60 bg-white/70 font-bold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    onClick={() => handleExportRows(exportRows)}
                    disabled={!exportRows.length}
                  >
                    <FileUp className="mr-2 h-4 w-4" /> Exportar todos
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl border-white/60 bg-white/70 font-bold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    onClick={() => handleExportRows(previewExportRows)}
                    disabled={!previewExportRows.length}
                  >
                    <FileUp className="mr-2 h-4 w-4" /> Exportar prévia (20)
                  </Button>

                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl border-white/60 bg-white/70 font-semibold backdrop-blur-xl dark:border-white/10 dark:bg-white/5"
                    onClick={handleResetExportFilters}
                  >
                    Limpar filtros
                  </Button>
                </div>

                {exportError && (
                  <div className="mt-5 flex items-start gap-3 rounded-[1.5rem] border border-amber-400/30 bg-amber-50/80 p-4 text-amber-900 dark:bg-amber-500/10 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p className="text-sm font-medium leading-relaxed">{exportError}</p>
                  </div>
                )}
              </div>

              <div className="rounded-[2rem] border border-white/50 bg-white/65 p-6 shadow-[0_16px_50px_rgba(15,23,42,0.08)] backdrop-blur-2xl dark:border-white/10 dark:bg-white/[0.04]">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">Prévia da Exportação</p>
                    <h3 className="mt-1 text-xl font-black tracking-tight">Resultados filtrados</h3>
                  </div>
                  <Badge className="rounded-full border border-white/50 bg-black/[0.04] px-3 py-1.5 text-foreground dark:border-white/10 dark:bg-white/5">
                    Mostrando {Math.min(exportRows.length, 20)} de {exportRows.length}
                  </Badge>
                </div>

                <div className="overflow-hidden rounded-[1.5rem] border border-white/60 bg-white/55 dark:border-white/10 dark:bg-white/5">
                  <div className="max-h-[32rem] overflow-auto hidden md:block">
                    <table className="min-w-max w-full border-separate border-spacing-0 text-sm">
                      <thead className="sticky top-0 z-10 bg-white/90 backdrop-blur-xl dark:bg-slate-950/90">
                        <tr>
                          {EXPORT_BASE_HEADERS.map((header) => (
                            <th key={header} className="border-b border-white/60 px-4 py-3 text-left text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground whitespace-nowrap dark:border-white/10">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {exportRows.length > 0 ? (
                          previewExportRows.map((lead, index) => (
                            <tr key={`${lead.id}-${index}`} className={cn(index % 2 === 0 ? "bg-black/[0.015] dark:bg-white/[0.02]" : "bg-transparent")}>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Nome"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Email"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Telefone"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Celular"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Empresa"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Cidade"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Estágio no funil"] ?? lead["Etapa do funil de vendas no CRM (última atualização)"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Dono do Lead"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Tags"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead["Referência"] ?? "-")}</td>
                              <td className="border-b border-white/50 px-4 py-3 text-muted-foreground whitespace-nowrap dark:border-white/10">{String(lead.imported_at ?? "-")}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={EXPORT_BASE_HEADERS.length} className="px-4 py-12 text-center text-muted-foreground">
                              Use os filtros e clique em "Buscar no Supabase" para gerar a exportação.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 p-3 md:hidden">
                    {previewExportRows.length > 0 ? (
                      previewExportRows.map((lead, index) => (
                        <article key={`${lead.id}-card-${index}`} className="rounded-2xl border border-white/60 bg-white/75 p-4 dark:border-white/10 dark:bg-white/5">
                          <p className="text-sm font-black tracking-tight text-foreground">{String(lead["Nome"] ?? "Sem nome")}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{String(lead["Email"] ?? "-")}</p>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <span>Cidade: {String(lead["Cidade"] ?? "-")}</span>
                            <span>Status: {String(lead["Status do Lead:"] ?? "-")}</span>
                            <span>Responsável: {String(lead["Dono do Lead"] ?? "-")}</span>
                            <span>Funil: {String(lead["Funil de vendas no CRM (última atualização)"] ?? "-")}</span>
                          </div>
                        </article>
                      ))
                    ) : (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        Use os filtros e clique em "Buscar no Supabase" para visualizar os leads.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  )
}