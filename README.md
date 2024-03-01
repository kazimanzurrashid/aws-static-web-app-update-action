# AWS Static Web App update action

[![GitHub](https://img.shields.io/github/license/kazimanzurrashid/aws-static-web-app-update-action)](https://opensource.org/licenses/MIT)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/kazimanzurrashid/aws-static-web-app-update-action)](https://github.com/kazimanzurrashid/aws-static-web-app-update-action/releases)
[![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/kazimanzurrashid/aws-static-web-app-update-action/ci.yml)](https://github.com/kazimanzurrashid/aws-static-web-app-update-action/actions)

This action uploads the contents of the specified directory with proper mime-type and cache-control into
S3 bucket and optionally issues an invalidation command to associated cloudfront distribution.

## Usage

### minimum

```yaml
uses: kazimanzurrashid/aws-static-web-app-update-action@v1.1.0
with:
  location: './web/public'
  bucket: 'example.com'
```

### complete

```yaml
uses: kazimanzurrashid/aws-static-web-app-update-action@v1.1.0
with:
  location: './web/public'
  bucket: 'example.com'
  cache-control: |
    private,max-age=31536000: ['**', '!index.html']
  invalidate: 'XXXXXXXXXXXXXX'
  wait: true
  AWS_REGION: ${{ secrets.AWS_REGION }}
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
  AWS_SESSION_TOKEN: ${{ secrets.AWS_SESSION_TOKEN }} 
```

## AWS Permission

The AWS Account needs to have the `"s3:PutObject"` permission, if Cloudfront invalidation is enabled
then `"cloudfront:CreateInvalidation"` and `"cloudfront:GetInvalidation"` are required, if no distribution id
is provided (e.g. `invalidate: true`) then `"cloudfront:ListDistributions"` is also required.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject"],
      "Resource": "*" // Don't use for production, change it to your s3 bucket name
    },
    {
      "Effect": "Allow",
      "Action": [
        "cloudfront:CreateInvalidation",
        "cloudfront:GetInvalidation",
        "cloudfront:ListDistributions"
      ],
      "Resource": "*" // Don't use all, change it to your actual cloudfront distribution
    }
  ]
}
```

## Inputs

### `location`

**Required**. The location of the directory which contents would be uploaded.

### `bucket`

**Required**. The name of the S3 bucket where the content would be uploaded.

### `cache-control`

_Optional_. HTTP cache-control mapping. behind the scene it uses [globby](https://github.com/sindresorhus/globby) to find the matching file.

### `invalidate`

_Optional_. `Boolean` or the id of the cloudfront distribution, the default is `false`, if `true` then it uses the cloudfront distribution id that is associated with the S3 bucket.

### `wait`

_Optional_. `Boolean`, if `true` then it would wait for the invalidation to complete, the default is `true`.

### `AWS_REGION`

_Optional_, if not specified fallbacks to environment variable.

### `AWS_ACCESS_KEY_ID`

_Optional_, if not specified fallbacks to environment variable.

### `AWS_SECRET_ACCESS_KEY`

_Optional_, if not specified fallbacks to environment variable.

### `AWS_SESSION_TOKEN`

_Optional_, if not specified fallbacks to environment variable.


## Outputs

N/A

## Examples

### React

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
        uses: actions/checkout@v3

      - name: Node.js setup
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Build
        run: |
          npm ci
          npm run build

      - name: Update
        uses: kazimanzurrashid/aws-static-web-app-update-action@v1.1.0
        with:
          location: ./build
          bucket: my-site.com
          cache-control: |
            public, max-age=31536000, immutable: '/static/**/**'
            max-age=0, no-cache, no-store, must-revalidate: ['./index.html', './'service-worker.js]
          invalidate: true
        env:
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Angular

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
        uses: actions/checkout@v3

      - name: Node.js setup
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Build
        run: |
          npm ci
          ng build --configuration production

      - name: Update
        uses: kazimanzurrashid/aws-static-web-app-update-action@v1.1.0
        with:
          location: ./dist/my-ng-app
          bucket: my-site.com
          cache-control: |
            public, max-age=31536000, immutable: ['./**/*.js', './**/*.css', './**/*.png', './**/*.jpg', './assets/**/**']
            max-age=0, no-cache, no-store, must-revalidate: ['./index.html']
          invalidate: true
        env:
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### Gatsby

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
        uses: actions/checkout@v3

      - name: Node.js setup
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Build
        run: |
          npm ci
          npm run build

      - name: Update
        uses: kazimanzurrashid/aws-static-web-app-update-action@v1.1.0
        with:
          location: ./public
          bucket: my-site.com
          cache-control: |
            max-age=0, no-cache, no-store, must-revalidate: ['./**/**/*.html', './page-data/**/**']
            public, max-age=31536000, immutable: ['./static/**/**', './*.js', './*.css']
          invalidate: true
        env:
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

## License

This project is distributed under the [MIT license](LICENSE).
