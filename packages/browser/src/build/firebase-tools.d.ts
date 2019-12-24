declare module 'firebase-tools/lib/command' {
  export class Command<T> {
    constructor(name: string);
    before(fn: (options: {}) => Promise<void>): Command<T>;
    action(fn: (options: {}) => Promise<T>): Command<T>;
    runner(): () => Promise<T>;
  }
}

declare module 'firebase-tools/lib/checkDupHostingKeys' {
  export default function checkDupHostingKeys(options: {}): Promise<void>;
}

declare module 'firebase-tools/lib/getProjectNumber' {
  export default function getProjectNumber(options: {}): Promise<void>;
}

declare module 'firebase-tools/lib/requireConfig' {
  export default function requireConfig(options: {}): Promise<void>;
}

declare module 'firebase-tools/lib/requirePermissions' {
  export function requirePermissions(options: {}): Promise<void>;
}

declare module 'firebase-tools/lib/hosting/implicitInit' {
  export default function implicitInit(options: {}): Promise<{}>;
}

declare module 'firebase-tools/lib/hosting/initMiddleware' {
  export default function initMiddleware(init: {}): Promise<
    (req: Express.Request, res: Express.Response, next: () => void) => void
  >;
}
