import JSZip from 'jszip';
import { FontStore } from '../utils.ts';
import { FONTS } from '../constants.ts';

const GOOGLE_FONTS_TO_DOWNLOAD = [
  { name: 'Inter', url: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2' },
  { name: 'Playfair Display', url: 'https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvUDQZNLo_U2r.woff2' },
  { name: 'Montserrat', url: 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459WlhyyTh89Y.woff2' },
  { name: 'Bangers', url: 'https://fonts.gstatic.com/s/bangers/v20/FeVQS0BTqb0h60ACL5la2bxii28.woff2' },
  { name: 'Lobster', url: 'https://fonts.gstatic.com/s/lobster/v28/neILzCirqoswsqX9_oWsMqEzSJQ.woff2' },
  { name: 'Permanent Marker', url: 'https://fonts.gstatic.com/s/permanentmarker/v16/Fh4uPib9Iyv2ucM6pGQMWimMp004La2Cf5b6jlg.woff2' },
  { name: 'Sacramento', url: 'https://fonts.gstatic.com/s/sacramento/v13/buEzpo6gcdjy0EiZMBUG0CoV_NxLeiw.woff2' },
  { name: 'Press Start 2P', url: 'https://fonts.gstatic.com/s/pressstart2p/v15/e3t4euO8T-267oIAQAu6jDQyK0nSgPJE4580.woff2' },
  { name: 'Monoton', url: 'https://fonts.gstatic.com/s/monoton/v15/5h1aiZUrOngCibe4fkbBQ2S7FU8.woff2' },
  { name: 'Alfa Slab One', url: 'https://fonts.gstatic.com/s/alfaslabone/v17/6NUQ8FmMKwSEKjnm5-4v-4Jh6dVretWvYmE.woff2' },
  { name: 'Cinzel Decorative', url: 'https://fonts.gstatic.com/s/cinzeldecorative/v14/daaCSScvJGqLYhG8nNt8KPPswUAPnh7URs1LaCyC.woff2' },
  { name: 'Faster One', url: 'https://fonts.gstatic.com/s/fasterone/v19/H4ciBXCHmdfClFb-vWhfyLuShq63czE.woff2' },
  { name: 'Righteous', url: 'https://fonts.gstatic.com/s/righteous/v13/1cXxaUPXBpj2rGoU7C9mj3uEicG01A.woff2' },
  { name: 'Fredoka One', url: 'https://fonts.gstatic.com/s/fredokaone/v13/k3kUo8kEI-tA1RRcTZGmTmHBA6aF8Bf_.woff2' },
  { name: 'Orbitron', url: 'https://fonts.gstatic.com/s/orbitron/v29/yMJMMIlzdpvBhQQL_SC3X9yhF25-T1nyGy6xpmIyXjU1pg.woff2' },
  { name: 'Special Elite', url: 'https://fonts.gstatic.com/s/specialelite/v18/XLYgIZbkc4JPUL5CVArUVL0nhncESXFtUsM.woff2' },
  { name: 'Cookie', url: 'https://fonts.gstatic.com/s/cookie/v21/syky-y18lb0tSbfNlQCT9tPdpw.woff2' },
  { name: 'Satisfy', url: 'https://fonts.gstatic.com/s/satisfy/v17/rP2Hp2yn6lkG50LoOZSCHBeHFl0.woff2' },
  { name: 'Kaushan Script', url: 'https://fonts.gstatic.com/s/kaushanscript/v14/vm8vdRfvXFLG3OLnsO15WYS5DF7_ytN3M48a.woff2' },
  { name: 'Pinyon Script', url: 'https://fonts.gstatic.com/s/pinyonscript/v16/6xKpdSJbL9-e9LuoeQiDRQR8aOLQO4bhiDY.woff2' },
  { name: 'Rochester', url: 'https://fonts.gstatic.com/s/rochester/v18/6ae-4KCqVa4Zy6Fif-Uy31vWNTMwoQ.woff2' },
  { name: 'Abril Fatface', url: 'https://fonts.gstatic.com/s/abrilfatface/v19/zOL64pLDlL1D99S8g8PtiKchm-BsjOLhZBY.woff2' },
  { name: 'Comfortaa', url: 'https://fonts.gstatic.com/s/comfortaa/v40/1Pt_g8LJRfWJmhDAuUsSQamb1W0lwk4S4TbMPrQVIT9c2c8.woff2' },
  { name: 'UnifrakturMaguntia', url: 'https://fonts.gstatic.com/s/unifrakturmaguntia/v16/WWXPlieVYwiGNomYU-ciRLRvEmK7oaVemGZM.woff2' },
  { name: 'Creepster', url: 'https://fonts.gstatic.com/s/creepster/v13/AlZy_zVUqJz4yMrniH4hdXf4XB0Tow.woff2' },
  { name: 'Nosifer', url: 'https://fonts.gstatic.com/s/nosifer/v18/ZGjXol5JTp0g5bxZaC1RVDNdGDs.woff2' },
  { name: 'Bungee Shade', url: 'https://fonts.gstatic.com/s/bungeeshade/v11/DtVkJxarWL0t2KdzK3oI_jks7iLSrwFUlw.woff2' }
];

export const downloadAllFontsAsZip = async (): Promise<Blob> => {
  const zip = new JSZip();
  const fontsFolder = zip.folder('fonts');

  for (const font of GOOGLE_FONTS_TO_DOWNLOAD) {
    try {
      const response = await fetch(font.url);
      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      fontsFolder?.file(`${font.name}.woff2`, arrayBuffer);
    } catch (error) {
      console.warn(`Failed to download ${font.name}:`, error);
    }
  }

  return await zip.generateAsync({ type: 'blob' });
};

export const uploadAndConfigureFonts = async (zipFile: File): Promise<{ name: string; value: string }[]> => {
  const zip = await JSZip.loadAsync(zipFile);
  const configuredFonts: { name: string; value: string }[] = [];

  for (const [filename, file] of Object.entries(zip.files)) {
    if (file.dir || !filename.match(/\.(ttf|otf|woff|woff2)$/i)) continue;

    const arrayBuffer = await file.async('arraybuffer');
    const fontName = filename.replace(/^fonts\//, '').replace(/\.(ttf|otf|woff|woff2)$/i, '');

    await FontStore.saveFont(fontName, arrayBuffer);

    const fontFace = new FontFace(fontName, `url(data:font/woff2;base64,${arrayBufferToBase64(arrayBuffer)})`);
    await fontFace.load();
    document.fonts.add(fontFace);

    configuredFonts.push({
      name: fontName,
      value: `'${fontName}', sans-serif`
    });
  }

  return configuredFonts;
};

export const loadLocalFonts = async (): Promise<{ name: string; value: string }[]> => {
  const fonts = await FontStore.getFonts();
  const loadedFonts: { name: string; value: string }[] = [];

  for (const font of fonts) {
    const fontFace = new FontFace(font.name, `url(data:font/woff2;base64,${arrayBufferToBase64(font.data)})`);
    await fontFace.load();
    document.fonts.add(fontFace);

    loadedFonts.push({
      name: font.name,
      value: `'${font.name}', sans-serif`
    });
  }

  return loadedFonts;
};

const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};
