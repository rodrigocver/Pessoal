# Sua primeira contribuição

Um passo a passo para quem nunca contribuiu com o Fiscaliza (ou com projeto aberto nenhum). Tudo acontece no
navegador: não é preciso instalar nada no computador. Leva uns 10 minutos até você ver o site rodando.

## 1. Abra o ambiente pronto

1. Entre (ou crie uma conta grátis) em https://github.com.
2. Na página do projeto, clique em **Code → Codespaces → Create codespace**, ou use o link direto:
   https://codespaces.new/rodrigocver/fiscaliza
3. Espere uns 3 minutos. Um editor (VS Code) abre no navegador, com tudo instalado: o banco de dados, as
   bibliotecas e **dados de exemplo** (quatro parlamentares fictícios: Ana Souza, Beto Lima, Carla Dias e Davi
   Rocha, com votações e gastos de 2025).

O GitHub oferece horas gratuitas de Codespaces por mês. Quando terminar, feche a aba: o ambiente para sozinho
e pode ser retomado depois em https://github.com/codespaces.

## 2. Veja o site funcionando

No **Terminal** do editor (menu ☰ → Terminal → New Terminal), rode:

```bash
npm run dev
```

Clique em **Open in Browser** no aviso que aparece (ou na aba **Portas**, porta 3000). Busque "Ana", abra o perfil
e navegue pelas abas. Para entrar com uma conta de teste, clique em **Entrar**, digite qualquer e-mail e copie o
link que aparece no terminal.

Quer dados reais? `npm run ingest` baixa o ano atual das fontes oficiais (uns 3 minutos; depois
`npm run exemplo -- --forcar` volta ao exemplo).

## 3. Escolha uma tarefa

Abra as [issues com o rótulo "boa primeira issue"](https://github.com/rodrigocver/fiscaliza/issues?q=is%3Aopen+label%3A%22boa+primeira+issue%22).
Cada uma diz o contexto, os arquivos a mexer e quando está pronta. Comente "vou fazer esta" para ninguém
trabalhar em dobro, e pergunte lá mesmo se algo não estiver claro.

Antes de começar, leia os **princípios** no [CONTRIBUTING.md](../CONTRIBUTING.md): só dados oficiais,
neutralidade (sem adjetivos nem rankings) e toda métrica explicada.

## 4. Faça a mudança

- O código do site fica em `src/app/` (páginas) e `src/components/` (pedaços de tela).
- As consultas e os cálculos ficam em `src/lib/consultas.ts`; as definições, em `docs/METRICAS.md`.
- Salve o arquivo e o site no navegador se atualiza sozinho.
- Mapa completo em [ARQUITETURA.md](ARQUITETURA.md).

## 5. Confira

No terminal (pode abrir um segundo, pelo **+**, para deixar o site rodando no primeiro):

```bash
npm run format      # arruma a formatação
npm run verificar   # lint, tipos e testes (para na primeira falha)
```

Mudou um cálculo? Ajuste o cenário em `tests/integracao/dados.ts` e os valores esperados. Corrigiu um erro?
Inclua um teste que falhava antes.

## 6. Envie

Na barra lateral, abra **Controle do Código-Fonte** (ícone de ramificação):

1. Escreva uma mensagem curta em português, ex.: "Busca: ignorar acentos no nome completo".
2. Clique em **Commit** e depois em **Publish Branch** (o editor cria a sua cópia do projeto, um *fork*, se
   precisar).
3. Clique em **Create Pull Request**. Na descrição, diga qual issue resolve ("Resolve #12") e como testou.

O CI roda todos os testes no seu pull request. Alguém do projeto revisa, comenta se precisar de ajuste, e junta
ao projeto. Pronto: sua primeira contribuição!

## Dúvidas comuns

- **O site não abre:** confira se `npm run dev` está rodando no terminal e use a porta 3000 na aba Portas.
- **"O banco já tem N parlamentares":** você já carregou dados; `npm run exemplo -- --forcar` troca pelo exemplo.
- **Prefere o seu computador?** Instale Node.js 22 e Docker e siga a seção "Rodando localmente" do
  [README](../README.md). Com o VS Code e a extensão Dev Containers, o mesmo ambiente do Codespaces sobe sozinho.
