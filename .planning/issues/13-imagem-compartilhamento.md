---
titulo: "Imagem de compartilhamento (Open Graph) por parlamentar"
rotulos: ["funcionalidade", "interface"]
---
## Contexto
Compartilhar o perfil no WhatsApp mostra só o título. Uma imagem com foto, nome e números do ano
aumenta muito o alcance.

## O que fazer
- `opengraph-image.tsx` em `src/app/parlamentar/[casa]/[id]/` (Next.js `ImageResponse`) com foto, nome,
  partido-UF, presença, votos e gastos do ano (da tabela `estatistica`).
- Texto neutro, só números, com a data.

## Pronto quando
- Colar o link no WhatsApp/Telegram mostra a imagem.
