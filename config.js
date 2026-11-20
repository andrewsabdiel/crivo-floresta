// Valores que dependem de decisão ou de arquivo ainda não definidos.
// Preencher antes de publicar. Não colocar segredos aqui: este arquivo é público.
window.SITE = {
  // URL final da landing da CRIVO (https://...). Vazio = botão fica sem destino.
  landingUrl: '',
  // Vídeo de abertura (Pexels). Caminhos relativos a esta pasta. Vazio = só a imagem de poster.
  heroVideo: {
    // Pexels 28580909 (Ejov Igor), com cor reforçada e emenda cruzada para loop contínuo
    desktop: 'assets/video/hero-desktop.mp4',          // H.264 1080p (compatível com tudo)
    desktopAv1: 'assets/video/hero-desktop-1440.webm', // AV1 1440p (telas grandes que decodificam bem)
    mobile: ''   // ex.: 'assets/video/hero-mobile.mp4'
  }
};
