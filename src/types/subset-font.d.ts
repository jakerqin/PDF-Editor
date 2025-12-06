declare module 'subset-font' {
  interface SubsetFontOptions {
    targetFormat?: 'truetype' | 'woff' | 'woff2' | 'sfnt';
  }

  function subsetFont(
    font: Uint8Array | ArrayBuffer,
    characters: string,
    options?: SubsetFontOptions
  ): Promise<Uint8Array>;

  export default subsetFont;
}

