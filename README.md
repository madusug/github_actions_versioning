# GITHUB ACTIONS AND CI/CD: Deployment Pipelines and Cloud Integration

## Automated Releases and Versioning

Using semantic versioning (SemVer), it is possible to implement automated versioning using GitHub Actions to increment version numbers automatically based on code changes. The code snippet provided for creating a tag and bumping the version is as follows:

```
name: Bump version and tag
on:
  push:
    branches:
      - main

jobs:
  build:
    name: Create Tag
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        # The checkout action checks out your repository under $GITHUB_WORKSPACE, so your workflow can access it.

      - name: Bump version and push tag
        uses: anothrNick/github-tag-action@1.26.0
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          DEFAULT_BUMP: patch
        # This action automatically increments the patch version and tags the commit.
        # 'DEFAULT_BUMP' specifies the type of version bump (major, minor, patch).
```

This workflow tells GitHub actions to use `anothrNick/github-tag-action@1.26.0` to automate version bumping and tagging. The `env` defines environment variables for GitHub_Token and Default_Bump.

### What it does: This action:

1. Looks for an existing version tag in your repository (e.g., v1.0.0).
2. Increments it based on DEFAULT_BUMP (here, it’s patch, so v1.0.0 becomes v1.0.1).
3. Creates a new Git tag with the updated version (e.g., v1.0.1).
4. Pushes the tag back to the repository.

The provided snippet to Create a Release:
```
on:
  push:
    tags:
      - '*'

jobs:
  build:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v2
        # Checks out the code in the tag that triggered the workflow.

      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          # This step creates a new release in GitHub using the tag name.
```

The workflow uses the `actions/checkout@v2` action to clone the repository’s code into the workflow’s VM (into $GITHUB_WORKSPACE). Since this workflow is triggered by a tag push, this step checks out the specific commit associated with that tag (e.g., if the tag is v1.0.1, it checks out the commit tagged as v1.0.1). This ensures the workflow has access to the code at the tagged state. The `actions/create-release@v1` action creates a new GitHub Release tied to the tag that triggered the workflow.

The two workflows complement each other in a version management and release type pipeline. The first workflow (Tag Creation) automatically bumps the version and creates a tag when code is pushed to main.  The second workflow (Release Creation), creates a GitHub release whenever a tag is pushed.

## CLOUD DEPLOYMENT

To deploy to the cloud, I decided to choose Elastic Beanstalk. Elastic Beanstalk is a PaaS that simplifies deploying and managing applications. I chose this because it is easy to set up, auto-scales, handles load balancing and manages the infrastructure.

The syntax I used for this is:

```
name: Deploy to AWS
on:
  push:
    tags:
      - '*'
  # Triggers on tag push (e.g., v1.0.1) instead of main.

jobs:
  deploy:
    runs-on: ubuntu-latest
    # Specifies the runner environment.

    steps:
    - name: Checkout code
      uses: actions/checkout@v2
      # Checks out your repository under $GITHUB_WORKSPACE.

    - name: Set up Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'  # Adjust to your Node.js version
      # Installs Node.js for building your app.

    - name: Install dependencies
      run: npm install
      # Installs your app’s dependencies.

    - name: Build the application
      run: npm run build --if-present
      # Builds your app if you have a build script (optional).

    - name: Set up AWS credentials
      uses: aws-actions/configure-aws-credentials@v1
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: us-east-1
      # Configures AWS credentials from GitHub secrets.

    - name: Deploy to AWS Elastic Beanstalk
      run: |
        zip -r deploy.zip . -x "*.git*"
        aws elasticbeanstalk create-application-version --application-name my-node-app --version-label ${{ github.sha }} --source-bundle S3Bucket="my-eb-bucket",S3Key="deploy-${{ github.sha }}.zip"
        aws s3 cp deploy.zip s3://my-eb-bucket-darey/deploy-${{ github.sha }}.zip
        aws elasticbeanstalk update-environment --application-name my-node-app --environment-name my-node-env --version-label ${{ github.sha }}
      # Zips the app, uploads it to S3, and deploys it to Elastic Beanstalk.
```

### Explanation of the Workflow

1. Trigger: Runs when a tag is created.
2. Checkout: Clones your repository.
3. Set up Node.js: Installs Node.js (adjust the version to match your app’s needs).
4. Install Dependencies: Runs npm install to fetch your app’s dependencies.
5. Build (Optional): Runs npm run build if your app requires it (e.g., for TypeScript or frontend assets).
6. AWS Credentials: Configures AWS CLI access using secrets stored in GitHub (you’ll need to add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY to your repository’s secrets).
7. Deploy to Elastic Beanstalk:
   - `zip -r deploy.zip . -x "*.git*"`: Creates a zip file of your app, excluding Git files.
   - `aws elasticbeanstalk create-application-version`: Registers a new version of your app in Elastic Beanstalk.
   - `aws s3 cp`: Uploads the zip to an S3 bucket (you’ll need to create this bucket beforehand).
   - `aws elasticbeanstalk update-environment`: Updates the Elastic Beanstalk environment to use the new version.

### Prerequisites for Elastic Beanstalk

Before running the workflow, I:

1. Created an Elastic Beanstalk Application:
   - In the AWS Console, I went to Elastic Beanstalk → Create Application → Named it (e.g., my-node-app) and Chose "Node.js" platform.
2. Created an Environment:
   - Within the application, created an environment (e.g., my-node-env) to run my app.
3. Created an S3 Bucket:
   - I went to S3, created a bucket (e.g., my-eb-bucket-darey) in the same region (us-east-1).
4. Set Up IAM Permissions:
   - Ensured my AWS credentials (access key) have permissions for Elastic Beanstalk, S3, and IAM (e.g., AWSElasticBeanstalkFullAccess and AmazonS3FullAccess).
5. Added Secrets to GitHub:
   - In my GitHub repo: Settings → Secrets and variables → Actions → Add AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.


## Execution:

Upon execution, the Tag workflow was successful but didn't push a tag to the repo and didn't trigger the Release Creation workflow. However, the Deploy to AWS workflow ran with an error, noting that the environment variable specified was not in existence.

![failure](./img/5%20failure.jpg)

To resolve these issues, I decided to tackle them one by one:

1. Bump Version and Tag workflow executes successfully but does not push a tag to the repo
2. Release Creation workflow not being triggered
3. Elastic Beanstalk not set up properly

## 1. Bump Version and Tag workflow executes successfully but does not push a tag to the repo

I tried various adjustments to the workflow, spending approximately 6hrs trying to figure out what was wrong. The issue seemed to have stemmed from the github action `anothrNick/github-tag-action@1.26.0`. This action wasn't working properly and didn't recognize the commits. This caused the workflow to execute successfully but did not create a tag or push a tag to the repo. To resolve this, I changed the action to `mathieudutour/github-tag-action`. This successfully created the tag and pushed it to the repo.

```
- name: Bump version and push tag
  id: bump
  uses: mathieudutour/github-tag-action@v6.1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    default_bump: patch
    tag_prefix: v
    create_annotated_tag: true
```

## Release Creation workflow not being triggered

Even though the first workflow was now creating tags, the second workflow was still not being triggered. To resolve this, I conducted another 4 hours of research and discovered that I needed to first try a manual push:
```
git fetch origin
git push origin :refs/tags/v0.0.4  # Delete remotely
git tag v0.0.4 06a122b5cca5b6d07855aa92b218ff724b31916c  # Recreate locally
git push origin v0.0.4  # Push manually
```
to see if the Release Creation workflow would be triggered and it worked. It was triggered. This led me to believe that there was an 'Event Suppression in Actions'. This problem occurs when a workflow pushes a tag using GITHUB_TOKEN and GitHub suppresses subsequent workflow triggers to avoid infinite loops which is a known behaviour in actions. To curb this I had two approaches: 

1. Combine my first workflow with my second workflow

```
name: Bump Version and Create Release
on:
  push:
    branches:
      - main
jobs:
  build:
    name: Create Tag and Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Bump version and push tag
        id: bump
        uses: mathieudutour/github-tag-action@v6.1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          default_bump: patch
          tag_prefix: v
          create_annotated_tag: true
          dry_run: true

      - name: Configure Git identity and push tag
        if: steps.bump.outputs.new_tag != ''
        run: |
          git config --global user.name "GitHub Action"
          git config --global user.email "action@github.com"
          git tag ${{ steps.bump.outputs.new_tag }} -a -m "Release ${{ steps.bump.outputs.new_tag }}"
          git push origin ${{ steps.bump.outputs.new_tag }}

      - name: Create Release
        if: steps.bump.outputs.new_tag != ''
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.bump.outputs.new_tag }}
          release_name: Release ${{ steps.bump.outputs.new_tag }}
          body: |
            Changes in this Release
            - First Change
            - Second Change
          draft: false
          prerelease: false

      - name: Debug tag creation
        run: |
          echo "New tag: ${{ steps.bump.outputs.new_tag }}"
          git tag -l
```

2. Modify my workflow to use `workflow_dispatch` and call it from "Bump version and tag" after pushing the tag

Create Release workflow:
```
name: Create Release
on:
  workflow_dispatch:
    inputs:
      tag_name:
        description: 'Tag to create release for'
        required: true
jobs:
  build:
    name: Create Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      - name: Create Release
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.event.inputs.tag_name }}
          release_name: Release ${{ github.event.inputs.tag_name }}
          body: |
            Changes in this Release
            - First Change
            - Second Change
          draft: false
          prerelease: false
```

Bump version and Tag workflow:

```
name: Bump version and tag
on:
  push:
    branches:
      - main
jobs:
  build:
    name: Create Tag
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Bump version and push tag
        id: bump
        uses: mathieudutour/github-tag-action@v6.1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          default_bump: patch
          tag_prefix: v
          create_annotated_tag: true
          dry_run: true

      - name: Configure Git identity and push tag
        if: steps.bump.outputs.new_tag != ''
        run: |
          git config --global user.name "GitHub Action"
          git config --global user.email "action@github.com"
          git tag ${{ steps.bump.outputs.new_tag }} -a -m "Release ${{ steps.bump.outputs.new_tag }}"
          git push origin ${{ steps.bump.outputs.new_tag }}

      - name: Trigger Create Release
        if: steps.bump.outputs.new_tag != ''
        uses: actions/github-script@v6
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          script: |
            await github.rest.actions.createWorkflowDispatch({
              owner: context.repo.owner,
              repo: context.repo.repo,
              workflow_id: 'node.rel.yml',
              ref: 'main',
              inputs: {
                tag_name: '${{ steps.bump.outputs.new_tag }}'
              }
            });

      - name: Debug tag creation
        run: |
          echo "New tag: ${{ steps.bump.outputs.new_tag }}"
          git tag -l
```
![workflow](./img/1%20actions.jpg)

## Elastic Beanstalk not set up properly

I set up Elastic Beanstalk properly after watching a youtube video and changed my server.js file to accommodate deployment on elastic beanstalk.

```
const express = require('express');
const app = express();
const port = process.env.PORT || 3000; // Use EB's port (8080) or 3000 locally

// Serve static files from the "public" directory
app.use(express.static('public'));

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
```
Since I was also aware of the suppression by actions, I combined all the workflows to create a tag, a release and then deploy to aws elastic beanstalk.

```
name: Bump Version, Create Release, and Deploy to AWS
on:
  push:
    branches:
      - main
jobs:
  build:
    name: Create Tag, Release, and Deploy
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Bump version and push tag
        id: bump
        uses: mathieudutour/github-tag-action@v6.1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          default_bump: patch
          tag_prefix: v
          create_annotated_tag: true
          dry_run: true

      - name: Configure Git identity and push tag
        if: steps.bump.outputs.new_tag != ''
        run: |
          git config --global user.name "GitHub Action"
          git config --global user.email "action@github.com"
          git tag ${{ steps.bump.outputs.new_tag }} -a -m "Release ${{ steps.bump.outputs.new_tag }}"
          git push origin ${{ steps.bump.outputs.new_tag }}

      - name: Create Release
        if: steps.bump.outputs.new_tag != ''
        id: create_release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ steps.bump.outputs.new_tag }}
          release_name: Release ${{ steps.bump.outputs.new_tag }}
          body: |
            Changes in this Release
            - First Change
            - Second Change
          draft: false
          prerelease: false

      - name: Set up Node.js
        if: steps.bump.outputs.new_tag != ''
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        if: steps.bump.outputs.new_tag != ''
        run: npm install

      - name: Build the application
        if: steps.bump.outputs.new_tag != ''
        run: npm run build --if-present

      - name: Set up AWS credentials
        if: steps.bump.outputs.new_tag != ''
        uses: aws-actions/configure-aws-credentials@v1
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to AWS Elastic Beanstalk
        if: steps.bump.outputs.new_tag != ''
        run: |
          zip -r deploy.zip . -x "*.git*"
          aws s3 cp deploy.zip s3://my-eb-bucket-darey/deploy-${{ github.sha }}.zip
          aws elasticbeanstalk create-application-version --application-name my-node-app --version-label ${{ github.sha }} --source-bundle S3Bucket="my-eb-bucket-darey",S3Key="deploy-${{ github.sha }}.zip"
          aws elasticbeanstalk update-environment --application-name my-node-app --environment-name my-node-env --version-label ${{ github.sha }}

      - name: Debug tag creation
        run: |
          echo "New tag: ${{ steps.bump.outputs.new_tag }}"
          git tag -l
```

This worked and was deployed successfully.

![action](./img/2%20combined.jpg)
![success_bean](./img/3%20bean.jpg)
![success_web](./img/4%20success.jpg)