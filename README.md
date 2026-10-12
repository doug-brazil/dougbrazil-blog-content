# DOUG BR — Conteúdo

Este repositório guarda **todo o conteúdo** do site da DOUG BR (DevOps User
Group Brazil): posts, eventos, vagas, membros e pilares. O site é gerado a
partir daqui automaticamente — você não precisa saber programar nem rodar o
site localmente para contribuir.

**O fluxo resumido:** clone → branch → escreve → valida → PR → merge →
o site atualiza sozinho em alguns minutos. 🚀

---

## Estrutura

```
├── posts/       ← artigos do blog
├── events/      ← encontros, meetups, lives
├── jobs/        ← vagas da comunidade
├── members/     ← pessoas da comunidade (leads, fundadores)
├── pillars/     ← os 3 pilares da comunidade (não mexer sem alinhamento)
├── validate.mjs ← validador que roda no CI (e localmente)
└── .github/     ← workflows e templates
```

## Como contribuir (passo a passo)

### 1. Clone o repositório

```bash
git clone git@github.com:gaamaro/dougbr-content.git
cd dougbr-content
```

### 2. Instale as dependências (só na primeira vez)

Precisa de [Node.js](https://nodejs.org) 18+ instalado:

```bash
npm install
```

### 3. Crie uma branch

Nunca commite direto na `main` — ela é protegida. Crie uma branch
descritiva:

```bash
git checkout -b post/meu-primeiro-post
# exemplos: post/..., evento/..., vaga/..., perfil/seu-nome
```

### 4. Escreva o conteúdo

Crie o arquivo `.md` na pasta certa, seguindo os templates da seção
[Formatos de frontmatter](#formatos-de-frontmatter) abaixo. O corpo do
arquivo aceita **Markdown completo**: títulos, listas, código, imagens,
links.

### 5. Valide localmente

```bash
node validate.mjs
```

Se aparecer `✅ Conteúdo válido!`, pode seguir. Se aparecer erro, ele diz
**exatamente** o arquivo, o campo e o motivo — corrige e roda de novo.

### 6. Commit, push e PR

```bash
git add .
git commit -m "post: título do meu post"
git push -u origin post/meu-primeiro-post

gh pr create --title "post: título do meu post" --body "Descrição curta do que está sendo adicionado."
```

&gt; Sem o [GitHub CLI](https://cli.github.com) (`gh`)? Pode abrir o PR pela
&gt; interface web — o GitHub mostra um banner "Compare & pull request" logo
&gt; após o push.

### 7. Revisão e merge

- A Action **valida** roda automaticamente no seu PR — se ficar vermelha,
  clique nela para ver o erro, corrija e dê push na mesma branch
- Um maintainer revisa e aprova
- Após o merge, o **deploy do site dispara sozinho** — seu conteúdo entra
  no ar em alguns minutos

### 8. Limpeza (depois do merge)

```bash
git checkout main
git pull
git branch -d post/meu-primeiro-post
```

---

## Formatos de frontmatter

Todo arquivo `.md` começa com um bloco `---` de metadados. Copie o template
correspondente e preencha:

### Post (`posts/`)

```yaml
---
title: "Título do post"
description: "Resumo de uma ou duas frases (50 a 160 caracteres, aparece nos cards e no SEO)."
pubDate: 2026-10-15
author: "seu-slug-de-member"   # o nome do seu arquivo em members/, sem .md (obrigatório existir)
category: "kubernetes-plataforma" # opcional — veja lista abaixo (padrão: carreira-comunidade)
featured: false                # opcional — se true, ganha destaque no topo da listagem
tags: ["kubernetes", "ci-cd"]
draft: false                   # true = não publica (útil pra rascunho em PR)
canonical: "/manifesto/"       # opcional — override de URL canônica quando aplicável
---
```

**Categorias disponíveis para `category`:**
- `cloud`: Cloud (Arquitetura, migração e computação em nuvem)
- `kubernetes-plataforma`: Kubernetes e plataforma (Containers e engenharia de plataforma)
- `sre-confiabilidade`: SRE e confiabilidade (SLOs, resiliência e gestão de incidentes)
- `observabilidade`: Observabilidade (Métricas, logs e tracing distribuído)
- `iac-automacao`: IaC e automação (Terraform, infraestrutura como código)
- `ci-cd`: CI/CD (Pipelines e entrega contínua)
- `seguranca-devsecops`: Segurança (DevSecOps, segurança em pipelines)
- `carreira-comunidade`: Carreira e comunidade (Cultura, liderança e comunidade)

Se `category` não for preenchida, o post é classificado automaticamente como `carreira-comunidade`.


### Evento (`events/`)

Exemplo com todos os campos (obrigatórios e opcionais):

```yaml
---
title: "DOUG BR #12 — Observabilidade na prática"
eventDate: 2026-11-20T19:00:00-03:00  # data e horário de início
endDate: 2026-11-20T22:00:00-03:00    # opcional — término do evento
location: "Campinas/SP"               # cidade/UF ou "Online"
venue: "Campus Tech Campinas"         # opcional — nome do local físico
address: "Av. Paulista, 1000, Bela Vista, São Paulo - SP" # opcional — endereço completo (recomendado para presencial/híbrido)
format: "híbrido"                     # online | presencial | híbrido
status: "agendado"                    # opcional — agendado | cancelado | adiado | online
description: "Meetup sobre tracing distribuído, OpenTelemetry e métricas em produção." # opcional — se omitido, o site gera
link: "https://sympla.com.br/..."     # link da página de inscrição/detalhes
partner: "AWS UG Piracicaba"          # opcional — organizador parceiro
flag: "apoio"                         # opcional — apoio | presenca (selo de destaque)
cover: "https://..."                  # opcional — logo do evento no R2
gallery:                              # opcional — fotos pós-evento no R2
  - "https://..."
---
```

Lembrando:
- `address`: para eventos **presenciais** ou **híbridos**, preencha sempre o endereço completo para que o Google exiba rich results (cards de eventos na busca).
- `link`: prefira o link direto de inscrição (Sympla, Meetup, Eventbrite) em vez da página institucional da empresa no LinkedIn.
- `flag`: exibe selo no card (`apoio` = "Apoio DOUG BR", `presenca` = "Estaremos lá").
- `cover` e `gallery`: imagens hospedadas no bucket R2. Veja a seção de imagens abaixo.

### Vaga (`jobs/`)

```yaml
---
title: "Pessoa SRE Plena"
company: "Empresa X"
location: "Remoto"
level: "Pleno"                 # opcional
salary: "R$ 12k–16k"           # opcional
link: "https://..."            # link da candidatura
postedAt: 2026-10-01
expiresAt: 2026-11-01          # opcional — vaga sai do ar depois
---
```

### Membro (`members/`)

```yaml
---
name: "Seu Nome"
role: "Community Lead"         # Fundador | Community Lead | Membro
topics:                        # temas de referência (máx 3 slugs de categorias do blog)
  - observabilidade
  - cloud
pillar: "conhecimento"         # opcional: conexao | conhecimento | acessibilidade
isLead: true
avatar: "https://assets.doug.knov.work/members/seu-nome.png"  # veja seção de imagens
linkedin: "https://www.linkedin.com/in/..."
github: "https://github.com/..."      # opcional
instagram: "https://instagram.com/..." # opcional
order: 10                      # ordem de exibição (menor = aparece antes)
# capability: "..."            # OBSOLETO: mantido por compatibilidade legada; use 'topics'
---
```

O **corpo** do arquivo do membro vira a bio na página de perfil — escreva à
vontade em Markdown.

&gt; **Lideranças de referência por temas e pilares:**
&gt; - `topics`: lista de categorias do blog (máximo 3) em que a pessoa atua como referência técnica para a comunidade.
&gt; - `pillar`: pilar da comunidade ao qual o lead está diretamente ligado (`conexao`, `conhecimento` ou `acessibilidade`).
&gt; - `capability`: campo **obsoleto**, mantido por compatibilidade com versões anteriores. Use `topics` no lugar dele.

---

## Imagens e arquivos pesados

**Imagens do post** (prints de terminal, diagramas, screenshots): commitam
junto com o post, na mesma pasta, e referencia com caminho relativo:

```
posts/
└── meu-post/
    ├── index.md
    └── diagrama.png   →  no markdown: ![Diagrama](./diagrama.png)
```

Regras:

- **Até 500KB por imagem** — o CI falha o PR se passar disso. Otimize antes
  ([squoosh.app](https://squoosh.app) ou similar) ou suba no R2.
- **Galerias de eventos, PDFs, slides, vídeos e avatares**: não commitar.
  Esses vão para o nosso bucket R2 em `https://assets.doug.knov.work` —
  mencione no PR que precisa de upload e um maintainer sobe e te passa a URL
  para referenciar no markdown.
- Imagens referenciadas com caminho relativo **precisam existir** no PR —
  o CI valida isso automaticamente.

---

## Regras de validação e SEO (o que o CI cobra)

O script `node validate.mjs` roda em todo PR e durante o deploy do site para garantir qualidade técnica e consistência de SEO:

### ❌ Erros que barram o PR (o CI falha se encontrar):
1. **Título repetido:** o título do seu post, evento ou nome de membro não pode ser idêntico a outro já existente, nem colidir com páginas fixas do site (`Blog`, `Eventos`, `Vagas`, `Membros`, `Manifesto`, `Página não encontrada`).
2. **Descrição repetida:** `description` de posts e eventos não podem ser idênticas entre si.
3. **Encoding quebrado (mojibake):** o arquivo precisa estar codificado em **UTF-8 sem BOM**. Caracteres corrompidos (como `Ã©`, `Ã¡`, `â€`) quebram a validação.
4. **Autor inexistente:** o campo `author` no post precisa corresponder ao slug de um membro existente em `members/` (ex: `author: "gabriel"` exige `members/gabriel.md`).
5. **Frontmatter/Schema inválido:** campos obrigatórios faltando ou com formato incorreto.

### ⚠️ Avisos de qualidade (aparecem no log, mas não bloqueiam o merge):
- **Tamanho da descrição:** o ideal para a meta description no Google é ter entre **50 e 160 caracteres**.
- **Endereço do evento (`address`):** eventos presenciais ou híbridos com endereço completo ganham destaque (rich results) na busca do Google.
- **Link de inscrição:** para eventos futuros, prefira links diretos de inscrição (Sympla, Meetup, Eventbrite) em vez de links institucionais da página do LinkedIn.

---

## FAQ

**Preciso rodar o site pra ver como ficou?**
Não. Se o `node validate.mjs` passar e o PR ficar verde, o site gera a
página corretamente. Se quiser preview visual, fale com um maintainer.

**Como edito algo que já publiquei?**
Mesmo fluxo: branch → edita o arquivo → PR → merge.

**Meu PR ficou vermelho, e agora?**
Clique no check **valida** na página do PR — o log mostra o arquivo e o
campo com problema. Corrija, commite na mesma branch e dê push; o PR
atualiza sozinho.

**Posso commitar na main?**
Não — a branch é protegida e o push será recusado. Todo conteúdo entra via
PR (isso garante que nada quebre o site).

---

Dúvidas? Abra uma
[Discussion](https://github.com/gaamaro/dougbr-content/discussions) ou fale
com os leads no nosso canal. 💛💚