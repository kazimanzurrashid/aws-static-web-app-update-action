import { createReadStream, readdir, stat } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { S3, PutObjectCommand } from '@aws-sdk/client-s3';

import {
  CloudFront,
  CreateInvalidationCommand,
  ListDistributionsCommand,
  GetInvalidationCommand
} from '@aws-sdk/client-cloudfront';

import {
  ListDistributionsResult,
  GetInvalidationResult,
  CreateInvalidationResult
} from '@aws-sdk/client-cloudfront/models';

import { getInput, setFailed, info } from '@actions/core';
import { lookup } from 'mime-types';
import { globby } from 'globby';
import { load } from 'js-yaml';

import { Action } from './action';

const getValue = (key: string): string =>
  (getInput(key) || (process.env[key] as unknown)) as string;

const location = getInput('location', { required: true });
const bucket = getInput('bucket', { required: true });
const cacheControl = getInput('cache-control');
const invalidate = getInput('invalidate');
const wait = (getInput('wait') || 'true').toLowerCase() === 'true';
const awsRegion = getValue('AWS_REGION');
const awsAccessKeyId = getValue('AWS_ACCESS_KEY_ID');
const awsSecretAccessKey = getValue('AWS_SECRET_ACCESS_KEY');

const s3 = new S3({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  }
});

const cf = new CloudFront({
  region: awsRegion,
  credentials: {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  }
});

(async () => {
  try {
    await new Action(
      {
        readdir: promisify(readdir),
        stat: promisify(stat),
        createReadStream,
        join
      },
      {
        putObject: async (args: PutObjectCommand): Promise<void> => {
          await s3.send(args);
        }
      },
      {
        listDistributions: async (
          args: ListDistributionsCommand
        ): Promise<ListDistributionsResult> => cf.send(args),
        getInvalidation: async (
          args: GetInvalidationCommand
        ): Promise<GetInvalidationResult> => cf.send(args),
        createInvalidation: async (
          args: CreateInvalidationCommand
        ): Promise<CreateInvalidationResult> => cf.send(args)
      },
      {
        lookup
      },
      {
        match: async (path: string, pattern: string | string[]) =>
          globby(pattern, { cwd: path, onlyFiles: true })
      },
      info
    ).run({
      location,
      bucket,
      cacheControl: cacheControl
        ? (load(cacheControl) as { [key: string]: string | string[] })
        : {},
      invalidate,
      region: awsRegion,
      wait
    });
  } catch (error) {
    setFailed(error as Error);
  }
})();
