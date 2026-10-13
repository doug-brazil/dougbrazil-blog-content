// Valida o frontmatter e regras de SEO de todo o conteúdo contra os mesmos schemas
// do src/content.config.ts do site (dougbrazil-blog-foundation). Se mudar lá, muda aqui.
//
// ATENÇÃO: Mantenha este arquivo em sincronia com src/content.config.ts do site.
// Não importe o arquivo do site em runtime: no CI deste repo o site não existe (é privado).
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, relative, basename } from 'node:path';
import yaml from 'js-yaml';
import { z } from 'zod';

// ---------- Limite de tamanho para assets commitados ----------
// Prints e diagramas pequenos: OK no repo. Acima disso: vai pro R2.
const MAX_ASSET_KB = 500;

// Categorias oficiais do blog (sincronizadas com src/data/categories.ts do site - "mudou aqui, muda lá")
const VALID_CATEGORIES = [
    'cloud',
    'kubernetes-plataforma',
    'sre-confiabilidade',
    'observabilidade',
    'iac-automacao',
    'ci-cd',
    'seguranca-devsecops',
    'carreira-comunidade',
];

// ---------- Schemas (espelho de src/content.config.ts) ----------
const schemas = {
    posts: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        author: z.string(), // slug do membro
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        canonical: z.string().optional(), // override do canonical (caminho ou URL), ex: '/manifesto/'
        category: z.string().refine((val) => VALID_CATEGORIES.includes(val), {
            message: `categoria inválida. Categorias permitidas: ${VALID_CATEGORIES.join(', ')}`,
        }).optional(),
        featured: z.boolean().default(false),
    }),
    events: z.object({
        title: z.string(),
        eventDate: z.coerce.date(),
        location: z.string(),
        description: z.string().optional(), // meta description / JSON-LD; se ausente, é gerada
        format: z.enum(['presencial', 'online', 'híbrido']).default('online'),
        link: z.string().url().optional(),
        endDate: z.coerce.date().optional(),
        venue: z.string().optional(), // nome do local (ex: Centro de Convenções)
        address: z.string().optional(), // logradouro/endereço
        status: z.enum(['agendado', 'cancelado', 'adiado', 'online']).optional(),
        partner: z.string().optional(),
        flag: z.enum(['apoio', 'presenca']).optional(),
        cover: z.string().url().optional(),
        gallery: z.array(z.string().url()).default([]),
    }),
    jobs: z.object({
        title: z.string(),
        company: z.string(),
        location: z.string(),
        level: z.string().optional(),
        salary: z.string().optional(),
        link: z.string().url(),
        postedAt: z.coerce.date(),
        expiresAt: z.coerce.date().optional(),
    }),
    members: z.object({
        name: z.string(),
        role: z.string(), // ex: Fundador, Community Lead, Membro
        capability: z.string().optional(), // obsoleto: mantido por compatibilidade, substituído por topics
        topics: z.array(z.string().refine((val) => VALID_CATEGORIES.includes(val), {
            message: `tópico inválido. Deve ser uma categoria do blog: ${VALID_CATEGORIES.join(', ')}`,
        })).max(3).optional(),
        pillar: z.enum(['conexao', 'conhecimento', 'acessibilidade']).optional(),
        isLead: z.boolean().default(false),
        avatar: z.string().optional(), // caminho em /public ou URL
        linkedin: z.string().url().optional(),
        github: z.string().url().optional(),
        instagram: z.string().url().optional(),
        order: z.number().default(99),
    }),
    pillars: z.object({
        title: z.string(),
        order: z.number(),
        accent: z.enum(['green', 'yellow', 'blue']),
    }),
};

const collections = Object.keys(schemas);
const errors = [];
const warnings = [];

// Coleções para validação cruzada de SEO
const parsedPosts = [];   // { rel, data }
const parsedEvents = [];  // { rel, data }
const parsedMembers = []; // { rel, data, slug }
const memberSlugs = new Set();

// Regex para detecção de mojibake (UTF-8 duplamente codificado / corrompido)
const MOJIBAKE_REGEX = /Ã[\u0080-\u00bf]|Â[\u0080-\u00bf]|â€/;

// Títulos fixos das páginas do site para evitar colisão com slugs/títulos do conteúdo
const FIXED_PAGE_TITLES = [
    'Blog',
    'Eventos',
    'Vagas',
    'Membros',
    'Manifesto',
    'Página não encontrada',
];

// ---------- Helpers ----------
function* walk(dir) {
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        if (statSync(full).isDirectory()) yield* walk(full);
        else yield full;
    }
}

function toPosix(path) {
    return path.split('\\').join('/');
}

function extractFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    return match ? match[1] : null;
}

// ---------- 1) Leitura, encoding e validação de schema ----------
for (const collection of collections) {
    const dir = join(process.cwd(), collection);
    if (!existsSync(dir)) continue;

    for (const file of walk(dir)) {
        const rel = toPosix(relative(process.cwd(), file));

        // 1a) Arquivos que não são .md (imagens etc.): limite de tamanho
        if (!file.endsWith('.md')) {
            const sizeKB = statSync(file).size / 1024;
            if (sizeKB > MAX_ASSET_KB) {
                errors.push(
                    `${rel}: ${Math.round(sizeKB)}KB passa do limite de ${MAX_ASSET_KB}KB. ` +
                    `Otimize a imagem ou suba no R2 (assets.doug.knov.work) e use a URL.`
                );
            }
            continue;
        }

        const raw = readFileSync(file, 'utf8');

        // 1b) Verificação de encoding corrompido (mojibake)
        const lines = raw.split(/\r?\n/);
        lines.forEach((line, idx) => {
            if (MOJIBAKE_REGEX.test(line)) {
                errors.push(
                    `${rel}:${idx + 1}: encoding quebrado (mojibake) no trecho "${line.trim()}". ` +
                    `Dica: salve o arquivo em UTF-8.`
                );
            }
        });

        // 1c) Frontmatter e parsing YAML
        const fm = extractFrontmatter(raw);
        if (fm === null) {
            errors.push(`${rel}: frontmatter ausente (o arquivo precisa começar com ---)`);
            continue;
        }

        let data;
        try {
            data = yaml.load(fm);
        } catch (e) {
            errors.push(`${rel}: YAML inválido — ${e.message}`);
            continue;
        }

        // 1d) Schema Zod
        const result = schemas[collection].safeParse(data);
        if (!result.success) {
            for (const issue of result.error.issues) {
                errors.push(`${rel}: campo "${issue.path.join('.')}" — ${issue.message}`);
            }
            continue;
        }

        // Salva dados validados para regras cruzadas de SEO
        const parsed = result.data;
        if (collection === 'posts') parsedPosts.push({ rel, data: parsed });
        else if (collection === 'events') parsedEvents.push({ rel, data: parsed });
        else if (collection === 'members') {
            const slug = basename(file, '.md');
            memberSlugs.add(slug);
            parsedMembers.push({ rel, data: parsed, slug });
        }

        // 1e) Imagens referenciadas no corpo
        const refs = raw.matchAll(/!\[[^\]]*\]\(([^)\s]+)[^)]*\)/g);
        for (const [, ref] of refs) {
            if (ref.startsWith('http://') || ref.startsWith('https://')) continue; // R2/externa: ok
            if (ref.startsWith('/')) continue; // /public do site: não dá pra validar aqui
            if (!existsSync(join(dirname(file), ref))) {
                errors.push(`${rel}: imagem "${ref}" não encontrada (caminho relativo ao post)`);
            }
        }
    }
}

// ---------- 2) Regras de SEO (Erros) ----------

// 2a) Título repetido (posts indexáveis, events, members e páginas fixas)
const titleMap = new Map(); // normalizedTitle -> { title, origin }

for (const fixed of FIXED_PAGE_TITLES) {
    const norm = fixed.trim().toLowerCase();
    titleMap.set(norm, { title: fixed, origin: `página fixa "${fixed}" do site` });
}

for (const { rel, data } of parsedPosts) {
    if (data.draft) continue;
    const title = data.title;
    const norm = title.trim().toLowerCase();
    if (titleMap.has(norm)) {
        const prev = titleMap.get(norm);
        errors.push(`Título repetido: "${title}" em ${rel} colide com ${prev.origin}`);
    } else {
        titleMap.set(norm, { title, origin: rel });
    }
}

for (const { rel, data } of parsedEvents) {
    const title = data.title;
    const norm = title.trim().toLowerCase();
    if (titleMap.has(norm)) {
        const prev = titleMap.get(norm);
        errors.push(`Título repetido: "${title}" em ${rel} colide com ${prev.origin}`);
    } else {
        titleMap.set(norm, { title, origin: rel });
    }
}

for (const { rel, data } of parsedMembers) {
    const title = data.name;
    const norm = title.trim().toLowerCase();
    if (titleMap.has(norm)) {
        const prev = titleMap.get(norm);
        errors.push(`Título repetido: "${title}" em ${rel} colide com ${prev.origin}`);
    } else {
        titleMap.set(norm, { title, origin: rel });
    }
}

// 2b) Descrição repetida (posts.description e events.description quando preenchida)
const descMap = new Map(); // normalizedDesc -> { desc, origin }

for (const { rel, data } of parsedPosts) {
    if (data.description) {
        const desc = data.description;
        const norm = desc.trim().toLowerCase();
        if (descMap.has(norm)) {
            const prev = descMap.get(norm);
            errors.push(`Descrição repetida: "${desc}" em ${rel} colide com ${prev.origin}`);
        } else {
            descMap.set(norm, { desc, origin: rel });
        }
    }
}

for (const { rel, data } of parsedEvents) {
    if (data.description) {
        const desc = data.description;
        const norm = desc.trim().toLowerCase();
        if (descMap.has(norm)) {
            const prev = descMap.get(norm);
            errors.push(`Descrição repetida: "${desc}" em ${rel} colide com ${prev.origin}`);
        } else {
            descMap.set(norm, { desc, origin: rel });
        }
    }
}

// 2c) Autor inexistente (posts.author precisa existir em members/)
for (const { rel, data } of parsedPosts) {
    if (!memberSlugs.has(data.author)) {
        errors.push(
            `${rel}: autor "${data.author}" não encontrado em members/ (esperado members/${data.author}.md)`
        );
    }
}

// ---------- 3) Regras de SEO (Avisos) ----------

// 3a) Comprimento de meta description (ideal 50–160 caracteres)
for (const { rel, data } of parsedPosts) {
    if (data.description) {
        const len = data.description.length;
        if (len < 50 || len > 160) {
            warnings.push(
                `${rel}: descrição com ${len} caracteres (ideal entre 50 e 160 caracteres para SEO)`
            );
        }
    }
}

for (const { rel, data } of parsedEvents) {
    if (data.description) {
        const len = data.description.length;
        if (len < 50 || len > 160) {
            warnings.push(
                `${rel}: descrição com ${len} caracteres (ideal entre 50 e 160 caracteres para SEO)`
            );
        }
    }
}

// 3b) Evento presencial ou híbrido sem address
for (const { rel, data } of parsedEvents) {
    if (['presencial', 'híbrido'].includes(data.format) && !data.address) {
        warnings.push(
            `${rel}: evento ${data.format} sem "address". O Google recomenda endereço completo para rich results de eventos.`
        );
    }
}

// 3c) Evento futuro com link apontando para página institucional do LinkedIn
const now = new Date();
for (const { rel, data } of parsedEvents) {
    const isFuture = new Date(data.eventDate) >= now;
    if (isFuture && data.link && /linkedin\.com\/company\//i.test(data.link)) {
        warnings.push(
            `${rel}: link aponta para página institucional do LinkedIn (${data.link}) em vez de link específico de inscrição do evento.`
        );
    }
}

// ---------- 4) Resultado ----------
console.log('valida: verificando conteúdo e SEO técnico...');

if (warnings.length > 0) {
    console.warn(`\n⚠️  ${warnings.length} aviso(s) (não impedem o merge, mas vale revisar):\n`);
    for (const w of warnings) console.warn(`  • ${w}`);
}

if (errors.length > 0) {
    console.error(`\n❌ ${errors.length} erro(s) encontrado(s):\n`);
    for (const e of errors) console.error(`  • ${e}`);
    console.error(`\nResumo: ${errors.length} erro(s), ${warnings.length} aviso(s).\n`);
    process.exit(1);
}

console.log(`\n✅ Conteúdo válido! (0 erros, ${warnings.length} aviso(s))\n`);