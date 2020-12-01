import { ReadStream, Stats } from 'fs';

import { PutObjectRequest, PutObjectOutput } from '@aws-sdk/client-s3/models';
import {
  CreateInvalidationRequest,
  CreateInvalidationResult,
  GetInvalidationRequest,
  GetInvalidationResult,
  ListDistributionsRequest,
  ListDistributionsResult
} from '@aws-sdk/client-cloudfront/models';

interface Input {
  location: string;
  bucket: string;
}

interface RunInput extends Input {
  invalidate?: boolean | string;
}

interface UploadInput extends Input {
  file: string;
}

class Action {
  constructor(
    private readonly fs: {
      readdir: (path: string) => Promise<string[]>;
      stat: (path: string) => Promise<Stats>;
      createReadStream: (path: string) => ReadStream;
      join: (...paths: string[]) => string;
    },
    private readonly s3: {
      putObject: (args: PutObjectRequest) => Promise<PutObjectOutput>;
    },
    private readonly cf: {
      listDistributions: (
        args: ListDistributionsRequest
      ) => Promise<ListDistributionsResult>;

      getInvalidation: (
        args: GetInvalidationRequest
      ) => Promise<GetInvalidationResult>;

      createInvalidation: (
        args: CreateInvalidationRequest
      ) => Promise<CreateInvalidationResult>;
    },
    private readonly core: {
      setFailed: (message: Error | string) => void;
      info: (message: string) => void;
    },
    private readonly mime: {
      lookup: (filenameOrExt: string) => string | false;
    }
  ) {}

  async run(input: RunInput): Promise<void> {
    try {
      const files = await this.getFiles(input.location);
      const uploads = files.map(async (file) =>
        this.upload({ ...input, file })
      );

      await Promise.all(uploads);

      if (
        typeof input.invalidate === 'undefined' ||
        (input.invalidate || 'false').toString().toLowerCase() === 'false'
      ) {
        return;
      }

      const distributionId =
        input.invalidate.toString().toLowerCase() === 'true'
          ? await this.getDistributionId(input.bucket)
          : input.invalidate.toString();

      if (!distributionId) {
        return this.core.setFailed(
          `Could not find any cloudfront distribution that is associated with s3 bucket ${input.bucket}!`
        );
      }

      await this.invalidateDistribution(distributionId);
    } catch (error) {
      this.core.setFailed(error);
    }
  }

  private async getFiles(path: string): Promise<string[]> {
    const load = async (location: string): Promise<string[]> => {
      const entries = await this.fs.readdir(location);
      const entriesWithStat = await Promise.all(
        entries.map(async (entry) => {
          const full = this.fs.join(location, entry);
          const stat = await this.fs.stat(full);

          return {
            full,
            stat
          };
        })
      );

      const files: string[] = [];
      const directories: string[] = [];

      for (const entry of entriesWithStat) {
        if (entry.stat.isFile()) {
          files.push(entry.full);
        } else if (entry.stat.isDirectory()) {
          directories.push(entry.full);
        }
      }

      await directories
        .map(load)
        .reduce(
          async (a, c) => [...(await a), ...(await c)],
          Promise.resolve(files)
        );

      return files;
    };

    return load(path);
  }

  private async upload(input: UploadInput): Promise<void> {
    const key = input.file
      .substring(input.location.length + 1)
      .replace(/\\/g, '/');

    const params: PutObjectRequest = {
      Bucket: input.bucket,
      Key: key,
      Body: this.fs.createReadStream(input.file)
    };

    const contentType = this.mime.lookup(key);

    if (contentType) {
      params.ContentType = contentType;
    }

    this.core.info(`uploading ${input.file}`);

    await this.s3.putObject(params);

    this.core.info(`uploaded ${input.file}`);
  }

  private async getDistributionId(domain: string): Promise<string | undefined> {
    let nextMarker: string | undefined = undefined;

    do {
      const params: ListDistributionsRequest = {
        Marker: nextMarker,
        MaxItems: '100'
      };

      const result = await this.cf.listDistributions(params);

      nextMarker = result.DistributionList?.NextMarker;

      const match = result.DistributionList?.Items?.find(
        (item) =>
          item.Aliases &&
          item.Aliases.Items &&
          item.Aliases.Items.some((a) => a.toLowerCase() === domain)
      );

      nextMarker = result.DistributionList?.NextMarker;

      if (match) {
        return match.Id;
      }
    } while (nextMarker);

    return undefined;
  }

  private async invalidateDistribution(distributionId: string): Promise<void> {
    const poll = async (id: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        setTimeout(async () => {
          const params: GetInvalidationRequest = {
            DistributionId: distributionId,
            Id: id
          };

          this.core.info('Checking invalidation status');

          try {
            const result = await this.cf.getInvalidation(params);

            if (
              result.Invalidation &&
              result.Invalidation.Status === 'Completed'
            ) {
              this.core.info('Invalidation completed');
              return resolve();
            }

            await poll(id);

            return resolve();
          } catch (error) {
            return reject(error);
          }
        }, 1000 * 10);
      });
    };

    const params: CreateInvalidationRequest = {
      DistributionId: distributionId,
      InvalidationBatch: {
        CallerReference: Date.now().toString(),
        Paths: {
          Quantity: 1,
          Items: ['/*']
        }
      }
    };

    this.core.info(`Invalidating ${distributionId}`);

    const result = await this.cf.createInvalidation(params);

    if (result.Invalidation && result.Invalidation.Id) {
      await poll(result.Invalidation.Id);
    }
  }
}

export { RunInput, Action };
