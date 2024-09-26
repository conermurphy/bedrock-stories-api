import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { APIGatewayProxyEvent } from 'aws-lambda';
import { z } from 'zod';

const bodySchema = z.object({
  prompt: z.string(),
});

// NOTE: The structure of the response differs depending on the model used on Bedrock.
const bedrockResponseSchema = z.object({
  generation: z.string(),
  prompt_token_count: z.number(),
  generation_token_count: z.number(),
  stop_reason: z.string(),
});

const client = new BedrockRuntimeClient();

export const handler = async (event: APIGatewayProxyEvent) => {
  if (!event.body) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing body' }),
    };
  }
  const { prompt } = bodySchema.parse(JSON.parse(event.body));

  if (!prompt) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "You didn't provide a prompt to generate a story with...",
      }),
    };
  }

  // NOTE: Configure the input for the Bedrock request
  const input = {
    // NOTE: The body differs depending on the Bedrock model used. Use the Bedrock dashboard playground to figure out what body to provide.
    body: JSON.stringify({
      prompt,
      max_gen_len: 512,
      temperature: 0.5,
      top_p: 0.9,
    }),
    accept: 'application/json',
    contentType: 'application/json',
    // NOTE: The ID of the model we want to use
    modelId: 'meta.llama3-70b-instruct-v1:0',
  };

  try {
    const response = await client.send(new InvokeModelCommand(input));

    const { generation } = bedrockResponseSchema.parse(
      // NOTE: Convert the response from UInt8Array to JSON
      JSON.parse(Buffer.from(response.body).toString('utf8'))
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ story: generation }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: e }),
    };
  }
};
