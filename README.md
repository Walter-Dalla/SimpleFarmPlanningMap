# Mapa da Chácara

Ferramenta 2D para mapear e planejar uma propriedade agrícola de **50m × 40m** (~2000m²).
Abre direto no navegador via `file://`, sem instalação ou build.

---

## Motivação

Precisava de um software simples para mapear as melhorias que quero fazer no meu terreno de chácara. Tudo que encontrei era pago, complexo, ou não atendia pelo excesso de funcionalidades desnecessárias. Resolvi fazer algo que me ajuda de verdade.

Deixo aqui como open source para quem tiver a mesma necessidade.

> Este projeto não é portfólio, não tem pretensão de ser grandioso — é só uma ferramenta simples e funcional.

---

## Como usar

Abra `mapa_chacara.html` no Chrome ou Firefox. Nenhum servidor necessário.

> **Nota:** o auto-carregamento de `chacara.json` na inicialização requer um servidor HTTP local (ex: `python -m http.server 8080`). Abrir via `file://` funciona normalmente para todas as outras funcionalidades; os dados são restaurados do `localStorage`.

---

## Grade

- Cada célula = **30cm × 30cm** (real)
- Tamanho padrão: **167 × 133 células** = 50,1m × 39,9m
- Bordas rotuladas: Rua Adolfo Germano Rogge (frente), Vizinho Campo de Futebol (fundo), Rua Nalim Sobrinho (esq.), Vizinho Chiquinho (dir.)
- Altere colunas/linhas no painel lateral → **Aplicar**

---

## Ferramentas

| Tecla | Ação |
|-------|------|
| `S` | Selecionar / mover polígonos |
| `D` | Desenhar novo polígono |
| `P` ou `Espaço` | Mover mapa (pan) |
| `Scroll` | Zoom (cursor fixo) |
| `Del` | Apagar polígono selecionado |
| `Esc` | Cancelar desenho / deselecionar |
| `Ctrl+S` | Salvar arquivo |

---

## Desenhar um polígono

1. Pressione `D` ou clique **Desenhar**
2. Clique para adicionar vértices (snappado na grade)
3. Feche com **duplo-clique** ou clicando perto do primeiro vértice (círculo laranja aparece)
4. Polígono criado → painel lateral abre para editar

---

## Propriedades do polígono

Cada polígono possui:

| Campo | Opções |
|-------|--------|
| **Nome** | Texto livre (aparece no mapa) |
| **Categoria** | Construção, Árvore, Árvore Frutífera, Plantio |
| **Status** | Existe (linha sólida), Projeto (tracejado largo), Em construção (tracejado fino) |
| **Camada** | Atual (sólido) ou Futuro (preenchimento transparente + tracejado) |
| **Cor** | Color picker |
| **Descrição** | Texto livre (notas, dimensões, materiais) |

---

## Camadas Atual / Futuro

Botões na barra superior:

- **Ambos** — mostra tudo
- **Atual** — oculta polígonos futuros
- **Futuro** — oculta polígonos atuais

Polígonos marcados como **Futuro** renderizam com preenchimento transparente e borda tracejada.

---

## Foto de satélite

1. Clique **Satélite** (barra ou painel)
2. Selecione PNG, JPG, WEBP ou qualquer formato de imagem
3. A imagem é esticada sobre toda a grade
4. Ajuste a **opacidade** no painel lateral
5. Marque/desmarque **Visível** para toggle rápido

A imagem é salva em base64 dentro do `chacara.json`.

---

## Salvar e carregar

### Automático
- Ao iniciar, o app tenta carregar `chacara.json` da mesma pasta (funciona em servidor HTTP)
- Se não encontrar, restaura o último estado do `localStorage` silenciosamente
- Após cada alteração, salva automaticamente no `localStorage` (~800ms de debounce)
- No Chrome/Edge: ao usar **Salvar** pela primeira vez, escolha o arquivo → próximas alterações salvam automaticamente nele

### Manual
- **Salvar** (`Ctrl+S`) — exporta `chacara.json`
- **Carregar** — abre um `.json` salvo anteriormente

### Formato chacara.json
```json
{
  "version": 1,
  "gridCols": 167,
  "gridRows": 133,
  "polygons": [...],
  "satellite": {
    "dataUrl": "data:image/png;base64,...",
    "opacity": 0.5,
    "visible": true
  },
  "savedAt": "2026-06-05T..."
}
```

---

## Estrutura de arquivos

```
ChacaraMapa/
├── mapa_chacara.html       ← HTML + referências aos scripts
├── css/
│   └── style.css           ← estilos da interface
├── js/
│   ├── state.js            ← constantes e objeto de estado global
│   ├── coords.js           ← canvas, transformações de coordenadas, zoom, pan
│   ├── render.js           ← todas as funções de desenho (canvas 2D)
│   ├── hitTest.js          ← detecção de clique em formas
│   ├── shapes.js           ← CRUD de polígonos e círculos
│   ├── merge.js            ← algoritmo de união de polígonos (Greiner-Hormann)
│   ├── tools.js            ← gerenciamento de ferramentas ativas
│   ├── sidebar.js          ← painel lateral, legenda, grade
│   ├── satellite.js        ← carregamento/remoção de foto de satélite
│   ├── persistence.js      ← salvar/carregar JSON, localStorage, autosave
│   ├── events.js           ← listeners de mouse e teclado
│   └── main.js             ← inicialização
├── chacara.json            ← dados salvos (gerado pelo app)
└── README.md               ← este arquivo
```

Sem dependências externas. Sem Node.js. Sem build.
