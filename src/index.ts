import { createReadStream, readdir, stat } from 'fs';
import { join } from 'path';
import { promisify } from 'util';

import { S3 } from '@aws-sdk/client-s3';
import { CloudFront } from '@aws-sdk/client-cloudfront';
import { getInput, setFailed, info } from '@actions/core';
import { lookup } from 'mime-types';
import globby from 'globby';
import { safeLoad } from 'js-yaml';

import { Action } from './action';

const getValue = (key: string): string =>
  (getInput(key) || process.env[key]) as string;

const location = getInput('location', { required: true });
const bucket = getInput('bucket', { required: true });
const cacheControl = getInput('cache-control');
const invalidate = getInput('invalidate');

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
      s3,
      cf,
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
        ? (safeLoad(cacheControl) as { [key: string]: string | string[] })
        : {},
      invalidate,
      region: awsRegion
    });
  } catch (error) {
    setFailed(error);
  }
})();
