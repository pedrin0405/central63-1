-- Lead imports from CSV sources such as RD Station

CREATE TABLE IF NOT EXISTS public.lead_imports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    source_system TEXT NOT NULL,
    source_label TEXT,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    company TEXT,
    city TEXT,
    stage TEXT,
    owner_name TEXT,
    campaign TEXT,
    status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'processado', 'erro')),
    row_hash TEXT NOT NULL UNIQUE,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    imported_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    imported_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lead_imports_source_system_idx ON public.lead_imports (source_system);
CREATE INDEX IF NOT EXISTS lead_imports_email_idx ON public.lead_imports (email);
CREATE INDEX IF NOT EXISTS lead_imports_imported_at_idx ON public.lead_imports (imported_at DESC);

ALTER TABLE public.lead_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lead imports are viewable by internal users" ON public.lead_imports;
DROP POLICY IF EXISTS "Lead imports can be created by internal users" ON public.lead_imports;
DROP POLICY IF EXISTS "Lead imports can be deleted by admins" ON public.lead_imports;

CREATE POLICY "Lead imports are viewable by internal users"
ON public.lead_imports FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('Admin', 'Gestor', 'Diretor', 'Marketing', 'Secretária', 'Secretaria')
    )
);

CREATE POLICY "Lead imports can be created by internal users"
ON public.lead_imports FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('Admin', 'Gestor', 'Diretor', 'Marketing', 'Secretária', 'Secretaria')
    )
);

CREATE POLICY "Lead imports can be deleted by admins"
ON public.lead_imports FOR DELETE
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('Admin', 'Gestor', 'Diretor')
    )
);

-- Full RD Station CSV schema support

CREATE TABLE IF NOT EXISTS public.rd_station_leads (
    "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    "row_hash" TEXT UNIQUE NOT NULL,
    raw_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    "Email" TEXT,
    "Nome" TEXT,
    "Telefone" TEXT,
    "Celular" TEXT,
    "Facebook" TEXT,
    "Twitter" TEXT,
    "Linkedin" TEXT,
    "Website" TEXT,
    "Cargo" TEXT,
    "Empresa" TEXT,
    "País" TEXT,
    "Estado" TEXT,
    "Cidade" TEXT,
    "Biografia" TEXT,
    "Estágio no funil" TEXT,
    "Dono do Lead" TEXT,
    "Data da última oportunidade" TEXT,
    "Data da última venda" TEXT,
    "Valor da última venda" TEXT,
    "Lead Scoring - Perfil" TEXT,
    "Lead Scoring - Interesse" INTEGER,
    "Status para comunicação por email" BOOLEAN,
    "Tags" TEXT,
    "URL pública" TEXT,
    "Data de aniversário" TEXT,
    "Base legal para comunicação" TEXT,
    "Total de conversões" INTEGER,
    "Data da primeira conversão" TEXT,
    "Origem da primeira conversão" TEXT,
    "Data da última conversão" TEXT,
    "Origem da última conversão" TEXT,
    "Eventos (Últimos 100)" TEXT,
    "Aceitou a condição de entrada?" TEXT,
    "Aceitou o valor do imóvel?" TEXT,
    "Celular.1" TEXT,
    "Concordou com a renda familiar?" TEXT,
    "CÓDIGO" TEXT,
    "Entrada de 310.000?" TEXT,
    "Entrada de R$ 50 mil?" TEXT,
    "Etapa do funil de vendas no CRM (última atualização)" TEXT,
    "FeedBack Lead:" TEXT,
    "Funil de vendas no CRM (última atualização)" TEXT,
    "Mot. de Descarte:" TEXT,
    "Motivo de Perda no RD Station CRM" TEXT,
    "Nome do responsável pela Oportunidade no CRM (última atualização)" TEXT,
    "O valor de R$ 2.950.000 está de acordo?" TEXT,
    "O valor de R$ 4.800.000 está de acordo?" TEXT,
    "O valor de R$ 850.000 está de acordo com que deseja investir?" TEXT,
    "O valor de R$ 950.000 está de acordo?" TEXT,
    "Origem da Oportunidade no CRM (última atualização)" TEXT,
    "Qual o valor você pretende investir?" TEXT,
    "Qualificação da Oportunidade no CRM (última atualização)" TEXT,
    "Quando pretende adquirir um imóvel?" TEXT,
    "Referência" TEXT,
    "Referência do Imóvel" TEXT,
    "Selecione uma das opções" TEXT,
    "Selecione uma das opções.1" TEXT,
    "Status do Lead:" TEXT,
    "Tem restrição?" TEXT,
    "Valor total da Oportunidade no CRM (última atualização)" TEXT,
    "Você deseja um imóvel para:" TEXT
);

    DO $$
    DECLARE
        legacy_column TEXT;
    BEGIN
        legacy_column := 'Nome do responsÃ¡vel pela Oportunidade no CRM (Ãºltima atualizaÃ§Ã£o)';

        IF EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'rd_station_leads'
              AND column_name = legacy_column
        ) AND NOT EXISTS (
            SELECT 1
            FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'rd_station_leads'
              AND column_name = 'Nome do responsável pela Oportunidade no CRM (última atualização)'
        ) THEN
            EXECUTE format(
                'ALTER TABLE public.rd_station_leads RENAME COLUMN %I TO %I',
                legacy_column,
                'Nome do responsável pela Oportunidade no CRM (última atualização)'
            );
        END IF;
    END
    $$;

ALTER TABLE public.rd_station_leads ADD COLUMN IF NOT EXISTS "row_hash" TEXT;
ALTER TABLE public.rd_station_leads ADD COLUMN IF NOT EXISTS raw_data JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.rd_station_leads ADD COLUMN IF NOT EXISTS "Nome do responsável pela Oportunidade no CRM (última atualização)" TEXT;
ALTER TABLE public.rd_station_leads ADD COLUMN IF NOT EXISTS imported_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'rd_station_leads_row_hash_key'
    ) THEN
        ALTER TABLE public.rd_station_leads
        ADD CONSTRAINT rd_station_leads_row_hash_key UNIQUE ("row_hash");
    END IF;
END $$;

ALTER TABLE public.rd_station_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "RD Station leads view policy" ON public.rd_station_leads;
DROP POLICY IF EXISTS "RD Station leads insert policy" ON public.rd_station_leads;

CREATE POLICY "RD Station leads view policy"
ON public.rd_station_leads FOR SELECT
USING (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('Admin', 'Gestor', 'Diretor', 'Marketing', 'Secretária', 'Secretaria')
    )
);

CREATE POLICY "RD Station leads insert policy"
ON public.rd_station_leads FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = auth.uid()
        AND role IN ('Admin', 'Gestor', 'Diretor', 'Marketing', 'Secretária', 'Secretaria')
    )
);