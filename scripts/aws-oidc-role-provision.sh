#!/usr/bin/env sh
THISDIR=$(cd $(dirname "$0"); pwd) #this script's directory
THISSCRIPT=$(basename $0)

GitHubOrg=activescott
RepositoryName=serverless-aws-static-file-handler
# Get OIDCProviderArn via `aws iam list-open-id-connect-providers` or at https://us-east-1.console.aws.amazon.com/iamv2/home#/identity_providers
# Create one according to https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html#manage-oidc-provider-console
# TODO: create it via cloudformation or CLI
OIDCProviderArn=arn:aws:iam::166901232151:oidc-provider/token.actions.githubusercontent.com

# us-east-1 since IAM is there anyway?
AWS_REGION=us-east-1

echo "using org '$GitHubOrg' and repo '$RepositoryName'."

aws cloudformation deploy \
  --region $AWS_REGION \
  --template-file aws-oidc-role-cloudformation-template.yaml \
  --stack-name aws-oidc-role-cloudformation \
  --capabilities CAPABILITY_NAMED_IAM \
  --parameter-overrides GitHubOrg=$GitHubOrg \
  RepositoryName=$RepositoryName \
  OIDCProviderArn=$OIDCProviderArn
  #--no-execute-changeset
