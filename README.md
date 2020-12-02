# AWS Static Web App update action

This action uploads the contents of the specified directory with proper mime-type and cache-control into S3 bucket and optionally issues an invalidation command to associated cloudfront distribution
 
The AWS Account needs to have the `"s3:PutObject"` permission, if Cloudfront invalidation is enabled then `"cloudfront:CreateInvalidation"` and `"cloudfront:GetInvalidation"` are required, if no distribution id is provided (e.g. `invalidate: true`) then `"cloudfront:ListDistributions"` is also required.
 
## Inputs

### `location`

**Required**. The location of the directory which contents would be uploaded.

### `bucket`

**Required**. The name of the S3 bucket where the content would be uploaded.

### `cache-control`

_Optional_. HTTP cache-control mapping. behind the scene it uses [globby](https://github.com/sindresorhus/globby) to find the matching file.

### `invalidate`

_Optional_. `Boolean` or the id of the cloudfront distribution, The default is `false`, if `true` then it uses the cloudfront distribution id that is associated with the S3 bucket.

### `AWS_REGION`

_Optional_. If not specified fallbacks to environment variable.

### `AWS_ACCESS_KEY_ID`

_Optional_. If not specified fallbacks to environment variable.

### `AWS_SECRET_ACCESS_KEY`

_Optional_. If not specified fallbacks to environment variable.

## Outputs

N/A

## Example usage

### minimum

```yaml
uses: kazimanzurrashid/aws-static-web-app-update-action@v1
with:
  location: './web/public'
  bucket: 'example.com'
```

### all

```yaml
uses: kazimanzurrashid/aws-static-web-app-update-action@v1
with:
  location: './web/public'
  bucket: 'example.com'
  cache-control:
    private,max-age=31536000: ['**', '!index.html']
  invalidate: 'XXXXXXXXXXXXXX'
  AWS_REGION: ${{ secrets.AWS_REGION }}
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### complete

```yaml
name: Web
on:
  push:
    branches:
      - main
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: Node.js setup
        uses: actions/setup-node@v2-beta
        with:
          node-version: 12.x

      - name: Build
        run: |
          cd web
          npm ci
          npm run build

      - name: Update
        uses: kazimanzurrashid/aws-static-web-app-update-action@v1
        with:
          location: './web/public'
          bucket: 'example.com'
          cache-control:
            private,max-age=31536000: ['**', '!index.html']
          invalidate: true
        env:
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```
