import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import {
  ApiKeySourceType,
  Cors,
  LambdaIntegration,
  RestApi,
} from 'aws-cdk-lib/aws-apigateway';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';

export class BedrockStoriesApiStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const api = new RestApi(this, 'StoriesApi', {
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      },
      apiKeySourceType: ApiKeySourceType.HEADER,
    });

    const usagePlan = api.addUsagePlan('StoriesApiUsagePlan', {
      apiStages: [
        {
          api,
          stage: api.deploymentStage,
        },
      ],
    });

    const apiKey = api.addApiKey('ApiKey');
    usagePlan.addApiKey(apiKey);

    const generateStoryLambda = new NodejsFunction(
      this,
      'GenerateStoryLambda',
      {
        entry: 'resources/handlers/generate-story.ts',
        handler: 'handler',
        runtime: Runtime.NODEJS_20_X,
        timeout: Duration.minutes(3),
        initialPolicy: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ['bedrock:InvokeModel'],
            resources: [
              'arn:aws:bedrock:*::foundation-model/meta.llama3-70b-instruct-v1:0',
            ],
          }),
        ],
      }
    );

    const generateStoryIntegration = new LambdaIntegration(generateStoryLambda);

    // NOTE: Create the /stories endpoint on our API
    const stories = api.root.addResource('stories');
    stories.addMethod('POST', generateStoryIntegration, {
      apiKeyRequired: true,
    });

    new CfnOutput(this, 'API Key ID', {
      value: apiKey.keyId,
    });
  }
}
