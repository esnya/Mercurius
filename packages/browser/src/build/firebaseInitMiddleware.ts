import implicitInit from 'firebase-tools/lib/hosting/implicitInit';
import initMiddleware from 'firebase-tools/lib/hosting/initMiddleware';
import checkDupHostingKeys from 'firebase-tools/lib/checkDupHostingKeys';
import getProjectNumber from 'firebase-tools/lib/getProjectNumber';
import requireConfig from 'firebase-tools/lib/requireConfig';
import { requirePermissions } from 'firebase-tools/lib/requirePermissions';
import { Command } from 'firebase-tools/lib/command';

type Middleware = (
  req: Express.Request,
  res: Express.Response,
  next: () => void,
) => void;

export default async function firebaseInitMiddleware(): Promise<Middleware> {
  return await new Command<Middleware>('init-middleware')
    .before(
      async (options: {}): Promise<void> => {
        await requireConfig(options);
        await requirePermissions(options);
        await checkDupHostingKeys(options);
        await getProjectNumber(options);
      },
    )
    .action(
      async (options: {}): Promise<Middleware> => {
        const init = await implicitInit(options);
        return initMiddleware(init);
      },
    )
    .runner()();
}
