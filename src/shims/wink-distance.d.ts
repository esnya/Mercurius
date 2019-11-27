declare module 'wink-distance' {
  const WinkDistance: {
    string: {
      jaro: (a: string, b: string) => number;
      jaroWinkler: (a: string, b: string) => number;
    };
  };
  export = WinkDistance;
}
