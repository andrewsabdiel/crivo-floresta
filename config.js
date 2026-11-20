// Valores que dependem de decisão ou de arquivo ainda não definidos.
// Preencher antes de publicar. Não colocar segredos aqui: este arquivo é público.
window.SITE = {
  // URL final da landing da CRIVO (https://...). Vazio = botão fica sem destino.
  landingUrl: '',
  // Vídeo de abertura (Pexels). Caminhos relativos a esta pasta. Vazio = só a imagem de poster.
  heroVideo: {
    // Pexels 28580909 (Ejov Igor), com cor reforçada e emenda cruzada para loop contínuo
    desktop: 'assets/video/hero-1440-h264.mp4',    // H.264 1440p com nitidez reforçada (compatível com tudo)
    desktopAv1: 'assets/video/hero-1440-av1.webm', // AV1 1440p, mais leve e nítido, quando o aparelho decodifica bem
    mobile: ''   // ex.: 'assets/video/hero-mobile.mp4'
  }
};
