// Curated catalog of recommended videos per subject, channel and topic.
// Items without video_id are resolved on click via resolveYoutubeVideo.

export type CatalogItem = {
  subject: string;
  topic: string;
  channel: string;
  title: string;
  search_query: string;
};

export const VIDEO_CATALOG: CatalogItem[] = [
  // ===================== Matemática =====================
  // Professor Ferretto
  { subject: "Matemática", topic: "Funções", channel: "Professor Ferretto", title: "Função do 1º grau — aula completa", search_query: "função do 1 grau aula completa Professor Ferretto" },
  { subject: "Matemática", topic: "Funções", channel: "Professor Ferretto", title: "Função do 2º grau — vértice e raízes", search_query: "função do 2 grau vértice raízes Professor Ferretto" },
  { subject: "Matemática", topic: "Trigonometria", channel: "Professor Ferretto", title: "Trigonometria no triângulo retângulo", search_query: "trigonometria triângulo retângulo Professor Ferretto" },
  { subject: "Matemática", topic: "Geometria", channel: "Professor Ferretto", title: "Geometria plana — áreas", search_query: "geometria plana áreas Professor Ferretto" },
  // Matemática Rio (Procopio)
  { subject: "Matemática", topic: "Porcentagem", channel: "Matemática Rio", title: "Porcentagem — do básico ao avançado", search_query: "porcentagem aula completa Matemática Rio Procopio" },
  { subject: "Matemática", topic: "Regra de Três", channel: "Matemática Rio", title: "Regra de três simples e composta", search_query: "regra de três simples composta Matemática Rio" },
  { subject: "Matemática", topic: "Probabilidade", channel: "Matemática Rio", title: "Probabilidade — conceitos iniciais", search_query: "probabilidade aula Matemática Rio" },
  // Sandro Curió
  { subject: "Matemática", topic: "Combinatória", channel: "Sandro Curió", title: "Análise combinatória — princípios", search_query: "análise combinatória Sandro Curió" },
  { subject: "Matemática", topic: "Lógica", channel: "Sandro Curió", title: "Raciocínio lógico — questões resolvidas", search_query: "raciocínio lógico Sandro Curió" },

  // ===================== Física =====================
  { subject: "Física", topic: "Cinemática", channel: "Física Total", title: "MRU e MRUV — aula completa", search_query: "MRU MRUV aula completa Física Total" },
  { subject: "Física", topic: "Dinâmica", channel: "Física Total", title: "Leis de Newton", search_query: "leis de Newton Física Total" },
  { subject: "Física", topic: "Energia", channel: "Física Total", title: "Trabalho e energia mecânica", search_query: "trabalho energia mecânica Física Total" },
  { subject: "Física", topic: "Eletricidade", channel: "Professor Boaro", title: "Circuitos elétricos — Lei de Ohm", search_query: "circuitos elétricos lei de Ohm Professor Boaro" },
  { subject: "Física", topic: "Óptica", channel: "Professor Boaro", title: "Óptica geométrica — espelhos e lentes", search_query: "óptica geométrica espelhos lentes Professor Boaro" },
  { subject: "Física", topic: "Ondulatória", channel: "Professor Boaro", title: "Ondas — conceitos e equação", search_query: "ondas equação Professor Boaro" },

  // ===================== Química =====================
  { subject: "Química", topic: "Atomística", channel: "Marcelão da Química", title: "Modelos atômicos e distribuição eletrônica", search_query: "modelos atômicos distribuição eletrônica Marcelão da Química" },
  { subject: "Química", topic: "Estequiometria", channel: "Marcelão da Química", title: "Cálculo estequiométrico passo a passo", search_query: "cálculo estequiométrico Marcelão da Química" },
  { subject: "Química", topic: "Soluções", channel: "Café com Química", title: "Soluções — concentração e diluição", search_query: "soluções concentração diluição Café com Química" },
  { subject: "Química", topic: "Termoquímica", channel: "Café com Química", title: "Termoquímica — entalpia", search_query: "termoquímica entalpia Café com Química" },
  { subject: "Química", topic: "Orgânica", channel: "Monstrão da Química", title: "Funções orgânicas — nomenclatura", search_query: "funções orgânicas nomenclatura Monstrão da Química" },
  { subject: "Química", topic: "Inorgânica", channel: "Monstrão da Química", title: "Ácidos, bases, sais e óxidos", search_query: "ácidos bases sais óxidos Monstrão da Química" },

  // ===================== Biologia =====================
  { subject: "Biologia", topic: "Citologia", channel: "Biologia Total", title: "Célula — organelas e funções", search_query: "célula organelas Biologia Total Paulo Jubilut" },
  { subject: "Biologia", topic: "Genética", channel: "Biologia Total", title: "Genética — 1ª lei de Mendel", search_query: "primeira lei de Mendel Biologia Total" },
  { subject: "Biologia", topic: "Ecologia", channel: "Guilherme Goulart", title: "Ecologia — cadeias e teias alimentares", search_query: "ecologia cadeias teias alimentares Guilherme Goulart" },
  { subject: "Biologia", topic: "Evolução", channel: "Guilherme Goulart", title: "Evolução — Darwin e Lamarck", search_query: "evolução Darwin Lamarck Guilherme Goulart" },
  { subject: "Biologia", topic: "Fisiologia", channel: "Samuel Cunha", title: "Sistema cardiovascular humano", search_query: "sistema cardiovascular Samuel Cunha biologia" },
  { subject: "Biologia", topic: "Botânica", channel: "Samuel Cunha", title: "Botânica — grupos vegetais", search_query: "botânica grupos vegetais Samuel Cunha" },

  // ===================== História =====================
  { subject: "História", topic: "Brasil Colônia", channel: "Parabólica", title: "Brasil Colônia — economia e sociedade", search_query: "Brasil Colônia economia sociedade Parabólica" },
  { subject: "História", topic: "República", channel: "Parabólica", title: "República Velha — café com leite", search_query: "República Velha café com leite Parabólica" },
  { subject: "História", topic: "Idade Contemporânea", channel: "Débora Aladim", title: "Revolução Francesa", search_query: "Revolução Francesa Débora Aladim" },
  { subject: "História", topic: "Século XX", channel: "Débora Aladim", title: "Guerra Fria — resumo completo", search_query: "Guerra Fria resumo Débora Aladim" },

  // ===================== Geografia =====================
  { subject: "Geografia", topic: "Geopolítica", channel: "Parabólica", title: "Geopolítica mundial atual", search_query: "geopolítica mundial Parabólica" },
  { subject: "Geografia", topic: "Climatologia", channel: "Parabólica", title: "Climas do Brasil e do mundo", search_query: "climas do Brasil e do mundo Parabólica" },
  { subject: "Geografia", topic: "Urbanização", channel: "Débora Aladim", title: "Urbanização brasileira", search_query: "urbanização brasileira Débora Aladim" },
  { subject: "Geografia", topic: "Globalização", channel: "Débora Aladim", title: "Globalização — fases e impactos", search_query: "globalização fases impactos Débora Aladim" },

  // ===================== Filosofia =====================
  { subject: "Filosofia", topic: "Antiga", channel: "Parabólica", title: "Sócrates, Platão e Aristóteles", search_query: "Sócrates Platão Aristóteles Parabólica filosofia" },
  { subject: "Filosofia", topic: "Moderna", channel: "Débora Aladim", title: "Iluminismo e contratualistas", search_query: "iluminismo contratualistas Débora Aladim filosofia" },
  { subject: "Filosofia", topic: "Contemporânea", channel: "Parabólica", title: "Escola de Frankfurt e indústria cultural", search_query: "Escola de Frankfurt indústria cultural Parabólica" },

  // ===================== Sociologia =====================
  { subject: "Sociologia", topic: "Clássicos", channel: "Parabólica", title: "Durkheim, Weber e Marx", search_query: "Durkheim Weber Marx sociologia Parabólica" },
  { subject: "Sociologia", topic: "Cultura", channel: "Débora Aladim", title: "Cultura, identidade e indústria cultural", search_query: "cultura identidade indústria cultural Débora Aladim" },
  { subject: "Sociologia", topic: "Movimentos Sociais", channel: "Parabólica", title: "Movimentos sociais no Brasil", search_query: "movimentos sociais Brasil Parabólica sociologia" },

  // ===================== Português =====================
  { subject: "Português", topic: "Gramática", channel: "Professor Noslen", title: "Crase — quando usar", search_query: "crase quando usar Professor Noslen" },
  { subject: "Português", topic: "Sintaxe", channel: "Professor Noslen", title: "Análise sintática — período simples", search_query: "análise sintática período simples Professor Noslen" },
  { subject: "Português", topic: "Interpretação", channel: "Luma e Ponto", title: "Interpretação de textos no ENEM", search_query: "interpretação de textos ENEM Luma e Ponto" },
  { subject: "Português", topic: "Semântica", channel: "Profinho", title: "Figuras de linguagem", search_query: "figuras de linguagem Profinho português" },

  // ===================== Literatura =====================
  { subject: "Literatura", topic: "Modernismo", channel: "Luma e Ponto", title: "Modernismo brasileiro — 1ª fase", search_query: "modernismo brasileiro primeira fase Luma e Ponto" },
  { subject: "Literatura", topic: "Romantismo", channel: "Professor Noslen", title: "Romantismo no Brasil", search_query: "Romantismo no Brasil Professor Noslen literatura" },
  { subject: "Literatura", topic: "Realismo", channel: "Profinho", title: "Realismo e Machado de Assis", search_query: "Realismo Machado de Assis Profinho literatura" },

  // ===================== Redação =====================
  { subject: "Redação", topic: "Estrutura", channel: "Professor Noslen", title: "Estrutura da redação do ENEM", search_query: "estrutura redação ENEM Professor Noslen" },
  { subject: "Redação", topic: "Argumentação", channel: "Luma e Ponto", title: "Como argumentar bem na redação", search_query: "como argumentar redação Luma e Ponto" },
  { subject: "Redação", topic: "Repertório", channel: "Profinho", title: "Repertório sociocultural para redação", search_query: "repertório sociocultural redação Profinho" },
];
