# AWS Static Web App update action

This action updates Upload the contents of the specified directory into S3 bucket and optionally issues an invalidation command of a cloudfront distribution
 
The AWS Account needs to have the `"s3:PutObject"` permission.
 
## Inputs

### `location`

**Required**. The location of the directory which contents would be uploaded.

### `bucket`

**Required**. The name of the S3 bucket where the content would be uploaded.

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
uses: kazimanzurrashid/lambda-update-action@v1
with:
  zip-file: './dist/my_lambda.zip'
```

### all

```yaml
uses: kazimanzurrashid/lambda-update-action@v1
with:
  zip-file: './dist/my_lambda.zip'
  lambda-name: 'your_lambda'
  publish: true
  AWS_REGION: ${{ secrets.AWS_REGION }}
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
```

### complete

```yaml
name: API
on:
  push:
    branches:
      - main
env:
  AWS_REGION: ${{ secrets.AWS_REGION }}
  AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
  AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v2

      - name: .NET setup
        uses: actions/setup-dotnet@v1
        with:
          dotnet-version: 3.1.x

      - name: Lambda.Tools install
        run: dotnet tool install -g Amazon.Lambda.Tools

      - name: Build
        run: |
          cd src/Api
          dotnet lambda package -o api.zip

      - name: Update
        uses: kazimanzurrashid/lambda-update-action@v1
        with:
          zip-file: src/Api/api.zip
```
